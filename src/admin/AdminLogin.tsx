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

const SCOPES = [
  "读取你的 GitHub 身份与头像",
  "校验你是该行程仓库的协作者",
  "读写行程 / 建议 / 账目内容",
];

// GitHub OAuth full-screen login. The button hands off to the Worker, which runs
// the OAuth round-trip and redirects back to /admin. Calm editorial design.
export function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const login = params.get("login");

  // A rejected account is a dead end on GitHub's side: GitHub auto-reuses the
  // already-authorized session, so clicking "登录" again just loops back here.
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
    <div className="min-h-screen grid place-items-center px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-3 mb-9">
          <div className="w-10 h-10 rounded-[11px] bg-[#1c1b19] text-[#fafaf8] grid place-items-center font-grotesk font-bold text-[16px]">
            AX
          </div>
          <div>
            <div className="font-grotesk text-[11px] tracking-[0.16em] uppercase text-[#3f6f5b]">
              Admin · 行程作战表后台
            </div>
            <div className="font-sans font-bold text-[15px] mt-0.5">Anime Expo 2026</div>
          </div>
        </div>

        <div className="bg-white border border-[#ebe9e3] rounded-[14px] p-7">
          <h1 className="font-sans font-bold text-[24px] tracking-tight">登录管理后台</h1>
          <p className="font-cjk text-[13.5px] text-[#76726a] leading-relaxed mt-3">
            管理行程停靠点、审批同行人建议、更新分账金额。仅该行程仓库的协作者可进入。
          </p>

          {errMsg && (
            <p className="mt-4 text-center font-cjk font-semibold text-[12.5px] text-[#c2553f]">
              {errMsg}
            </p>
          )}

          <button
            className={`w-full flex items-center justify-center gap-2 mt-6 py-3.5 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] font-sans font-semibold text-[13px] cursor-pointer transition-colors hover:bg-black [&_svg]:w-5 [&_svg]:h-5 [&_svg]:shrink-0${busy ? " opacity-70 pointer-events-none" : ""}`}
            onClick={signIn}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-[spin_0.7s_linear_infinite]" />
                <span>正在跳转 GitHub…</span>
              </>
            ) : (
              <>
                <Icons.github />
                <span>{forbidden ? "换管理员账号重试" : "用 GitHub 登录"}</span>
              </>
            )}
          </button>

          <div className="mt-6 rounded-[12px] border border-[#ebe9e3] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#fafaf8] border-b border-[#ebe9e3]">
              <span className="font-grotesk text-[10px] tracking-[0.14em] uppercase text-[#9b988f]">
                授权范围
              </span>
              <span className="ml-auto font-mono text-[11px] text-[#76726a]">
                aki-zero/anime-expo-2026
              </span>
            </div>
            {SCOPES.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2.5 px-3.5 py-2.5 font-cjk text-[12.5px] text-[#3b3833] border-b border-[#f0eee8] last:border-0 [&_svg]:w-3 [&_svg]:h-3"
              >
                <span className="w-[18px] h-[18px] rounded-md bg-[#eef4f0] text-[#3f6f5b] grid place-items-center shrink-0">
                  <Icons.check sw={3} />
                </span>
                {t}
              </div>
            ))}
          </div>

          {forbidden ? (
            <p className="text-center font-cjk text-[11.5px] text-[#9b988f] mt-5">
              登录了错误的账号？请先在 github.com 退出该账号，再回来重试。
            </p>
          ) : (
            <p className="text-center font-cjk text-[11.5px] text-[#9b988f] mt-5">
              仅 <b className="font-mono text-[#76726a]">repo collaborators</b> 可登录
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
