import { useState } from "react";
import { Icons } from "./AdminIcons";

// GitHub OAuth full-screen login (UI only — fakes the OAuth round-trip).
export function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [busy, setBusy] = useState(false);

  const signIn = () => {
    setBusy(true);
    setTimeout(() => onAuth(), 1100);
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-top">
          <span className="login-kicker">
            <span className="dot" />
            Admin · 行程作战表后台
          </span>
          <h1 className="login-title">
            Anime Expo <span className="yr">2026</span>
          </h1>
          <p className="login-sub">
            管理行程停靠点、审批同行人建议、更新分账金额。仅管理员可进入。
          </p>
        </div>

        <div className="login-body">
          <button className={`gh-btn${busy ? " busy" : ""}`} onClick={signIn}>
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

          <p className="login-foot">
            仅 <b>repo collaborators</b> 可登录管理后台 · 纯前端演示
          </p>
        </div>
      </div>
    </div>
  );
}
