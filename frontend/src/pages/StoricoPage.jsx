import { useState, useEffect, useCallback } from 'react'
import { ticketsApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import FilterBar from '../components/FilterBar'
import TicketTable from '../components/TicketTable'
import TicketDetail from '../components/TicketDetail'

const STATI_STORICO = ['Chiusa', 'Annullata']

export default function StoricoPage() {
  const { can } = useAuth()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({
    page: 1,
    page_size: 50,
    order_by: 'id',
    order_dir: 'desc',
    stato: [...STATI_STORICO],
  })

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await ticketsApi.list(filters)
      setTickets(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchTickets() }, [fetchTickets])

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
    a.download = 'storico_export.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Storico Ticket</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total.toLocaleString('it-IT')} totali</p>
        </div>
        {can('ticket.export') && (
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Esporta Excel
          </button>
        )}
      </div>

      <FilterBar filters={filters} onChange={setFilters} stati={STATI_STORICO} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border-b border-red-100 text-red-700 px-5 py-3 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}
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
