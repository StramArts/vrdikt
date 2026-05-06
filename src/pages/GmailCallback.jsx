import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function GmailCallback() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const err = params.get('error')

    if (err || !code) {
      setError(err === 'access_denied' ? 'Gmail access was denied.' : 'OAuth failed. Please try again.')
      return
    }

    if (!user) {
      setError('Not logged in.')
      return
    }

    fetch('/api/gmail-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, userId: user.id, redirectUri: `${window.location.origin}/auth/gmail/callback` }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          navigate('/dashboard', { replace: true })
        } else {
          setError(data.error ?? 'Connection failed.')
        }
      })
      .catch(() => setError('Network error. Please try again.'))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{
        minHeight: '100svh', background: '#0A0A0A',
        fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '20px' }}>⚠️</span>
          <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 10px' }}>Connection Failed</h2>
          <p style={{ color: '#666', fontSize: '14px', margin: '0 0 28px' }}>{error}</p>
          <button
            onClick={() => window.location.href = '/connect-gmail'}
            style={{
              background: '#F5C518', border: 'none', borderRadius: '12px',
              padding: '13px 24px', color: '#0A0A0A', fontSize: '14px', fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '3px solid #F5C518', borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 20px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ color: '#666', fontSize: '15px', margin: 0 }}>Connecting your Gmail…</p>
      </div>
    </div>
  )
}
