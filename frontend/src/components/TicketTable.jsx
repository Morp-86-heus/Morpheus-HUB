import SLABadge from './SLABadge'

const STATO_COLORS = {
  'In gestione': 'bg-blue-100 text-blue-700',
  'Attesa parti': 'bg-orange-100 text-orange-700',
  'Sospesa': 'bg-yellow-100 text-yellow-700',
  'Chiusa': 'bg-gray-100 text-gray-500',
  'Annullata': 'bg-red-100 text-red-600',
}

export default function TicketTable({ tickets, onSelect, onSort, orderBy, orderDir }) {
  const th = (label, field) => (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
        orderBy === field ? 'text-blue-600 bg-blue-50' : ''
      }`}
      onClick={() => onSort && onSort(field)}
    >
      {label}
      {orderBy === field && (
        <span className="ml-1">{orderDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  )

  if (!tickets.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        Nessun ticket trovato
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {th('ID', 'id')}
            {th('Commitente', 'commitente')}
            {th('Cliente', 'cliente')}
            {th('NR INT', 'nr_intervento')}
            {th('Utente', 'utente')}
            {th('Città', 'citta')}
            {th('SLA', 'sla_scadenza')}
            {th('Stato', 'stato')}
            {th('Tecnico', 'tecnico')}
            {th('Data gest.', 'data_gestione')}
            {th('Progr.', 'nr_progressivo')}
            {th('Note', 'note')}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {tickets.map(t => (
            <tr
              key={t.id}
              onClick={() => onSelect && onSelect(t)}
              className="hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <td className="px-3 py-2 text-xs text-gray-400">{t.id}</td>
              <td className="px-3 py-2 text-sm font-medium">{t.commitente || '—'}</td>
              <td className="px-3 py-2 text-sm">{t.cliente || '—'}</td>
              <td className="px-3 py-2 text-sm font-mono text-xs">{t.nr_intervento || '—'}</td>
              <td className="px-3 py-2 text-sm max-w-[150px] truncate" title={t.utente}>{t.utente || '—'}</td>
              <td className="px-3 py-2 text-sm max-w-[120px] truncate" title={t.citta}>{t.citta || '—'}</td>
              <td className="px-3 py-2">
                <SLABadge sla={t.sla_scadenza} stato={t.stato} />
              </td>
              <td className="px-3 py-2">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATO_COLORS[t.stato] || 'bg-gray-100 text-gray-600'}`}>
                  {t.stato || '—'}
                </span>
              </td>
              <td className="px-3 py-2 text-sm">{t.tecnico || '—'}</td>
              <td className="px-3 py-2 text-sm text-gray-500">
                {t.data_gestione ? new Date(t.data_gestione).toLocaleDateString('it-IT') : '—'}
              </td>
              <td className="px-3 py-2 text-center text-sm text-gray-500">
                {t.nr_progressivo ?? '—'}
              </td>
              <td className="px-3 py-2 text-sm text-gray-500 max-w-[200px] truncate" title={t.note || ''}>
                {t.note || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
