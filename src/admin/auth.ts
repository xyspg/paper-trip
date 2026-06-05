// Client side of the single-admin GitHub OAuth gate. The session lives in an
// httpOnly cookie set by the Worker; JS only ever reads /api/auth/me.

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
