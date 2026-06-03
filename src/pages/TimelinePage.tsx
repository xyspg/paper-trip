import { appleMapsUrl } from '../maps'

type ItemStatus = 'planned' | 'booked' | 'watch'
type Category = 'travel' | 'food' | 'event' | 'hotel' | 'errand'

type TripDay = {
  id: string
  num: string
  date: string
  label: string
  tag: string
  accent: 'magenta' | 'cyan' | 'green'
}

type TripItem = {
  id: string
  dayId: string
  time: string
  subTime: string
  title: string
  category: Category
  location: string
  address: string
  parkingPrimary: string
  parkingBackup: string
  status: ItemStatus
}

const days: TripDay[] = [
  {
    id: 'jul-03',
    num: '01',
    date: '7/3 · FRI',
    label: '抵达 + Anime Expo 第一天',
    tag: 'Arrival Day',
    accent: 'magenta',
  },
  {
    id: 'jul-04',
    num: '02',
    date: '7/4 · SAT',
    label: 'Anime Expo 全天',
    tag: 'Main Event',
    accent: 'cyan',
  },
  {
    id: 'jul-05',
    num: '03',
    date: '7/5 · SUN',
    label: '返程缓冲',
    tag: 'Departure',
    accent: 'green',
  },
]

const tripItems: TripItem[] = [
  {
    id: 'flight-arrival',
    dayId: 'jul-03',
    time: '08:53',
    subTime: 'Arrive',
    title: '抵达 LAX',
    category: 'travel',
    location: 'Los Angeles International Airport',
    address: '1 World Way, Los Angeles, CA',
    parkingPrimary: '从航站楼到达层搭 Hertz shuttle 去取车。',
    parkingBackup: '如果租车柜台严重延误，再考虑 LAX-it rideshare。',
    status: 'booked',
  },
  {
    id: 'in-n-out',
    dayId: 'jul-03',
    time: '10:45',
    subTime: 'Fuel up',
    title: 'In-N-Out LAX 停靠',
    category: 'food',
    location: 'In-N-Out Burger',
    address: '9149 S Sepulveda Blvd, Los Angeles, CA',
    parkingPrimary: '餐厅停车场；绕一圈还没位就放弃。',
    parkingBackup: '停车场爆满就跳过，改到 LACC 附近吃。',
    status: 'planned',
  },
  {
    id: 'ax-lacc-day1',
    dayId: 'jul-03',
    time: '12:30',
    subTime: 'Badge',
    title: 'Anime Expo badge + 第一轮逛场',
    category: 'event',
    location: 'Los Angeles Convention Center',
    address: '1201 S Figueroa St, Los Angeles, CA',
    parkingPrimary: 'LACC West Hall Garage。',
    parkingBackup: 'LA Live parking 后步行；如果 downtown 堵死，改 Little Tokyo + Metro。',
    status: 'watch',
  },
  {
    id: 'hotel-checkin',
    dayId: 'jul-03',
    time: '20:15',
    subTime: 'Check-in',
    title: '酒店 check-in',
    category: 'hotel',
    location: 'Holiday Inn Diamond Bar - Pomona',
    address: '21725 Gateway Center Dr, Diamond Bar, CA',
    parkingPrimary: '酒店地面停车场。',
    parkingBackup: '卸行李前先问前台 overflow 停车。',
    status: 'booked',
  },
  {
    id: 'ax-full-day',
    dayId: 'jul-04',
    time: '全天',
    subTime: 'All day',
    title: 'Anime Expo 全天逛场',
    category: 'event',
    location: 'Los Angeles Convention Center',
    address: '1201 S Figueroa St, Los Angeles, CA',
    parkingPrimary: '尽量提前预订 downtown garage（LACC 周边）。',
    parkingBackup: 'Union Station / Little Tokyo parking + Metro A/E line 进场。',
    status: 'watch',
  },
  {
    id: 'checkout-buffer',
    dayId: 'jul-05',
    time: '弹性',
    subTime: 'Flex',
    title: '酒店据点 · 装车返程',
    category: 'errand',
    location: 'Holiday Inn Diamond Bar - Pomona',
    address: '21725 Gateway Center Dr, Diamond Bar, CA',
    parkingPrimary: '装车时停酒店地面停车场。',
    parkingBackup: '如果停车场满，问前台临停位置。',
    status: 'planned',
  },
]

// Global 1-based stop number per item, precomputed so the render doesn't scan
// the array with indexOf for every stop.
const stopNumbers = new Map(tripItems.map((item, index) => [item.id, index + 1]))

const categoryMeta: Record<Category, { label: string; className: string }> = {
  travel: { label: 'Transit', className: 'cat-cyan' },
  food: { label: 'Food', className: 'cat-yellow' },
  event: { label: 'Event', className: 'cat-magenta' },
  hotel: { label: 'Stay', className: 'cat-violet' },
  errand: { label: 'Misc', className: 'cat-green' },
}

const statusLabel: Record<ItemStatus, string> = {
  planned: '计划中',
  booked: '已预订',
  watch: '关注',
}

export function TimelinePage() {
  const nextItem = tripItems.find((item) => item.status !== 'planned') ?? tripItems[0]
  const parkingCount = tripItems.filter((item) => item.parkingPrimary && item.parkingBackup).length

  return (
    <>
      <header className="masthead">
        <span className="mh-kicker">
          <span className="dot" />行程作战表 · Travel Ops
        </span>
        <h1 className="mh-title">
          Anime Expo <span className="yr">2026</span>
        </h1>
        <p className="mh-sub">
          LAX 抵达 · downtown 停车攻防 · badge 安排 · 酒店据点 · 返程缓冲。每个停靠点都备好主方案和备用方案。
        </p>

        <div className="mh-stats">
          <SummaryStat value={tripItems.length.toString()} label="停靠点 · 横跨 3 天" tone="c1" />
          <SummaryStat value={parkingCount.toString()} label="主方案 + 备用方案" tone="c2" />
          <SummaryStat value="7/3–7/5" label="周五抵达 · 周日返程" tone="c3" />
        </div>
      </header>

      <section className="nextup" aria-label="下一步行动">
        <span className="nu-flag">下一步行动</span>
        <span className="nu-time">{nextItem.time}</span>
        <div className="nu-body">
          <div className="nu-title">{nextItem.title}</div>
          <div className="nu-note">
            {nextItem.parkingPrimary} · {statusLabel[nextItem.status]}
          </div>
        </div>
      </section>

      {days.map((day) => (
        <section className={`day accent-${day.accent}`} key={day.id}>
          <div className="day-head">
            <div className="dh-num">{day.num}</div>
            <div className="dh-meta">
              <div className="dh-date">{day.date}</div>
              <div className="dh-label">{day.label}</div>
            </div>
            <div className="dh-tag">{day.tag}</div>
          </div>

          <div className="timeline">
            {tripItems
              .filter((item) => item.dayId === day.id)
              .map((item) => (
                <TicketStop
                  item={item}
                  stopNumber={stopNumbers.get(item.id) ?? 0}
                  key={item.id}
                  compactTime={!item.time.includes(':')}
                />
              ))}
          </div>
        </section>
      ))}

      <section className="legend">
        <h2>图例 · Legend</h2>
        <div className="legend-grid">
          <LegendItem swatch="sw-green" label="已预订 Booked" />
          <LegendItem swatch="sw-cyan" label="计划中 Planned" />
          <LegendItem swatch="sw-amber" label="关注 Watch" />
          <LegendItem swatch="sw-cyan" label="交通" />
          <LegendItem swatch="sw-yellow" label="用餐" />
          <LegendItem swatch="sw-magenta" label="活动" />
          <LegendItem swatch="sw-violet" label="酒店" />
          <LegendItem swatch="sw-green" label="杂项" />
        </div>
      </section>

      <p className="foot">LAX → LACC → Diamond Bar · 主方案落空就走备用 · 一路平安</p>
    </>
  )
}

function SummaryStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="stat">
      <div className={`num ${tone}`}>{value}</div>
      <div className="lbl">{label}</div>
    </div>
  )
}

function TicketStop({
  item,
  stopNumber,
  compactTime,
}: {
  item: TripItem
  stopNumber: number
  compactTime: boolean
}) {
  const category = categoryMeta[item.category]
  const isDarkStub = item.category === 'event' || item.category === 'hotel'

  return (
    <article className={`stop ${category.className}`}>
      <div className="pin">{stopNumber}</div>
      <div className="ticket">
        <div className={`stub ${category.className} ${isDarkStub ? 'stub-dark' : ''}`}>
          <span className="perf-notch top" />
          <span className="perf-notch bot" />
          <div>
            <div className={`s-time ${compactTime ? 's-time-compact' : ''}`}>{item.time}</div>
            <div className="s-sub">{item.subTime}</div>
          </div>
          <div className="s-cat">{category.label}</div>
        </div>
        <div className="tbody">
          <div className="tbody-head">
            <h2 className="t-title">{item.title}</h2>
            <span className={`status ${item.status}`}>{statusLabel[item.status]}</span>
          </div>
          <div className="t-loc">{item.location}</div>
          <a
            className="t-addr"
            href={appleMapsUrl(`${item.location}, ${item.address}`)}
            target="_blank"
            rel="noreferrer"
          >
            {item.address}
          </a>
          <div className="plans">
            <Plan kind="main" label="主方案" text={item.parkingPrimary} />
            <Plan kind="alt" label="备用" text={item.parkingBackup} />
          </div>
        </div>
      </div>
    </article>
  )
}

function Plan({ kind, label, text }: { kind: 'main' | 'alt'; label: string; text: string }) {
  return (
    <div className={`plan ${kind}`}>
      <span className="pk">{label}</span>
      <span className="pt">{text}</span>
    </div>
  )
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="lg-item">
      <span className={`lg-sw ${swatch}`} />
      {label}
    </div>
  )
}
