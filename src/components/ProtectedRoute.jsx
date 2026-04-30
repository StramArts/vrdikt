import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Splash() {
  return (
    <div style={{
      minHeight: '100svh',
      background: '#0A0A0A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>
        <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
      </span>
      <div style={{
        width: '28px', height: '28px',
        border: '2px solid #1A1A1A',
        borderTopColor: '#F5C518',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}

// requireOnboarding=true  → also redirect to /onboarding if not yet done (dashboard, upload, roast, profile)
// requireOnboarding=false → auth check only, no onboarding redirect (the /onboarding route itself)
export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { user, loading, profile, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || (user && profileLoading)) return <Splash />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />

  if (requireOnboarding && profile !== null && !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
