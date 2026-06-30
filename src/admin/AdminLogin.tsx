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
  // Offer a way out by sending the user to GitHub's sign-out first.
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
    <div className="login">
      <div className="login-card">
        <div className="login-top">
          <span className="login-kicker">
            <span className="dot" />
            Admin
          </span>
          <h1 className="login-title">
            Anime Expo <span className="yr">2026</span>
          </h1>
        </div>

        <div className="login-body">
          {errMsg && <p className="login-err">{errMsg}</p>}

          <button className={`gh-btn${busy ? " busy" : ""}`} onClick={signIn} disabled={busy}>
            {busy ? (
              <>
                <span className="spin" />
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
            <a className="login-switch" href="https://github.com/logout" target="_blank" rel="noreferrer">
              登录了错误的账号？先退出 GitHub →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
