import {
  BadgeCheck,
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Download,
  FileText,
  Flag,
  Hotel,
  LinkIcon,
  Map,
  MapPin,
  Navigation,
  ParkingCircle,
  Plane,
  RotateCcw,
  Save,
  ShieldAlert,
  SquarePen,
  Utensils,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import './App.css'
import {
  downloadText,
  formatDate,
  formatDuration,
  groupItemsByDate,
  toMarkdown,
} from './trip/exporters'
import {
  useReplaceTrip,
  useResetTrip,
  useSaveTripItem,
  useSetChecklistItem,
  useSetTripItemStatus,
  useTrip,
} from './trip/hooks'
import type { Checklist, ItemStatus, Trip, TripItem } from './trip/types'

const categoryIcon = {
  flight: Plane,
  food: Utensils,
  event: Flag,
  hotel: Hotel,
  drive: Car,
  errand: BadgeCheck,
}

const categoryLabel = {
  flight: 'Flight',
  food: 'Food',
  event: 'Event',
  hotel: 'Hotel',
  drive: 'Drive',
  errand: 'Errand',
}

const statusOrder: ItemStatus[] = ['planned', 'locked', 'done']

const statusLabel: Record<ItemStatus, string> = {
  planned: 'Planned',
  locked: 'Locked',
  done: 'Done',
}

function App() {
  const tripQuery = useTrip()
  const setStatus = useSetTripItemStatus()
  const saveItem = useSaveTripItem()
  const resetTrip = useResetTrip()
  const replaceTrip = useReplaceTrip()
  const setChecklistItem = useSetChecklistItem()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [importText, setImportText] = useState('')

  const trip = tripQuery.data

  const days = useMemo(() => groupItemsByDate(trip?.items ?? []), [trip?.items])
  const dates = useMemo(() => Object.keys(days).sort(), [days])
  const sortedItems = useMemo(
    () =>
      [...(trip?.items ?? [])].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
      ),
    [trip?.items],
  )

  const nextItem = sortedItems.find((item) => item.status !== 'done') ?? sortedItems[0]
  const selectedItem =
    sortedItems.find((item) => item.id === selectedItemId) ?? nextItem ?? sortedItems[0]
  const selectedDate = activeDate ?? selectedItem?.date ?? dates[0]
  const activeItems = days[selectedDate] ?? []

  if (tripQuery.isLoading || !trip) {
    return (
      <main className="loading-shell">
        <CircleDot className="spin" aria-hidden="true" />
        <span>Loading trip</span>
      </main>
    )
  }

  const completedCount = trip.items.filter((item) => item.status === 'done').length
  const checklistTotal = trip.checklists.reduce((total, list) => total + list.items.length, 0)
  const checklistDone = trip.checklists.reduce(
    (total, list) => total + list.items.filter((item) => item.checked).length,
    0,
  )
  const highPriorityOpen = trip.items.filter(
    (item) => item.priority === 'high' && item.status !== 'done',
  ).length
  const totalCost = trip.items.reduce((total, item) => total + (item.costEstimate ?? 0), 0)

  const handleExportMarkdown = () => {
    downloadText(`${trip.id}.md`, toMarkdown(trip), 'text/markdown')
  }

  const handleExportJson = () => {
    downloadText(`${trip.id}.json`, JSON.stringify(trip, null, 2), 'application/json')
  }

  const handleImport = () => {
    const parsed = JSON.parse(importText) as Trip
    replaceTrip.mutate(parsed)
    setImportText('')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Trip Ops</p>
          <h1>{trip.title}</h1>
          <p className="subtitle">{trip.subtitle}</p>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost-button" onClick={handleExportMarkdown}>
            <Download size={18} aria-hidden="true" />
            Markdown
          </button>
          <button type="button" className="ghost-button" onClick={handleExportJson}>
            <Download size={18} aria-hidden="true" />
            JSON
          </button>
          <button type="button" className="icon-button" onClick={() => resetTrip.mutate()}>
            <RotateCcw size={18} aria-hidden="true" />
            <span className="sr-only">Reset trip</span>
          </button>
        </div>
      </header>

      <section className="hero-band">
        <div className="trip-summary">
          <div>
            <span className="metric-label">Dates</span>
            <strong>
              {formatDate(trip.dates.start)} - {formatDate(trip.dates.end)}
            </strong>
          </div>
          <div>
            <span className="metric-label">Base</span>
            <strong>{trip.base.hotel}</strong>
          </div>
          <div>
            <span className="metric-label">Car</span>
            <strong>{trip.base.car}</strong>
          </div>
        </div>
        <div className="metric-grid">
          <Metric label="Timeline" value={`${completedCount}/${trip.items.length}`} />
          <Metric label="Checklist" value={`${checklistDone}/${checklistTotal}`} />
          <Metric label="Priority" value={String(highPriorityOpen)} />
          <Metric label="Budget" value={`$${totalCost}`} />
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="sidebar">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Days</p>
              <h2>Timeline</h2>
            </div>
            <CalendarDays size={20} aria-hidden="true" />
          </div>
          <div className="date-tabs" role="tablist" aria-label="Trip days">
            {dates.map((date) => (
              <button
                key={date}
                type="button"
                className={date === selectedDate ? 'date-tab active' : 'date-tab'}
                onClick={() => setActiveDate(date)}
              >
                <span>{formatDate(date)}</span>
                <strong>{days[date]?.length ?? 0}</strong>
              </button>
            ))}
          </div>
          <div className="timeline-list">
            {activeItems.map((item) => (
              <TimelineItem
                key={item.id}
                item={item}
                selected={item.id === selectedItem.id}
                onSelect={() => setSelectedItemId(item.id)}
                onStatus={(status) => setStatus.mutate({ itemId: item.id, status })}
              />
            ))}
          </div>
        </aside>

        <section className="main-column">
          <NextUp item={nextItem} />
          <MapPanel trip={trip} selectedItemId={selectedItem.id} onSelect={setSelectedItemId} />
          <ChecklistPanel
            checklists={trip.checklists}
            onToggle={(checklistId, item) => setChecklistItem.mutate({ checklistId, item })}
          />
        </section>

        <aside className="detail-column">
          <ItemEditor
            key={selectedItem.id}
            item={selectedItem}
            onSave={(item) => saveItem.mutate(item)}
          />
          <DocumentsPanel trip={trip} importText={importText} onImportText={setImportText} onImport={handleImport} />
        </aside>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function TimelineItem({
  item,
  selected,
  onSelect,
  onStatus,
}: {
  item: TripItem
  selected: boolean
  onSelect: () => void
  onStatus: (status: ItemStatus) => void
}) {
  const Icon = categoryIcon[item.category]

  return (
    <article className={selected ? 'timeline-item selected' : 'timeline-item'}>
      <button type="button" className="timeline-main" onClick={onSelect}>
        <span className={`category-dot ${item.category}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <span>
          <span className="timeline-time">{item.time}</span>
          <strong>{item.title}</strong>
          <small>{item.location}</small>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
      <div className="status-strip">
        {statusOrder.map((status) => (
          <button
            key={status}
            type="button"
            className={item.status === status ? 'status-pill active' : 'status-pill'}
            onClick={() => onStatus(status)}
          >
            {statusLabel[status]}
          </button>
        ))}
      </div>
    </article>
  )
}

function NextUp({ item }: { item?: TripItem }) {
  if (!item) {
    return null
  }

  const Icon = categoryIcon[item.category]

  return (
    <section className="panel next-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Next up</p>
          <h2>{item.title}</h2>
        </div>
        <span className={`category-dot ${item.category}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
      <div className="next-grid">
        <InfoChip icon={Clock3} label={`${formatDate(item.date)} at ${item.time}`} />
        <InfoChip icon={MapPin} label={item.location} />
        <InfoChip icon={Flag} label={categoryLabel[item.category]} />
        {item.leaveBy ? <InfoChip icon={Navigation} label={`Leave by ${item.leaveBy}`} /> : null}
      </div>
      <div className="note-stack">
        {item.notes.slice(0, 3).map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
    </section>
  )
}

function InfoChip({
  icon: Icon,
  label,
}: {
  icon: typeof Clock3
  label: string
}) {
  return (
    <span className="info-chip">
      <Icon size={16} aria-hidden="true" />
      {label}
    </span>
  )
}

function MapPanel({
  trip,
  selectedItemId,
  onSelect,
}: {
  trip: Trip
  selectedItemId: string
  onSelect: (id: string) => void
}) {
  const places = trip.items.filter((item) => item.address)

  return (
    <section className="panel map-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Places</p>
          <h2>Route board</h2>
        </div>
        <Map size={20} aria-hidden="true" />
      </div>
      <div className="route-board">
        {places.map((item, index) => {
          const Icon = categoryIcon[item.category]
          return (
            <button
              type="button"
              key={item.id}
              className={item.id === selectedItemId ? 'route-pin active' : 'route-pin'}
              style={{
                '--x': `${14 + ((index * 23) % 70)}%`,
                '--y': `${18 + ((index * 31) % 58)}%`,
              } as CSSProperties}
              onClick={() => onSelect(item.id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{index + 1}</span>
            </button>
          )
        })}
      </div>
      <div className="place-list">
        {places.slice(0, 5).map((item) => (
          <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
            <MapPin size={16} aria-hidden="true" />
            <span>{item.location}</span>
            <small>{item.time}</small>
          </button>
        ))}
      </div>
    </section>
  )
}

function ChecklistPanel({
  checklists,
  onToggle,
}: {
  checklists: Checklist[]
  onToggle: (checklistId: string, item: Checklist['items'][number]) => void
}) {
  return (
    <section className="panel checklist-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ready</p>
          <h2>Checklists</h2>
        </div>
        <Check size={20} aria-hidden="true" />
      </div>
      <div className="checklist-grid">
        {checklists.map((checklist) => (
          <div className="checklist" key={checklist.id}>
            <h3>{checklist.title}</h3>
            {checklist.items.map((item) => (
              <label key={item.id} className="check-row">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) =>
                    onToggle(checklist.id, { ...item, checked: event.currentTarget.checked })
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function ItemEditor({
  item,
  onSave,
}: {
  item: TripItem
  onSave: (item: TripItem) => void
}) {
  const [draft, setDraft] = useState(item)

  return (
    <section className="panel editor-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Details</p>
          <h2>{draft.title}</h2>
        </div>
        <SquarePen size={20} aria-hidden="true" />
      </div>

      <div className="form-grid">
        <label>
          <span>Title</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
          />
        </label>
        <label>
          <span>Time</span>
          <input
            value={draft.time}
            onChange={(event) => setDraft({ ...draft, time: event.currentTarget.value })}
          />
        </label>
        <label>
          <span>Location</span>
          <input
            value={draft.location}
            onChange={(event) => setDraft({ ...draft, location: event.currentTarget.value })}
          />
        </label>
        <label>
          <span>Address</span>
          <input
            value={draft.address}
            onChange={(event) => setDraft({ ...draft, address: event.currentTarget.value })}
          />
        </label>
        <label>
          <span>Leave by</span>
          <input
            value={draft.leaveBy ?? ''}
            onChange={(event) =>
              setDraft({ ...draft, leaveBy: event.currentTarget.value || undefined })
            }
          />
        </label>
        <label>
          <span>Duration</span>
          <input
            type="number"
            value={draft.durationMinutes}
            onChange={(event) =>
              setDraft({ ...draft, durationMinutes: Number(event.currentTarget.value) })
            }
          />
        </label>
      </div>

      <div className="logistics-card">
        <h3>
          <ParkingCircle size={17} aria-hidden="true" />
          Parking
        </h3>
        <label>
          <span>Primary</span>
          <input
            value={draft.parking?.primary ?? ''}
            onChange={(event) =>
              setDraft({
                ...draft,
                parking: {
                  primary: event.currentTarget.value,
                  backup: draft.parking?.backup ?? '',
                  warning: draft.parking?.warning,
                },
              })
            }
          />
        </label>
        <label>
          <span>Backup</span>
          <input
            value={draft.parking?.backup ?? ''}
            onChange={(event) =>
              setDraft({
                ...draft,
                parking: {
                  primary: draft.parking?.primary ?? '',
                  backup: event.currentTarget.value,
                  warning: draft.parking?.warning,
                },
              })
            }
          />
        </label>
        <label>
          <span>Warning</span>
          <input
            value={draft.parking?.warning ?? ''}
            onChange={(event) =>
              setDraft({
                ...draft,
                parking: {
                  primary: draft.parking?.primary ?? '',
                  backup: draft.parking?.backup ?? '',
                  warning: event.currentTarget.value || undefined,
                },
              })
            }
          />
        </label>
      </div>

      <label className="textarea-label">
        <span>Notes</span>
        <textarea
          rows={5}
          value={draft.notes.join('\n')}
          onChange={(event) =>
            setDraft({
              ...draft,
              notes: event.currentTarget.value.split('\n').filter(Boolean),
            })
          }
        />
      </label>

      <div className="detail-actions">
        {draft.links[0] ? (
          <a className="ghost-button" href={draft.links[0].url} target="_blank" rel="noreferrer">
            <Navigation size={18} aria-hidden="true" />
            Navigate
          </a>
        ) : null}
        <button type="button" className="primary-button" onClick={() => onSave(draft)}>
          <Save size={18} aria-hidden="true" />
          Save
        </button>
      </div>
      <div className="detail-meta">
        <InfoChip icon={Clock3} label={formatDuration(draft.durationMinutes)} />
        {draft.confirmation ? <InfoChip icon={FileText} label={draft.confirmation} /> : null}
        {draft.parking?.warning ? <InfoChip icon={ShieldAlert} label={draft.parking.warning} /> : null}
      </div>
    </section>
  )
}

function DocumentsPanel({
  trip,
  importText,
  onImportText,
  onImport,
}: {
  trip: Trip
  importText: string
  onImportText: (value: string) => void
  onImport: () => void
}) {
  return (
    <section className="panel docs-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Files</p>
          <h2>Documents</h2>
        </div>
        <FileText size={20} aria-hidden="true" />
      </div>
      <div className="doc-list">
        {trip.documents.map((document) => (
          <article key={document.id}>
            <FileText size={18} aria-hidden="true" />
            <div>
              <strong>{document.title}</strong>
              <span>{document.location}</span>
              <small>{document.note}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="import-box">
        <label className="textarea-label">
          <span>Import JSON</span>
          <textarea
            rows={4}
            value={importText}
            onChange={(event) => onImportText(event.currentTarget.value)}
          />
        </label>
        <button type="button" className="ghost-button" onClick={onImport} disabled={!importText}>
          <LinkIcon size={18} aria-hidden="true" />
          Import
        </button>
      </div>
    </section>
  )
}

export default App
