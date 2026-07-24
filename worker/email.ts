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
// stylesheets) and tables for every layout decision — Gmail drops `display:flex`
// and `gap`, which collapses a flex lockup into overlapping spans. The palette
// mirrors src/index.css tokens.
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
  // The app's own icon, served straight out of public/. Absolute URLs only —
  // mail clients have no origin to resolve against.
  const logoUrl = (() => {
    try {
      return `${new URL(acceptUrl).origin}/apple-touch-icon.png`;
    } catch {
      return "https://papertrip.xyspg.moe/apple-touch-icon.png";
    }
  })();
  const font = "-apple-system,'Segoe UI',Roboto,'Noto Sans SC',sans-serif";
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body style="margin:0;padding:0;background:#fafaf8;color:#1c1b19;font-family:${font};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(inviterName)} 邀请你一起规划「${esc(tripTitle)}」。</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#fafaf8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:480px;">
            <tr>
              <td style="padding-bottom:24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="36" style="width:36px;">
                      <img src="${logoUrl}" width="36" height="36" alt="PaperTrip" style="display:block;width:36px;height:36px;border:0;border-radius:9px;outline:none;text-decoration:none;" />
                    </td>
                    <td style="padding-left:10px;font-family:${font};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#3f6f5b;font-weight:600;">
                      Trip Invite
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #ebe9e3;border-radius:14px;padding:28px;">
                <h1 style="margin:0;font-family:${font};font-size:22px;letter-spacing:-0.01em;color:#1c1b19;">邀请你加入行程</h1>
                <p style="margin:14px 0 0;font-family:${font};font-size:14px;line-height:1.8;color:#76726a;">
                  <b style="color:#1c1b19;">${esc(inviterName)}</b> 邀请你一起规划
                  <b style="color:#1c1b19;">「${esc(tripTitle)}」</b>：
                  共享时间线、预订信息和分账账目，实时同步。
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:22px;">
                  <tr>
                    <td align="center" style="background:#1c1b19;border-radius:10px;">
                      <a href="${esc(acceptUrl)}" style="display:block;padding:13px 16px;font-family:${font};font-size:14px;font-weight:600;color:#fafaf8;text-decoration:none;">用 GitHub 登录并加入</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-family:${font};font-size:12px;line-height:1.7;color:#9b988f;">
                  链接 7 天内有效，任何用它登录的 GitHub 账号都会加入行程；如果这不是发给你的，请忽略这封邮件。
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:16px;font-family:${font};font-size:11px;line-height:1.6;color:#9b988f;word-break:break-all;">
                <a href="${esc(acceptUrl)}" style="color:#9b988f;text-decoration:none;">${esc(acceptUrl)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
