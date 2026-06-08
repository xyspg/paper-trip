import { DurableObject } from "cloudflare:workers";
import { tripData } from "../src/trip/tripData";
import type { Trip } from "../src/trip/types";
import { applyOp, type TripOp } from "../src/trip/ops";
import type { Env } from "./env";

type Snapshot = { rev: number; trip: Trip };

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
      this.trip.suggestions ??= [];
      this.trip.expenses ??= structuredClone(tripData.expenses);
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
      this.trip = { ...applyOp(this.trip, op), updatedAt: new Date().toISOString() };
      this.rev += 1;
      this.persist();
      this.broadcast({ type: "update", rev: this.rev, trip: this.trip });
      return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
    }

    return Response.json({ rev: this.rev, trip: this.trip } satisfies Snapshot);
  }

  private broadcast(message: unknown): void {
    const websockets = this.ctx.getWebSockets();
    for (const ws of websockets) {
      ws.send(JSON.stringify(message));
    }
  }
}
