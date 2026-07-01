import { useState } from "react";
import { Icons } from "./AdminIcons";
import { ADMIN_LOGIN_URL } from "./auth";

const ERRORS: Record<string, string> = {
  forbidden: "该 GitHub 账号无权进入后台。",
  oauth: "登录校验失败，请重试。",
  token: "GitHub 授权失败，请重试。",
  user: "无法读取 GitHub 身份，请重试。",
  config: "OAuth 未正确配置。",
};

// GitHub OAuth full-screen login. The button hands off to the Worker, which runs
// the OAuth round-trip and redirects back to /admin.
export function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const login = params.get("login");

  // A rejected account is a dead end on GitHub's side: GitHub auto-reuses the
  // already-authorized session, so clicking "登录" again just loops back here.
  // We tell the user to sign out of GitHub themselves (a link to github.com/logout
  // does nothing over a plain GET; it needs a POST with a CSRF token).
  const forbidden = error === "forbidden";
  const errMsg =
    forbidden && login
      ? `GitHub 账号 @${login} 无权进入后台。`
      : error
        ? (ERRORS[error] ?? "登录失败，请重试。")
        : null;

  const signIn = () => {
    setBusy(true);
    window.location.href = ADMIN_LOGIN_URL;
  };

  return (
    <div className="min-h-screen grid place-items-center p-[clamp(16px,4vw,48px)]">
      <div className="relative w-[min(440px,100%)] bg-paper-2 border-[3px] border-ink rounded-card shadow-hard overflow-hidden">
        <div className="relative bg-ink text-paper px-[26px] pt-[26px] pb-[22px] overflow-hidden isolate before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_26px,rgba(255,45,107,0.12)_26px_28px),radial-gradient(circle_at_90%_12%,rgba(0,191,212,0.22),transparent_44%),radial-gradient(circle_at_6%_96%,rgba(255,196,0,0.16),transparent_42%)]">
          <span className="inline-flex items-center gap-[9px] font-grotesk font-extrabold text-[11px] tracking-[0.24em] uppercase text-ink bg-yellow border-2 border-paper py-[5px] px-[11px] rounded-full whitespace-nowrap">
            <span className="w-[6px] h-[6px] rounded-full bg-magenta" />
            Admin
          </span>
          <h1 className="font-display font-black text-[clamp(28px,7vw,40px)] leading-[0.94] uppercase mt-4">
            Anime Expo <span className="text-magenta [-webkit-text-stroke:2px_var(--color-paper)] [paint-order:stroke_fill]">2026</span>
          </h1>
        </div>

        <div className="pt-6 px-[26px] pb-[26px] flex flex-col gap-[14px]">
          {errMsg && <p className="my-0 mx-0.5 text-center font-cjk font-semibold text-[12.5px] text-magenta">{errMsg}</p>}

          <button className={`w-full flex items-center justify-center gap-3 bg-ink text-paper border-[3px] border-ink rounded-[12px] shadow-hard-sm py-[15px] px-[18px] cursor-pointer font-grotesk font-extrabold text-[15px] tracking-[0.02em] whitespace-nowrap transition-[transform,box-shadow] duration-[0.08s] ease-[ease] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_var(--color-ink)] active:translate-x-1 active:translate-y-1 active:shadow-none [&_svg]:w-[22px] [&_svg]:h-[22px] [&_svg]:shrink-0${busy ? " opacity-70 pointer-events-none" : ""}`} onClick={signIn} disabled={busy}>
            {busy ? (
              <>
                <span className="w-[18px] h-[18px] rounded-full border-[3px] border-paper/30 border-t-yellow animate-[spin_0.7s_linear_infinite]" />
                <span>正在跳转 GitHub…</span>
              </>
            ) : (
              <>
                <Icons.github />
                <span>{forbidden ? "换管理员账号重试" : "用 GitHub 登录"}</span>
              </>
            )}
          </button>

          {forbidden && (
            <p className="my-0 mx-0.5 text-center font-cjk font-semibold text-[12px] text-[rgba(20,18,16,0.5)] no-underline hover:text-magenta">
              登录了错误的账号？请先在 github.com 退出该账号，再回来重试。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
