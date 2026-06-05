import { DurableObject } from "cloudflare:workers";
import { tripData } from "../src/trip/tripData";
import type { Trip } from "../src/trip/types";
import { applyOp, type TripOp } from "../src/trip/ops";
import type { Env } from "./env";

type Snapshot = { rev: number; trip: Trip };

export class AX26DurableObject extends DurableObject<Env> {
  private trip!: Trip;
  private rev = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // blockConcurrencyWhile：构造期把存储里的状态读进内存，期间不接请求
    // 第一次启动存储为空，就用 tripData 作为种子
    ctx.blockConcurrencyWhile(async () => {
      this.trip = (await ctx.storage.get<Trip>("trip")) ?? structuredClone(tripData);
      this.rev = (await ctx.storage.get<number>("rev")) ?? 0;
    });
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
      await this.ctx.storage.put({ trip: this.trip, rev: this.rev });
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
