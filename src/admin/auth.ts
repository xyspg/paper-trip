// Client side of the single-admin GitHub OAuth gate. The session lives in an
// httpOnly cookie set by the Worker; JS only ever reads /api/auth/me.

import { useQuery, type QueryClient } from "@tanstack/react-query";

export type AdminUser = {
  login: string;
  name: string | null;
  email: string;
  avatarUrl: string;
};

export async function fetchAdminUser(): Promise<AdminUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AdminUser | null };
  return data.user;
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
}

// Full-page redirect into the server-driven OAuth flow.
export const ADMIN_LOGIN_URL = "/api/auth/github";
export const ADMIN_SESSION_KEY = ["admin", "me"] as const;

// Session probe shared by the admin console and the public pages (nav avatar,
// parking-pass gate). One query key keeps them in sync across login/logout.
export function useAdminUser() {
  return useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: fetchAdminUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// Run the OAuth flow in a separate tab (it ends on /admin), then re-probe the
// session when the user returns so this tab picks up the login without a
// reload. staleTime would otherwise keep the stale null for minutes.
export function openAdminLogin(queryClient: QueryClient): void {
  window.open(ADMIN_LOGIN_URL, "_blank");
  window.addEventListener(
    "focus",
    () => void queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_KEY }),
    { once: true },
  );
}
