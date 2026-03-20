import { formatDistanceToNow, isPast, addHours } from 'date-fns'
import { it } from 'date-fns/locale'

export default function SLABadge({ sla, stato }) {
  if (!sla) return <span className="text-gray-400 text-xs">—</span>

  const date = new Date(sla)
  const now = new Date()
  const in24h = addHours(now, 24)
  const statiAperti = ['In gestione', 'Attesa parti', 'Sospesa']
  const isOpen = statiAperti.includes(stato)

  let color, label
  if (!isOpen) {
    color = 'bg-gray-100 text-gray-500'
    label = date.toLocaleDateString('it-IT')
  } else if (isPast(date)) {
    color = 'bg-red-100 text-red-700 font-semibold'
    label = `Scaduta ${formatDistanceToNow(date, { addSuffix: true, locale: it })}`
  } else if (date <= in24h) {
    color = 'bg-yellow-100 text-yellow-700 font-semibold'
    label = `Scade ${formatDistanceToNow(date, { addSuffix: true, locale: it })}`
  } else {
    color = 'bg-green-100 text-green-700'
    label = date.toLocaleDateString('it-IT')
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${color}`}>
      {label}
    </span>
  )
}
