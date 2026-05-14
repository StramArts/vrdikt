import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateXP } from '../lib/challenges'
import AppNav from '../components/AppNav'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcMaxStreak(roasts) {
  if (!roasts?.length) return 0
  const days = [...new Set(roasts.map(r => new Date(r.created_at).toDateString()))]
    .sort((a, b) => new Date(b) - new Date(a))
  if (days.length === 0) return 0
  let maxStreak = 1, cur = 1
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((new Date(days[i - 1]) - new Date(days[i])) / 86400000)
    if (diff === 1) { cur++; if (cur > maxStreak) maxStreak = cur }
    else cur = 1
  }
  return maxStreak
}

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [roasts, setRoasts]             = useState(null)
  const [gmailConn, setGmailConn]       = useState(false)
  const [coupleLinked, setCoupleLinked] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('roasts')
      .select('id, created_at, personality_type, score, roast_lines')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRoasts(data ?? []))
    supabase
      .from('gmail_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setGmailConn(!!data))
    supabase
      .from('couple_links')
      .select('id')
      .or(`initiator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => setCoupleLinked(!!data))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const loading     = roasts === null
  const latestRoast = roasts?.[0] ?? null
  const scores      = (roasts ?? []).map(r => r.score).filter(s => typeof s === 'number')
  const bestScore   = scores.length ? Math.max(...scores) : null
  const worstScore  = scores.length ? Math.min(...scores) : null
  const memberSince = roasts?.length
    ? formatDate(roasts[roasts.length - 1].created_at)
    : '—'
  const xpData      = calculateXP(roasts ?? [])
  const maxStreak   = calcMaxStreak(roasts ?? [])
  const streak7     = maxStreak >= 7 || !!localStorage.getItem('streak7Shown')
  const streak30    = maxStreak >= 30 || !!localStorage.getItem('streak30Shown')

  const BADGES = [
    { id: 'first_roast', emoji: '🔥', name: 'First Roast',              earned: (roasts?.length ?? 0) >= 1 },
    { id: 'score_30',    emoji: '💀', name: 'Score Under 30',            earned: scores.some(s => s < 30) },
    { id: 'streak_7',    emoji: '⚡', name: 'Week Warrior',              earned: streak7 },
    { id: 'streak_30',   emoji: '🏆', name: 'Obsessed (In a Good Way)',  earned: streak30 },
    { id: 'roasts_10',   emoji: '💣', name: '10 Roasts',                 earned: (roasts?.length ?? 0) >= 10 },
    { id: 'shared_card', emoji: '📤', name: 'Shared Roast Card',         earned: false },
    { id: 'gmail',       emoji: '📧', name: 'Gmail Connected',           earned: gmailConn || !!profile?.gmail_connected },
    { id: 'couple',      emoji: '💑', name: 'Couple Mode',               earned: coupleLinked },
  ]

  const personalities = (roasts ?? [])
    .filter(r => r.personality_type)
    .map(r => ({ date: r.created_at, name: r.personality_type }))

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', flexDirection: 'column',
    }}>
      <AppNav loggedIn showDashboardBtn user={user} onSignOut={handleSignOut} />

      <div style={{
        flex: 1, maxWidth: 700, width: '100%',
        margin: '0 auto', padding: '36px 20px 80px',
        display: 'flex', flexDirection: 'column', gap: '24px',
      }}>

        {/* Header */}
        <div>
          <p style={{ color: '#1E1E1E', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>
            Your Record
          </p>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>
            Profile
          </h1>
        </div>

        {/* Section 1: Identity card */}
        <div style={{
          background: '#0D0D0D', border: '1px solid rgba(245,197,24,0.25)',
          borderRadius: '24px', padding: '28px 24px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 0 40px rgba(245,197,24,0.05)',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at top left, rgba(245,197,24,0.04) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          {loading ? (
            <p style={{ color: '#333', fontSize: '14px', margin: 0 }}>Loading…</p>
          ) : latestRoast ? (
            <>
              <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 10px' }}>
                Spending Personality
              </p>
              <h2 style={{ color: '#F5C518', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>
                {latestRoast.personality_type ?? '—'}
              </h2>
              <p style={{ color: '#333', fontSize: '12px', margin: '0 0 12px' }}>
                Your financial identity as of {formatDate(latestRoast.created_at)}
              </p>
              <p style={{ color: '#2A2A2A', fontSize: '12px', margin: 0, fontWeight: 600 }}>
                {xpData.levelName}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: '#555', fontSize: '15px', fontWeight: 700, margin: '0 0 14px' }}>No roasts yet.</p>
              <button onClick={() => navigate('/upload')} style={{
                background: '#F5C518', border: 'none', borderRadius: '10px',
                padding: '10px 20px', color: '#0A0A0A', fontSize: '13px', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>Get Your First Roast →</button>
            </>
          )}
        </div>

        {/* Section 2: Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {[
            { label: 'Total Roasts', value: loading ? '—' : (roasts?.length ?? 0), accent: '#F0F0F0' },
            { label: 'Member Since', value: memberSince,                             accent: '#F0F0F0' },
            { label: 'Best Score',   value: loading || bestScore  === null ? '—' : bestScore,  accent: '#30D158' },
            { label: 'Worst Score',  value: loading || worstScore === null ? '—' : worstScore, accent: '#FF3B30' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{
              background: '#0D0D0D', border: '1px solid #161616',
              borderRadius: '16px', padding: '18px 16px',
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              <span style={{ color: '#333', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
              <span style={{ color: accent, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Section 3: Financial Character Arc */}
        <div style={{
          background: '#0D0D0D', border: '1px solid #161616',
          borderRadius: '20px', padding: '24px',
        }}>
          <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 18px' }}>
            Financial Character Arc
          </p>
          {personalities.length < 2 ? (
            <p style={{ color: '#2A2A2A', fontSize: '13px', margin: 0 }}>
              Get more roasts to see your character arc.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {personalities.map((p, i) => (
                <div key={p.date + i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '14px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? '#F5C518' : '#2A2A2A', flexShrink: 0, marginTop: '5px' }} />
                    {i < personalities.length - 1 && (
                      <div style={{ width: '1px', flex: 1, background: '#1A1A1A', minHeight: '22px' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < personalities.length - 1 ? '14px' : '0' }}>
                    <p style={{ color: i === 0 ? '#F5C518' : '#555', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>
                      {p.name}
                    </p>
                    <p style={{ color: '#2A2A2A', fontSize: '10px', margin: 0 }}>{formatDate(p.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Badges */}
        <div>
          <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px' }}>
            Badges
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {BADGES.map(b => (
              <div key={b.id} style={{
                background: b.earned ? '#0D0D0D' : '#0A0A0A',
                border: `1px solid ${b.earned ? 'rgba(245,197,24,0.2)' : '#141414'}`,
                borderRadius: '14px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                opacity: b.earned ? 1 : 0.4,
              }}>
                <span style={{ fontSize: '20px', filter: b.earned ? 'none' : 'grayscale(1)', flexShrink: 0 }}>
                  {b.earned ? b.emoji : '🔒'}
                </span>
                <div>
                  <p style={{ color: b.earned ? '#E0E0E0' : '#333', fontSize: '12px', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                    {b.name}
                  </p>
                  {b.earned && (
                    <p style={{ color: '#F5C518', fontSize: '9px', fontWeight: 700, margin: '3px 0 0', letterSpacing: '0.1em' }}>
                      EARNED
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
