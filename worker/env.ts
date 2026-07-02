import type { AX26DurableObject } from "./AX26DurableObject";

export interface Env {
  AX26: DurableObjectNamespace<AX26DurableObject>;
  // GitHub OAuth app creds for the /admin console, injected from .env via wrangler.
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  // Google Gemini key for the admin receipt scanner, from .env.local via wrangler.
  GEMINI_API_KEY?: string;
  // JSON map of reservationId → full provider pass URL. Pass links are
  // capability URLs (whoever holds one can edit/cancel the reservation), so
  // they live only in this secret and are served via /api/parking-pass/:rid
  // behind the admin session — never in trip data or the client bundle.
  PARKING_PASS_URLS?: string;
}
