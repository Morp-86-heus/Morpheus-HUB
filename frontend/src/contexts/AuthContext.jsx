import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() =>
    localStorage.getItem('token') || sessionStorage.getItem('token')
  )
  const [activeOrg, setActiveOrgState] = useState(() => {
    const stored = localStorage.getItem('activeOrg')
    return stored ? JSON.parse(stored) : null
  })
  const [permissions, setPermissions] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  useEffect(() => {
    if (activeOrg?.id) {
      axios.defaults.headers.common['X-Organization-Id'] = String(activeOrg.id)
    } else {
      delete axios.defaults.headers.common['X-Organization-Id']
    }
  }, [activeOrg])

  const fetchPermissions = useCallback(async (ruolo) => {
    if (ruolo === 'proprietario') return  // sempre tutto
    try {
      const res = await axios.get('/api/permessi/miei')
      setPermissions(new Set(res.data))
    } catch {
      // ignora errori temporanei
    }
  }, [])

  useEffect(() => {
    if (!token) { setLoading(false); return }
    axios.get('/api/auth/me')
      .then(async r => {
        setUser(r.data)
        await fetchPermissions(r.data.ruolo)
      })
      .catch(() => { localStorage.removeItem('token'); sessionStorage.removeItem('token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [])  // eslint-disable-line

  const refreshUser = useCallback(() => {
    return axios.get('/api/auth/me').then(r => setUser(r.data))
  }, [])

  const refreshPermissions = useCallback(async () => {
    if (!user) return
    await fetchPermissions(user.ruolo)
  }, [user, fetchPermissions])

  const login = useCallback(async (email, password, rememberMe = false) => {
    const res = await axios.post('/api/auth/login', { email, password, remember_me: rememberMe })
    const { access_token, user } = res.data
    if (rememberMe) {
      localStorage.setItem('token', access_token)
      sessionStorage.removeItem('token')
    } else {
      sessionStorage.setItem('token', access_token)
      localStorage.removeItem('token')
    }
    setToken(access_token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setUser(user)
    await fetchPermissions(user.ruolo)
    return user
  }, [fetchPermissions])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('activeOrg')
    localStorage.removeItem('activeOrgId')
    setToken(null)
    setUser(null)
    setActiveOrgState(null)
    setPermissions(new Set())
    delete axios.defaults.headers.common['Authorization']
    delete axios.defaults.headers.common['X-Organization-Id']
  }, [])

  const setActiveOrg = useCallback((org) => {
    if (org) {
      const orgData = { id: org.id, nome: org.nome, piano: org.piano ?? null }
      localStorage.setItem('activeOrg', JSON.stringify(orgData))
      localStorage.setItem('activeOrgId', String(org.id))
      axios.defaults.headers.common['X-Organization-Id'] = String(org.id)
      setActiveOrgState(orgData)
    } else {
      localStorage.removeItem('activeOrg')
      localStorage.removeItem('activeOrgId')
      delete axios.defaults.headers.common['X-Organization-Id']
      setActiveOrgState(null)
    }
  }, [])

  const clearActiveOrg = useCallback(() => {
    setActiveOrg(null)
  }, [setActiveOrg])

  const isProprietario = user?.ruolo === 'proprietario'
  const isAmministratore = user?.ruolo === 'amministratore'

  // Piano e feature gating — usa user.org_piano (sempre fresco da /api/auth/me)
  // per il proprietario senza org usa 'enterprise' (accesso totale alla console)
  const piano = (user?.org_piano || 'enterprise').toLowerCase()

  const PLAN_FEATURES = {
    base:         { magazzino: false, listini: false, calendario: false, funnel: false, servizi: false, contabilita: false },
    professional: { magazzino: true,  listini: true,  calendario: true,  funnel: true,  servizi: true,  contabilita: false },
    enterprise:   { magazzino: true,  listini: true,  calendario: true,  funnel: true,  servizi: true,  contabilita: true  },
  }

  const hasFeature = useCallback((feature) => {
    const p = (piano || 'enterprise').toLowerCase()
    return PLAN_FEATURES[p]?.[feature] ?? true
  }, [piano])  // eslint-disable-line

  // Mapping nomi legacy → codici permesso nuovi
  const LEGACY = {
    'delete_ticket': 'ticket.delete',
    'create_ticket': 'ticket.create',
    'edit_ticket':   'ticket.edit',
    'view_stats':    'stats.view',
    'manage_users':  'utenti.manage',
    'manage_orgs':   null,   // solo proprietario
    'view_log':      'storico.view',
  }

  const can = useCallback((action) => {
    if (!user) return false
    if (user.ruolo === 'proprietario') return true
    const code = Object.prototype.hasOwnProperty.call(LEGACY, action) ? LEGACY[action] : action
    if (!code) return false
    return permissions.has(code)
  }, [user, permissions])  // eslint-disable-line

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      activeOrg, setActiveOrg, clearActiveOrg,
      isProprietario, isAmministratore,
      permissions,
      piano, hasFeature,
      login, logout, can, refreshUser, refreshPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
