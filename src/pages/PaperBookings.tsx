import { Gem, Hotel, MapPin, Plane } from "lucide-react"
import type { ReactNode } from "react"
import { AddressLink } from "../components/AddressLink"
import { type Flight, flights, hotel } from "./bookingsData"

// Paper theme bookings: a port of the "预订信息" Claude Design layout (light
// masthead, boarding-pass flight cards, hotel card). Fed the shared static
// booking data. Slate = outbound, plum = return / hotel.

function PlaneArc({ color }: { color: string }) {
  return (
    <div className="w-[92px] h-6 max-[600px]:w-10 max-[600px]:rotate-90">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 92 24" fill="none">
        <path
          d="M2 20 C 28 4, 64 4, 90 20"
          stroke="#c7c3ba"
          strokeWidth="1.5"
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
        <g transform="translate(46,4.5)">
          <path
            d="M7.5 6 L1 4 L0 2 L1.4 2 L3 3.4 L5.6 3 L3.4 0.2 L4.8 0 L8.6 2.6 L11.4 2.6 C12.2 2.6 12.2 4.2 11.4 4.2 L4.8 6.6 Z"
            fill={color}
          />
        </g>
      </svg>
    </div>
  )
}

function SectionTitle({
  icon,
  bg,
  title,
  count,
}: {
  icon: ReactNode
  bg: string
  title: string
  count: string
}) {
  return (
    <div className="flex items-center gap-3 mt-[clamp(30px,5vw,44px)] mb-[18px]">
      <span className="grid shrink-0 w-10 h-10 place-items-center rounded-[11px] text-white" style={{ background: bg }}>
        {icon}
      </span>
      <h2 className="font-sans font-extrabold text-[clamp(20px,4vw,27px)] tracking-[-0.02em]">{title}</h2>
      <span className="ml-auto font-grotesk font-semibold text-[11px] uppercase tracking-[0.1em] text-[#9b988f]">
        {count}
      </span>
    </div>
  )
}

function Endpoint({ ep, align }: { ep: Flight["from"]; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right max-[600px]:text-center" : "max-[600px]:text-center"}>
      <div className="font-grotesk font-bold text-[clamp(20px,4vw,26px)] leading-[0.95]">{ep.time}</div>
      <div className="mt-0.5 font-sans font-extrabold text-[clamp(30px,7vw,46px)] leading-[0.95] tracking-[-0.02em]">
        {ep.code}
      </div>
      <div className="mt-[5px] font-cjk text-[12.5px] text-[#76726a]">{ep.city}</div>
      {ep.flag && (
        <span className="inline-block mt-2 font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.04em] text-[#c2553f] bg-[#f8efec] border border-[#ecccc2] rounded-full py-[3px] px-2">
          {ep.flag}
        </span>
      )}
    </div>
  )
}

function BoardingPass({ flight }: { flight: Flight }) {
  const ret = flight.legClass === "ret"
  const accent = ret ? "#7a5c84" : "#5b7a99"
  return (
    <article className="flex overflow-hidden bg-white border border-[#ebe9e3] rounded-[16px] mb-4">
      <div
        className="shrink-0 w-[46px] flex items-center justify-center text-white max-[600px]:w-[38px]"
        style={{ background: accent }}
      >
        <span className="font-grotesk font-semibold text-[11px] uppercase tracking-[0.18em] whitespace-nowrap [writing-mode:vertical-rl] max-[600px]:text-[10px] max-[600px]:tracking-[0.12em]">
          {flight.rail}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2.5 py-3 px-[18px] bg-[#fdfdfb] border-b border-dashed border-[#ebe9e3]">
          <span
            className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.12em] text-white rounded-full py-[5px] px-[11px]"
            style={{ background: accent }}
          >
            {flight.legLabel}
          </span>
          <span className="font-cjk font-bold text-[13.5px]">{flight.date}</span>
          <span className="inline-flex items-center gap-[7px] font-grotesk font-bold text-[12.5px]" style={{ color: accent }}>
            <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
            JetBlue Airways
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pt-[22px] px-[18px] pb-[18px] max-[600px]:grid-cols-1 max-[600px]:gap-1.5">
          <Endpoint ep={flight.from} align="left" />
          <div className="flex flex-col items-center gap-2 min-w-[92px] max-[600px]:flex-row max-[600px]:gap-3 max-[600px]:my-1">
            <PlaneArc color={accent} />
            <div className="font-grotesk font-semibold text-[11.5px] text-[#3b3833] bg-[#fafaf8] border border-[#ebe9e3] rounded-full py-[3px] px-[11px] whitespace-nowrap">
              {flight.duration}
            </div>
          </div>
          <Endpoint ep={flight.to} align="right" />
        </div>

        <div className="grid grid-cols-3 border-t border-dashed border-[#ebe9e3] max-[600px]:grid-cols-1">
          <Cell k="航班号" v={flight.flightNo} sub={flight.aircraft} />
          <Cell k="舱位 / 票价" v={flight.fareClass} sub={flight.fareNote} />
          <Cell k="承运" v="JetBlue" sub="JETBLUE AIRWAYS" />
        </div>

        <div className="flex flex-wrap items-center gap-2 py-3.5 px-[18px] border-t border-[#f0eee8]">
          <span className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.1em] text-[#9b988f] mr-1">
            行李 / 费用
          </span>
          <span className="inline-flex items-center gap-1.5 font-cjk font-semibold text-[12px] py-[5px] px-3 rounded-full text-[#3f6f5b] bg-[#eef4f0] border border-[#cfe0d6]">
            <span className="font-grotesk font-bold">✓</span>含随身行李
          </span>
          <span className="inline-flex items-center gap-1.5 font-cjk font-semibold text-[12px] py-[5px] px-3 rounded-full text-[#b08648] bg-[#f7f0e2] border border-[#e6d3ad]">
            <span className="font-grotesk font-bold">$</span>托运 · 选座 · 改签另付
          </span>
          <span className="inline-flex items-center gap-1.5 font-cjk font-semibold text-[12px] py-[5px] px-3 rounded-full text-[#76726a] bg-white border border-dashed border-[#ebe9e3]">
            <span className="font-grotesk font-bold text-[#c2553f]">✕</span>不可退款
          </span>
        </div>
      </div>
    </article>
  )
}

function Cell({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="py-[13px] px-[18px] border-r border-[#f0eee8] last:border-r-0 max-[600px]:border-r-0 max-[600px]:border-b max-[600px]:last:border-b-0">
      <div className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.1em] text-[#9b988f]">{k}</div>
      <div className="mt-[5px] font-cjk font-bold text-[14.5px]">
        {v}
        <small className="block mt-[3px] font-mono font-normal text-[11px] text-[#76726a]">{sub}</small>
      </div>
    </div>
  )
}

export function PaperBookings() {
  return (
    <div className="font-sans text-[#1c1b19]">
      {/* MASTHEAD */}
      <header className="pb-[30px] border-b border-[#ebe9e3]">
        <span className="inline-flex gap-[9px] items-center font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5b7a99]">
          <span className="w-[7px] h-[7px] rounded-full bg-[#5b7a99]" />
          预订信息 · Bookings
        </span>
        <h1 className="mt-3.5 font-sans font-extrabold tracking-[-0.03em] leading-[0.98] text-[clamp(36px,7vw,58px)]">
          机票 <span className="text-[#5b7a99]">&amp;</span> 酒店
        </h1>
        <p className="mt-4 max-w-[56ch] font-cjk text-[14.5px] leading-[1.8] text-[#76726a]">
          JetBlue 往返 + Holiday Inn 据点。注意返程从 <b className="font-bold text-[#c2553f]">ONT 安大略</b> 起飞,且{" "}
          <b className="font-bold text-[#c2553f]">隔天清晨</b> 到 JFK。
        </p>
      </header>

      <SectionTitle
        icon={<Plane size={21} strokeWidth={2} />}
        bg="#5b7a99"
        title="JetBlue 往返"
        count="2 段航程"
      />
      {flights.map((flight) => (
        <BoardingPass flight={flight} key={flight.flightNo} />
      ))}

      <SectionTitle icon={<Hotel size={21} strokeWidth={2} />} bg="#7a5c84" title="酒店据点" count="2 晚 · IHG" />

      <article className="overflow-hidden bg-white border border-[#ebe9e3] rounded-[16px]">
        <div className="flex flex-wrap">
          <div className="relative flex-[1_1_280px] min-h-[210px] overflow-hidden bg-[#efece5] border-r border-[#ebe9e3] max-[600px]:basis-full max-[600px]:border-r-0 max-[600px]:border-b">
            <span className="absolute z-[2] top-3.5 left-3.5 font-grotesk font-semibold text-[10px] uppercase tracking-[0.1em] text-white bg-[#7a5c84] rounded-full py-[5px] px-[11px]">
              酒店 · Stay
            </span>
            <img className="absolute inset-0 w-full h-full object-cover" src="/hotel.jpg" alt={hotel.name} />
          </div>
          <div className="flex-[1_1_340px] min-w-0 p-[22px]">
            <div className="font-cjk font-bold text-[clamp(18px,3vw,22px)] leading-[1.3]">{hotel.name}</div>
            <div className="mt-[7px] font-cjk text-[13.5px] text-[#76726a]">{hotel.room}</div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 mt-[18px] p-[15px] border border-[#ddccdf] rounded-[12px] bg-[#f5eef6]">
              <div className="min-w-0">
                <div className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.1em] text-[#76726a]">
                  入住 Check-in
                </div>
                <div className="mt-[5px] font-sans font-extrabold text-[clamp(15px,3vw,18px)] leading-none">
                  {hotel.checkInDate}
                </div>
                <div className="mt-1 font-cjk text-[12.5px] text-[#76726a]">{hotel.checkInTime}</div>
              </div>
              <div className="font-grotesk font-semibold text-[11.5px] text-[#fafaf8] bg-[#7a5c84] rounded-full py-1 px-[11px] whitespace-nowrap">
                {hotel.nights}
              </div>
              <div className="min-w-0 text-right">
                <div className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.1em] text-[#76726a]">
                  退房 Check-out
                </div>
                <div className="mt-[5px] font-sans font-extrabold text-[clamp(15px,3vw,18px)] leading-none">
                  {hotel.checkOutDate}
                </div>
                <div className="mt-1 font-cjk text-[12.5px] text-[#76726a]">{hotel.checkOutTime}</div>
              </div>
            </div>

            <AddressLink
              className="flex items-center gap-2 mt-4 font-cjk font-semibold text-[13px] text-[#3b3833] no-underline hover:underline hover:underline-offset-2"
              query={hotel.addressQuery}
              leading={<MapPin className="shrink-0 text-[#7a5c84]" size={15} strokeWidth={2} />}
            >
              {hotel.address}
            </AddressLink>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 py-[15px] px-[22px] border-t border-dashed border-[#ebe9e3]">
          <span className="inline-flex items-center gap-2 font-cjk font-semibold text-[12.5px]">
            <span className="font-grotesk font-bold text-[#3f6f5b]">✓</span>免费取消{" "}
            <small className="font-normal text-[#9b988f]">{hotel.cancelNote}</small>
          </span>
          <span className="ml-auto inline-flex items-center gap-2 font-cjk font-semibold text-[12px] text-[#7a5c84] bg-[#f5eef6] border border-[#ddccdf] rounded-full py-1.5 px-3 max-[600px]:ml-0">
            <Gem size={14} strokeWidth={1.8} />
            可累积 IHG One Rewards · 入住时报会员号
          </span>
        </div>
      </article>

      <p className="flex items-center gap-3.5 mt-[30px] pt-[22px] border-t border-[#ebe9e3] font-grotesk text-[11px] uppercase tracking-[0.14em] text-[#9b988f]">
        <span className="flex-1 h-px bg-[#cfccc2]" />
        JFK ✈ LAX · 落地 Diamond Bar · 返程记得开去 ONT
        <span className="flex-1 h-px bg-[#cfccc2]" />
      </p>
    </div>
  )
}
