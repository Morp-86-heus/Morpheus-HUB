import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificheBell from './NotificheBell'

const RUOLO_COLORS = {
  proprietario: 'bg-purple-500',
  amministratore: 'bg-blue-500',
  commerciale: 'bg-green-500',
  tecnico: 'bg-orange-500',
}

const RUOLO_BADGE = {
  proprietario: 'bg-purple-100 text-purple-700',
  amministratore: 'bg-blue-100 text-blue-700',
  commerciale: 'bg-green-100 text-green-700',
  tecnico: 'bg-orange-100 text-orange-700',
}

const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    anagrafiche: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    dashboard: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    tickets: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    stats: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    orgs: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    logout: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    menu: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    close: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    storico: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    listini: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    magazzino: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    contabilita: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    chevron: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    ),
    profile: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    back: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    ),
    admin: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    customers: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    funnel: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
      </svg>
    ),
  }
  return icons[name] || null
}

function NavItem({ to, icon, label, exact, collapsed, onClick, indent }) {
  const { pathname } = useLocation()
  const active = exact ? pathname === to : pathname.startsWith(to)

  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${indent && !collapsed ? 'pl-8' : ''} ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span>{label}</span>}
      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50 transition-opacity">
          {label}
        </span>
      )}
    </Link>
  )
}

function NavGroup({ icon, label, collapsed, children, matchPaths, onClick }) {
  const { pathname } = useLocation()
  const isChildActive = matchPaths.some(p => pathname.startsWith(p))
  const [open, setOpen] = useState(isChildActive)

  // Apri automaticamente se un figlio è attivo
  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [isChildActive])

  if (collapsed) {
    // In modalità collapsed mostra solo i figli come link singoli
    return <>{children}</>
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isChildActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout, can, activeOrg, clearActiveOrg, isProprietario, isAmministratore } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleTornaOrg = () => {
    clearActiveOrg()
    navigate('/organizzazioni')
  }

  const showAmministrazione = isAmministratore || isProprietario
  const showUtenti = can('manage_users')

  // Permessi sidebar
  const showMagazzino   = can('magazzino.view')
  const showStorico     = can('storico.view')
  const showAnagrafiche = can('anagrafiche.view')
  const showListini     = can('listini.view')
  const showServizi     = can('servizi.view')
  const showAbbonamenti = can('abbonamenti.view')
  const showFunnel      = can('funnel.view')
  const showCustomerManager = showAnagrafiche || showListini || showServizi || showAbbonamenti || showFunnel

  // Nav items per la console proprietario (senza activeOrg)
  const adminNavItems = [
    { to: '/organizzazioni', icon: <Icon name="orgs" />, label: 'Organizzazioni', exact: true },
    { to: '/contabilita', icon: <Icon name="contabilita" />, label: 'Contabilità' },
  ]

  const orgNavItems = [
    { to: '/', icon: <Icon name="dashboard" />, label: 'Dashboard', exact: true },
    showMagazzino && { to: '/magazzino', icon: <Icon name="magazzino" />, label: 'Magazzino' },
  ].filter(Boolean)

  const navItems = (isProprietario && !activeOrg) ? adminNavItems : orgNavItems

  const SidebarContent = ({ onNav }) => (
    <div className="flex flex-col h-full">
      {/* Logo + collapse button */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-200 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-7 h-7 rounded-md bg-orange-500 flex items-center justify-center shrink-0 hover:bg-orange-600 transition-colors hidden md:flex"
            title="Espandi"
          >
            <span className="block rotate-180">
              <Icon name="chevron" className="w-4 h-4 text-white" />
            </span>
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-orange-500 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm leading-none">M</span>
              </span>
              <span className="font-bold text-gray-800 text-sm leading-tight">
                Morpheus<br />HUB
              </span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors hidden md:block"
              title="Comprimi"
            >
              <Icon name="chevron" className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Banner organizzazione attiva (solo proprietario con activeOrg) */}
      {isProprietario && activeOrg && !collapsed && (
        <div className="px-3 pt-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
            <div className="text-xs text-purple-600 font-medium mb-0.5">Organizzazione</div>
            <div className="text-sm font-semibold text-purple-800 truncate" title={activeOrg.nome}>
              {activeOrg.nome}
            </div>
            <button
              onClick={handleTornaOrg}
              className="mt-1.5 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
            >
              <Icon name="back" className="w-3 h-3" />
              Tutte le organizzazioni
            </button>
          </div>
        </div>
      )}
      {isProprietario && activeOrg && collapsed && (
        <div className="px-2 pt-2">
          <button
            onClick={handleTornaOrg}
            title="Tutte le organizzazioni"
            className="w-full flex justify-center p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <Icon name="back" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
        {/* Dashboard sempre prima */}
        {navItems.filter(i => i.to === '/').map(item => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNav} />
        ))}
        {/* Gruppo Ticket Manager subito dopo Dashboard */}
        {!(isProprietario && !activeOrg) && (
          <NavGroup
            icon={<Icon name="tickets" />}
            label="Ticket Manager"
            collapsed={collapsed}
            matchPaths={['/tickets', '/storico']}
          >
            <NavItem to="/tickets" icon={<Icon name="tickets" />} label="Ticket Aperti" exact collapsed={collapsed} onClick={onNav} indent />
            {showStorico && (
              <NavItem to="/storico" icon={<Icon name="storico" />} label="Storico Ticket" collapsed={collapsed} onClick={onNav} indent />
            )}
          </NavGroup>
        )}
        {/* Resto dei nav items (Magazzino) */}
        {navItems.filter(i => i.to !== '/').map(item => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNav} />
        ))}
        {/* Gruppo Customer Manager — visibile solo se almeno un item è accessibile */}
        {!(isProprietario && !activeOrg) && showCustomerManager && (
          <NavGroup
            icon={<Icon name="customers" />}
            label="Customer Manager"
            collapsed={collapsed}
            matchPaths={['/anagrafiche', '/listini', '/servizi', '/abbonamenti', '/funnel']}
          >
            {showAnagrafiche && <NavItem to="/anagrafiche" icon={<Icon name="anagrafiche" />} label="Anagrafiche" collapsed={collapsed} onClick={onNav} indent />}
            {showListini    && <NavItem to="/listini"     icon={<Icon name="listini" />}     label="Listini Prezzi"    collapsed={collapsed} onClick={onNav} indent />}
            {showServizi    && <NavItem to="/servizi"     icon={<Icon name="listini" />}     label="Catalogo Servizi"  collapsed={collapsed} onClick={onNav} indent />}
            {showAbbonamenti && <NavItem to="/abbonamenti" icon={<Icon name="storico" />}   label="Abbonamenti"       collapsed={collapsed} onClick={onNav} indent />}
            {showFunnel     && <NavItem to="/funnel"      icon={<Icon name="funnel" />}      label="Funnel Vendite"    collapsed={collapsed} onClick={onNav} indent />}
          </NavGroup>
        )}
        {/* Statistiche */}
        {!(isProprietario && !activeOrg) && can('view_stats') && (
          <NavItem to="/stats" icon={<Icon name="stats" />} label="Statistiche" collapsed={collapsed} onClick={onNav} />
        )}
        {/* Gruppo Amministrazione (solo per amministratori e proprietari) */}
        {(isProprietario && !activeOrg) ? null : showAmministrazione && (
          <NavGroup
            icon={<Icon name="admin" />}
            label="Amministrazione"
            collapsed={collapsed}
            matchPaths={['/amministrazione', '/users']}
          >
            <NavItem to="/amministrazione" icon={<Icon name="admin" />} label="Permessi" collapsed={collapsed} onClick={onNav} indent />
            {showUtenti && (
              <NavItem to="/users" icon={<Icon name="users" />} label="Utenti" collapsed={collapsed} onClick={onNav} indent />
            )}
          </NavGroup>
        )}
      </nav>

      {/* User card */}
      <div className={`border-t border-gray-200 p-3 shrink-0 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {collapsed ? (
          <>
            <NotificheBell collapsed={true} />
            <button
              onClick={() => navigate('/profile')}
              title="Profilo"
              className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
            >
              <Icon name="profile" className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              title="Esci"
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <Icon name="logout" className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${RUOLO_COLORS[user?.ruolo] || 'bg-gray-400'}`}>
                {(user?.nome || user?.email || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {user?.nome_completo || user?.email}
                </div>
                <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${RUOLO_BADGE[user?.ruolo] || 'bg-gray-100 text-gray-500'}`}>
                  {user?.ruolo}
                </span>
              </div>
              <NotificheBell collapsed={false} />
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <Icon name="profile" className="w-4 h-4" />
              Profilo
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <Icon name="logout" className="w-4 h-4" />
              Esci
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md text-gray-600"
      >
        <Icon name="menu" className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
          <button onClick={() => setMobileOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent onNav={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </aside>
    </>
  )
}
