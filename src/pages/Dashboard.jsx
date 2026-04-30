import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useMobile } from '../hooks/useMobile'
import { parseRoast } from '../lib/anthropic'

function Logo() {
  return (
    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
      <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
    </span>
  )
}

function scoreColor(score) {
  if (score == null) return '#555'
  if (score < 40) return '#FF3B30'
  if (score > 70) return '#30D158'
  return '#F5C518'
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useMobile()

  const [roasts, setRoasts] = useState(null) // null = loading

  useEffect(() => {
    if (!user) return
    supabase
      .from('roasts')
      .select('id, created_at, roast_text, personality_type, score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRoasts(data ?? []))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  // Derived stats
  const totalRoasts = roasts?.length ?? 0
  const scores = roasts?.map(r => r.score).filter(s => typeof s === 'number') ?? []
  const worstScore = scores.length ? Math.min(...scores) : null
  const bestScore  = scores.length ? Math.max(...scores) : null

  // Streak: consecutive months with at least 1 roast (simple version)
  const streak = (() => {
    if (!roasts?.length) return 0
    const months = new Set(roasts.map(r => {
      const d = new Date(r.created_at)
      return `${d.getFullYear()}-${d.getMonth()}`
    }))
    let count = 0
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      if (months.has(`${d.getFullYear()}-${d.getMonth()}`)) count++
      else break
    }
    return count
  })()

  const STATS = [
    { label: 'Total Roasts', value: roasts === null ? '—' : totalRoasts, accent: '#FF3B30' },
    { label: 'Current Streak', value: roasts === null ? '—' : `${streak} mo`, accent: '#F5C518' },
    { label: 'Worst Score', value: worstScore === null ? '—' : worstScore, accent: '#FF3B30' },
    { label: 'Best Score',  value: bestScore  === null ? '—' : bestScore,  accent: '#30D158' },
  ]

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', borderBottom: '1px solid #111',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          <Logo />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              color: '#555', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Pricing
          </button>
          {!isMobile && <span style={{ color: '#252525', fontSize: '13px' }}>{user?.email}</span>}
          <button
            onClick={handleSignOut}
            style={{
              background: 'transparent', border: '1px solid #1E1E1E',
              borderRadius: '8px', padding: '6px 14px',
              color: '#555', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF3B30'; e.currentTarget.style.color = '#FF3B30' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#555' }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{
        flex: 1, maxWidth: 720, width: '100%',
        margin: '0 auto', padding: '44px 20px 80px',
        display: 'flex', flexDirection: 'column', gap: '24px',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#F5C518', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px' }}>
              Financial Crime Record
            </p>
            <h1 style={{
              fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900,
              letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1,
            }}>
              YOUR FINANCIAL<br />CRIME RECORD
            </h1>
          </div>
          <button
            onClick={() => navigate('/upload')}
            style={{
              background: '#F5C518', border: 'none', borderRadius: '12px',
              padding: '13px 22px', color: '#0A0A0A',
              fontSize: '14px', fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              letterSpacing: '-0.01em', whiteSpace: 'nowrap',
              boxShadow: '0 0 32px rgba(245,197,24,0.2)',
              transition: 'opacity 0.15s, transform 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Get Roasted 🔥
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '10px',
        }}>
          {STATS.map(({ label, value, accent }) => (
            <div key={label} style={{
              background: '#0D0D0D', border: '1px solid #161616',
              borderRadius: '16px', padding: '16px 14px',
              display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <span style={{ color: '#333', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>
                {label}
              </span>
              <span style={{ color: accent, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Roast History */}
        <div>
          <p style={{
            color: '#444', fontSize: '10px', letterSpacing: '0.2em',
            textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px',
          }}>
            Roast History
          </p>

          {roasts === null && (
            <p style={{ color: '#333', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
          )}

          {roasts?.length === 0 && (
            <div style={{
              background: '#0D0D0D', border: '1px solid #161616',
              borderRadius: '20px', padding: '48px 24px',
              textAlign: 'center', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px',
            }}>
              <span style={{ fontSize: '40px' }}>📂</span>
              <p style={{ color: '#555', fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                No crimes on record. Yet.
              </p>
              <button
                onClick={() => navigate('/upload')}
                style={{
                  background: '#F5C518', border: 'none', borderRadius: '10px',
                  padding: '11px 22px', color: '#0A0A0A',
                  fontSize: '14px', fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  marginTop: '4px',
                }}
              >
                Get Roasted →
              </button>
            </div>
          )}

          {roasts?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roasts.map((r) => {
                const parsed = parseRoast(r.roast_text ?? '')
                const preview = parsed.roastLines?.[0] ?? '—'
                const personality = r.personality_type ?? parsed.personalityType
                const score = r.score ?? parsed.score

                return (
                  <div key={r.id} style={{
                    background: '#0D0D0D', border: '1px solid #161616',
                    borderRadius: '18px', padding: '20px 22px',
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', gap: '16px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#333', fontSize: '12px' }}>{formatDate(r.created_at)}</span>
                        {personality && (
                          <span style={{
                            background: 'rgba(245,197,24,0.08)',
                            border: '1px solid rgba(245,197,24,0.15)',
                            borderRadius: '20px', padding: '2px 9px',
                            color: '#F5C518', fontSize: '11px', fontWeight: 600,
                          }}>
                            {personality}
                          </span>
                        )}
                      </div>
                      <p style={{
                        color: '#888', fontSize: '13px', margin: 0,
                        lineHeight: 1.5, overflow: 'hidden',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        "{preview}"
                      </p>
                    </div>
                    <div style={{
                      flexShrink: 0, textAlign: 'center',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    }}>
                      <span style={{ color: scoreColor(score), fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em' }}>
                        {score ?? '—'}
                      </span>
                      <span style={{ color: '#2A2A2A', fontSize: '10px', fontWeight: 600 }}>/100</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* BROक Mode */}
        <div style={{
          background: '#0A0A0A', border: '1px solid #141414',
          borderRadius: '20px', padding: '28px 24px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at top left, rgba(245,197,24,0.03) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>🔒</span>
              <div>
                <p style={{ color: '#555', fontSize: '14px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                  BROक Mode
                </p>
              </div>
            </div>
            <span style={{
              background: 'rgba(245,197,24,0.07)',
              border: '1px solid rgba(245,197,24,0.15)',
              borderRadius: '20px', padding: '3px 10px',
              color: '#F5C518', fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase', flexShrink: 0,
            }}>
              Coming Soon
            </span>
          </div>
          <p style={{ color: '#2E2E2E', fontSize: '13px', margin: '0 0 18px', lineHeight: 1.5 }}>
            Challenge a friend. Whoever spends worse loses. Bragging rights included.
          </p>
          <button
            disabled
            style={{
              background: 'transparent', border: '1px solid #1A1A1A',
              borderRadius: '10px', padding: '10px 20px',
              color: '#2A2A2A', fontSize: '13px', fontWeight: 700,
              cursor: 'not-allowed', fontFamily: 'Inter, sans-serif',
            }}
          >
            Challenge a Friend
          </button>
        </div>

      </div>
    </div>
  )
}
