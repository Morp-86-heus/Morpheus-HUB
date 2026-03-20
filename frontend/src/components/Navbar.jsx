import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const RUOLO_COLORS = {
  proprietario: 'bg-purple-500',
  amministratore: 'bg-blue-500',
  commerciale: 'bg-green-500',
  tecnico: 'bg-orange-500',
}

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, logout, can } = useAuth()

  const links = [
    { to: '/', label: 'Dashboard', exact: true },
    { to: '/tickets', label: 'Tickets' },
    can('view_stats') && { to: '/stats', label: 'Statistiche' },
    can('manage_users') && { to: '/users', label: 'Utenti' },
  ].filter(Boolean)

  return (
    <nav className="bg-blue-700 text-white shadow">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm leading-none">M</span>
            </span>
            Morpheus-HUB
          </span>
          <div className="flex gap-1">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  (l.exact ? pathname === l.to : pathname.startsWith(l.to))
                    ? 'bg-blue-900 text-white'
                    : 'hover:bg-blue-600'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${RUOLO_COLORS[user?.ruolo] || 'bg-gray-400'}`} />
            <span className="text-blue-100">{user?.nome_completo || user?.username}</span>
            <span className="text-blue-300 text-xs">({user?.ruolo})</span>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1 text-xs border border-blue-400 rounded hover:bg-blue-600 transition-colors"
          >
            Esci
          </button>
        </div>
      </div>
    </nav>
  )
}
