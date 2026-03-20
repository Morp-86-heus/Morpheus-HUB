import { useEffect, useState } from 'react'
import { statsApi } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

const STATO_COLORS_MAP = {
  'In gestione': '#3b82f6',
  'Attesa parti': '#f97316',
  'Sospesa': '#eab308',
  'Chiusa': '#9ca3af',
  'Annullata': '#ef4444',
}

function formatMese(val) {
  if (!val) return ''
  const [y, m] = val.split('-')
  return new Date(y, m - 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 bg-gray-100 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 ${i === 3 ? 'md:col-span-2' : ''}`}>
            <div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-64 w-full bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

function BarCustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-3 py-2 text-left">
      <p className="text-xs font-semibold text-gray-700 mb-1.5">{d?.tecnico}</p>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
          <span className="text-gray-500">Totale:</span>
          <span className="font-semibold text-gray-800">{d?.totale}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span className="text-gray-500">Aperti:</span>
          <span className="font-semibold text-gray-800">{d?.aperti}</span>
        </div>
      </div>
    </div>
  )
}

function PieCustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-3 py-2">
      <p className="text-xs font-semibold text-gray-700">{d.name}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: d.payload.fill }}>{d.value.toLocaleString('it-IT')}</p>
    </div>
  )
}

function AreaCustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-3 py-2 text-left">
      <p className="text-xs text-gray-400 mb-1">{formatMese(label)}</p>
      <p className="text-sm font-bold text-blue-600">{payload[0].value} ticket</p>
    </div>
  )
}

export default function StatsPage() {
  const [perTecnico, setPerTecnico] = useState([])
  const [perStato, setPerStato] = useState([])
  const [trend, setTrend] = useState([])
  const [sla, setSla] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      statsApi.perTecnico(),
      statsApi.perStato(),
      statsApi.trendMensile(),
      statsApi.slaCompliance(),
    ]).then(([pt, ps, tr, sl]) => {
      setPerTecnico(pt.data)
      setPerStato(ps.data)
      setTrend(tr.data)
      setSla(sl.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <StatsSkeleton />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Statistiche</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ticket per tecnico */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-1">Ticket per tecnico</h2>
              <p className="text-xs text-gray-400 mt-0.5 mb-5">Totale e aperti per ciascun tecnico</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" /> Totale
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Aperti
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={perTecnico} layout="vertical" barSize={12} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="tecnico" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={85} />
              <Tooltip content={<BarCustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="totale" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
              <Bar dataKey="aperti" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuzione stati */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Distribuzione stati</h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">Ripartizione di tutti i ticket per stato</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={perStato}
                dataKey="totale"
                nameKey="stato"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                strokeWidth={0}
              >
                {perStato.map((entry) => (
                  <Cell key={entry.stato} fill={STATO_COLORS_MAP[entry.stato] || '#8b5cf6'} />
                ))}
              </Pie>
              <Tooltip content={<PieCustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Custom legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
            {perStato.map((entry) => (
              <div key={entry.stato} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: STATO_COLORS_MAP[entry.stato] || '#8b5cf6' }}
                />
                <span className="text-xs text-gray-500">{entry.stato}</span>
                <span className="text-xs font-semibold text-gray-700">{entry.totale}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend mensile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Trend mensile</h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">Ticket registrati negli ultimi 12 mesi</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBlueTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="mese" tickFormatter={formatMese} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<AreaCustomTooltip />} />
              <Area type="monotone" dataKey="totale" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#gradBlueTrend)" dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SLA compliance table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">SLA Compliance per commitente</h2>
          <p className="text-xs text-gray-400 mt-0.5">Percentuale di rispetto SLA per ciascun commitente</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/60">
                {['Commitente', 'Totale con SLA', 'Rispettati', 'Violati', 'Compliance %'].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sla.map(r => (
                <tr key={r.commitente} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{r.commitente || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{r.totale}</td>
                  <td className="px-5 py-3 text-sm text-green-600 font-medium">{r.rispettati}</td>
                  <td className="px-5 py-3 text-sm text-red-500 font-medium">{r.violati}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${r.compliance_pct >= 80 ? 'bg-green-500' : r.compliance_pct >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                          style={{ width: `${r.compliance_pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right text-gray-700">{r.compliance_pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
