import { DurableObject } from "cloudflare:workers";
import type { Trip, TripMember } from "../src/trip/types";
import { applyOp, emptyTrip, type TripOp } from "../src/trip/ops";
import { rebaseFxRows } from "../src/trip/expenses";
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
  // Historically the GitHub numeric id; better-auth actor ids are strings.
  // SQLite's INTEGER affinity keeps both readable side by side.
  actorId: number | string | null;
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
// websocket snapshot) serve this.trip verbatim. Strip the deprecated field at
// every point state enters memory: init load and backup restore.
function scrubPassUrls(trip: Trip): void {
  for (const item of trip.items) {
    const parking = item.parking as ({ passUrl?: string } & typeof item.parking) | undefined;
    if (parking?.passUrl) delete parking.passUrl;
  }
}

// Minimal structural gate for whole-trip PUT bodies: enough to stop an agent
// from persisting a payload the UI can't render (wrong trip id, missing
// arrays), without re-validating every field the op path already trusts
// authenticated writers with.
function isTripShape(x: unknown, expectedId: string): x is Trip {
  if (typeof x !== "object" || x === null) return false;
  const t = x as Record<string, unknown>;
  return (
    t.id === expectedId &&
    typeof t.title === "string" &&
    typeof t.dates === "object" &&
    t.dates !== null &&
    typeof t.base === "object" &&
    t.base !== null &&
    Array.isArray(t.items) &&
    Array.isArray(t.checklists) &&
    Array.isArray(t.documents) &&
    Array.isArray(t.suggestions) &&
    Array.isArray(t.expenses) &&
    Array.isArray(t.flights) &&
    // Optional on `Trip`, and absent from bodies built against the pre-payments
    // schema. Rejecting those would break every existing whole-trip writer, so
    // the gate only insists it be an array when present; the handler backfills.
    (t.payments === undefined || Array.isArray(t.payments))
  );
}

// The id of the entity a write touched, for the audit `target` column. Bulk ops
// (`clearSuggestions`, `resetExpenses`, `reset`) affect everything, so null.
function opTarget(op: TripOp): string | null {
  switch (op.type) {
    case "setItemStatus":
    case "deleteItem":
      return op.itemId;
    case "updateItem":
    case "addItem":
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
    case "addPayment":
    case "updatePayment":
      return op.payment.id;
    case "deletePayment":
      return op.paymentId;
    case "addFlight":
    case "updateFlight":
      return op.flight.id;
    case "deleteFlight":
      return op.flightId;
    case "clearSuggestions":
    case "resetExpenses":
    case "reset":
      return null;
  }
}

export class TripDurableObject extends DurableObject<Env> {
  // null = this DO has never been initialized (a fresh name that /internal/init
  // hasn't reached yet, or one wiped by /internal/destroy).
  private trip: Trip | null = null;
  private rev = 0;
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    // blockConcurrencyWhile：构造期把存储里的状态读进内存，期间不接请求
    ctx.blockConcurrencyWhile(async () => {
      this.ensureTables();
      const row = this.sql
        .exec<{ rev: number; trip: string }>("SELECT rev, trip FROM state WHERE id = 1")
        .toArray()[0];
      if (row) {
        this.rev = row.rev;
        this.trip = JSON.parse(row.trip) as Trip;
      }
      if (!this.trip) return;
      // Backfill state persisted before newer content arrays existed so reads
      // never see undefined and old trips upgrade without a separate migration.
      const before = JSON.stringify(this.trip);
      this.trip.suggestions ??= [];
      this.trip.expenses ??= [];
      this.trip.flights ??= [];
      this.trip.payments ??= [];
      // Pre-multi-currency trips settled in the app's hardcoded USD.
      this.trip.base.currency ??= "USD";
      scrubPassUrls(this.trip);
      // Persist the backfill so the SQL row (and dashboard Query panel) reflects it.
      if (JSON.stringify(this.trip) !== before) this.persist();
    });
  }

  // Called from the constructor and again from init(): destroy() drops every
  // SQL table via storage.deleteAll, so a re-created trip on the same name must
  // rebuild them before its first persist.
  private ensureTables(): void {
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
  }

  private persist(): void {
    this.sql.exec(
      "INSERT INTO state (id, rev, trip) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET rev = excluded.rev, trip = excluded.trip",
      this.rev,
      JSON.stringify(this.trip),
    );
  }

  private static uninitialized(): Response {
    return Response.json({ error: "uninitialized" }, { status: 404 });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Worker-internal control endpoints. Unreachable from outside: the worker
    // only ever forwards (rewritten) /api/trip* paths; /internal/* requests are
    // constructed by the worker itself (trip create/patch/roster/delete).
    if (url.pathname.startsWith("/internal/")) {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      if (url.pathname === "/internal/init") return this.init(req);
      if (url.pathname === "/internal/members") return this.setMembers(req);
      if (url.pathname === "/internal/meta") return this.setMeta(req);
      if (url.pathname === "/internal/destroy") return this.destroy();
      return new Response("Not Found", { status: 404 });
    }

    if (!this.trip) return TripDurableObject.uninitialized();

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

    if (req.method === "PUT" && url.pathname === "/api/trip") {
      const body = (await req.json().catch(() => null)) as {
        rev?: unknown;
        trip?: unknown;
      } | null;
      if (!body || typeof body.rev !== "number" || !isTripShape(body.trip, this.trip.id)) {
        return Response.json({ error: "bad_request" }, { status: 400 });
      }
      // Optimistic lock: the caller edited the snapshot it fetched. A rev
      // mismatch means someone else wrote in between — hand back the current
      // state (the caller refetches, reapplies, retries) instead of clobbering.
      if (body.rev !== this.rev) {
        return Response.json(
          { error: "stale_rev", rev: this.rev, trip: this.trip },
          { status: 409 },
        );
      }
      const at = new Date().toISOString();
      // The roster is registry-owned (synced from D1), never writable through a
      // whole-trip PUT — re-impose the current one over whatever the body says.
      this.trip = {
        ...body.trip,
        payments: body.trip.payments ?? [],
        members: this.trip.members,
        updatedAt: at,
      };
      scrubPassUrls(this.trip);
      this.rev += 1;
      this.persist();
      // Audit records only the fact of the replacement; embedding the full
      // body would bloat the audit table past what AUDIT_RETENTION is sized for.
      this.recordAuditAction(req, "replaceTrip", null, { rev: this.rev }, at);
      this.broadcast({ type: "update", rev: this.rev, trip: this.trip });
      return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
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

  // Persist the empty skeleton for a freshly created trip. Idempotent: a retry
  // for the same trip id answers the current snapshot; a different id is a
  // hard conflict (two registry rows must never share a DO).
  private async init(req: Request): Promise<Response> {
    const body = (await req.json().catch(() => null)) as {
      tripId?: unknown;
      title?: unknown;
      dates?: { start?: unknown; end?: unknown };
      timezone?: unknown;
      currency?: unknown;
    } | null;
    if (!body || typeof body.tripId !== "string" || typeof body.title !== "string") {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }
    if (this.trip) {
      if (this.trip.id === body.tripId) {
        return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
      }
      return Response.json({ error: "already_initialized" }, { status: 409 });
    }
    this.ensureTables();
    this.trip = emptyTrip({
      id: body.tripId,
      title: body.title,
      dates: {
        start: typeof body.dates?.start === "string" ? body.dates.start : "",
        end: typeof body.dates?.end === "string" ? body.dates.end : "",
      },
      timezone: typeof body.timezone === "string" ? body.timezone : "UTC",
      currency: typeof body.currency === "string" ? body.currency : undefined,
    });
    this.rev = 0;
    this.persist();
    this.recordAuditAction(req, "init", null, { tripId: body.tripId, title: body.title });
    return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
  }

  // Replace the roster (synced from the D1 registry on every membership change).
  private async setMembers(req: Request): Promise<Response> {
    if (!this.trip) return TripDurableObject.uninitialized();
    const body = (await req.json().catch(() => null)) as { members?: TripMember[] } | null;
    if (!body || !Array.isArray(body.members)) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }
    const at = new Date().toISOString();
    this.trip = { ...this.trip, members: body.members, updatedAt: at };
    this.rev += 1;
    this.persist();
    this.recordAuditAction(req, "setMembers", null, { count: body.members.length }, at);
    this.broadcast({ type: "update", rev: this.rev, trip: this.trip });
    return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
  }

  // Mirror registry metadata edits (title/dates/timezone/currency) into the
  // document so the masthead everyone renders never drifts from what settings
  // shows. A currency change also restates the captured conversion rates via
  // the fxRebase cross rate the worker fetched (rebaseFxRows), so stored
  // amounts are never silently relabeled in a new unit. Expenses and settle-up
  // payments are rebased together: restating one without the other would leave
  // balances off by the whole rebase factor.
  private async setMeta(req: Request): Promise<Response> {
    if (!this.trip) return TripDurableObject.uninitialized();
    const body = (await req.json().catch(() => null)) as {
      title?: unknown;
      dates?: { start?: unknown; end?: unknown };
      timezone?: unknown;
      currency?: unknown;
      fxRebase?: unknown;
    } | null;
    if (!body) return Response.json({ error: "bad_request" }, { status: 400 });
    const at = new Date().toISOString();
    const prevCurrency = this.trip.base.currency ?? "USD";
    const nextCurrency =
      typeof body.currency === "string" && body.currency ? body.currency : prevCurrency;
    const rebase = Number(body.fxRebase);
    const rebasing = nextCurrency !== prevCurrency && Number.isFinite(rebase) && rebase > 0;
    const expenses = rebasing
      ? rebaseFxRows(this.trip.expenses ?? [], prevCurrency, nextCurrency, rebase)
      : this.trip.expenses;
    const payments = rebasing
      ? rebaseFxRows(this.trip.payments ?? [], prevCurrency, nextCurrency, rebase)
      : this.trip.payments;
    this.trip = {
      ...this.trip,
      title: typeof body.title === "string" && body.title ? body.title : this.trip.title,
      dates: {
        start: typeof body.dates?.start === "string" ? body.dates.start : this.trip.dates.start,
        end: typeof body.dates?.end === "string" ? body.dates.end : this.trip.dates.end,
      },
      base: {
        ...this.trip.base,
        timezone:
          typeof body.timezone === "string" && body.timezone
            ? body.timezone
            : this.trip.base.timezone,
        currency: nextCurrency,
      },
      expenses,
      payments,
      updatedAt: at,
    };
    this.rev += 1;
    this.persist();
    this.recordAuditAction(req, "setMeta", null, body, at);
    this.broadcast({ type: "update", rev: this.rev, trip: this.trip });
    return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
  }

  // Wipe everything (trip deleted from the registry). deleteAll on a
  // SQLite-backed DO drops the SQL tables too; live sockets are closed so
  // clients stop rendering a trip that no longer exists.
  private async destroy(): Promise<Response> {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1001, "trip_deleted");
      } catch {
        // Already closed; nothing to do.
      }
    }
    await this.ctx.storage.deleteAll();
    this.trip = null;
    this.rev = 0;
    return Response.json({ ok: true });
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
    const body = await req.json<{ label?: unknown }>().catch(() => ({}) as { label?: unknown });
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
      .exec<TripBackup>("SELECT id, at, rev, label, actorLogin FROM backups WHERE id = ?", id)
      .toArray()[0];
    if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

    this.sql.exec("DELETE FROM backups WHERE id = ?", id);
    this.recordAuditAction(req, "deleteBackup", id, existing);
    return Response.json({ ok: true });
  }

  private restoreBackup(req: Request, id: string): Response {
    const row = this.sql
      .exec<BackupRow>("SELECT id, at, rev, label, actorLogin, trip FROM backups WHERE id = ?", id)
      .toArray()[0];
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });

    const at = new Date().toISOString();
    // The roster is registry-owned: restoring must not revive the member list
    // frozen inside the snapshot (same rule as the whole-trip PUT above).
    this.trip = {
      ...(JSON.parse(row.trip) as Trip),
      members: this.trip?.members,
      updatedAt: at,
    };
    this.trip.flights ??= [];
    this.trip.payments ??= [];
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
      req.headers.get("x-actor-id") || null,
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
