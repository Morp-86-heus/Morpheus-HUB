import { useEffect, useState } from 'react'
import { statsApi, ticketsApi } from '../api/client'
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Link, useNavigate } from 'react-router-dom'

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const STATI_APERTI = ['In gestione', 'Attesa parti', 'Sospesa']

const STATO_COLORS = {
  'In gestione': '#3b82f6',
  'Attesa parti': '#f97316',
  'Sospesa':      '#eab308',
  'Chiusa':       '#6b7280',
  'Annullata':    '#ef4444',
}

function buildUrl(params) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach(s => qs.append(k, s))
    else qs.append(k, v)
  })
  return `/tickets?${qs.toString()}`
}

/* ─── Formatters ─────────────────────────────────────────────────────────────── */
function formatMese(val) {
  if (!val) return ''
  const [y, m] = val.split('-')
  return new Date(y, m - 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
}

/* ─── Icons ──────────────────────────────────────────────────────────────────── */
const IcoTicket = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)
const IcoGear = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IcoBox = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)
const IcoPause = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
    <circle cx="12" cy="12" r="9" strokeWidth={2} />
  </svg>
)
const IcoAlertCircle = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IcoClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IcoCheckCircle = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IcoXCircle = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

/* ─── Skeleton ───────────────────────────────────────────────────────────────── */
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-52 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────────────────── */
const COLOR_MAP = {
  blue:   { accent: 'bg-blue-500',   iconBg: 'bg-blue-50',   iconText: 'text-blue-500',   value: (v) => v > 0 ? 'text-gray-800' : 'text-gray-800' },
  orange: { accent: 'bg-orange-500', iconBg: 'bg-orange-50', iconText: 'text-orange-500', value: () => 'text-gray-800' },
  yellow: { accent: 'bg-yellow-400', iconBg: 'bg-yellow-50', iconText: 'text-yellow-500', value: (v) => v > 0 ? 'text-yellow-600' : 'text-gray-800' },
  red:    { accent: 'bg-red-500',    iconBg: 'bg-red-50',    iconText: 'text-red-500',    value: (v) => v > 0 ? 'text-red-600'    : 'text-gray-800' },
  gray:   { accent: 'bg-gray-400',   iconBg: 'bg-gray-100',  iconText: 'text-gray-500',   value: () => 'text-gray-800' },
}

function KpiCard({ label, value, icon, sub, to, color = 'blue' }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue
  const inner = (
    <div className={`
      bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative
      ${to ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all' : ''}
    `}>
      {/* Colored accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.accent}`} />
      <div className="p-5 pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.iconBg}`}>
            <span className={c.iconText}>{icon}</span>
          </div>
          {to && (
            <svg className="w-3.5 h-3.5 text-gray-300 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
        <div className={`text-3xl font-extrabold tracking-tight tabular-nums ${c.value(value)}`}>
          {value ?? '—'}
        </div>
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-2 leading-snug">
          {label}
        </div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

/* ─── Custom tooltips ────────────────────────────────────────────────────────── */
function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-3 py-2 text-left">
      <p className="text-xs text-gray-400 mb-1">{formatMese(label)}</p>
      <p className="text-sm font-bold text-blue-600">{payload[0].value} ticket</p>
    </div>
  )
}

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-3 py-2 text-left">
      <p className="text-xs font-semibold text-gray-700 mb-1.5">{d?.tecnico}</p>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span className="text-gray-500">Aperti:</span>
          <span className="font-semibold text-gray-800">{d?.aperti}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          <span className="text-gray-500">Chiusi:</span>
          <span className="font-semibold text-gray-800">{(d?.totale ?? 0) - (d?.aperti ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-3 py-2">
      <p className="text-xs font-semibold text-gray-700">{d.name}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: d.payload.fill }}>{d.value}</p>
    </div>
  )
}

/* ─── Custom legend ──────────────────────────────────────────────────────────── */
function DonutLegend({ data }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
      {data.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0"
            style={{ background: STATO_COLORS[entry.stato] || '#d1d5db' }} />
          <span className="text-xs text-gray-500">{entry.stato}</span>
          <span className="text-xs font-semibold text-gray-700">{entry.totale}</span>
        </div>
      ))}
    </div>
  )
}

const STATO_BADGE = {
  'In gestione': 'bg-blue-100 text-blue-700',
  'Attesa parti': 'bg-orange-100 text-orange-700',
  'Sospesa':      'bg-yellow-100 text-yellow-700',
  'Chiusa':       'bg-gray-100 text-gray-500',
  'Annullata':    'bg-red-100 text-red-600',
}

function TicketOggiCard({ ticket }) {
  return (
    <Link to={`/tickets?ticket_id=${ticket.id}`} className="block bg-white border border-gray-100 rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-bold text-blue-600 truncate">{ticket.nr_intervento || '—'}</span>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATO_BADGE[ticket.stato] || 'bg-gray-100 text-gray-500'}`}>
          {ticket.stato}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-800 truncate">{ticket.utente || '—'}</p>
      <p className="text-xs text-gray-500 truncate mt-0.5">{ticket.cliente || ticket.commitente || '—'}</p>
      {ticket.citta && <p className="text-xs text-gray-400 truncate mt-0.5">{ticket.citta}</p>}
      {ticket.tecnico && (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {ticket.tecnico}
        </p>
      )}
    </Link>
  )
}

/* ─── Dashboard ──────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [stats, setStats]           = useState(null)
  const [trend, setTrend]           = useState([])
  const [perTecnico, setPerTecnico] = useState([])
  const [perStato, setPerStato]     = useState([])
  const [ticketOggi, setTicketOggi] = useState([])
  const [loading, setLoading]       = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const oggi = new Date().toISOString().slice(0, 10)
    Promise.all([
      statsApi.dashboard(),
      statsApi.trendMensile(),
      statsApi.perTecnico(),
      statsApi.perStato(),
      ticketsApi.list({ data_da: oggi, data_a: oggi, page_size: 200 }),
    ]).then(([d, t, pt, ps, tog]) => {
      setStats(d.data)
      setTrend(t.data)
      setPerTecnico(
        pt.data
          .filter(r => r.aperti > 0)
          .sort((a, b) => b.aperti - a.aperti)
      )
      setPerStato(ps.data)
      setTicketOggi(tog.data.items ?? [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />
  if (!stats) return null

  const totalStati = perStato.reduce((s, r) => s + r.totale, 0)

  return (
    <div className="space-y-6">

      {/* ── SLA Alert banner ── */}
      {(stats.sla_scadute > 0 || stats.sla_in_scadenza_oggi > 0) && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-500">
            <IcoAlertCircle />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
              {stats.sla_scadute > 0 && (
                <span className="text-sm font-semibold text-red-700">
                  {stats.sla_scadute} SLA {stats.sla_scadute === 1 ? 'scaduta' : 'scadute'}
                </span>
              )}
              {stats.sla_in_scadenza_oggi > 0 && (
                <span className="text-sm text-red-600">
                  {stats.sla_in_scadenza_oggi} in scadenza entro 24h
                </span>
              )}
            </div>
          </div>
          <Link to={buildUrl({ stato: STATI_APERTI, sla_scaduta: 'true' })}
            className="text-xs font-medium text-red-500 hover:text-red-700 shrink-0 flex items-center gap-1">
            Vedi
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* ── KPI — Ticket attivi ── */}
      <div>
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Ticket attivi</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Ticket aperti" value={stats.totale_aperti}
            icon={<IcoTicket />} color="blue"
            to={buildUrl({ stato: STATI_APERTI })} />
          <KpiCard label="In gestione" value={stats.in_gestione}
            icon={<IcoGear />} color="blue"
            to={buildUrl({ stato: ['In gestione'] })} />
          <KpiCard label="Attesa parti" value={stats.attesa_parti}
            icon={<IcoBox />} color="orange"
            to={buildUrl({ stato: ['Attesa parti'] })} />
          <KpiCard label="Sospesi" value={stats.sospesi}
            icon={<IcoPause />} color="yellow"
            to={buildUrl({ stato: ['Sospesa'] })} />
        </div>
      </div>

      {/* ── KPI — SLA & storico ── */}
      <div>
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">SLA &amp; storico</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="SLA scadute" value={stats.sla_scadute}
            icon={<IcoAlertCircle />} color="red"
            to={buildUrl({ stato: STATI_APERTI, sla_scaduta: 'true' })} />
          <KpiCard label="SLA in scadenza (24h)" value={stats.sla_in_scadenza_oggi}
            icon={<IcoClock />} color="yellow"
            to={buildUrl({ stato: STATI_APERTI })} />
          <KpiCard label="Chiusi" value={stats.chiusi}
            icon={<IcoCheckCircle />} color="gray"
            to={buildUrl({ stato: ['Chiusa'] })} />
          <KpiCard label="Annullati" value={stats.annullati}
            icon={<IcoXCircle />} color="gray"
            to={buildUrl({ stato: ['Annullata'] })} />
        </div>
      </div>

      {/* ── Ticket di oggi ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              Ticket di oggi
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              {ticketOggi.length > 0 && ` · ${ticketOggi.length} interventi`}
            </p>
          </div>
          {ticketOggi.length > 0 && (
            <Link
              to={buildUrl({ data_da: new Date().toISOString().slice(0,10), data_a: new Date().toISOString().slice(0,10) })}
              className="text-xs font-medium text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              Vedi tutti
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
        {ticketOggi.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-8 text-center shadow-sm">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-gray-400">Nessun intervento con data odierna</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ticketOggi.map(t => <TicketOggiCard key={t.id} ticket={t} />)}
          </div>
        )}
      </div>

      {/* ── Charts row 1: Trend + Donut ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Area trend */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Andamento mensile</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ticket aperti negli ultimi 12 mesi</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="mese" tickFormatter={formatMese}
                tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<AreaTooltip />} />
              <Area type="monotone" dataKey="totale" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#gradBlue)" dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut stati */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Distribuzione stati</h3>
            <p className="text-xs text-gray-400 mt-0.5">Tutti i ticket</p>
          </div>
          {/* Chart con overlay per testo centrale */}
          <div className="relative" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={perStato} dataKey="totale" nameKey="stato"
                  cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                  paddingAngle={2} strokeWidth={0}>
                  {perStato.map((entry, i) => (
                    <Cell key={i} fill={STATO_COLORS[entry.stato] || '#d1d5db'} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Testo centrale assoluto */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-800 leading-none">{totalStati}</span>
              <span className="text-xs text-gray-400 mt-1">totale</span>
            </div>
          </div>
          {/* Legenda esterna al container recharts */}
          <DonutLegend data={perStato} />
        </div>
      </div>

      {/* ── Chart: Tecnici ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Carico per tecnico</h3>
            <p className="text-xs text-gray-400 mt-0.5">Clicca su una barra per filtrare i ticket</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Aperti
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Chiusi
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(180, perTecnico.length * 38)}>
          <BarChart
            data={perTecnico.map(r => ({ ...r, chiusi: r.totale - r.aperti }))}
            layout="vertical"
            barSize={14}
            onClick={e => e?.activePayload?.[0] &&
              navigate(buildUrl({ stato: STATI_APERTI, tecnico: e.activePayload[0].payload.tecnico }))}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="tecnico" type="category"
              tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="aperti" fill="#3b82f6" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }} />
            <Bar dataKey="chiusi" fill="#22c55e" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
