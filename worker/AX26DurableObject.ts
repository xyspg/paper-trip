import { DurableObject } from "cloudflare:workers";
import { tripData } from "../src/trip/tripData";
import type { Trip } from "../src/trip/types";
import { applyOp, type TripOp } from "../src/trip/ops";
import type { TripBackup } from "../src/trip/types";
import type { Env } from "./env";

type Snapshot = { rev: number; trip: Trip };

// Cap on retained audit rows. The GET view returns at most 500, so keeping the
// most recent 2000 leaves ample history while bounding storage (each row can
// embed a full scanned-receipt payload, so the table would otherwise grow
// without limit over the trip's life).
const AUDIT_RETENTION = 2000;

type AuditRow = {
  seq: number;
  at: string;
  rev: number;
  op: string;
  target: string | null;
  actorId: number | null;
  actorLogin: string;
  actorEmail: string | null;
  ip: string | null;
  detail: string;
};

type BackupRow = TripBackup & {
  trip: string;
};

// Trips persisted before the parking-pass proxy carry the secret provider
// capability URL in `parking.passUrl`, and public reads (/api/trip, the
// websocket snapshot) serve this.trip verbatim. Strip the legacy field at
// every point state enters memory: init load and backup restore.
function scrubPassUrls(trip: Trip): void {
  for (const item of trip.items) {
    const parking = item.parking as ({ passUrl?: string } & typeof item.parking) | undefined;
    if (parking?.passUrl) delete parking.passUrl;
  }
}

// The id of the entity a write touched, for the audit `target` column. Bulk ops
// (`clearSuggestions`, `resetExpenses`, `reset`) affect everything, so null.
function opTarget(op: TripOp): string | null {
  switch (op.type) {
    case "setItemStatus":
      return op.itemId;
    case "updateItem":
      return op.item.id;
    case "setChecklistItem":
      return op.checklistId;
    case "addSuggestion":
      return op.suggestion.id;
    case "setSuggestionStatus":
    case "deleteSuggestion":
      return op.suggestionId;
    case "addExpense":
    case "updateExpense":
      return op.expense.id;
    case "deleteExpense":
    case "setExpenseAmount":
    case "setExpensePayer":
    case "setExpenseSplit":
      return op.expenseId;
    case "clearSuggestions":
    case "resetExpenses":
    case "reset":
      return null;
  }
}

export class AX26DurableObject extends DurableObject<Env> {
  private trip!: Trip;
  private rev = 0;
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    // blockConcurrencyWhile：构造期把存储里的状态读进内存，期间不接请求
    ctx.blockConcurrencyWhile(async () => {
      // 单行 JSON 表：dashboard 的 Query 面板能 `SELECT * FROM state` 看到可读数据
      this.sql.exec(
        "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), rev INTEGER NOT NULL, trip TEXT NOT NULL)",
      );
      // Audit trail: one row per applied write. Separate table from `state`, so a
      // `reset` op wipes the trip but never the history. Append-only apart from
      // the retention prune in recordAudit, which caps the table at AUDIT_RETENTION
      // rows so storage stays bounded.
      this.sql.exec(
        "CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, rev INTEGER NOT NULL, op TEXT NOT NULL, target TEXT, actorId INTEGER, actorLogin TEXT NOT NULL, actorEmail TEXT, ip TEXT, detail TEXT NOT NULL)",
      );
      // Manual point-in-time snapshots. Unlike `audit`, backups are not pruned:
      // they are explicit restore points, so an admin should delete them only
      // deliberately.
      this.sql.exec(
        "CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, at TEXT NOT NULL, rev INTEGER NOT NULL, label TEXT, actorLogin TEXT NOT NULL, trip TEXT NOT NULL)",
      );
      this.sql.exec("CREATE INDEX IF NOT EXISTS backups_at_idx ON backups (at DESC)");
      const row = this.sql
        .exec<{ rev: number; trip: string }>("SELECT rev, trip FROM state WHERE id = 1")
        .toArray()[0];
      if (row) {
        this.rev = row.rev;
        this.trip = JSON.parse(row.trip) as Trip;
      } else {
        // 迁移：把旧的 KV-API 状态搬进 SQL 表；从没写过就用 tripData 种子
        this.trip = (await ctx.storage.get<Trip>("trip")) ?? structuredClone(tripData);
        this.rev = (await ctx.storage.get<number>("rev")) ?? 0;
        this.persist();
      }
      // Backfill state persisted before suggestions/expenses existed so reads never see undefined.
      const before = JSON.stringify(this.trip);
      this.trip.suggestions ??= [];
      this.trip.expenses ??= structuredClone(tripData.expenses);
      scrubPassUrls(this.trip);
      // Persist the backfill so the SQL row (and dashboard Query panel) reflects it.
      if (JSON.stringify(this.trip) !== before) this.persist();
    });
  }

  private persist(): void {
    this.sql.exec(
      "INSERT INTO state (id, rev, trip) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET rev = excluded.rev, trip = excluded.trip",
      this.rev,
      JSON.stringify(this.trip),
    );
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (req.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server); // 交给 hibernation 托管，空闲不计费
      server.send(JSON.stringify({ type: "snapshot", rev: this.rev, trip: this.trip }));
      return new Response(null, { status: 101, webSocket: client });
    }

    // Anchor backup routing to the exact canonical path. The worker's admin gate
    // matches only "/api/trip/backups"(/...), so loose matching here (endsWith /
    // unanchored regex) would let a non-canonical URL like /api/trip/x/backups
    // slip past auth and reach a backup action. Unmatched method/action returns
    // 405 rather than falling through to the trip-op mutator below.
    if (url.pathname === "/api/trip/backups") {
      if (req.method === "GET") return this.listBackups();
      if (req.method === "POST") return this.createBackup(req);
      return new Response("Method Not Allowed", { status: 405 });
    }

    const backupAction = url.pathname.match(/^\/api\/trip\/backups\/([^/]+)(?:\/(restore))?$/);
    if (backupAction) {
      let id: string;
      try {
        id = decodeURIComponent(backupAction[1]);
      } catch {
        return new Response("Bad Request", { status: 400 });
      }
      if (req.method === "DELETE" && !backupAction[2]) return this.deleteBackup(req, id);
      if (req.method === "POST" && backupAction[2] === "restore") {
        return this.restoreBackup(req, id);
      }
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (req.method === "POST") {
      const op = await req.json<TripOp>();
      const at = new Date().toISOString();
      this.trip = { ...applyOp(this.trip, op), updatedAt: at };
      this.rev += 1;
      this.persist();
      this.recordAudit(req, op, at);
      this.broadcast({ type: "update", rev: this.rev, trip: this.trip });
      return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
    }

    // Admin-only audit read (the worker gates auth before forwarding). Newest
    // first; capped for the view (the table is itself pruned to AUDIT_RETENTION).
    if (req.method === "GET" && url.pathname === "/api/trip/audit") {
      const entries = this.sql
        .exec<AuditRow>(
          "SELECT seq, at, rev, op, target, actorId, actorLogin, actorEmail, ip, detail FROM audit ORDER BY seq DESC LIMIT 500",
        )
        .toArray();
      return Response.json({ entries });
    }

    return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
  }

  private listBackups(): Response {
    // No LIMIT: every stored backup must stay listable, since deleteBackup can
    // only target an id the list surfaced (a cap would orphan older snapshots).
    const backups = this.sql
      .exec<TripBackup>("SELECT id, at, rev, label, actorLogin FROM backups ORDER BY at DESC")
      .toArray();
    return Response.json({ backups });
  }

  private async createBackup(req: Request): Promise<Response> {
    const body = await req
      .json<{ label?: unknown }>()
      .catch(() => ({}) as { label?: unknown });
    const label =
      typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 120) : null;
    const at = new Date().toISOString();
    const id = crypto.randomUUID();
    const actorLogin = req.headers.get("x-actor-login") || "admin";

    this.sql.exec(
      "INSERT INTO backups (id, at, rev, label, actorLogin, trip) VALUES (?, ?, ?, ?, ?, ?)",
      id,
      at,
      this.rev,
      label,
      actorLogin,
      JSON.stringify(this.trip),
    );
    this.recordAuditAction(req, "createBackup", id, { id, label, rev: this.rev }, at);

    return Response.json({
      backup: { id, at, rev: this.rev, label, actorLogin } satisfies TripBackup,
    });
  }

  private deleteBackup(req: Request, id: string): Response {
    const existing = this.sql
      .exec<TripBackup>(
        "SELECT id, at, rev, label, actorLogin FROM backups WHERE id = ?",
        id,
      )
      .toArray()[0];
    if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

    this.sql.exec("DELETE FROM backups WHERE id = ?", id);
    this.recordAuditAction(req, "deleteBackup", id, existing);
    return Response.json({ ok: true });
  }

  private restoreBackup(req: Request, id: string): Response {
    const row = this.sql
      .exec<BackupRow>(
        "SELECT id, at, rev, label, actorLogin, trip FROM backups WHERE id = ?",
        id,
      )
      .toArray()[0];
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });

    const at = new Date().toISOString();
    this.trip = { ...(JSON.parse(row.trip) as Trip), updatedAt: at };
    // Backups taken before the parking-pass proxy still embed the secret URL.
    scrubPassUrls(this.trip);
    this.rev += 1;
    this.persist();
    this.recordAuditAction(
      req,
      "restoreBackup",
      id,
      { id: row.id, backupRev: row.rev, backupAt: row.at, label: row.label },
      at,
    );
    this.broadcast({ type: "update", rev: this.rev, trip: this.trip });

    const { trip: _trip, ...backup } = row;
    return Response.json({ rev: this.rev, trip: this.trip, backup } satisfies Snapshot & {
      backup: TripBackup;
    });
  }

  // Stamp one immutable row from the actor headers the worker set on `req`.
  private recordAudit(req: Request, op: TripOp, at: string): void {
    this.recordAuditAction(req, op.type, opTarget(op), op, at);
  }

  private recordAuditAction(
    req: Request,
    op: string,
    target: string | null,
    detail: unknown,
    at = new Date().toISOString(),
  ): void {
    this.sql.exec(
      "INSERT INTO audit (at, rev, op, target, actorId, actorLogin, actorEmail, ip, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      at,
      this.rev,
      op,
      target,
      Number(req.headers.get("x-actor-id")) || null,
      req.headers.get("x-actor-login") || "public",
      req.headers.get("x-actor-email") || null,
      req.headers.get("x-actor-ip") || null,
      JSON.stringify(detail),
    );
    // Drop everything older than the most recent AUDIT_RETENTION rows so the
    // table stays bounded (seq is a monotonic AUTOINCREMENT id).
    this.sql.exec(
      "DELETE FROM audit WHERE seq <= (SELECT MAX(seq) FROM audit) - ?",
      AUDIT_RETENTION,
    );
  }

  private broadcast(message: unknown): void {
    const payload = JSON.stringify(message);
    const websockets = this.ctx.getWebSockets();
    for (const ws of websockets) {
      // A socket that closed without us hearing about it throws on send; don't
      // let one dead peer abort the broadcast to everyone else.
      try {
        ws.send(payload);
      } catch {
        // ignore
      }
    }
  }
}
