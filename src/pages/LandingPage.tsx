import type { ReactNode } from "react";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Archive,
  ArrowRight,
  Bot,
  DollarSign,
  Globe,
  Route,
  Ticket,
  UserPlus,
  Zap,
} from "lucide-react";
import { signInWithGitHub } from "../admin/auth";
import { currentLocale } from "../locale";
import "./landing.css";

// Brand name lives here and in index.html only.
const BRAND = "Papertrip";

// lucide dropped brand icons; the GitHub mark rides along as a tiny inline SVG.
function GitHubMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

// Marketing landing rendered at `/` for signed-out visitors. It reuses the
// paper design system verbatim so the hero mockup and the real product are
// literally the same UI. All hero motion is CSS-only (see landing.css).
export function LandingPage() {
  return (
    <div className="lp-root min-h-svh bg-paper text-ink font-sans">
      <Nav />
      <Hero />
      <AgentDemo />
      <Features />
      <DevBand />
      <ClosingCta />
      <Footer />
    </div>
  );
}

const container = "w-[min(1040px,100%)] mx-auto px-[clamp(16px,4vw,40px)]";

const githubBtn = (label: string) => (
  <button
    type="button"
    className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] font-sans font-semibold text-[13.5px] cursor-pointer hover:bg-black"
    onClick={() => signInWithGitHub("/")}
  >
    <GitHubMark size={16} />
    {label}
  </button>
);

function Nav() {
  return (
    <div className={`${container} flex items-center gap-6 py-5`}>
      <span className="inline-flex items-center gap-[9px] font-grotesk font-bold text-[15px] tracking-tight">
        <span className="w-[9px] h-[9px] rounded-full bg-[#3f6f5b]" />
        {BRAND}
      </span>
      <nav className="hidden sm:flex items-center gap-1 font-grotesk text-[12px] font-semibold text-[#76726a]">
        <a
          href="#features"
          className="py-1.5 px-3 rounded-full no-underline text-inherit hover:text-[#1c1b19]"
        >
          <Trans>功能</Trans>
        </a>
        <a
          href="#agent"
          className="py-1.5 px-3 rounded-full no-underline text-inherit hover:text-[#1c1b19]"
        >
          <Trans>Agent 接入</Trans>
        </a>
      </nav>
      <button
        type="button"
        className="ml-auto inline-flex items-center gap-2 py-2 px-4 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] font-sans font-semibold text-[12.5px] cursor-pointer hover:bg-black"
        onClick={() => signInWithGitHub("/")}
      >
        <GitHubMark size={14} />
        <Trans>登录</Trans>
      </button>
    </div>
  );
}

function Hero() {
  const { t } = useLingui();
  return (
    <header className="relative overflow-x-clip">
      <div className="lp-hero-dots" />
      <div className={`${container} relative pt-[clamp(28px,6vw,64px)] text-center`}>
        <span className="inline-flex gap-[9px] items-center font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3f6f5b]">
          <span className="w-[7px] h-[7px] rounded-full bg-[#3f6f5b]" />
          Agentic Trip Workbench
        </span>
        <h1 className="mt-4 mx-auto max-w-[16ch] font-sans font-extrabold tracking-[-0.03em] leading-[1.08] text-[clamp(34px,6.5vw,62px)]">
          <Trans>
            你负责旅行，
            <br />
            <span className="text-[#3f6f5b]">Agent</span> 负责行程
          </Trans>
        </h1>
        <p className="mt-5 mx-auto max-w-[42ch] font-cjk text-[15px] leading-[1.9] text-[#76726a]">
          <Trans>
            时间线、预订、分账，一份行程实时同步。朋友从浏览器进来，Agent 拿着令牌从 API
            进来——写的是同一张纸。
          </Trans>
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {githubBtn(t`用 GitHub 登录，免费开始`)}
          <a
            href="#features"
            className="inline-flex items-center gap-1.5 py-3 px-5 rounded-[10px] border border-[#ebe9e3] bg-white no-underline text-[#3b3833] font-sans font-semibold text-[13.5px] hover:border-[#1c1b19]"
          >
            <Trans>了解功能</Trans>
            <ArrowRight size={15} strokeWidth={2.2} />
          </a>
        </div>

        <DeviceScene />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------------ */
/* Hero device scene: laptop running the real workbench UI, phone syncing    */
/* beside it, and two multiplayer cursors (you + Agent) editing the sheet.   */
/* ------------------------------------------------------------------------ */

function CursorMark({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-start">
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M4 2 L19 12.5 L11.8 13.8 L8.2 20.5 Z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="mt-3 -ml-0.5 py-[3px] px-2 rounded-full font-grotesk text-[10px] font-bold text-white whitespace-nowrap"
        style={{ background: color }}
      >
        {label}
      </span>
    </span>
  );
}

function Bubble({
  className,
  typeClass,
  chars,
}: {
  className: string;
  typeClass: string;
  chars: string;
}) {
  // The typewriter widths in landing.css count 1em per CJK glyph; Latin text
  // is narrower and would clip or gap, so other locales show the line whole.
  const typeClasses = currentLocale() === "zh" ? `lp-type ${typeClass}` : undefined;
  return (
    <div className={`lp-bubble ${className} max-w-none`}>
      <div className="py-2 px-3 bg-white border border-[#ebe9e3] rounded-[10px] rounded-bl-[3px] shadow-[0_10px_24px_-14px_rgba(28,27,25,0.4)]">
        <span className="block font-grotesk text-[9px] font-bold uppercase tracking-[0.12em] text-[#7a5c84]">
          <Trans>对 Agent 说</Trans>
        </span>
        <span className="block mt-0.5 font-cjk text-[12.5px] font-medium text-[#1c1b19]">
          <Trans>
            「<span className={typeClasses}>{chars}</span>」
          </Trans>
        </span>
      </div>
    </div>
  );
}

function MiniChip({
  text,
  color,
  bg,
  border,
}: {
  text: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span
      className="inline-flex py-[2px] px-1.5 rounded-full font-grotesk text-[8px] font-bold uppercase tracking-[0.06em]"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {text}
    </span>
  );
}

function MiniTicket({
  chip,
  time,
  title,
  sub,
  className,
  children,
}: {
  chip: ReactNode;
  time: string;
  title: string;
  sub?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative p-2 bg-white border border-[#ebe9e3] rounded-[8px] text-left ${className ?? ""}`}
    >
      <div className="flex items-center gap-1">
        {chip}
        <span className="ml-auto font-mono text-[8px] text-[#9b988f]">{time}</span>
      </div>
      <div className="mt-1 font-sans font-bold text-[10px] leading-tight text-[#1c1b19]">
        {title}
      </div>
      {sub && <div className="mt-0.5 font-cjk text-[8.5px] text-[#76726a]">{sub}</div>}
      {children}
    </div>
  );
}

function DeviceScene() {
  const { t } = useLingui();
  return (
    <div className="lp-scene relative mx-auto mt-[clamp(32px,5vw,56px)] mb-10 w-[min(880px,100%)] text-left">
      {/* Boarding-pass prop, peeking out from under the laptop's left edge */}
      <div className="lp-pass absolute left-[-6%] -bottom-5 z-0 hidden md:block w-[150px] p-2.5 rounded-[8px]">
        <div className="font-grotesk text-[8px] font-bold uppercase tracking-[0.14em] text-[#9b988f]">
          Boarding Pass
        </div>
        <div className="mt-1 font-mono text-[10px] font-bold text-[#1c1b19]">
          AC 103 · YYZ → YVR
        </div>
        <div className="font-mono text-[8.5px] text-[#76726a]">8/12 08:30 · SEAT 18A</div>
        <div className="lp-pass-barcode mt-1.5 h-[14px] rounded-[2px]" />
      </div>

      {/* Laptop, sitting slightly left so the phone can lean on its right edge */}
      <div className="relative z-10 w-[min(660px,88%)] ml-[4%] max-md:w-full max-md:ml-0">
        <div className="lp-laptop overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 py-2 px-3 border-b border-[#ebe9e3] bg-[#fdfdfb]">
            <span className="w-2 h-2 rounded-full bg-[#e4e1d9]" />
            <span className="w-2 h-2 rounded-full bg-[#e4e1d9]" />
            <span className="w-2 h-2 rounded-full bg-[#e4e1d9]" />
            <span className="ml-2 py-[3px] px-2.5 rounded-full bg-white border border-[#ebe9e3] font-mono text-[8.5px] text-[#9b988f]">
              /t/north-america-west-coast
            </span>
            <span className="ml-auto inline-flex items-center gap-1 font-grotesk text-[8px] font-bold uppercase tracking-[0.1em] text-[#3f6f5b]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#3f6f5b]" />
              Live
            </span>
          </div>

          {/* Mini workbench */}
          <div className="p-3.5">
            <div className="flex items-baseline gap-2">
              <span className="font-sans font-extrabold tracking-[-0.02em] text-[15px]">
                <Trans>
                  北美西海岸<span className="text-[#3f6f5b]">之旅</span>
                </Trans>
              </span>
              <span className="font-grotesk text-[8px] font-semibold uppercase tracking-[0.14em] text-[#9b988f]">
                8/12 – 8/20 · Vancouver → Portland
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2.5 max-[560px]:grid-cols-2">
              <MiniTicket
                chip={<MiniChip text={t`交通`} color="#5b7a99" bg="#eef2f6" border="#cdd8e2" />}
                time="08:30"
                title="AC 103 · YYZ → YVR"
                sub={t`T1 值机 · 18A/18B`}
              >
                {/* Status chip the human cursor flips: 计划中 → 已锁定 */}
                <span className="relative inline-block mt-1 h-[14px] w-[44px]">
                  <span className="lp-chip-a absolute inset-0">
                    <MiniChip text={t`计划中`} color="#5b7a99" bg="#eef2f6" border="#cdd8e2" />
                  </span>
                  <span className="lp-chip-b absolute inset-0">
                    <MiniChip text={t`已锁定`} color="#3f6f5b" bg="#eef4f0" border="#cfe0d6" />
                  </span>
                </span>
              </MiniTicket>

              <MiniTicket
                chip={<MiniChip text={t`酒店`} color="#7a5c84" bg="#f5eef6" border="#ddccdf" />}
                time="15:00"
                title="Waterfront Hotel"
                sub={t`入住 · 确认码 7N4PQ`}
              />

              {/* Ledger card, spans both rows */}
              <div className="row-span-2 p-2 bg-white border border-[#ebe9e3] rounded-[8px] max-[560px]:col-span-2 max-[560px]:row-span-1">
                <div className="font-grotesk text-[8px] font-bold uppercase tracking-[0.14em] text-[#9b988f]">
                  <Trans>账本 · Ledger</Trans>
                </div>
                <div className="mt-1.5 space-y-1 font-cjk text-[9px] text-[#3b3833]">
                  <div className="flex justify-between gap-2">
                    <span>
                      <Trans>晚餐 · Gastown</Trans>
                    </span>
                    <span className="font-mono">$92.00</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>
                      <Trans>租车 · 三日</Trans>
                    </span>
                    <span className="font-mono">$148.00</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>
                      <Trans>门票 · 吊桥公园</Trans>
                    </span>
                    <span className="font-mono">$126.00</span>
                  </div>
                </div>
                <div className="flex justify-between gap-2 mt-1.5 pt-1.5 border-t border-[#ebe9e3] font-sans font-bold text-[9.5px]">
                  <span>
                    <Trans>合计</Trans>
                  </span>
                  <span className="font-mono">$366.00</span>
                </div>
                <div className="lp-ledger-chip mt-1.5 py-1 px-1.5 rounded-[6px] bg-[#eef4f0] border border-[#cfe0d6] font-cjk text-[8.5px] font-medium text-[#3f6f5b]">
                  <Trans>结算：同行者 → 你 $183.00</Trans>
                </div>
              </div>

              <MiniTicket
                chip={<MiniChip text={t`活动`} color="#c2553f" bg="#f8efec" border="#ecccc2" />}
                time="09:00"
                title={t`Stanley Park · 骑行`}
                sub={t`Seawall · 租车点集合`}
              />

              {/* The booking the agent types in */}
              <MiniTicket
                className="lp-card-agent"
                chip={<MiniChip text={t`预订`} color="#3f6f5b" bg="#eef4f0" border="#cfe0d6" />}
                time="14:20"
                title="Amtrak 517 · SEA → PDX"
                sub={t`南下 · 确认码 R4K8M`}
              >
                <span className="inline-flex items-center gap-1 mt-1 font-grotesk text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#7a5c84]">
                  <Bot size={9} strokeWidth={2.4} />
                  <Trans>由 Agent 添加</Trans>
                </span>
              </MiniTicket>
            </div>

            <div className="flex items-center gap-1.5 mt-2.5 font-grotesk text-[8px] font-semibold uppercase tracking-[0.1em] text-[#9b988f]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#3f6f5b]" />
              <Trans>实时同步 · 2 人在线 · rev 129</Trans>
            </div>
          </div>
        </div>
        <div className="lp-laptop-base" />
      </div>

      {/* Phone, overlapping the laptop's right edge */}
      <div className="lp-phone absolute right-8 -bottom-4 z-20 hidden sm:block w-[168px] p-2.5 max-md:right-0">
        <div className="flex items-center justify-between">
          <span className="font-sans font-extrabold text-[10.5px] tracking-tight">
            <Trans>
              西海岸<span className="text-[#3f6f5b]">之旅</span>
            </Trans>
          </span>
          <span className="font-grotesk text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#9b988f]">
            <Trans>时间线</Trans>
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            ["09:00", t`Stanley Park 骑行`, "#c2553f"],
            ["12:30", t`Granville Island 午餐`, "#b08648"],
            ["14:20", t`Amtrak 517 南下`, "#3f6f5b"],
          ].map(([time, label, color]) => (
            <div
              key={label}
              className="flex items-center gap-1.5 py-1.5 px-2 bg-[#fdfdfb] border border-[#ebe9e3] rounded-[7px]"
            >
              <span
                className="w-[4px] h-[4px] rounded-full shrink-0"
                style={{ background: color }}
              />
              <span className="font-mono text-[8px] text-[#9b988f]">{time}</span>
              <span className="font-cjk text-[8.5px] font-medium text-[#1c1b19] truncate">
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="lp-toast mt-2 py-1.5 px-2 rounded-[7px] bg-[#1c1b19] font-cjk text-[8.5px] font-medium text-[#fafaf8]">
          <Trans>● 已同步 · rev 129</Trans>
        </div>
      </div>

      {/* Multiplayer cursors + agent speech */}
      <div className="lp-cursor lp-cursor-agent">
        <CursorMark label="Agent" color="#7a5c84" />
      </div>
      <div className="lp-cursor lp-cursor-user">
        <CursorMark label={t`你`} color="#3f6f5b" />
      </div>
      <Bubble
        className="lp-bubble-1 left-[38%] top-[74%] max-[560px]:left-[10%]"
        typeClass="lp-type-1"
        chars={t`把这个预订信息加进去`}
      />
      <Bubble
        className="lp-bubble-2 left-[58%] top-[16%] max-[640px]:left-[30%]"
        typeClass="lp-type-2"
        chars={t`计算一下费用`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------ */

const DEMO_ROWS: { say: MessageDescriptor; result: MessageDescriptor }[] = [
  { say: msg`把这个预订信息加进去`, result: msg`新增预订 · Amtrak 517 · 8/16 14:20 南下` },
  { say: msg`计算一下费用`, result: msg`账本已结清 · 3 笔支出 · 同行者应付你 $183.00` },
  { say: msg`周六下午排太满了，帮我匀开一点`, result: msg`移动 2 个日程 · 已实时同步给所有成员` },
];

function AgentDemo() {
  const { t } = useLingui();
  return (
    <section className="border-t border-[#ebe9e3] bg-white">
      <div className={`${container} py-[clamp(48px,8vw,88px)]`}>
        <SectionHead
          eyebrow="Talk to your trip"
          title={t`对着行程，直接说`}
          sub={t`Agent 改的不是聊天记录，是行程本身：每条指令落成一次带审计的写入，所有人立刻看到。`}
        />
        <div className="mt-9 space-y-3 max-w-[720px] mx-auto">
          {DEMO_ROWS.map((row) => {
            const say = t(row.say);
            return (
              <div key={row.say.id} className="flex flex-wrap items-center gap-3">
                <span className="py-2.5 px-4 bg-[#fafaf8] border border-[#ebe9e3] rounded-[12px] rounded-bl-[4px] font-cjk text-[13.5px] font-medium">
                  <Trans>「{say}」</Trans>
                </span>
                <ArrowRight
                  size={15}
                  strokeWidth={2.2}
                  className="text-[#9b988f] max-[560px]:hidden"
                />
                <span className="inline-flex items-center gap-2 py-2.5 px-4 bg-[#eef4f0] border border-[#cfe0d6] rounded-[12px] font-cjk text-[13px] text-[#3f6f5b]">
                  <Zap size={13} strokeWidth={2.4} />
                  {t(row.result)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center font-cjk text-[12.5px] text-[#9b988f]">
          <Trans>每一步写入都进审计日志，改错了随时快照回滚。</Trans>
        </p>
      </div>
    </section>
  );
}

const FEATURES: { icon: ReactNode; title: MessageDescriptor; body: MessageDescriptor }[] = [
  {
    icon: <Route size={17} strokeWidth={2.2} />,
    title: msg`实时时间线`,
    body: msg`WebSocket 推送 + 乐观更新，改一处所有人立刻看到；按天折叠，过去的日程自动归档。`,
  },
  {
    icon: <Ticket size={17} strokeWidth={2.2} />,
    title: msg`预订一页收齐`,
    body: msg`机票、酒店、确认码、停车方案，全放进同一张纸，出发当天不用再翻邮箱。`,
  },
  {
    icon: <DollarSign size={17} strokeWidth={2.2} />,
    title: msg`分账账本`,
    body: msg`AA 或自定义比例，自动算清谁欠谁，行程结束一键导出 PDF 对账单。`,
  },
  {
    icon: <UserPlus size={17} strokeWidth={2.2} />,
    title: msg`邮件邀请协作`,
    body: msg`一封邀请邮件，GitHub 登录即加入；成员进出由创建者掌握，随时移除。`,
  },
  {
    icon: <Bot size={17} strokeWidth={2.2} />,
    title: msg`Agent API`,
    body: msg`为每个行程签发限时 Bearer 令牌，配套 SKILL.md 说明书，Claude 们开箱即用。`,
  },
  {
    icon: <Archive size={17} strokeWidth={2.2} />,
    title: msg`备份与审计`,
    body: msg`每次改动留痕、可追责到人（或 Agent）；一键快照，误操作随时回滚。`,
  },
];

function Features() {
  const { t } = useLingui();
  return (
    <section id="features" className="border-t border-[#ebe9e3]">
      <div className={`${container} py-[clamp(48px,8vw,88px)]`}>
        <SectionHead
          eyebrow="Everything in one sheet"
          title={t`一份行程该有的，都在`}
          sub={t`给爱做攻略的人一张认真的纸：不是备忘录，也不用拉一个共享表格。`}
        />
        <div className="grid grid-cols-3 gap-3.5 mt-9 max-[820px]:grid-cols-2 max-[560px]:grid-cols-1">
          {FEATURES.map((f) => (
            <div key={f.title.id} className="p-5 bg-white border border-[#ebe9e3] rounded-[14px]">
              <span className="grid place-items-center w-9 h-9 rounded-[10px] bg-[#eef4f0] text-[#3f6f5b]">
                {f.icon}
              </span>
              <div className="mt-3.5 font-sans font-bold text-[15px]">{t(f.title)}</div>
              <p className="mt-1.5 font-cjk text-[12.5px] leading-[1.8] text-[#76726a]">
                {t(f.body)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-8 font-cjk text-[12.5px] text-[#9b988f]">
          <Globe size={13} strokeWidth={2.2} />
          <Trans>行程可设为公开：任何人可以围观时间线，还能给你提建议。</Trans>
        </div>
      </div>
    </section>
  );
}

const STEPS: { n: string; title: MessageDescriptor; body: MessageDescriptor }[] = [
  {
    n: "01",
    title: msg`登录，建一个行程`,
    body: msg`GitHub 一键登录，起个名字、定好日期，行程纸就铺开了。`,
  },
  {
    n: "02",
    title: msg`把同行人请进来`,
    body: msg`填个邮箱发出邀请，对方点开链接登录即加入，无需注册流程。`,
  },
  {
    n: "03",
    title: msg`给 Agent 发张门票`,
    body: msg`后台一键签发令牌，把 SKILL.md 丢给你的 Agent，开始使唤它。`,
  },
];

function DevBand() {
  const { t } = useLingui();
  return (
    <section id="agent" className="bg-[#1c1b19] text-[#fafaf8]">
      <div className={`${container} py-[clamp(48px,8vw,88px)]`}>
        <div className="grid grid-cols-2 gap-10 items-center max-[820px]:grid-cols-1">
          <div>
            <span className="inline-flex gap-[9px] items-center font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fb8a4]">
              <span className="w-[7px] h-[7px] rounded-full bg-[#8fb8a4]" />
              Work with Agent
            </span>
            <h2 className="mt-3.5 font-sans font-extrabold tracking-[-0.02em] leading-[1.15] text-[clamp(26px,4vw,38px)]">
              <Trans>
                给 Agent 一张
                <br />
                进入行程的门票
              </Trans>
            </h2>
            <p className="mt-4 max-w-[40ch] font-cjk text-[14px] leading-[1.9] text-[#b5b1a8]">
              <Trans>
                令牌只对单个行程有效、限时、可随时吊销；配套的 SKILL.md 把行程 API 讲给 Agent
                听。Claude Code、或任何会发 HTTP 的东西，都能替你打理行程。
              </Trans>
            </p>
            <div className="mt-7 space-y-4">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-4">
                  <span className="font-mono text-[13px] font-bold text-[#8fb8a4]">{s.n}</span>
                  <div>
                    <div className="font-sans font-bold text-[14.5px]">{t(s.title)}</div>
                    <div className="mt-0.5 font-cjk text-[12.5px] leading-[1.7] text-[#b5b1a8]">
                      {t(s.body)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#3b3833] bg-[#141311] overflow-hidden">
            <div className="flex items-center gap-1.5 py-2.5 px-3.5 border-b border-[#3b3833]">
              <span className="w-2 h-2 rounded-full bg-[#3b3833]" />
              <span className="w-2 h-2 rounded-full bg-[#3b3833]" />
              <span className="w-2 h-2 rounded-full bg-[#3b3833]" />
              <span className="ml-2 font-mono text-[10px] text-[#76726a]">agent session</span>
            </div>
            <pre className="m-0 p-4 font-mono text-[11.5px] leading-[1.9] overflow-x-auto text-[#d8d5cd]">
              <code>
                {"$ claude\n"}
                <span className="text-[#76726a]">{"> "}</span>
                {t`帮我把今晚的酒店确认加进行程` + "\n\n"}
                <span className="text-[#8fb8a4]">{"✓"}</span>
                {" " + t`读取 SKILL.md · 行程 API 已就绪` + "\n"}
                <span className="text-[#8fb8a4]">{"✓"}</span>
                {" POST /api/trips/"}
                <span className="text-[#b08648]">{"kx83jq2h4m"}</span>
                {"/trip\n"}
                {"    Authorization: Bearer "}
                <span className="text-[#b08648]">{"••••••"}</span>
                {"\n"}
                <span className="text-[#8fb8a4]">{"✓"}</span>
                {" " + t`rev 129 → 130 · 已同步给 2 位成员` + "\n"}
                <span className="text-[#8fb8a4]">{"✓"}</span>
                {" " + t`审计日志：agent · addStop` + "\n"}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  const { t } = useLingui();
  return (
    <section className="border-t border-[#ebe9e3]">
      <div className={`${container} py-[clamp(56px,9vw,96px)] text-center`}>
        <h2 className="mx-auto max-w-[18ch] font-sans font-extrabold tracking-[-0.03em] leading-[1.15] text-[clamp(28px,5vw,44px)]">
          <Trans>
            下一趟旅行，
            <br className="sm:hidden" />
            带上你的 <span className="text-[#3f6f5b]">Agent</span>
          </Trans>
        </h2>
        <p className="mt-4 font-cjk text-[14px] text-[#76726a]">
          <Trans>免费使用，登录即开工。</Trans>
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {githubBtn(t`用 GitHub 登录`)}
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="text-center">
      <span className="inline-flex gap-[9px] items-center font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3f6f5b]">
        <span className="w-[7px] h-[7px] rounded-full bg-[#3f6f5b]" />
        {eyebrow}
      </span>
      <h2 className="mt-3.5 font-sans font-extrabold tracking-[-0.02em] leading-[1.15] text-[clamp(26px,4.5vw,38px)]">
        {title}
      </h2>
      <p className="mt-3.5 mx-auto max-w-[46ch] font-cjk text-[13.5px] leading-[1.9] text-[#76726a]">
        {sub}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#ebe9e3]">
      <div className={`${container} flex flex-wrap items-center gap-4 py-7`}>
        <span className="inline-flex items-center gap-[9px] font-grotesk font-bold text-[13px]">
          <span className="w-[8px] h-[8px] rounded-full bg-[#3f6f5b]" />
          {BRAND}
        </span>
        <span className="font-cjk text-[12px] text-[#9b988f]">
          <Trans>人和 Agent 共写的行程工作台</Trans>
        </span>
        <span className="ml-auto inline-flex items-center gap-2 leading-none text-[#9b988f]">
          <span className="font-sans text-[12px]" aria-hidden="true">
            ©
          </span>
          <span className="font-mono text-[11px]">2026 · Built on Cloudflare Workers</span>
        </span>
      </div>
    </footer>
  );
}
