import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) { return n?.toLocaleString('it-IT') ?? '—' }

const PIANO_COLORS = {
  base:         'bg-gray-100 text-gray-600',
  professional: 'bg-blue-100 text-blue-700',
  enterprise:   'bg-purple-100 text-purple-700',
  trial:        'bg-yellow-100 text-yellow-700',
  nessuna:      'bg-gray-100 text-gray-400',
}

const STATO_COLORS = {
  attiva:        'bg-green-100 text-green-700',
  trial:         'bg-yellow-100 text-yellow-700',
  trial_scaduto: 'bg-red-100 text-red-600',
  scaduta:       'bg-red-100 text-red-600',
  nessuna:       'bg-gray-100 text-gray-400',
}

const STATO_LABELS = {
  attiva:        'Attiva',
  trial:         'Trial',
  trial_scaduto: 'Trial scaduto',
  scaduta:       'Scaduta',
  nessuna:       'Nessuna',
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color = 'blue', alert }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red:    'bg-red-50 text-red-600',
    gray:   'bg-gray-50 text-gray-500',
  }
  return (
    <div className={`bg-white rounded-2xl border ${alert ? 'border-red-200' : 'border-gray-100'} shadow-sm p-5 flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Piano Bar ─────────────────────────────────────────────────────────────────

function PianoBar({ perPiano }) {
  const items = [
    { key: 'enterprise',   label: 'Enterprise',   color: 'bg-purple-500' },
    { key: 'professional', label: 'Professional', color: 'bg-blue-500' },
    { key: 'base',         label: 'Base',         color: 'bg-gray-400' },
    { key: 'trial',        label: 'Trial',        color: 'bg-yellow-400' },
    { key: 'nessuna',      label: 'Nessuna',      color: 'bg-gray-200' },
  ]
  const total = Object.values(perPiano).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuzione per piano</h3>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
        {items.map(({ key, color }) => {
          const pct = ((perPiano[key] || 0) / total) * 100
          return pct > 0 ? (
            <div key={key} className={`${color} rounded-full`} style={{ width: `${pct}%` }} title={`${key}: ${perPiano[key]}`} />
          ) : null
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
            <span className="text-gray-600">{label}</span>
            <span className="ml-auto font-semibold text-gray-900">{perPiano[key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DB Health Card ────────────────────────────────────────────────────────────

function DbHealthCard({ db }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <h3 className="text-sm font-semibold text-gray-700">Stato database</h3>
      </div>
      <dl className="space-y-2.5">
        {[
          ['Dimensione', db?.size],
          ['Migrazione', db?.alembic_version],
          ['Uptime', db?.uptime],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <dt className="text-gray-400">{label}</dt>
            <dd className="font-mono font-medium text-gray-700">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ── Alert scadenze ────────────────────────────────────────────────────────────

function ScadenzeAlert({ presto, scadute }) {
  if (!presto?.length && !scadute?.length) return null
  return (
    <div className="space-y-2">
      {scadute?.map(o => (
        <div key={o.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div className="flex-1 text-sm">
            <span className="font-semibold text-red-700">{o.nome}</span>
            <span className="text-red-500"> — licenza scaduta</span>
          </div>
          <Link to="/organizzazioni" className="text-xs text-red-600 font-medium hover:underline">Gestisci</Link>
        </div>
      ))}
      {presto?.map(o => (
        <div key={o.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-lg">🔔</span>
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-700">{o.nome}</span>
            <span className="text-amber-600"> — scade tra {o.giorni} giorni</span>
          </div>
          <Link to="/organizzazioni" className="text-xs text-amber-600 font-medium hover:underline">Gestisci</Link>
        </div>
      ))}
    </div>
  )
}

// ── Utenti online ─────────────────────────────────────────────────────────────

function OnlineUsersCard({ utenti }) {
  const count = utenti?.length ?? 0

  const RUOLO_LABELS = {
    amministratore: 'Admin',
    tecnico: 'Tecnico',
    commerciale: 'Commerciale',
    operatore: 'Operatore',
  }
  const RUOLO_COLORS = {
    amministratore: 'bg-purple-100 text-purple-700',
    tecnico: 'bg-blue-100 text-blue-700',
    commerciale: 'bg-green-100 text-green-700',
    operatore: 'bg-gray-100 text-gray-600',
  }

  function fmtTime(iso) {
    if (!iso) return '—'
    const d = new Date(iso + 'Z')
    const sec = Math.floor((Date.now() - d.getTime()) / 1000)
    if (sec < 60) return 'adesso'
    if (sec < 3600) return `${Math.floor(sec / 60)} min fa`
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${count > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
          <h3 className="text-sm font-semibold text-gray-700">Utenti online</h3>
        </div>
        <span className={`text-sm font-bold ${count > 0 ? 'text-green-600' : 'text-gray-400'}`}>{count}</span>
      </div>
      {count === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">Nessun utente online</div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {utenti.map(u => (
            <li key={u.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                {u.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.nome}</p>
                <p className="text-xs text-gray-400 truncate">{u.org_nome}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RUOLO_COLORS[u.ruolo] || 'bg-gray-100 text-gray-500'}`}>
                  {RUOLO_LABELS[u.ruolo] || u.ruolo}
                </span>
                <span className="text-[10px] text-gray-400">{fmtTime(u.last_seen)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Tabella organizzazioni ────────────────────────────────────────────────────

function OrgsTable({ orgs }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Organizzazioni</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nome</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Piano</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stato</th>
              <th className="px-5 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Utenti</th>
              <th className="px-5 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ticket aperti</th>
              <th className="px-5 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ticket totali</th>
              <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Scadenza</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orgs?.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Nessuna organizzazione</td></tr>
            )}
            {orgs?.map(o => (
              <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{o.nome}</td>
                <td className="px-5 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PIANO_COLORS[o.piano] || PIANO_COLORS.nessuna}`}>
                    {o.piano || 'nessuna'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATO_COLORS[o.stato] || STATO_COLORS.nessuna}`}>
                    {STATO_LABELS[o.stato] || o.stato}
                  </span>
                </td>
                <td className="px-5 py-3 text-center text-gray-600">{o.utenti_attivi}</td>
                <td className="px-5 py-3 text-center">
                  <span className={o.ticket_aperti > 0 ? 'font-semibold text-blue-600' : 'text-gray-400'}>
                    {o.ticket_aperti}
                  </span>
                </td>
                <td className="px-5 py-3 text-center text-gray-500">{fmt(o.ticket_totali)}</td>
                <td className="px-5 py-3 text-right text-xs text-gray-400">
                  {o.licenza_scadenza
                    ? new Date(o.licenza_scadenza).toLocaleDateString('it-IT')
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Pagina ────────────────────────────────────────────────────────────────────

export default function ProprietarioDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/admin/db/system-stats')
      .then(r => { setData(r.data); setLastRefresh(new Date()) })
      .catch(() => setError('Impossibile caricare i dati di sistema'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-gray-400 text-sm">
      Caricamento dashboard...
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center py-32 text-red-500 text-sm">{error}</div>
  )

  const { organizzazioni: orgs, utenti, tickets, database, orgs_detail } = data
  const utentiOnline = utenti?.online ?? []

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard di sistema</h1>
          {lastRefresh && (
            <p className="text-xs text-gray-400 mt-0.5">
              Aggiornato alle {lastRefresh.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Aggiorna
        </button>
      </div>

      {/* Alert scadenze */}
      <ScadenzeAlert presto={orgs.scadenza_presto} scadute={orgs.scadute} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          label="Licenze attive"
          value={orgs.licenze_attive}
          sub={`su ${orgs.totale} organizzazioni`}
          color="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
        <KpiCard
          label="Trial attivi"
          value={orgs.licenze_trial}
          color="orange"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          label="Utenti attivi"
          value={fmt(utenti.totale_attivi)}
          sub="in tutte le organizzazioni"
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KpiCard
          label="Online ora"
          value={utentiOnline.length}
          sub="ultimi 5 minuti"
          color={utentiOnline.length > 0 ? 'green' : 'gray'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M12 12a3 3 0 100-6 3 3 0 000 6zm0 0v1m0 4h.01" /></svg>}
        />
        <KpiCard
          label="Ticket aperti"
          value={fmt(tickets.aperti)}
          sub={`${fmt(tickets.totale)} totali`}
          color="purple"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
      </div>

      {/* Piano + DB + Utenti online */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PianoBar perPiano={orgs.per_piano} />
        <DbHealthCard db={database} />
        <OnlineUsersCard utenti={utentiOnline} />
      </div>

      {/* Tabella organizzazioni */}
      <OrgsTable orgs={orgs_detail} />

    </div>
  )
}
