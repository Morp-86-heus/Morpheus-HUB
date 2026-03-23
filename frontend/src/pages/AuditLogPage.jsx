import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

const AZIONE_COLORS = {
  'auth.login':         'bg-green-100 text-green-700',
  'auth.login_failed':  'bg-red-100 text-red-700',
  'ticket.create':      'bg-blue-100 text-blue-700',
  'ticket.close':       'bg-purple-100 text-purple-700',
  'ticket.delete':      'bg-red-100 text-red-700',
  'ticket.update':      'bg-yellow-100 text-yellow-700',
  'user.create':        'bg-blue-100 text-blue-700',
  'user.update':        'bg-yellow-100 text-yellow-700',
  'user.activate':      'bg-green-100 text-green-700',
  'user.deactivate':    'bg-orange-100 text-orange-700',
  'user.delete':        'bg-red-100 text-red-700',
  'vendita.create':     'bg-blue-100 text-blue-700',
  'vendita.update':     'bg-yellow-100 text-yellow-700',
  'vendita.delete':     'bg-red-100 text-red-700',
}

const AZIONE_LABELS = {
  'auth.login':         'Login',
  'auth.login_failed':  'Login fallito',
  'ticket.create':      'Ticket creato',
  'ticket.close':       'Ticket chiuso',
  'ticket.delete':      'Ticket eliminato',
  'ticket.update':      'Ticket aggiornato',
  'user.create':        'Utente creato',
  'user.update':        'Utente aggiornato',
  'user.activate':      'Utente attivato',
  'user.deactivate':    'Utente disattivato',
  'user.delete':        'Utente eliminato',
  'vendita.create':     'Vendita creata',
  'vendita.update':     'Vendita aggiornata',
  'vendita.delete':     'Vendita eliminata',
}

const RUOLO_COLORS = {
  proprietario:  'bg-purple-100 text-purple-700',
  amministratore:'bg-blue-100 text-blue-700',
  commerciale:   'bg-green-100 text-green-700',
  tecnico:       'bg-orange-100 text-orange-700',
}

function fmtTs(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'Z')
  return d.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function AzioneBadge({ azione }) {
  const cls = AZIONE_COLORS[azione] || 'bg-gray-100 text-gray-600'
  const label = AZIONE_LABELS[azione] || azione
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

function DettagliCell({ dettagli }) {
  if (!dettagli || Object.keys(dettagli).length === 0) return <span className="text-gray-300">—</span>
  return (
    <div className="text-xs text-gray-500 space-y-0.5 max-w-xs">
      {Object.entries(dettagli).map(([k, v]) => (
        <div key={k} className="flex gap-1">
          <span className="text-gray-400 shrink-0">{k}:</span>
          <span className="truncate font-mono">{String(v ?? '—')}</span>
        </div>
      ))}
    </div>
  )
}

// ── Pagina ────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [logs, setLogs]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [orgs, setOrgs]         = useState([])
  const [page, setPage]         = useState(1)
  const PAGE_SIZE = 50

  const [filters, setFilters] = useState({
    org_id: '',
    azione: '',
    data_da: '',
    data_a: '',
  })

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', page)
    params.set('page_size', PAGE_SIZE)
    if (filters.org_id) params.set('org_id', filters.org_id)
    if (filters.azione) params.set('azione', filters.azione)
    if (filters.data_da) params.set('data_da', filters.data_da)
    if (filters.data_a)  params.set('data_a',  filters.data_a)

    api.get(`/admin/db/audit-logs?${params}`)
      .then(r => { setLogs(r.data.items); setTotal(r.data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filters])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get('/admin/db/audit-logs/orgs')
      .then(r => setOrgs(r.data))
      .catch(() => {})
  }, [])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const setFilter = (k, v) => {
    setFilters(f => ({ ...f, [k]: v }))
    setPage(1)
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-xs text-gray-400 mt-0.5">Storico attività — ultimi 90 giorni</p>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <span className="text-sm text-gray-500">{total.toLocaleString('it-IT')} eventi</span>
          )}
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Aggiorna
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Organizzazione</label>
            <select
              value={filters.org_id}
              onChange={e => setFilter('org_id', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutte</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Azione</label>
            <select
              value={filters.azione}
              onChange={e => setFilter('azione', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutte</option>
              <optgroup label="Auth">
                <option value="auth.login">Login</option>
                <option value="auth.login_failed">Login fallito</option>
              </optgroup>
              <optgroup label="Ticket">
                <option value="ticket.create">Ticket creato</option>
                <option value="ticket.close">Ticket chiuso</option>
                <option value="ticket.delete">Ticket eliminato</option>
              </optgroup>
              <optgroup label="Utenti">
                <option value="user.create">Utente creato</option>
                <option value="user.activate">Utente attivato</option>
                <option value="user.deactivate">Utente disattivato</option>
                <option value="user.delete">Utente eliminato</option>
              </optgroup>
              <optgroup label="Vendite">
                <option value="vendita.create">Vendita creata</option>
                <option value="vendita.delete">Vendita eliminata</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Dal</label>
            <input type="date" value={filters.data_da} onChange={e => setFilter('data_da', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Al</label>
            <input type="date" value={filters.data_a} onChange={e => setFilter('data_a', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={() => { setFilters({ org_id: '', azione: '', data_da: '', data_a: '' }); setPage(1) }}
              className="text-xs text-blue-600 hover:underline"
            >
              Rimuovi filtri
            </button>
          </div>
        )}
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Caricamento...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Nessun evento trovato</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Utente</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Organizzazione</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Azione</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Risorsa</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Dettagli</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtTs(log.timestamp)}</td>
                      <td className="px-4 py-3">
                        {log.user_nome ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{log.user_nome}</div>
                            {log.user_ruolo && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${RUOLO_COLORS[log.user_ruolo] || 'bg-gray-100 text-gray-500'}`}>
                                {log.user_ruolo}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 italic">sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.organizzazione_nome || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <AzioneBadge azione={log.azione} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {log.risorsa_tipo ? (
                          <span>{log.risorsa_tipo}{log.risorsa_id ? ` #${log.risorsa_id}` : ''}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <DettagliCell dettagli={log.dettagli} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Pagina {page} di {totalPages} — {total.toLocaleString('it-IT')} eventi totali
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
