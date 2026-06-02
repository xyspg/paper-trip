import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

type View = 'overview' | 'timeline' | 'places' | 'checklist' | 'export'
type ItemStatus = 'planned' | 'booked' | 'watch' | 'done'
type Category = 'travel' | 'food' | 'event' | 'hotel' | 'parking' | 'errand'

type TripDay = {
  id: string
  date: string
  label: string
  base: string
  note: string
}

type TripItem = {
  id: string
  dayId: string
  time: string
  leaveBy?: string
  title: string
  category: Category
  location: string
  address: string
  parkingPrimary?: string
  parkingBackup?: string
  cost?: string
  confirmation?: string
  notes: string[]
  links: string[]
  status: ItemStatus
}

type ChecklistItem = {
  id: string
  group: string
  label: string
  done: boolean
}

type TripState = {
  items: TripItem[]
  checklist: ChecklistItem[]
}

type DraftItem = {
  dayId: string
  time: string
  leaveBy: string
  title: string
  category: Category
  location: string
  address: string
  parkingPrimary: string
  parkingBackup: string
  cost: string
  confirmation: string
  notes: string
  links: string
}

const storageKey = 'trip-ops-web-state-v1'

const days: TripDay[] = [
  {
    id: 'jul-03',
    date: '2026-07-03',
    label: 'Arrival + AX day one',
    base: 'Holiday Inn Diamond Bar - Pomona',
    note: 'Rental pickup, food stop, badge logistics, and first downtown parking decision.',
  },
  {
    id: 'jul-04',
    date: '2026-07-04',
    label: 'Anime Expo full day',
    base: 'Los Angeles Convention Center',
    note: 'Queue heat, long garage exits, and a hard evening fallback route.',
  },
  {
    id: 'jul-05',
    date: '2026-07-05',
    label: 'Departure buffer',
    base: 'ONT / LAX route decision',
    note: 'Checkout, fuel, rental inspection photos, and airport timing.',
  },
]

const seedItems: TripItem[] = [
  {
    id: 'flight-arrival',
    dayId: 'jul-03',
    time: '08:53',
    leaveBy: '10:20',
    title: 'Arrive at LAX',
    category: 'travel',
    location: 'Los Angeles International Airport',
    address: '1 World Way, Los Angeles, CA',
    parkingPrimary: 'Hertz shuttle from terminal arrivals level',
    parkingBackup: 'Use LAX-it rideshare only if rental counter is delayed hard',
    cost: 'Rental + airport fees',
    confirmation: 'Add airline and Hertz confirmation',
    notes: ['Screenshot baggage claim and rental shuttle details', 'If rental line is slow, skip food stop'],
    links: ['https://www.flylax.com/'],
    status: 'booked',
  },
  {
    id: 'in-n-out',
    dayId: 'jul-03',
    time: '10:45',
    leaveBy: '11:35',
    title: 'In-N-Out LAX stop',
    category: 'food',
    location: 'In-N-Out Burger',
    address: '9149 S Sepulveda Blvd, Los Angeles, CA',
    parkingPrimary: 'Restaurant lot; circle once before giving up',
    parkingBackup: 'Skip and eat near LACC if lot is packed',
    cost: '$15-25',
    notes: ['Keep luggage hidden before parking', 'Plane photos only if the line is sane'],
    links: ['https://maps.google.com/?q=9149+S+Sepulveda+Blvd+Los+Angeles'],
    status: 'planned',
  },
  {
    id: 'ax-lacc-day1',
    dayId: 'jul-03',
    time: '12:30',
    leaveBy: '19:00',
    title: 'Anime Expo badge + first sweep',
    category: 'event',
    location: 'Los Angeles Convention Center',
    address: '1201 S Figueroa St, Los Angeles, CA',
    parkingPrimary: 'LACC West Hall Garage',
    parkingBackup: 'LA Live parking, then walk; Little Tokyo + Metro if downtown is locked',
    cost: '$25-60 parking',
    confirmation: 'Add AX badge QR / pickup notes',
    notes: ['Hide bags before entering downtown', 'Set a hard exit time before hotel check-in', 'Screenshot badge pickup map'],
    links: ['https://www.anime-expo.org/'],
    status: 'watch',
  },
  {
    id: 'hotel-checkin',
    dayId: 'jul-03',
    time: '20:15',
    title: 'Hotel check-in',
    category: 'hotel',
    location: 'Holiday Inn Diamond Bar - Pomona',
    address: '21725 Gateway Center Dr, Diamond Bar, CA',
    parkingPrimary: 'Hotel surface lot',
    parkingBackup: 'Ask desk about overflow before unloading',
    confirmation: 'Add IHG confirmation',
    notes: ['Charge devices', 'Prep badge, cash, water, and parking screenshots for tomorrow'],
    links: [],
    status: 'booked',
  },
  {
    id: 'ax-full-day',
    dayId: 'jul-04',
    time: '08:30',
    leaveBy: '21:30',
    title: 'Anime Expo full day',
    category: 'event',
    location: 'Los Angeles Convention Center',
    address: '1201 S Figueroa St, Los Angeles, CA',
    parkingPrimary: 'Prebook downtown garage if possible',
    parkingBackup: 'Union Station / Little Tokyo parking + Metro A/E line',
    cost: '$35-70 parking + food',
    notes: ['Arrive with water already filled', 'Pick one must-see panel and one backup', 'Leave before surge if exhausted'],
    links: [],
    status: 'planned',
  },
  {
    id: 'checkout-buffer',
    dayId: 'jul-05',
    time: '09:00',
    leaveBy: '10:30',
    title: 'Pack, checkout, rental fuel check',
    category: 'errand',
    location: 'Hotel base',
    address: '21725 Gateway Center Dr, Diamond Bar, CA',
    parkingPrimary: 'Hotel lot while loading',
    parkingBackup: 'Front desk short stop if lot is full',
    notes: ['Check drawers, chargers, badge, wallet, rental receipt', 'Photograph rental car exterior before leaving'],
    links: [],
    status: 'planned',
  },
]

const seedChecklist: ChecklistItem[] = [
  { id: 'badge', group: 'AX carry', label: 'Badge / QR code / ID', done: false },
  { id: 'battery', group: 'AX carry', label: 'Battery pack and short cable', done: false },
  { id: 'water', group: 'AX carry', label: 'Water bottle and electrolyte packet', done: false },
  { id: 'parking-shots', group: 'Before driving', label: 'Parking screenshots saved offline', done: false },
  { id: 'bags', group: 'Before parking', label: 'Bags hidden before reaching downtown', done: false },
  { id: 'fuel', group: 'Departure', label: 'Fuel level and rental return address checked', done: false },
]

const emptyDraft: DraftItem = {
  dayId: days[0].id,
  time: '13:00',
  leaveBy: '',
  title: '',
  category: 'event',
  location: '',
  address: '',
  parkingPrimary: '',
  parkingBackup: '',
  cost: '',
  confirmation: '',
  notes: '',
  links: '',
}

const inputClass = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-950 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15'
const labelClass = 'grid gap-1.5 text-xs font-black uppercase text-stone-500'
const panelClass = 'rounded-lg border border-stone-200 bg-white/90 shadow-[0_16px_44px_rgba(35,45,42,0.08)]'
const buttonBase = 'inline-flex min-h-10 items-center justify-center rounded-lg border px-3 text-sm font-black transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-teal-700/15'
const ghostButton = `${buttonBase} border-stone-200 bg-white text-stone-800 hover:border-stone-950`
const primaryButton = `${buttonBase} border-stone-950 bg-stone-950 text-white hover:bg-stone-800`
const dangerButton = `${buttonBase} border-red-200 bg-red-50 text-red-800 hover:border-red-300`

function loadState(): TripState {
  if (typeof window === 'undefined') return { items: seedItems, checklist: seedChecklist }

  try {
    const saved = window.localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved) as TripState
      if (Array.isArray(parsed.items) && Array.isArray(parsed.checklist)) return parsed
    }
  } catch {
    window.localStorage.removeItem(storageKey)
  }

  return { items: seedItems, checklist: seedChecklist }
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function statusLabel(status: ItemStatus) {
  const labels: Record<ItemStatus, string> = {
    planned: 'Planned',
    booked: 'Booked',
    watch: 'Watch',
    done: 'Done',
  }
  return labels[status]
}

function categoryLabel(category: Category) {
  const labels: Record<Category, string> = {
    travel: 'Travel',
    food: 'Food',
    event: 'Event',
    hotel: 'Hotel',
    parking: 'Parking',
    errand: 'Errand',
  }
  return labels[category]
}

function statusClass(status: ItemStatus) {
  const classes: Record<ItemStatus, string> = {
    planned: 'bg-sky-50 text-sky-800 ring-sky-200',
    booked: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    watch: 'bg-amber-50 text-amber-800 ring-amber-200',
    done: 'bg-stone-100 text-stone-600 ring-stone-200',
  }
  return classes[status]
}

function buildMarkdown(items: TripItem[], checklist: ChecklistItem[]) {
  const lines = ['# Anime Expo 2026 Trip Ops', '']

  for (const day of days) {
    const dayItems = items
      .filter((item) => item.dayId === day.id)
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time))

    lines.push(`## ${dateLabel(day.date)} - ${day.label}`, '')
    lines.push(`Base: ${day.base}`)
    lines.push(`Field note: ${day.note}`, '')

    for (const item of dayItems) {
      lines.push(`### ${item.time} ${item.title}`)
      lines.push(`- Status: ${statusLabel(item.status)}`)
      lines.push(`- Category: ${categoryLabel(item.category)}`)
      lines.push(`- Location: ${item.location}`)
      lines.push(`- Address: ${item.address}`)
      if (item.leaveBy) lines.push(`- Leave by: ${item.leaveBy}`)
      if (item.parkingPrimary) lines.push(`- Parking: ${item.parkingPrimary}`)
      if (item.parkingBackup) lines.push(`- Backup parking: ${item.parkingBackup}`)
      if (item.cost) lines.push(`- Cost: ${item.cost}`)
      if (item.confirmation) lines.push(`- Confirmation: ${item.confirmation}`)
      if (item.links.length) lines.push(`- Links: ${item.links.join(', ')}`)
      if (item.notes.length) {
        lines.push('- Notes:')
        for (const note of item.notes) lines.push(`  - ${note}`)
      }
      lines.push('')
    }
  }

  lines.push('## Checklist', '')
  for (const item of checklist) lines.push(`- [${item.done ? 'x' : ' '}] ${item.group}: ${item.label}`)
  return lines.join('\n')
}

function mapsUrl(item: TripItem) {
  const query = encodeURIComponent(item.address || item.location)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function App() {
  const [{ items, checklist }, setTripState] = useState<TripState>(() => loadState())
  const [selectedDayId, setSelectedDayId] = useState(days[0].id)
  const [activeView, setActiveView] = useState<View>('overview')
  const [draft, setDraft] = useState<DraftItem>(emptyDraft)
  const [exportStatus, setExportStatus] = useState('Ready')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ items, checklist }))
  }, [items, checklist])

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0]
  const sortedItems = useMemo(
    () => items.slice().sort((a, b) => `${a.dayId}-${a.time}`.localeCompare(`${b.dayId}-${b.time}`)),
    [items],
  )
  const dayItems = useMemo(
    () => sortedItems.filter((item) => item.dayId === selectedDayId),
    [selectedDayId, sortedItems],
  )
  const upcomingItems = useMemo(
    () => sortedItems.filter((item) => item.status !== 'done').slice(0, 4),
    [sortedItems],
  )
  const markdown = useMemo(() => buildMarkdown(sortedItems, checklist), [sortedItems, checklist])
  const doneCount = checklist.filter((item) => item.done).length
  const parkingCount = items.filter((item) => item.parkingPrimary || item.parkingBackup).length
  const completion = Math.round((doneCount / checklist.length) * 100)

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.title.trim()) return

    const item: TripItem = {
      id: `item-${Date.now()}`,
      dayId: draft.dayId,
      time: draft.time || '12:00',
      leaveBy: draft.leaveBy.trim() || undefined,
      title: draft.title.trim(),
      category: draft.category,
      location: draft.location.trim() || draft.title.trim(),
      address: draft.address.trim(),
      parkingPrimary: draft.parkingPrimary.trim() || undefined,
      parkingBackup: draft.parkingBackup.trim() || undefined,
      cost: draft.cost.trim() || undefined,
      confirmation: draft.confirmation.trim() || undefined,
      notes: draft.notes.split('\n').map((note) => note.trim()).filter(Boolean),
      links: draft.links.split('\n').map((link) => link.trim()).filter(Boolean),
      status: 'planned',
    }

    setTripState((state) => ({ ...state, items: [...state.items, item] }))
    setSelectedDayId(draft.dayId)
    setActiveView('timeline')
    setDraft({ ...emptyDraft, dayId: draft.dayId, time: draft.time })
  }

  function updateStatus(id: string, status: ItemStatus) {
    setTripState((state) => ({
      ...state,
      items: state.items.map((item) => (item.id === id ? { ...item, status } : item)),
    }))
  }

  function removeItem(id: string) {
    setTripState((state) => ({ ...state, items: state.items.filter((item) => item.id !== id) }))
  }

  function toggleChecklist(id: string) {
    setTripState((state) => ({
      ...state,
      checklist: state.checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    }))
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown)
    setExportStatus('Copied')
    window.setTimeout(() => setExportStatus('Ready'), 1400)
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'anime-expo-2026-trip-ops.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  function resetDemo() {
    setTripState({ items: seedItems, checklist: seedChecklist })
    setDraft(emptyDraft)
    setSelectedDayId(days[0].id)
    setActiveView('overview')
  }

  return (
    <main className="min-h-svh bg-[#eef2f0] text-stone-800">
      <header className="mx-auto grid w-[min(1440px,calc(100%-2rem))] gap-6 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:w-[min(1440px,calc(100%-2.5rem))]">
        <div>
          <p className="mb-2 text-xs font-black uppercase text-stone-500">Trip Ops</p>
          <h1 className="text-5xl font-black leading-[0.93] tracking-normal text-stone-950 md:text-7xl">Anime Expo 2026</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-stone-600 md:text-base">LAX arrival, downtown parking, badge logistics, hotel base, and departure buffer.</p>
        </div>
        <nav className="flex flex-wrap gap-2 md:justify-end" aria-label="Trip views">
          {(['overview', 'timeline', 'places', 'checklist', 'export'] as View[]).map((view) => (
            <button
              key={view}
              className={activeView === view ? primaryButton : ghostButton}
              type="button"
              onClick={() => setActiveView(view)}
            >
              {view}
            </button>
          ))}
        </nav>
      </header>

      <section className="mx-auto mb-3 grid w-[min(1440px,calc(100%-2rem))] gap-3 md:grid-cols-2 xl:grid-cols-[1.35fr_repeat(3,minmax(0,1fr))] lg:w-[min(1440px,calc(100%-2.5rem))]" aria-label="Trip summary">
        <div className={`${panelClass} grid min-h-36 gap-4 overflow-hidden p-4 sm:grid-cols-[220px_minmax(0,1fr)]`}>
          <div className="flex flex-col justify-between gap-4">
            <span className="text-xs font-black uppercase text-stone-500">Route</span>
            <strong className="text-2xl font-black leading-tight text-stone-950">{'LAX -> LACC -> Diamond Bar'}</strong>
          </div>
          <div className="relative min-h-32 overflow-hidden rounded-lg border border-teal-100 bg-[#f4f9f7] [background-image:linear-gradient(90deg,rgba(26,103,121,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(26,103,121,.08)_1px,transparent_1px)] [background-size:24px_24px]">
            <span className="absolute left-[16%] bottom-[24%] z-10 grid h-8 min-w-12 place-items-center rounded-full border-2 border-white bg-blue-800 px-2 text-xs font-black text-white shadow-lg">LAX</span>
            <span className="absolute left-[46%] top-[20%] z-10 grid h-8 min-w-12 place-items-center rounded-full border-2 border-white bg-red-700 px-2 text-xs font-black text-white shadow-lg">AX</span>
            <span className="absolute right-[10%] bottom-[18%] z-10 grid h-8 min-w-14 place-items-center rounded-full border-2 border-white bg-emerald-700 px-2 text-xs font-black text-white shadow-lg">Hotel</span>
            <span className="absolute left-[18%] right-[16%] top-1/2 h-1 -rotate-12 rounded-full bg-teal-800" />
          </div>
        </div>
        <SummaryCard label="Timeline" value={`${items.length} stops`} detail={`${days.length} operating days`} />
        <SummaryCard label="Parking intel" value={`${parkingCount} plans`} detail="primary and backup fields" />
        <SummaryCard label="Checklist" value={`${completion}% ready`} detail={`${doneCount} of ${checklist.length} done`} />
      </section>

      <div className="mx-auto grid w-[min(1440px,calc(100%-2rem))] gap-3 pb-8 lg:w-[min(1440px,calc(100%-2.5rem))] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`${panelClass} self-start overflow-hidden`} aria-label="Trip controls">
          <section className="border-b border-stone-200 p-4">
            <h2 className="mb-3 text-base font-black text-stone-950">Days</h2>
            <div className="grid gap-2">
              {days.map((day) => (
                <button
                  key={day.id}
                  className={`grid gap-1 rounded-lg border p-3 text-left transition hover:border-teal-700 ${selectedDayId === day.id ? 'border-teal-700 bg-teal-50' : 'border-stone-200 bg-white'}`}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                >
                  <span className="text-xs font-black uppercase text-stone-500">{dateLabel(day.date)}</span>
                  <strong className="text-sm font-black text-stone-950">{day.label}</strong>
                </button>
              ))}
            </div>
          </section>

          <form className="grid gap-3 p-4" onSubmit={addItem}>
            <h2 className="text-base font-black text-stone-950">Add detail</h2>
            <label className={labelClass}>
              Day
              <select className={inputClass} value={draft.dayId} onChange={(event) => setDraft({ ...draft, dayId: event.target.value })}>
                {days.map((day) => <option key={day.id} value={day.id}>{dateLabel(day.date)}</option>)}
              </select>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={labelClass}>
                Time
                <input className={inputClass} type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} />
              </label>
              <label className={labelClass}>
                Leave by
                <input className={inputClass} type="time" value={draft.leaveBy} onChange={(event) => setDraft({ ...draft, leaveBy: event.target.value })} />
              </label>
            </div>
            <label className={labelClass}>
              Title
              <input className={inputClass} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Prebook parking" />
            </label>
            <label className={labelClass}>
              Category
              <select className={inputClass} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}>
                <option value="event">Event</option>
                <option value="parking">Parking</option>
                <option value="travel">Travel</option>
                <option value="food">Food</option>
                <option value="hotel">Hotel</option>
                <option value="errand">Errand</option>
              </select>
            </label>
            <label className={labelClass}>
              Location
              <input className={inputClass} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="LACC West Hall Garage" />
            </label>
            <label className={labelClass}>
              Address
              <input className={inputClass} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="1201 S Figueroa St" />
            </label>
            <label className={labelClass}>
              Primary parking
              <input className={inputClass} value={draft.parkingPrimary} onChange={(event) => setDraft({ ...draft, parkingPrimary: event.target.value })} placeholder="Garage, floor, entrance" />
            </label>
            <label className={labelClass}>
              Backup parking
              <input className={inputClass} value={draft.parkingBackup} onChange={(event) => setDraft({ ...draft, parkingBackup: event.target.value })} placeholder="Fallback lot or transit plan" />
            </label>
            <label className={labelClass}>
              Notes
              <textarea className={inputClass} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="One note per line" rows={4} />
            </label>
            <button className={primaryButton} type="submit">Add stop</button>
          </form>
        </aside>

        <section className={`${panelClass} min-w-0 p-4`}>
          {activeView === 'overview' && (
            <ViewStack>
              <SectionHead eyebrow="Now board" title="Next operating moves" action={<button type="button" className={ghostButton} onClick={() => setActiveView('timeline')}>Open timeline</button>} />
              <div className="grid gap-3 lg:grid-cols-2">
                {upcomingItems.map((item) => <OpsCard key={item.id} item={item} />)}
              </div>
            </ViewStack>
          )}

          {activeView === 'timeline' && (
            <ViewStack>
              <SectionHead eyebrow={dateLabel(selectedDay.date)} title={selectedDay.label} detail={`${selectedDay.base} · ${selectedDay.note}`} />
              <div className="grid gap-4">
                {dayItems.map((item) => (
                  <article className="grid gap-3 md:grid-cols-[112px_minmax(0,1fr)]" key={item.id}>
                    <div className="grid content-start gap-1 border-l-4 border-teal-700 pl-3">
                      <strong className="text-xl font-black text-stone-950">{item.time}</strong>
                      {item.leaveBy && <span className="text-xs font-black uppercase text-stone-500">leave {item.leaveBy}</span>}
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-white p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-black uppercase text-stone-600">{categoryLabel(item.category)}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <h3 className="text-lg font-black text-stone-950">{item.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-stone-600">{item.location}</p>
                      <div className="mt-4 grid gap-2 lg:grid-cols-2">
                        <Detail label="Address" value={item.address || 'Not set'} />
                        <Detail label="Parking" value={item.parkingPrimary || 'Not set'} />
                        <Detail label="Backup" value={item.parkingBackup || 'Not set'} />
                        <Detail label="Cost / confirmation" value={item.cost || item.confirmation || 'Not set'} />
                      </div>
                      {item.notes.length > 0 && (
                        <ul className="mt-4 grid gap-1.5 pl-5 text-sm font-semibold text-stone-700">
                          {item.notes.map((note) => <li className="list-disc" key={note}>{note}</li>)}
                        </ul>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a className={ghostButton} href={mapsUrl(item)} target="_blank" rel="noreferrer">Map</a>
                        <button type="button" className={ghostButton} onClick={() => updateStatus(item.id, 'done')}>Done</button>
                        <button type="button" className={ghostButton} onClick={() => updateStatus(item.id, 'watch')}>Watch</button>
                        <button type="button" className={dangerButton} onClick={() => removeItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </ViewStack>
          )}

          {activeView === 'places' && (
            <ViewStack>
              <SectionHead eyebrow="Places" title="Parking-first location list" />
              <div className="grid gap-3 lg:grid-cols-2">
                {sortedItems.map((item) => (
                  <article className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4" key={item.id}>
                    <span className="w-fit rounded-full bg-stone-100 px-2.5 py-1 text-xs font-black uppercase text-stone-600">{categoryLabel(item.category)}</span>
                    <div>
                      <h3 className="text-lg font-black text-stone-950">{item.location}</h3>
                      <p className="mt-1 text-sm font-semibold text-stone-600">{item.address}</p>
                    </div>
                    <div className="grid gap-1 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
                      <strong className="text-stone-950">{item.parkingPrimary || 'Primary parking needed'}</strong>
                      <span className="font-semibold text-stone-600">{item.parkingBackup || 'Backup not set'}</span>
                    </div>
                    <a className="text-sm font-black text-teal-800 underline-offset-4 hover:underline" href={mapsUrl(item)} target="_blank" rel="noreferrer">Open map</a>
                  </article>
                ))}
              </div>
            </ViewStack>
          )}

          {activeView === 'checklist' && (
            <ViewStack>
              <SectionHead eyebrow="Checklist" title={`${doneCount} / ${checklist.length} ready`} />
              <div className="grid gap-2">
                {checklist.map((item) => (
                  <label className={`grid cursor-pointer items-center gap-3 rounded-lg border border-stone-200 p-4 sm:grid-cols-[24px_130px_minmax(0,1fr)] ${item.done ? 'bg-emerald-50/70' : 'bg-white'}`} key={item.id}>
                    <input className="h-5 w-5 accent-teal-800" type="checkbox" checked={item.done} onChange={() => toggleChecklist(item.id)} />
                    <span className="text-xs font-black uppercase text-stone-500">{item.group}</span>
                    <strong className={`text-sm text-stone-950 ${item.done ? 'text-stone-500 line-through' : ''}`}>{item.label}</strong>
                  </label>
                ))}
              </div>
            </ViewStack>
          )}

          {activeView === 'export' && (
            <ViewStack>
              <SectionHead
                eyebrow="Markdown"
                title="Repo-ready trip file"
                detail={`Status: ${exportStatus}`}
                action={
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={ghostButton} onClick={copyMarkdown}>Copy</button>
                    <button type="button" className={primaryButton} onClick={downloadMarkdown}>Download</button>
                    <button type="button" className={dangerButton} onClick={resetDemo}>Reset</button>
                  </div>
                }
              />
              <textarea className="min-h-[580px] w-full rounded-lg border border-stone-300 bg-white/80 p-4 font-mono text-sm leading-6 text-stone-900 outline-none focus:ring-4 focus:ring-teal-700/15" value={markdown} readOnly />
            </ViewStack>
          )}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className={`${panelClass} flex min-h-36 flex-col justify-between p-4`}>
      <span className="text-xs font-black uppercase text-stone-500">{label}</span>
      <div>
        <strong className="block text-3xl font-black leading-none text-stone-950">{value}</strong>
        <small className="mt-2 block text-sm font-bold text-stone-500">{detail}</small>
      </div>
    </div>
  )
}

function ViewStack({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>
}

function SectionHead({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-stone-200 pb-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-stone-500">{eyebrow}</p>
        <h2 className="text-3xl font-black leading-tight text-stone-950">{title}</h2>
        {detail && <p className="mt-2 max-w-3xl text-sm font-semibold text-stone-600">{detail}</p>}
      </div>
      {action}
    </section>
  )
}

function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ring-1 ${statusClass(status)}`}>{statusLabel(status)}</span>
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <span className="text-xs font-black uppercase text-stone-500">{label}</span>
      <strong className="text-sm font-black leading-snug text-stone-950">{value}</strong>
    </div>
  )
}

function OpsCard({ item }: { item: TripItem }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase text-stone-500">{item.time}</span>
        <StatusBadge status={item.status} />
      </div>
      <h3 className="text-lg font-black text-stone-950">{item.title}</h3>
      <p className="mt-1 text-sm font-semibold text-stone-600">{item.location}</p>
      <dl className="mt-4 grid gap-2">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <dt className="text-xs font-black uppercase text-stone-500">Parking</dt>
          <dd className="mt-1 text-sm font-black text-stone-950">{item.parkingPrimary || 'Add primary plan'}</dd>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <dt className="text-xs font-black uppercase text-stone-500">Backup</dt>
          <dd className="mt-1 text-sm font-black text-stone-950">{item.parkingBackup || 'Add backup plan'}</dd>
        </div>
      </dl>
    </article>
  )
}

export default App
