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
  const error = new URLSearchParams(window.location.search).get("error");

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
          {error && <p className="login-err">{ERRORS[error] ?? "登录失败，请重试。"}</p>}

          <button className={`gh-btn${busy ? " busy" : ""}`} onClick={signIn} disabled={busy}>
            {busy ? (
              <>
                <span className="spin" />
                <span>正在跳转 GitHub…</span>
              </>
            ) : (
              <>
                <Icons.github />
                <span>用 GitHub 登录</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
