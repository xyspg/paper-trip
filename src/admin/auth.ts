// Client side of the GitHub sign-in. The session lives in an httpOnly cookie
// managed by better-auth on the Worker; the client only ever reads it through
// authClient.useSession (a shared store — every subscriber updates together on
// sign-in/sign-out, which is what the old react-query key kept in sync).

import { authClient } from "../auth/client";

export type AdminUser = {
  login: string;
  name: string | null;
  email: string;
  avatarUrl?: string;
};

// Session probe shared by the admin console and the public pages (nav avatar,
// parking-pass gate). Same `{ data, isLoading }` contract the old probe had.
export function useAdminUser(): { data: AdminUser | null; isLoading: boolean } {
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  return {
    data: user
      ? {
          login: user.login || user.name,
          name: user.name ?? null,
          email: user.email,
          avatarUrl: user.image ?? undefined,
        }
      : null,
    isLoading: isPending,
  };
}

export async function adminLogout(): Promise<void> {
  await authClient.signOut();
}

// Full-page redirect into the GitHub OAuth flow; better-auth brings the user
// back to `callbackURL` when it completes.
export function signInWithGitHub(callbackURL: string): void {
  void authClient.signIn.social({ provider: "github", callbackURL });
}
