import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useMobile } from '../hooks/useMobile'
import {
  getChallengeStatus, getStatusColor, getDaysRemaining, formatINR,
} from '../lib/challenges'

// ─── helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

function ScoreArc({ score }) {
  const color = score < 40 ? '#FF3B30' : score > 70 ? '#30D158' : '#F5C518'
  const r = 46
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  return (
    <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="#1C1C1C" strokeWidth="9" />
        <circle
          cx="65" cy="65" r={r}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: '#444', fontWeight: 600, marginTop: 2 }}>/100</span>
      </div>
    </div>
  )
}

const COMING_SOON = [
  { icon: '👑', name: 'BROक Mode',           desc: 'Unlimited roasts + brutal deep dive' },
  { icon: '📊', name: 'The VRDIKT Report',    desc: 'Your complete annual financial verdict' },
  { icon: '⚔️', name: 'Spending Duel',        desc: 'Challenge a friend to a spending battle' },
  { icon: '👥', name: 'Friend Comparisons',   desc: 'See how broke your friends are too' },
]

// ─── component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useMobile()

  const [challenge, setChallenge]   = useState(undefined) // undefined = loading
  const [roastCount, setRoastCount] = useState(null)

  const SCORE = 47
  const rawName   = user?.email?.split('@')[0] ?? 'friend'
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' })

  useEffect(() => {
    if (!user) return

    supabase
      .from('challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setChallenge(data ?? null))

    supabase
      .from('roasts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setRoastCount(count ?? 0))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const challengeStatus = challenge
    ? getChallengeStatus(challenge.current_amount, challenge.target_amount)
    : null

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', borderBottom: '1px solid #111',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent', border: 'none', padding: 0,
            cursor: 'pointer', fontSize: '19px', fontWeight: 900,
            letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {!isMobile && <span style={{ color: '#333', fontSize: '13px' }}>{user?.email}</span>}
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

      {/* ── Content ── */}
      <div style={{
        flex: 1, maxWidth: 680, width: '100%',
        margin: '0 auto', padding: '44px 20px 80px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>

        {/* 1. Greeting */}
        <div style={{ animation: 'fade-in 0.5s ease forwards' }}>
          <p style={{ color: '#555', fontSize: '15px', margin: '0 0 4px', fontWeight: 400 }}>
            {greeting()}
          </p>
          <h1 style={{
            fontSize: 'clamp(28px, 6vw, 38px)', fontWeight: 900,
            letterSpacing: '-0.04em', margin: '0 0 6px', lineHeight: 1.1,
          }}>
            <span style={{ color: '#F5C518' }}>{firstName}</span>
          </h1>
          <p style={{ color: '#333', fontSize: '14px', margin: 0 }}>
            Your financial verdict awaits
          </p>
        </div>

        {/* 2+3. Score + Challenge side by side */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '14px',
        }}>

          {/* VRDIKT Score card */}
          <div style={{
            background: '#0D0D0D', border: '1px solid #161616',
            borderRadius: '20px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div>
              <p style={{ color: '#444', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 4px' }}>
                VRDIKT Score
              </p>
              <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
                Your financial health this month
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <ScoreArc score={SCORE} />
              <div>
                <p style={{ color: '#F5C518', fontSize: '13px', fontWeight: 600, margin: '0 0 4px' }}>
                  Could be worse
                </p>
                <p style={{ color: '#3A3A3A', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                  You're spending like someone who knows better but doesn't care.
                </p>
              </div>
            </div>
          </div>

          {/* Savings Challenge card */}
          <div style={{
            background: '#0D0D0D', border: '1px solid #161616',
            borderRadius: '20px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <p style={{ color: '#444', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 4px' }}>
                  Your {monthName} Challenge
                </p>
                {challenge === undefined && (
                  <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>Loading…</p>
                )}
                {challenge === null && (
                  <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>No active challenge</p>
                )}
                {challenge && (
                  <p style={{ color: '#888', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                    {challenge.goal}
                  </p>
                )}
              </div>
              {challengeStatus && (
                <span style={{
                  background: `${getStatusColor(challengeStatus)}18`,
                  border: `1px solid ${getStatusColor(challengeStatus)}44`,
                  borderRadius: '20px', padding: '3px 9px',
                  color: getStatusColor(challengeStatus),
                  fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.1em', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {challengeStatus}
                </span>
              )}
            </div>

            {challenge && (
              <>
                {/* Progress bar */}
                <div>
                  <div style={{ background: '#1A1A1A', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((challenge.current_amount / challenge.target_amount) * 100, 100)}%`,
                      background: getStatusColor(challengeStatus),
                      borderRadius: '4px',
                      transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ color: '#555', fontSize: '12px' }}>
                      {formatINR(challenge.current_amount)} spent
                    </span>
                    <span style={{ color: '#333', fontSize: '12px' }}>
                      limit {formatINR(challenge.target_amount)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/challenge')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #F5C518',
                    borderRadius: '10px', padding: '9px 16px',
                    color: '#F5C518', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'background 0.15s',
                    marginTop: 'auto',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,197,24,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  View Challenge →
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4. Quick stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}>
          {[
            {
              label: 'Roasts Received',
              value: roastCount === null ? '—' : roastCount,
              accent: '#FF3B30',
            },
            {
              label: 'Current Streak',
              value: '1 month',
              accent: '#F5C518',
            },
            {
              label: 'This Month',
              value: monthName,
              accent: '#6B6B6B',
            },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{
              background: '#0D0D0D', border: '1px solid #161616',
              borderRadius: '16px', padding: '16px 14px',
              display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <span style={{ color: '#333', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>
                {label}
              </span>
              <span style={{ color: accent, fontSize: isMobile ? '16px' : '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* 5. Get Roasted CTA */}
        <button
          onClick={() => navigate('/upload')}
          style={{
            width: '100%', background: '#F5C518',
            border: 'none', borderRadius: '16px',
            padding: '20px 32px', color: '#0A0A0A',
            fontSize: '18px', fontWeight: 900,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.02em',
            boxShadow: '0 0 48px rgba(245,197,24,0.18)',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        >
          Get Roasted 🔥
        </button>

        {/* 6. Coming Soon */}
        <div style={{ marginTop: '12px' }}>
          <p style={{
            color: '#F5C518', fontSize: '10px', letterSpacing: '0.2em',
            textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px',
          }}>
            Coming Soon
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '10px',
          }}>
            {COMING_SOON.map(({ icon, name, desc }) => (
              <div
                key={name}
                style={{
                  position: 'relative',
                  background: '#0A0A0A', border: '1px solid #141414',
                  borderRadius: '16px', padding: '18px 20px',
                  opacity: 0.65,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.65'}
              >
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: 'rgba(245,197,24,0.08)',
                  border: '1px solid rgba(245,197,24,0.2)',
                  borderRadius: '20px', padding: '2px 8px',
                  color: '#F5C518', fontSize: '8px', fontWeight: 700,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>
                  COMING SOON
                </div>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px', filter: 'grayscale(0.3)' }}>
                  {icon}
                </span>
                <p style={{ color: '#666', fontSize: '14px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                  {name}
                </p>
                <p style={{ color: '#2E2E2E', fontSize: '12px', margin: 0, lineHeight: 1.4, paddingRight: '20px' }}>
                  {desc}
                </p>
                <span style={{ position: 'absolute', bottom: '14px', right: '14px', fontSize: '12px', color: '#1E1E1E' }}>
                  🔒
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
