import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { NotificheProvider } from './contexts/NotificheContext'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TicketsPage from './pages/TicketsPage'
import NewTicketPage from './pages/NewTicketPage'
import StatsPage from './pages/StatsPage'
import UsersPage from './pages/UsersPage'
import AnagrafichePage from './pages/AnagrafichePage'
import StoricoPage from './pages/StoricoPage'
import ListiniPage from './pages/ListiniPage'
import MagazzinoPage from './pages/MagazzinoPage'
import ProfilePage from './pages/ProfilePage'
import OrganizzazioniPage from './pages/OrganizzazioniPage'
import OrgAnagraficaPage from './pages/OrgAnagraficaPage'
import AmministrazionePage from './pages/AmministrazionePage'
import ContabilitaPage from './pages/ContabilitaPage'
import ClientiDirettiPage from './pages/ClientiDirettiPage'
import ServiziPage from './pages/ServiziPage'
import AbbonamentiPage from './pages/AbbonamentiPage'
import FunnelPage from './pages/FunnelPage'
import AdminDatabasePage from './pages/AdminDatabasePage'
import CalendarioPage from './pages/CalendarioPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import EmailSistemaPage from './pages/EmailSistemaPage'

function AuthErrorToast() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const handler = (e) => {
      const id = Date.now()
      setMessages(prev => [...prev, { id, text: e.detail }])
      setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 4000)
    }
    window.addEventListener('auth-error', handler)
    return () => window.removeEventListener('auth-error', handler)
  }, [])

  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
      {messages.map(m => (
        <div key={m.id} className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg max-w-sm animate-fade-in">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          {m.text}
        </div>
      ))}
    </div>
  )
}

function LicenzaBanner({ giorni }) {
  return (
    <div className="sticky top-0 z-40 bg-red-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium shadow">
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Licenza scaduta — periodo di tolleranza:{' '}
      <strong>{typeof giorni === 'number' ? `${giorni} giorni rimanenti` : 'in scadenza'}</strong>.
      {' '}Contatta l'amministratore per rinnovare.
    </div>
  )
}

function BloccataScreen() {
  const { logout } = useAuth()
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-red-700 mb-3">Accesso bloccato</h1>
        <p className="text-gray-600 mb-2">
          Il periodo di prova o la licenza è scaduta e i 7 giorni di tolleranza sono terminati.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Contatta il tuo amministratore per rinnovare la licenza e ripristinare l'accesso.
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Esci
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, allow, allowRoles }) {
  const { user, can } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowRoles && !allowRoles.includes(user.ruolo)) return <Navigate to="/" replace />
  if (allow && !can(allow)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, loading, isProprietario, activeOrg, logout } = useAuth()
  const location = useLocation()

  // Pagine pubbliche (nessuna autenticazione richiesta)
  if (location.pathname === '/forgot-password') return <ForgotPasswordPage />
  if (location.pathname === '/reset-password') return <ResetPasswordPage />

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Caricamento...
      </div>
    )
  }

  if (!user) return <LoginPage />

  // Blocco licenza per utenti non-proprietario
  if (!isProprietario && user.org_stato_licenza === 'bloccata') {
    return <BloccataScreen />
  }

  // Il proprietario senza org attiva va alla console di gestione
  if (isProprietario && !activeOrg) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="md:hidden h-14" />
          <Routes>
            <Route path="/organizzazioni" element={<OrganizzazioniPage />} />
            <Route path="/contabilita" element={<ContabilitaPage />} />
            <Route path="/email-sistema" element={<EmailSistemaPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/organizzazioni/:orgId/anagrafica" element={<OrgAnagraficaPage />} />
            <Route path="/admin/database" element={<AdminDatabasePage />} />
            <Route path="*" element={<Navigate to="/organizzazioni" replace />} />
          </Routes>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Banner grazia licenza */}
        {!isProprietario && user.org_stato_licenza === 'in_grazia' && (
          <LicenzaBanner giorni={user.org_giorni_grazia_rimanenti} />
        )}
        {/* Mobile top padding for hamburger button */}
        <div className="md:hidden h-14" />
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
            <Route path="/tickets/new" element={<ProtectedRoute allow="create_ticket"><NewTicketPage /></ProtectedRoute>} />
            <Route path="/tickets/:id/edit" element={<ProtectedRoute><NewTicketPage /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute allow="view_stats"><StatsPage /></ProtectedRoute>} />
            <Route path="/storico" element={<ProtectedRoute allow="storico.view"><StoricoPage /></ProtectedRoute>} />
            <Route path="/anagrafiche" element={<ProtectedRoute allow="anagrafiche.view"><AnagrafichePage /></ProtectedRoute>} />
            <Route path="/listini" element={<ProtectedRoute allow="listini.view"><ListiniPage /></ProtectedRoute>} />
            <Route path="/magazzino" element={<ProtectedRoute allow="magazzino.view"><MagazzinoPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allow="manage_users"><UsersPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/amministrazione" element={<ProtectedRoute allowRoles={['amministratore', 'proprietario']}><AmministrazionePage /></ProtectedRoute>} />
            <Route path="/clienti-diretti" element={<ProtectedRoute allow="clienti.view"><ClientiDirettiPage /></ProtectedRoute>} />
            <Route path="/servizi" element={<ProtectedRoute allow="servizi.view"><ServiziPage /></ProtectedRoute>} />
            <Route path="/abbonamenti" element={<ProtectedRoute allow="abbonamenti.view"><AbbonamentiPage /></ProtectedRoute>} />
            <Route path="/funnel" element={<ProtectedRoute allow="funnel.view"><FunnelPage /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute><CalendarioPage /></ProtectedRoute>} />
            <Route path="/admin/database" element={<ProtectedRoute allowRoles={['proprietario']}><AdminDatabasePage /></ProtectedRoute>} />
            {/* Il proprietario con org attiva può anche tornare alla console org */}
            {isProprietario && (
              <Route path="/organizzazioni" element={<OrganizzazioniPage />} />
            )}
            {isProprietario && (
              <Route path="/organizzazioni/:orgId/anagrafica" element={<OrgAnagraficaPage />} />
            )}
            <Route path="/login" element={<Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificheProvider>
          <BrowserRouter>
            <AppRoutes />
            <AuthErrorToast />
          </BrowserRouter>
        </NotificheProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
