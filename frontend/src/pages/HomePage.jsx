import { useAuth } from '../contexts/AuthContext'
import Dashboard from '../components/Dashboard'
import CommercialeDashboard from '../components/CommercialeDashboard'

export default function HomePage() {
  const { user } = useAuth()
  const isCommerciale = user?.ruolo === 'commerciale'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {isCommerciale
            ? 'Panoramica abbonamenti e scadenze clienti diretti'
            : 'Panoramica in tempo reale dei ticket di assistenza'}
        </p>
      </div>
      {isCommerciale ? <CommercialeDashboard /> : <Dashboard />}
    </div>
  )
}
