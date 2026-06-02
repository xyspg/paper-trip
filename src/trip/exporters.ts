import type { Trip, TripItem } from './types'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

export const formatDate = (value: string) =>
  dateFormatter.format(new Date(`${value}T12:00:00`))

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  if (hours === 0) {
    return `${remainder}m`
  }

  if (remainder === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remainder}m`
}

export const groupItemsByDate = (items: TripItem[]) => {
  return items.reduce<Record<string, TripItem[]>>((groups, item) => {
    groups[item.date] = [...(groups[item.date] ?? []), item].sort((a, b) =>
      a.time.localeCompare(b.time),
    )
    return groups
  }, {})
}

export const toMarkdown = (trip: Trip) => {
  const days = groupItemsByDate(trip.items)
  const dayBlocks = Object.entries(days)
    .map(([date, items]) => {
      const itemLines = items
        .map((item) => {
          const notes = item.notes.map((note) => `    - ${note}`).join('\n')
          const parking = item.parking
            ? [
                `    - Parking: ${item.parking.primary}`,
                `    - Backup parking: ${item.parking.backup}`,
                item.parking.warning ? `    - Warning: ${item.parking.warning}` : '',
              ]
                .filter(Boolean)
                .join('\n')
            : ''

          return [
            `- ${item.time} ${item.title}`,
            `  - Location: ${item.location}`,
            `  - Address: ${item.address}`,
            item.leaveBy ? `  - Leave by: ${item.leaveBy}` : '',
            notes ? `  - Notes:\n${notes}` : '',
            parking ? `  - Logistics:\n${parking}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        })
        .join('\n\n')

      return `## ${formatDate(date)}\n\n${itemLines}`
    })
    .join('\n\n')

  const checklists = trip.checklists
    .map((checklist) => {
      const items = checklist.items
        .map((item) => `- [${item.checked ? 'x' : ' '}] ${item.label}`)
        .join('\n')
      return `## ${checklist.title}\n\n${items}`
    })
    .join('\n\n')

  return `# ${trip.title}\n\n${trip.subtitle}\n\nBase: ${trip.base.hotel}\nCar: ${trip.base.car}\n\n${dayBlocks}\n\n# Checklists\n\n${checklists}\n`
}

export const downloadText = (filename: string, text: string, type = 'text/plain') => {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
