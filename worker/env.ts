import type { TripDurableObject } from "./TripDurableObject";

export interface Env {
  TRIPS: DurableObjectNamespace<TripDurableObject>;
  // D1: better-auth tables (user/session/account/verification) plus the
  // multi-tenant registry (trips/members/invites — see worker/registry.ts).
  DB: D1Database;
  // better-auth cookie/state signing secret and canonical origin.
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  // Public origin for links we build ourselves (invite emails).
  APP_ORIGIN?: string;
  // Resend: invite mail. EMAIL_FROM must be on a domain verified with Resend.
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  // GitHub OAuth app whose callback is /api/auth/callback/github (better-auth).
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  // HMAC key for agent bearer tokens — deliberately separate from
  // BETTER_AUTH_SECRET so neither credential kind can pass the other's verifier.
  AGENT_TOKEN_SECRET?: string;
  // Google Gemini key for the admin receipt scanner, from .env.local via wrangler.
  GEMINI_API_KEY?: string;
  // Gemini model id for the receipt scanner; a public var set in wrangler.jsonc.
  GEMINI_MODEL?: string;
  // JSON map of reservationId → full provider pass URL. Pass links are
  // capability URLs (whoever holds one can edit/cancel the reservation), so
  // they live only in this secret and are served via /api/parking-pass/:rid
  // behind trip membership — never in trip data or the client bundle.
  PARKING_PASS_URLS?: string;
}
