import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

// Client for the worker's better-auth instance (mounted at /api/auth). The
// additional-fields plugin mirrors worker/auth.ts's authModelOptions so
// `session.user.login` (the GitHub handle) is typed.
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        login: { type: "string", required: false },
      },
    }),
  ],
});
