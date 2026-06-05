import type { AX26DurableObject } from "./AX26DurableObject";

export interface Env {
  AX26: DurableObjectNamespace<AX26DurableObject>;
  // GitHub OAuth app creds for the /admin console, injected from .env via wrangler.
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
}
