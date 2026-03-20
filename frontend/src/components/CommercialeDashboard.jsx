import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtPrezzo(c) {
  if (c == null) return '—'
  return `€ ${(c / 100).toFixed(2)}`
}
function diffGiorni(d) {
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24))
}
function formatMese(val) {
  if (!val) return ''
  const [y, m] = val.split('-')
  return new Date(y, m - 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
}
function fmtEuro(centesimi) {
  if (!centesimi && centesimi !== 0) return '—'
  if (centesimi === 0) return '€ 0'
  return `€ ${(centesimi / 100).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
const FATTURAZIONE_LABEL = {
  una_tantum: 'Una tantum', mensile: 'Mensile', trimestrale: 'Trim.',
  semestrale: 'Sem.', annuale: 'Annuale',
}

/* ─── Icons ───────────────────────────────────────────────────────────────── */
const IcoChevron = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)
const IcoAlert = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IcoClock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IcoCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IcoUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IcoTarget = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
function Sk({ className }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
}
function DashSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <Sk className="h-3 w-24" />
            <Sk className="h-8 w-16" />
            <Sk className="h-2 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Sk className="lg:col-span-3 h-72" />
        <Sk className="lg:col-span-2 h-72" />
      </div>
      <Sk className="h-64" />
    </div>
  )
}

/* ─── KPI Card ────────────────────────────────────────────────────────────── */
const ACCENT = {
  blue:   { bar: 'bg-blue-500',   val: 'text-blue-600',   ico: 'bg-blue-50 text-blue-500'   },
  green:  { bar: 'bg-emerald-500',val: 'text-emerald-600',ico: 'bg-emerald-50 text-emerald-500' },
  red:    { bar: 'bg-red-500',    val: 'text-red-600',    ico: 'bg-red-50 text-red-500'     },
  yellow: { bar: 'bg-amber-400',  val: 'text-amber-600',  ico: 'bg-amber-50 text-amber-500' },
  violet: { bar: 'bg-violet-500', val: 'text-violet-600', ico: 'bg-violet-50 text-violet-500'},
}
function KpiCard({ label, value, sub, icon, color = 'blue', dimValue, to }) {
  const a = ACCENT[color] || ACCENT.blue
  const showDim = dimValue !== undefined && dimValue !== null
  const inner = (
    <div className={`relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden transition-all
      ${to ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}`}>
      {/* accent bar top */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${a.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
          <p className={`text-3xl font-extrabold mt-2 tabular-nums tracking-tight ${showDim && !value ? 'text-gray-300' : a.val}`}>
            {value ?? '0'}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1.5 leading-snug">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.ico}`}>
          {icon}
        </div>
      </div>
      {to && (
        <div className="mt-4 flex items-center gap-1 text-[11px] font-medium text-gray-400 group-hover:text-gray-600">
          <span>Dettaglio</span>
          <IcoChevron />
        </div>
      )}
    </div>
  )
  return to ? <Link to={to} className="group block">{inner}</Link> : inner
}

/* ─── Scadenze card with tabs ─────────────────────────────────────────────── */
function ScadenzeCard({ scaduti, inScadenza, attivi, giorni, setGiorni }) {
  const [tab, setTab] = useState(scaduti.length > 0 ? 'scaduti' : 'in_scadenza')

  const rows = tab === 'scaduti' ? scaduti : inScadenza

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Monitoraggio scadenze</h3>
          <p className="text-xs text-gray-400 mt-0.5">Abbonamenti scaduti o in scadenza imminente</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Finestra:</span>
          <select
            value={giorni}
            onChange={e => setGiorni(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {[7, 14, 30, 60, 90].map(g => <option key={g} value={g}>{g} giorni</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-5">
        <button
          onClick={() => setTab('scaduti')}
          className={`flex items-center gap-2 py-2.5 px-1 mr-5 text-xs font-semibold border-b-2 transition-colors
            ${tab === 'scaduti'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Scaduti
          {scaduti.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
              {scaduti.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('in_scadenza')}
          className={`flex items-center gap-2 py-2.5 px-1 text-xs font-semibold border-b-2 transition-colors
            ${tab === 'in_scadenza'
              ? 'border-amber-400 text-amber-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          In scadenza
          {inScadenza.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600">
              {inScadenza.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenuto */}
      {rows.length === 0 && attivi > 0 ? (
        <div className="py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">Tutto in ordine</p>
          <p className="text-xs text-gray-400 mt-1">
            {tab === 'scaduti'
              ? 'Nessun abbonamento scaduto.'
              : `Nessuna scadenza nei prossimi ${giorni} giorni.`}
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-400">Nessun abbonamento attivo.</p>
          <Link to="/abbonamenti" className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
            Aggiungi il primo contratto →
          </Link>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50/60">
            <tr>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Servizio</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prezzo</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Scadenza</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stato</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(c => <ContrattoRow key={c.id} c={c} variant={tab === 'scaduti' ? 'red' : 'yellow'} />)}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ─── Riga contratto ──────────────────────────────────────────────────────── */
function ContrattoRow({ c, variant }) {
  const gg = c.data_scadenza ? diffGiorni(c.data_scadenza) : null

  const badge = c.data_scadenza
    ? gg < 0
      ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Scaduto {Math.abs(gg)}gg fa</span>
      : gg <= 7
        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{gg}gg</span>
        : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{gg}gg</span>
    : <span className="text-xs text-gray-300">Perpetuo</span>

  return (
    <tr className={`transition-colors ${variant === 'red' ? 'hover:bg-red-50/40' : 'hover:bg-amber-50/40'}`}>
      <td className="px-5 py-3 font-medium text-gray-900 text-sm">{c.cliente_ragione_sociale}</td>
      <td className="px-5 py-3">
        <div className="text-sm text-gray-700">{c.servizio_nome}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">{FATTURAZIONE_LABEL[c.servizio_tipo_fatturazione] || ''}</div>
      </td>
      <td className="px-5 py-3 text-sm font-mono text-gray-600">{fmtPrezzo(c.prezzo_effettivo)}</td>
      <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(c.data_scadenza)}</td>
      <td className="px-5 py-3">{badge}</td>
      <td className="px-5 py-3 text-right">
        <Link to="/abbonamenti" className="text-[11px] font-medium text-blue-500 hover:text-blue-700">
          Gestisci →
        </Link>
      </td>
    </tr>
  )
}

/* ─── Tooltip ricavi ──────────────────────────────────────────────────────── */
function RicaviTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white shadow-xl rounded-xl border border-gray-100 px-4 py-3 min-w-[170px]">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">{formatMese(label)}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 text-xs mb-1.5 last:mb-0">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-gray-800">{fmtEuro(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Revenue chart ───────────────────────────────────────────────────────── */
function RicaviChart({ ricavi }) {
  if (!ricavi.length) return null
  const last = ricavi[ricavi.length - 1]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Andamento ricavi</h3>
          <p className="text-xs text-gray-400 mt-0.5">MRR + nuovi contratti — ultimi 12 mesi</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> MRR
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Nuovi
          </span>
        </div>
      </div>

      <div className="flex-1 mt-4 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ricavi} margin={{ top: 4, right: 0, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMrr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNuovi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="mese" tickFormatter={formatMese}
              tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => v >= 100 ? fmtEuro(v) : '€ 0'}
              tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={68} />
            <Tooltip content={<RicaviTooltip />} />
            <Area type="monotone" dataKey="mrr" name="MRR ricorrente"
              stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradMrr)"
              dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
            <Area type="monotone" dataKey="nuovi" name="Nuovi contratti"
              stroke="#34d399" strokeWidth={2} fill="url(#gradNuovi)"
              dot={false} activeDot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-3 gap-4">
        {[
          { label: 'MRR corrente', value: fmtEuro(last.mrr), color: 'text-blue-600' },
          { label: 'Nuovi mese', value: fmtEuro(last.nuovi), color: 'text-emerald-500' },
          { label: 'Totale mese', value: fmtEuro(last.totale), color: 'text-gray-700' },
        ].map(k => (
          <div key={k.label}>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{k.label}</p>
            <p className={`text-base font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Funnel panel ────────────────────────────────────────────────────────── */
const FASI_FUNNEL = [
  { key: 'lead',         label: 'Lead',         color: '#6366f1' },
  { key: 'qualifica',    label: 'Qualifica',    color: '#8b5cf6' },
  { key: 'proposta',     label: 'Proposta',     color: '#3b82f6' },
  { key: 'negoziazione', label: 'Negoziazione', color: '#f59e0b' },
  { key: 'vinto',        label: 'Vinto',        color: '#10b981' },
]

function FunnelPanel({ stats }) {
  const perFase = stats?.per_fase ?? {}
  const totPipeline = stats?.totale_pipeline ?? 0
  const vintoValore = stats?.vinto_valore ?? 0
  const totOpp = FASI_FUNNEL.reduce((s, f) => s + (perFase[f.key]?.count ?? 0), 0)
  const vintoCount = perFase['vinto']?.count ?? 0
  const perso = perFase['perso'] ?? { count: 0 }
  const maxCount = Math.max(1, ...FASI_FUNNEL.map(f => perFase[f.key]?.count ?? 0))
  const tassoChiusura = (totOpp + perso.count) > 0
    ? Math.round((vintoCount / (totOpp + perso.count)) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Pipeline Commerciale</h3>
          <p className="text-xs text-gray-400 mt-0.5">Opportunità per fase di vendita</p>
        </div>
        <Link to="/funnel" className="flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-700">
          Funnel completo <IcoChevron />
        </Link>
      </div>

      {/* Mini KPI */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Pipeline</p>
          <p className="text-sm font-bold text-gray-700 mt-0.5">{fmtEuro(totPipeline)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
          <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wide">Vinto</p>
          <p className="text-sm font-bold text-emerald-700 mt-0.5">{fmtEuro(vintoValore)}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 px-3 py-2.5 text-center">
          <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wide">Tasso</p>
          <p className="text-sm font-bold text-indigo-600 mt-0.5">{tassoChiusura}%</p>
        </div>
      </div>

      {/* Barre */}
      {totOpp === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2">
              <IcoTarget />
            </div>
            <p className="text-xs text-gray-400">Nessuna opportunità</p>
            <Link to="/funnel" className="inline-block mt-1.5 text-[11px] text-blue-500 hover:text-blue-700 font-medium">
              Aggiungi →
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-2.5">
          {FASI_FUNNEL.map((fase, i) => {
            const d = perFase[fase.key] ?? { count: 0, valore: 0 }
            const pct = Math.round((d.count / maxCount) * 100)
            // conversion rate to next stage
            const nextFase = FASI_FUNNEL[i + 1]
            const nextCount = nextFase ? (perFase[nextFase.key]?.count ?? 0) : null
            const conv = nextCount !== null && d.count > 0 ? Math.round((nextCount / d.count) * 100) : null

            return (
              <div key={fase.key}>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-semibold text-gray-500 w-20 shrink-0">{fase.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-2 transition-all duration-500"
                      style={{ width: `${Math.max(pct, d.count > 0 ? 12 : 0)}%`, backgroundColor: fase.color }}
                    >
                      {d.count > 0 && (
                        <span className="text-[10px] font-bold text-white/90 leading-none">{d.count}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{d.count || '—'}</span>
                </div>
                {conv !== null && (
                  <div className="flex items-center gap-1 ml-22 pl-[5.5rem] mt-0.5 mb-0.5">
                    <div className="w-px h-3 bg-gray-200 ml-1" />
                    <span className="text-[9px] text-gray-300 ml-1">{conv}% →</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Perse */}
      {perso.count > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-[11px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
          <span>{perso.count} opportunit{perso.count === 1 ? 'à persa' : 'à perse'}</span>
        </div>
      )}
    </div>
  )
}

/* ─── Dashboard Commerciale ───────────────────────────────────────────────── */
export default function CommercialeDashboard() {
  const [scadenze, setScadenze] = useState(null)
  const [tuttiContratti, setTuttiContratti] = useState([])
  const [clientiTotali, setClientiTotali] = useState(0)
  const [ricavi, setRicavi] = useState([])
  const [funnelStats, setFunnelStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [giorni, setGiorni] = useState(30)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get('/api/contratti-servizi/scadenze', { params: { giorni } }),
      axios.get('/api/contratti-servizi', { params: { stato: 'attivo' } }),
      axios.get('/api/clienti-diretti'),
      axios.get('/api/contratti-servizi/ricavi-mensili', { params: { mesi: 12 } }),
      axios.get('/api/opportunita/stats'),
    ]).then(([sc, tutti, clienti, ric, funnel]) => {
      setScadenze(sc.data)
      setTuttiContratti(tutti.data)
      setClientiTotali(clienti.data.length)
      setRicavi(ric.data)
      setFunnelStats(funnel.data)
    }).finally(() => setLoading(false))
  }, [giorni])

  if (loading) return <DashSkeleton />

  const scaduti = scadenze?.scaduti ?? []
  const inScadenza = scadenze?.in_scadenza ?? []
  const attivi = tuttiContratti.length

  return (
    <div className="space-y-5">

      {/* ── Alert banner ── */}
      {scaduti.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-500">
            <IcoAlert />
          </div>
          <p className="text-sm font-semibold text-red-700 flex-1">
            {scaduti.length} {scaduti.length === 1 ? 'abbonamento scaduto' : 'abbonamenti scaduti'} — attenzione richiesta
          </p>
          <Link to="/abbonamenti" className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 shrink-0">
            Gestisci <IcoChevron />
          </Link>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Clienti Diretti" value={clientiTotali}
          icon={<IcoUsers />} color="blue"
          sub="clienti registrati" to="/clienti-diretti"
        />
        <KpiCard
          label="Abbonamenti Attivi" value={attivi}
          icon={<IcoCheck />} color="green"
          sub="contratti in corso" to="/abbonamenti"
        />
        <KpiCard
          label="Abbonamenti Scaduti" value={scaduti.length}
          icon={<IcoAlert />} color="red"
          sub="da rinnovare" to="/abbonamenti"
        />
        <KpiCard
          label={`In scadenza ${giorni}gg`} value={inScadenza.length}
          icon={<IcoClock />} color="yellow"
          sub={`entro ${giorni} giorni`} to="/abbonamenti"
        />
      </div>

      {/* ── Grafici affiancati ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 min-h-[320px]">
          <RicaviChart ricavi={ricavi} />
        </div>
        <div className="lg:col-span-2 min-h-[320px]">
          <FunnelPanel stats={funnelStats} />
        </div>
      </div>

      {/* ── Monitoraggio scadenze ── */}
      <ScadenzeCard
        scaduti={scaduti}
        inScadenza={inScadenza}
        attivi={attivi}
        giorni={giorni}
        setGiorni={setGiorni}
      />

    </div>
  )
}
