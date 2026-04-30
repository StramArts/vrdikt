import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px',
    }}>
      <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>
        <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
      </span>
      <p style={{ color: '#6B6B6B', fontSize: '15px', margin: 0 }}>
        Signed in as <span style={{ color: '#F5C518' }}>{user?.email}</span>
      </p>
      <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>Profile — coming soon</p>
      <button
        onClick={handleSignOut}
        style={{
          marginTop: '8px', background: 'transparent',
          border: '1px solid #1E1E1E', borderRadius: '10px',
          padding: '10px 24px', color: '#F0F0F0', fontSize: '13px',
          fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF3B30'; e.currentTarget.style.color = '#FF3B30' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#F0F0F0' }}
      >
        Sign out
      </button>
    </div>
  )
}
