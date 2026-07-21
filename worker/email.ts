import type { Env } from "./env";

// Invite mail via Resend's REST API — one endpoint, plain fetch, no SDK.
// Failures are reported, not thrown: an invite still works via its copyable
// link even when mail can't go out (missing key, bounced domain, …).

type SendResult = { sent: boolean; error?: string };

export async function sendInviteEmail(
  env: Env,
  input: {
    to: string;
    tripTitle: string;
    inviterName: string;
    acceptUrl: string;
  },
): Promise<SendResult> {
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!key || !from) return { sent: false, error: "email_not_configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `${input.inviterName} 邀请你加入行程「${input.tripTitle}」`,
      html: inviteHtml(input),
      text: `${input.inviterName} 邀请你一起规划「${input.tripTitle}」。打开链接并用 GitHub 登录即可加入：${input.acceptUrl}（7 天内有效）`,
    }),
  }).catch(() => null);

  if (!res) return { sent: false, error: "network" };
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { sent: false, error: `resend_${res.status}: ${detail.slice(0, 200)}` };
  }
  return { sent: true };
}

// Paper-editorial single-column email. Inline styles only (email clients strip
// stylesheets); the palette mirrors src/index.css tokens.
function inviteHtml({
  tripTitle,
  inviterName,
  acceptUrl,
}: {
  tripTitle: string;
  inviterName: string;
  acceptUrl: string;
}): string {
  // Quote-escaping included: acceptUrl lands inside an href attribute, and its
  // origin can derive from forwarded headers when APP_ORIGIN is unset.
  const esc = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#fafaf8;font-family:-apple-system,'Segoe UI',Roboto,'Noto Sans SC',sans-serif;color:#1c1b19;">
    <div style="max-width:480px;margin:0 auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <span style="display:inline-block;width:36px;height:36px;border-radius:9px;background:#1c1b19;color:#fafaf8;font-weight:700;font-size:13px;text-align:center;line-height:36px;">PT</span>
        <span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#3f6f5b;font-weight:600;">行程作战表 · Trip Invite</span>
      </div>
      <div style="background:#ffffff;border:1px solid #ebe9e3;border-radius:14px;padding:28px;">
        <h1 style="margin:0;font-size:22px;letter-spacing:-0.01em;">邀请你加入行程</h1>
        <p style="margin:14px 0 0;font-size:14px;line-height:1.8;color:#76726a;">
          <b style="color:#1c1b19;">${esc(inviterName)}</b> 邀请你一起规划
          <b style="color:#1c1b19;">「${esc(tripTitle)}」</b>：
          共享时间线、预订信息和分账账目，实时同步。
        </p>
        <a href="${esc(acceptUrl)}"
           style="display:block;margin:22px 0 0;padding:13px 0;border-radius:10px;background:#1c1b19;color:#fafaf8;text-align:center;text-decoration:none;font-weight:600;font-size:14px;">
          用 GitHub 登录并加入
        </a>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#9b988f;">
          链接 7 天内有效，任何用它登录的 GitHub 账号都会加入行程；如果这不是发给你的，请忽略这封邮件。
        </p>
      </div>
      <p style="margin:16px 0 0;font-size:11px;color:#9b988f;text-align:center;">
        ${esc(acceptUrl)}
      </p>
    </div>
  </body>
</html>`;
}
