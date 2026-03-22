import { useAuth } from '../contexts/AuthContext'

const PLAN_LABELS = { base: 'Base', professional: 'Professional', enterprise: 'Enterprise' }
const UPGRADE_TO = { base: 'Professional', professional: 'Enterprise' }

export default function PlanGate({ feature, children }) {
  const { hasFeature, piano } = useAuth()
  if (hasFeature(feature)) return children

  const upgradeTo = UPGRADE_TO[piano || 'enterprise']

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-gray-700">Funzionalità non disponibile</p>
        <p className="text-sm text-gray-400 mt-1">
          Questa funzionalità richiede il piano <strong>{upgradeTo}</strong>.
        </p>
      </div>
      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full uppercase tracking-wide">
        Piano attuale: {PLAN_LABELS[piano || 'enterprise']}
      </span>
    </div>
  )
}
