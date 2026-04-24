import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ticketsApi, lookupApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import FilterBar from '../components/FilterBar'
import TicketTable from '../components/TicketTable'
import TicketDetail from '../components/TicketDetail'

const STATI_APERTI = ['In gestione', 'Attesa parti', 'Sospesa']
const TUTTI_STATI = ['In gestione', 'Attesa parti', 'Sospesa', 'Chiusa', 'Annullata']

function filtersFromUrl(searchParams) {
  const stato = searchParams.getAll('stato')
  const sla_scaduta = searchParams.get('sla_scaduta') === 'true'
  const tecnico = searchParams.get('tecnico') || undefined
  return {
    page: 1,
    page_size: 50,
    order_by: 'data_gestione',
    order_dir: 'asc',
    stato: stato.length > 0 ? stato : [...STATI_APERTI],
    sla_scaduta: sla_scaduta || undefined,
    tecnico,
  }
}

export default function TicketsPage() {
  const { can } = useAuth()
  const [searchParams] = useSearchParams()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState(() => filtersFromUrl(searchParams))
  const [tecnicoColors, setTecnicoColors] = useState({})

  // Aggiorna i filtri se cambia l'URL (navigazione da dashboard)
  useEffect(() => {
    setFilters(filtersFromUrl(searchParams))
  }, [searchParams.toString()])

  // Apre il dettaglio se ticket_id è presente nell'URL
  useEffect(() => {
    const ticketId = searchParams.get('ticket_id')
    if (!ticketId) return
    ticketsApi.get(ticketId).then(res => setSelected(res.data)).catch(() => {})
  }, [searchParams.get('ticket_id')])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = { ...filters }
      if (params.stato && params.stato.length === 0) delete params.stato
      const res = await ticketsApi.list(params)
      setTickets(res.data.items)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchTickets() }, [fetchTickets])
  useEffect(() => {
    lookupApi.tecnici().then(r => {
      const map = {}
      r.data.forEach(t => { if (t.colore) map[t.nome] = t.colore })
      setTecnicoColors(map)
    }).catch(() => {})
  }, [])

  const handleSort = (field) => {
    setFilters(f => ({
      ...f,
      order_by: field,
      order_dir: f.order_by === field && f.order_dir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }))
  }

  const totalPages = Math.ceil(total / (filters.page_size || 50))

  const handleExport = async () => {
    const params = { ...filters, page: undefined, page_size: undefined }
    const res = await ticketsApi.export(params)
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'tickets_export.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total.toLocaleString('it-IT')} totali</p>
        </div>
        <div className="flex gap-2">
          {can('ticket.export') && (
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Esporta Excel
            </button>
          )}
          {can('ticket.create') && (
            <Link to="/tickets/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuovo Ticket
            </Link>
          )}
        </div>
      </div>

      <FilterBar filters={filters} onChange={setFilters} stati={STATI_APERTI} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            <svg className="animate-spin w-5 h-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Caricamento...
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            onSelect={setSelected}
            onSort={handleSort}
            orderBy={filters.order_by}
            orderDir={filters.order_dir}
            tecnicoColors={tecnicoColors}
          />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
            <div className="text-xs font-medium text-gray-400">Pagina {filters.page} di {totalPages}</div>
            <div className="flex gap-1">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                ← Prec
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(filters.page - 3, totalPages - 6)) + i
                if (p < 1 || p > totalPages) return null
                return (
                  <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${p === filters.page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                )
              })}
              <button
                disabled={filters.page >= totalPages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                Succ →
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => { setSelected(null); fetchTickets() }}
          onRefresh={() => { setSelected(null); fetchTickets() }}
        />
      )}
    </div>
  )
}
