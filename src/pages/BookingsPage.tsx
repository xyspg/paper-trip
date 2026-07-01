import { MapPin, Gem } from "lucide-react";
import { AddressLink } from "../components/AddressLink";

const sectionLogo = (src: string, alt: string) => (
  <img className="w-full h-full p-1 object-contain" src={src} alt={alt} />
);

type Endpoint = {
  time: string;
  code: string;
  city: string;
  flag?: string;
};

type Flight = {
  rail: string;
  railColor?: string;
  legLabel: string;
  legClass?: string;
  date: string;
  from: Endpoint;
  to: Endpoint;
  duration: string;
  flightNo: string;
  aircraft: string;
  fareClass: string;
  fareNote: string;
};

const flights: Flight[] = [
  {
    rail: "Outbound · 去程",
    legLabel: "去程 · Depart",
    date: "周五 · 7月3日 2026",
    from: { time: "07:30 AM", code: "JFK", city: "纽约 · New York" },
    to: { time: "10:21 AM", code: "LAX", city: "洛杉矶 · Los Angeles" },
    duration: "5h 51m",
    flightNo: "B6 223",
    aircraft: "Airbus A318",
    fareClass: "Blue Basic",
    fareNote: "经济舱 · class L",
  },
  {
    rail: "Return · 返程",
    railColor: "var(--color-magenta)",
    legLabel: "返程 · Return",
    legClass: "ret",
    date: "周日 · 7月5日 2026",
    from: {
      time: "11:59 PM",
      code: "ONT",
      city: "安大略 · Ontario, CA",
      flag: "⚠ 不同机场 · 非 LAX",
    },
    to: {
      time: "08:25 AM",
      code: "JFK",
      city: "纽约 · New York",
      flag: "⚠ 隔天到 · 7月6日 周一",
    },
    duration: "5h 26m",
    flightNo: "B6 454",
    aircraft: "Airbus A321",
    fareClass: "Blue Basic",
    fareNote: "经济舱 · class L",
  },
];

export function BookingsPage() {
  return (
    <>
      <header className="relative isolate overflow-hidden p-[clamp(22px,4vw,40px)] text-paper bg-ink border-[3px] border-ink rounded-card shadow-hard before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_26px,rgb(255_45_107_/_10%)_26px_28px),radial-gradient(circle_at_88%_12%,rgb(0_191_212_/_22%),transparent_42%),radial-gradient(circle_at_8%_96%,rgb(255_196_0_/_16%),transparent_40%)]">
        <span className="inline-flex gap-2.5 items-center py-1.5 px-3 mb-4.5 text-ink uppercase tracking-[0.28em] bg-cyan border-2 border-paper rounded-full font-grotesk text-xs font-extrabold">
          <span className="w-[7px] h-[7px] bg-magenta rounded-full" />
          预订信息 · Bookings
        </span>
        <h1 className="m-0 uppercase tracking-[0] font-display text-[clamp(38px,9vw,92px)] font-black leading-[0.92]">
          机票 <span className="[-webkit-text-stroke:2px_var(--color-paper)] [paint-order:stroke_fill] text-cyan">&amp;</span> 酒店
        </h1>
        <p className="max-w-[52ch] mt-3.5 mx-0 mb-0 text-paper/78 font-cjk text-[clamp(14px,2.2vw,18px)] font-medium">
          JetBlue 往返 + Holiday Inn 据点。注意返程从 <b>ONT 安大略</b>起飞，且
          <b>隔天清晨</b>到 JFK。
        </p>
      </header>

      <SectionTitle
        icon={sectionLogo("/jetblue-logo.png", "JetBlue")}
        accent="var(--color-cyan)"
        iconBg="#fff"
        title="JetBlue 往返"
        count="2 段航程"
      />

      {flights.map((flight) => (
        <BoardingPass flight={flight} key={flight.flightNo} />
      ))}

      <SectionTitle
        icon={sectionLogo("/ihg-logo.png", "IHG")}
        accent="var(--color-violet)"
        iconBg="#fff"
        title="酒店"
        count="2 晚 · IHG"
      />

      <article className="relative overflow-hidden bg-paper-2 border-[3px] border-ink rounded-card shadow-hard">
        <div className="flex flex-wrap">
          <div className="relative flex-[1_1_280px] min-h-[200px] overflow-hidden bg-[#e8e2d4] border-r-[3px] border-ink max-[600px]:basis-full max-[600px]:border-r-0 max-[600px]:border-b-[3px]">
            <span className="absolute top-3.5 left-3.5 z-[2] py-1.5 px-[11px] text-ink uppercase tracking-[0.16em] bg-violet border-2 border-ink rounded-lg shadow-[3px_3px_0_var(--color-ink)] font-display text-[11px] font-black">Stay</span>
            <img className="block w-full h-full min-h-[200px] object-cover" src="/hotel.jpg" alt="Holiday Inn Diamond Bar - Pomona" />
          </div>
          <div className="flex-[1_1_340px] min-w-0 py-5 px-[22px]">
            <div className="font-cjk text-[clamp(19px,3vw,24px)] font-black leading-[1.2]">Holiday Inn DIAMOND BAR – POMONA by IHG</div>
            <div className="mt-1.5 text-ink-soft font-cjk text-sm font-semibold">2 Queen Standard · 两张大床 (2 Queen bed)</div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5 items-center p-3.5 mt-4.5 bg-[color-mix(in_srgb,var(--color-violet)_10%,#fff)] border-2 border-ink rounded-xl">
              <div className="min-w-0">
                <div className="text-ink-soft uppercase tracking-[0.12em] font-grotesk text-[10px] font-extrabold">入住 Check-in</div>
                <div className="mt-1 font-display text-[clamp(16px,3vw,20px)] font-black leading-none">7月3日 周五</div>
                <div className="mt-[3px] text-ink-soft font-cjk text-[13px] font-semibold">15:00 · 3:00 PM</div>
              </div>
              <div className="py-1 px-2.5 text-ink whitespace-nowrap bg-yellow border-2 border-ink rounded-full font-grotesk text-xs font-extrabold">2 晚</div>
              <div className="min-w-0 text-right">
                <div className="text-ink-soft uppercase tracking-[0.12em] font-grotesk text-[10px] font-extrabold">退房 Check-out</div>
                <div className="mt-1 font-display text-[clamp(16px,3vw,20px)] font-black leading-none">7月5日 周日</div>
                <div className="mt-[3px] text-ink-soft font-cjk text-[13px] font-semibold">12:00 · 中午</div>
              </div>
            </div>
            <AddressLink
              className="inline-flex gap-2 items-center mt-4 text-jetblue no-underline font-cjk text-sm font-bold hover:underline hover:underline-offset-2"
              query="Holiday Inn Diamond Bar Pomona, 21725 E Gateway Center Dr, Diamond Bar, CA 91765"
              leading={<MapPin className="shrink-0" size={16} strokeWidth={2.2} />}
            >
              21725 E Gateway Center Dr, Diamond Bar, CA 91765 US
            </AddressLink>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center py-3.5 px-[22px] border-t-2 border-dashed border-ink">
          <span className="inline-flex gap-2 items-center font-cjk text-[13px] font-bold">
            <span className="text-green font-black">✓</span>免费取消{" "}
            <small className="text-ink-soft font-medium">截至 7月2日 周四 12:00 AM（酒店当地时间）</small>
          </span>
          <span className="inline-flex gap-2 items-center py-1.5 px-3 ml-auto text-jetblue bg-[color-mix(in_srgb,var(--color-jetblue)_9%,#fff)] border-2 border-jetblue rounded-full font-cjk text-[12.5px] font-bold max-[600px]:ml-0">
            <Gem size={15} strokeWidth={2} />
            入住时报IHG会员号
          </span>
        </div>
      </article>

      <p className="mt-4.5 mx-0 mb-0 text-ink-soft text-center uppercase tracking-[0.14em] font-grotesk text-xs font-bold">JFK ✈ LAX</p>
    </>
  );
}

function SectionTitle({
  icon,
  accent,
  iconBg,
  title,
  count,
}: {
  icon: React.ReactNode;
  accent: string;
  iconBg?: string;
  title: string;
  count: string;
}) {
  return (
    <div className="flex gap-3 items-center mt-[clamp(30px,5vw,46px)] mx-0 mb-4.5" style={{ ["--accent" as string]: accent }}>
      <span className="grid shrink-0 w-10 h-10 place-items-center overflow-hidden bg-[var(--accent,var(--color-cyan))] border-[3px] border-ink rounded-[10px] shadow-hard-sm" style={{ background: iconBg ?? accent }}>
        {icon}
      </span>
      <h2 className="m-0 uppercase tracking-[-0.01em] font-display text-[clamp(20px,4vw,30px)] font-black">{title}</h2>
      <span className="ml-auto text-ink-soft uppercase tracking-[0.14em] font-grotesk text-xs font-extrabold">{count}</span>
    </div>
  );
}

function PlaneArc() {
  return (
    <div className="relative w-[88px] h-[26px] max-[600px]:w-10 max-[600px]:rotate-90">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 88 26" fill="none">
        <path
          d="M2 22 C 26 4, 62 4, 86 22"
          stroke="#14110F"
          strokeWidth="2.4"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
        <g transform="translate(44,5)">
          <path
            d="M7.5 6 L1 4 L0 2 L1.4 2 L3 3.4 L5.6 3 L3.4 0.2 L4.8 0 L8.6 2.6 L11.4 2.6 C12.2 2.6 12.2 4.2 11.4 4.2 L4.8 6.6 Z"
            fill="#FF2D6B"
            stroke="#14110F"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}

function BoardingPass({ flight }: { flight: Flight }) {
  return (
    <article className="relative flex mb-5.5 overflow-hidden bg-paper-2 border-[3px] border-ink rounded-card shadow-hard">
      <div
        className="relative flex shrink-0 items-center justify-center w-[54px] text-white bg-jetblue after:content-[''] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-[3px] after:bg-[repeating-linear-gradient(var(--color-ink)_0_7px,transparent_7px_14px)] max-[600px]:w-10"
        style={flight.railColor ? { background: flight.railColor } : undefined}
      >
        <span className="whitespace-nowrap uppercase tracking-[0.22em] [writing-mode:vertical-rl] rotate-180 font-display text-[13px] font-black max-[600px]:tracking-[0.16em] max-[600px]:text-[11px]">{flight.rail}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2.5 items-center justify-between py-3 px-4.5 bg-[color-mix(in_srgb,var(--color-jetblue)_8%,var(--color-paper-2))] border-b-2 border-dashed border-ink">
          <span className={`py-[5px] px-[11px] text-white uppercase tracking-[0.16em] rounded-full font-grotesk text-[11px] font-extrabold ${flight.legClass === "ret" ? "bg-magenta" : "bg-ink"}`}>{flight.legLabel}</span>
          <span className="font-cjk text-sm font-bold">{flight.date}</span>
          <span className="inline-flex gap-[7px] items-center text-jetblue font-grotesk text-[13px] font-extrabold">
            <img className="h-[18px] w-auto block" src="/jetblue-logo.png" alt="JetBlue Airways" />
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center pt-5 px-4.5 pb-4 max-[600px]:grid-cols-1 max-[600px]:gap-1.5 max-[600px]:text-center">
          <div className="min-w-0">
            <div className="font-display text-[clamp(24px,5vw,34px)] font-black leading-[0.95]">{flight.from.time}</div>
            <div className="tracking-[0.01em] font-display text-[clamp(28px,7vw,48px)] font-extrabold leading-[0.95]">{flight.from.code}</div>
            <div className="mt-1 text-ink-soft font-cjk text-[13px] font-medium">{flight.from.city}</div>
            {flight.from.flag && <span className="inline-block py-[3px] px-2 mt-[7px] text-paper uppercase tracking-[0.08em] bg-red rounded-full font-grotesk text-[10px] font-extrabold">{flight.from.flag}</span>}
          </div>
          <div className="flex flex-col gap-1.5 items-center min-w-[88px] max-[600px]:flex-row max-[600px]:gap-3 max-[600px]:my-1">
            <PlaneArc />
            <div className="py-[3px] px-2.5 text-ink whitespace-nowrap bg-yellow border-2 border-ink rounded-full font-grotesk text-xs font-extrabold">{flight.duration}</div>
          </div>
          <div className="min-w-0 text-right max-[600px]:text-center">
            <div className="font-display text-[clamp(24px,5vw,34px)] font-black leading-[0.95]">{flight.to.time}</div>
            <div className="tracking-[0.01em] font-display text-[clamp(28px,7vw,48px)] font-extrabold leading-[0.95]">{flight.to.code}</div>
            <div className="mt-1 text-ink-soft font-cjk text-[13px] font-medium">{flight.to.city}</div>
            {flight.to.flag && <span className="inline-block py-[3px] px-2 mt-[7px] text-paper uppercase tracking-[0.08em] bg-red rounded-full font-grotesk text-[10px] font-extrabold">{flight.to.flag}</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t-2 border-dashed border-ink max-[600px]:grid-cols-1">
          <div className="py-3 px-4 border-r-2 border-r-[#ece6d8] last:border-r-0 max-[600px]:border-r-0 max-[600px]:border-b-2 max-[600px]:border-b-[#ece6d8] max-[600px]:last:border-b-0">
            <div className="text-ink-soft uppercase tracking-[0.12em] font-grotesk text-[10px] font-extrabold">航班号</div>
            <div className="mt-1 font-cjk text-[15px] font-extrabold">
              {flight.flightNo} <small className="block mt-[1px] text-ink-soft text-xs font-medium">{flight.aircraft}</small>
            </div>
          </div>
          <div className="py-3 px-4 border-r-2 border-r-[#ece6d8] last:border-r-0 max-[600px]:border-r-0 max-[600px]:border-b-2 max-[600px]:border-b-[#ece6d8] max-[600px]:last:border-b-0">
            <div className="text-ink-soft uppercase tracking-[0.12em] font-grotesk text-[10px] font-extrabold">舱位 / 票价</div>
            <div className="mt-1 font-cjk text-[15px] font-extrabold">
              {flight.fareClass} <small className="block mt-[1px] text-ink-soft text-xs font-medium">{flight.fareNote}</small>
            </div>
          </div>
          <div className="py-3 px-4 border-r-2 border-r-[#ece6d8] last:border-r-0 max-[600px]:border-r-0 max-[600px]:border-b-2 max-[600px]:border-b-[#ece6d8] max-[600px]:last:border-b-0">
            <div className="text-ink-soft uppercase tracking-[0.12em] font-grotesk text-[10px] font-extrabold">承运</div>
            <div className="mt-1 font-cjk text-[15px] font-extrabold">
              JetBlue <small className="block mt-[1px] text-ink-soft text-xs font-medium">JETBLUE AIRWAYS</small>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center pt-3.5 px-4.5 pb-4 border-t-2 border-t-[#ece6d8]">
          <span className="mr-1 text-ink-soft uppercase tracking-[0.1em] font-grotesk text-[11px] font-extrabold">行李 / 费用</span>
          <span className="inline-flex gap-1.5 items-center py-[5px] px-[11px] border-2 border-ink rounded-full font-cjk text-[12.5px] font-bold bg-[color-mix(in_srgb,var(--color-green)_20%,#fff)]">
            <span className="font-black text-green">✓</span>含随身行李
          </span>
          <span className="inline-flex gap-1.5 items-center py-[5px] px-[11px] border-2 border-ink rounded-full font-cjk text-[12.5px] font-bold bg-[color-mix(in_srgb,var(--color-amber)_18%,#fff)]">
            <span className="font-black text-amber">$</span>托运 · 选座 · 改签另付
          </span>
          <span className="inline-flex gap-1.5 items-center py-[5px] px-[11px] border-2 border-ink rounded-full font-cjk text-[12.5px] font-bold text-ink-soft bg-white border-dashed">
            <span className="font-black text-red">✕</span>不可退款
          </span>
        </div>
      </div>
    </article>
  );
}
