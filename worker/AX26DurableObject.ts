import { DurableObject } from "cloudflare:workers";
import { tripData } from "../src/trip/tripData";
import type { Trip } from "../src/trip/types";
import { applyOp, type TripOp } from "../src/trip/ops";
import type { Env } from "./env";

type Snapshot = { rev: number; trip: Trip };

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
      // Append-only audit trail: one row per applied write. Separate table from
      // `state`, so a `reset` op wipes the trip but never the history. Insert-only
      // — nothing in this class updates or deletes rows.
      this.sql.exec(
        "CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, rev INTEGER NOT NULL, op TEXT NOT NULL, target TEXT, actorId INTEGER, actorLogin TEXT NOT NULL, actorEmail TEXT, ip TEXT, detail TEXT NOT NULL)",
      );
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
    if (req.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server); // 交给 hibernation 托管，空闲不计费
      server.send(JSON.stringify({ type: "snapshot", rev: this.rev, trip: this.trip }));
      return new Response(null, { status: 101, webSocket: client });
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
    // first; capped for the view — the table itself keeps every row.
    if (req.method === "GET" && new URL(req.url).pathname.endsWith("/audit")) {
      const entries = this.sql
        .exec<AuditRow>(
          "SELECT seq, at, rev, op, target, actorId, actorLogin, actorEmail, ip, detail FROM audit ORDER BY seq DESC LIMIT 500",
        )
        .toArray();
      return Response.json({ entries });
    }

    return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
  }

  // Stamp one immutable row from the actor headers the worker set on `req`.
  private recordAudit(req: Request, op: TripOp, at: string): void {
    this.sql.exec(
      "INSERT INTO audit (at, rev, op, target, actorId, actorLogin, actorEmail, ip, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      at,
      this.rev,
      op.type,
      opTarget(op),
      Number(req.headers.get("x-actor-id")) || null,
      req.headers.get("x-actor-login") || "public",
      req.headers.get("x-actor-email") || null,
      req.headers.get("x-actor-ip") || null,
      JSON.stringify(op),
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
