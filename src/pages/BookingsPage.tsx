import { MapPin, Gem } from "lucide-react";
import { AddressLink } from "../components/AddressLink";

const sectionLogo = (src: string, alt: string) => (
  <img className="st-logo" src={src} alt={alt} />
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
    railColor: "var(--magenta)",
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
      <header className="masthead">
        <span className="mh-kicker k-cyan">
          <span className="dot" />
          预订信息 · Bookings
        </span>
        <h1 className="mh-title">
          机票 <span className="em em-cyan">&amp;</span> 酒店
        </h1>
        <p className="mh-sub">
          JetBlue 往返 + Holiday Inn 据点。注意返程从 <b>ONT 安大略</b>起飞，且
          <b>隔天清晨</b>到 JFK。
        </p>
      </header>

      <SectionTitle
        icon={sectionLogo("/jetblue-logo.png", "JetBlue")}
        accent="var(--cyan)"
        iconBg="#fff"
        title="JetBlue 往返"
        count="2 段航程"
      />

      {flights.map((flight) => (
        <BoardingPass flight={flight} key={flight.flightNo} />
      ))}

      <SectionTitle
        icon={sectionLogo("/ihg-logo.png", "IHG")}
        accent="var(--violet)"
        iconBg="#fff"
        title="酒店"
        count="2 晚 · IHG"
      />

      <article className="hotel">
        <div className="hotel-top">
          <div className="hotel-photo">
            <span className="badge">Stay</span>
            <img src="/hotel.jpg" alt="Holiday Inn Diamond Bar - Pomona" />
          </div>
          <div className="hotel-info">
            <div className="h-name">Holiday Inn DIAMOND BAR – POMONA by IHG</div>
            <div className="h-room">2 Queen Standard · 两张大床 (2 Queen bed)</div>
            <div className="hotel-dates">
              <div className="hd in">
                <div className="hd-k">入住 Check-in</div>
                <div className="hd-d">7月3日 周五</div>
                <div className="hd-t">15:00 · 3:00 PM</div>
              </div>
              <div className="nights">2 晚</div>
              <div className="hd out">
                <div className="hd-k">退房 Check-out</div>
                <div className="hd-d">7月5日 周日</div>
                <div className="hd-t">12:00 · 中午</div>
              </div>
            </div>
            <AddressLink
              className="hotel-addr"
              query="Holiday Inn Diamond Bar Pomona, 21725 E Gateway Center Dr, Diamond Bar, CA 91765"
              leading={<MapPin size={16} strokeWidth={2.2} />}
            >
              21725 E Gateway Center Dr, Diamond Bar, CA 91765 US
            </AddressLink>
          </div>
        </div>
        <div className="hotel-foot">
          <span className="cancel">
            <span className="tick">✓</span>免费取消{" "}
            <small>截至 7月2日 周四 12:00 AM（酒店当地时间）</small>
          </span>
          <span className="rewards">
            <Gem size={15} strokeWidth={2} />
            可累积 IHG One Rewards · 入住时报会员号
          </span>
        </div>
      </article>

      <p className="foot">JFK ✈ LAX</p>
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
    <div className="sec-title" style={{ ["--accent" as string]: accent }}>
      <span className="st-ic" style={{ background: iconBg ?? accent }}>
        {icon}
      </span>
      <h2>{title}</h2>
      <span className="st-count">{count}</span>
    </div>
  );
}

function PlaneArc() {
  return (
    <div className="arc">
      <svg viewBox="0 0 88 26" fill="none">
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
    <article className="pass">
      <div
        className="pass-rail"
        style={flight.railColor ? { background: flight.railColor } : undefined}
      >
        <span className="rail-txt">{flight.rail}</span>
      </div>
      <div className="pass-main">
        <div className="pass-top">
          <span className={`leg ${flight.legClass ?? ""}`}>{flight.legLabel}</span>
          <span className="date">{flight.date}</span>
          <span className="airline">
            <img className="airline-logo" src="/jetblue-logo.png" alt="JetBlue Airways" />
          </span>
        </div>
        <div className="pass-route">
          <div className="endpoint from">
            <div className="ep-time">{flight.from.time}</div>
            <div className="ep-code">{flight.from.code}</div>
            <div className="ep-city">{flight.from.city}</div>
            {flight.from.flag && <span className="ep-flag">{flight.from.flag}</span>}
          </div>
          <div className="pass-mid">
            <PlaneArc />
            <div className="dur">{flight.duration}</div>
          </div>
          <div className="endpoint to">
            <div className="ep-time">{flight.to.time}</div>
            <div className="ep-code">{flight.to.code}</div>
            <div className="ep-city">{flight.to.city}</div>
            {flight.to.flag && <span className="ep-flag">{flight.to.flag}</span>}
          </div>
        </div>
        <div className="pass-detail">
          <div className="cell">
            <div className="ck">航班号</div>
            <div className="cv">
              {flight.flightNo} <small>{flight.aircraft}</small>
            </div>
          </div>
          <div className="cell">
            <div className="ck">舱位 / 票价</div>
            <div className="cv">
              {flight.fareClass} <small>{flight.fareNote}</small>
            </div>
          </div>
          <div className="cell">
            <div className="ck">承运</div>
            <div className="cv">
              JetBlue <small>JETBLUE AIRWAYS</small>
            </div>
          </div>
        </div>
        <div className="fare">
          <span className="fk">行李 / 费用</span>
          <span className="chip inc">
            <span className="ci">✓</span>含随身行李
          </span>
          <span className="chip fee">
            <span className="ci">$</span>托运 · 选座 · 改签另付
          </span>
          <span className="chip no">
            <span className="ci">✕</span>不可退款
          </span>
        </div>
      </div>
    </article>
  );
}
