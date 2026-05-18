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
  const [fullName, setFullName]         = useState(null)

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
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.full_name) setFullName(data.full_name) })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const displayName = fullName || profile?.full_name || (user?.email ? user.email.split('@')[0] : '—')
  const memberSince = user?.created_at ? formatDate(user.created_at) : '—'

  const loading     = roasts === null
  const latestRoast = roasts?.[0] ?? null
  const scores      = (roasts ?? []).map(r => r.score).filter(s => typeof s === 'number')
  const bestScore   = scores.length ? Math.max(...scores) : null
  const worstScore  = scores.length ? Math.min(...scores) : null
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

  // ── extra derived values for the new design ──────────────────────
  const initials = displayName.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).filter(Boolean).join('') || '?'
  const currentScore = latestRoast?.score ?? 0
  const worstRoast = (roasts ?? []).find(r => r.score === worstScore)
  const worstRoastLine = worstRoast?.roast_lines?.[0] ?? null

  // Last 8 roasts in chronological order for sparkline
  const chartRoasts = [...(roasts ?? [])].reverse().slice(-8)
  function buildChartPath(items) {
    if (!items.length) return { line: 'M0 50 L320 50', area: 'M0 50 L320 50 L320 80 L0 80 Z', last: [320, 50] }
    const W = 320, H = 80, pad = 10
    const pts = items.map((r, i) => {
      const x = items.length === 1 ? W / 2 : (i / (items.length - 1)) * W
      const y = H - pad - ((r.score ?? 50) / 100) * (H - pad * 2)
      return [Math.round(x), Math.round(y)]
    })
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
    const area = `${line} L${W} ${H} L0 ${H} Z`
    return { line, area, last: pts[pts.length - 1] }
  }
  const chart = buildChartPath(chartRoasts)

  const TIER_LIST = [
    { name: 'Financial Disaster',   range: '0–25',    min: 0,  max: 25  },
    { name: 'Digital Couch Potato', range: '26–40',   min: 26, max: 40  },
    { name: 'Almost Responsible',   range: '41–65',   min: 41, max: 65  },
    { name: 'Reformed Spender',     range: '66–85',   min: 66, max: 85  },
    { name: 'VRDIKT-Proof',         range: '86–100',  min: 86, max: 100, locked: true },
  ]

  // Design tokens
  const D = {
    bg: '#070707', bg2: '#0E0E0F',
    ink: '#FAFAF8', inkDim: 'rgba(250,250,248,0.55)', inkFaint: 'rgba(250,250,248,0.32)',
    hair: 'rgba(255,255,255,0.06)', hair2: 'rgba(255,255,255,0.10)',
  }
  const mono = { fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' }
  function DCard({ children, glow, style }) {
    return (
      <div style={{
        position: 'relative', padding: 18, borderRadius: 22,
        background: D.bg2, border: `1px solid ${D.hair}`, overflow: 'hidden',
        boxShadow: glow ? '0 0 0 1px rgba(255,85,0,0.2) inset, 0 0 24px -8px rgba(255,85,0,0.35)' : undefined,
        ...style,
      }}>{children}</div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', background: D.bg, color: D.ink, fontFamily: 'Geist, system-ui, sans-serif', position: 'relative' }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', left: '20%', top: '18%', width: 420, height: 420, transform: 'translate(-50%,-50%)', pointerEvents: 'none', background: 'radial-gradient(circle, #FF5500 0%, transparent 60%)', filter: 'blur(2px)', opacity: 0.16, zIndex: 0 }} />
      <div style={{ position: 'fixed', left: '85%', top: '6%', width: 260, height: 260, transform: 'translate(-50%,-50%)', pointerEvents: 'none', background: 'radial-gradient(circle, #FF1040 0%, transparent 60%)', filter: 'blur(2px)', opacity: 0.10, zIndex: 0 }} />
      {/* Subtle grid */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.4, zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Desktop top nav */}
      <AppNav loggedIn showDashboardBtn={false} user={user} onSignOut={handleSignOut} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, margin: '0 auto', padding: '16px 20px 120px' }}>

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ ...mono, color: D.inkDim }}>YOUR FILE</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${D.hair2}`, color: D.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9c-.7-.5-1.4-1-2.3-1.2L13.7 3h-3.4L10 5.6c-.8.3-1.6.7-2.3 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.7.5 1.4 1 2.3 1.2L10.3 21h3.4l.6-2.6c.8-.3 1.6-.7 2.3-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/></svg>
            </button>
          </div>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 74, height: 74, borderRadius: '50%', flexShrink: 0,
            background: 'radial-gradient(circle at 30% 25%, #ffd2a8, #ff7a3a 60%, #c43818)',
            border: '2px solid rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 28, color: '#1a0a00',
            boxShadow: '0 8px 24px -8px rgba(255,85,0,0.55), 0 0 30px rgba(255,85,0,0.28)',
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 24, color: D.ink, letterSpacing: '-0.025em', lineHeight: 1 }}>{displayName}</div>
            {latestRoast?.personality_type && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, background: '#FF5500', transform: 'rotate(45deg)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ ...mono, color: '#FF5500', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{latestRoast.personality_type}</span>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <span style={{ ...mono, color: D.inkFaint }}>JOINED {memberSince.toUpperCase()} · {roasts?.length ?? 0} ROASTS</span>
            </div>
          </div>
        </div>

        {/* 2×2 Bento stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {/* VRDIKT Score */}
          <DCard glow>
            <span style={{ ...mono, color: D.inkDim }}>VRDIKT SCORE</span>
            <div style={{ fontWeight: 800, fontSize: 38, color: D.ink, letterSpacing: '-0.04em', marginTop: 8, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2 }}>
              {loading ? '—' : currentScore}
              {!loading && <span style={{ fontSize: 14, color: D.inkDim, fontWeight: 500 }}>/100</span>}
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginTop: 8, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${currentScore}%`, background: '#FF5500', borderRadius: 99 }} />
            </div>
          </DCard>

          {/* Streak */}
          <DCard>
            <span style={{ ...mono, color: D.inkDim }}>STREAK</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 38, color: D.ink, letterSpacing: '-0.04em', lineHeight: 1 }}>{maxStreak}</span>
              <span style={{ fontSize: 14, color: D.inkDim, fontWeight: 500 }}>days</span>
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
              {[...Array(9)].map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < Math.min(maxStreak, 9) ? '#FFD000' : 'rgba(255,255,255,0.08)', boxShadow: i < Math.min(maxStreak, 9) ? '0 0 6px rgba(255,208,0,0.55)' : 'none' }} />
              ))}
            </div>
          </DCard>

          {/* Total Roasts */}
          <DCard>
            <span style={{ ...mono, color: D.inkDim }}>TOTAL ROASTS</span>
            <div style={{ fontWeight: 800, fontSize: 30, color: D.ink, letterSpacing: '-0.035em', marginTop: 8, lineHeight: 1 }}>
              {loading ? '—' : (roasts?.length ?? 0)}
            </div>
            <span style={{ ...mono, color: D.inkFaint, marginTop: 6, display: 'block' }}>
              SINCE {memberSince.split(' ').slice(-1)[0]}
            </span>
          </DCard>

          {/* Worst Roast */}
          <DCard>
            <span style={{ ...mono, color: D.inkDim }}>WORST ROAST</span>
            {worstRoastLine ? (
              <>
                <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, color: 'rgba(250,250,248,0.78)', lineHeight: 1.35, marginTop: 8 }}>
                  "{worstRoastLine.length > 58 ? worstRoastLine.slice(0, 58) + '…' : worstRoastLine}"
                </div>
                <span style={{ ...mono, color: '#FF1040', marginTop: 6, display: 'block' }}>EVIDENCE #01</span>
              </>
            ) : (
              <div style={{ fontWeight: 800, fontSize: 30, color: D.ink, letterSpacing: '-0.035em', marginTop: 8, lineHeight: 1 }}>
                {loading ? '—' : (worstScore !== null ? worstScore : '—')}
              </div>
            )}
          </DCard>
        </div>

        {/* Score history sparkline */}
        {chartRoasts.length > 0 && (
          <DCard style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <span style={{ ...mono, color: D.inkDim }}>SCORE HISTORY</span>
                <div style={{ fontWeight: 700, fontSize: 16, color: D.ink, letterSpacing: '-0.015em', marginTop: 6 }}>Last {chartRoasts.length} roast{chartRoasts.length !== 1 ? 's' : ''}</div>
              </div>
              {bestScore !== null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,85,0,0.15)', color: '#FF5500', fontSize: 11, fontWeight: 600, letterSpacing: '-0.005em' }}>
                  ↗ best {bestScore}
                </span>
              )}
            </div>
            <svg width="100%" height="80" viewBox="0 0 320 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="prof-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5500" stopOpacity="0.45"/>
                  <stop offset="100%" stopColor="#FF5500" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[20, 40, 60].map(y => (
                <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />
              ))}
              <path d={chart.area} fill="url(#prof-fill)" />
              <path d={chart.line} stroke="#FF5500" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={chart.last[0]} cy={chart.last[1]} r="4" fill="#FF5500" />
              <circle cx={chart.last[0]} cy={chart.last[1]} r="8" fill="#FF5500" fillOpacity="0.25" />
            </svg>
          </DCard>
        )}

        {/* Tier ladder */}
        <div style={{ marginBottom: 14, padding: '0 4px' }}>
          <span style={{ ...mono, color: D.inkDim }}>YOUR JOURNEY</span>
        </div>
        <DCard style={{ marginBottom: 10 }}>
          {TIER_LIST.map((tier, i) => {
            const active = currentScore >= tier.min && currentScore <= tier.max
            return (
              <div key={tier.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < TIER_LIST.length - 1 ? `1px solid ${D.hair}` : 'none' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: active ? '#FF5500' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? '#FF5500' : D.hair2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: active ? '#0a0a0a' : D.inkFaint,
                  fontSize: 11, fontWeight: 700,
                }}>
                  {active ? '●' : tier.locked ? (
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
                  ) : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: active ? 700 : 500, fontSize: 14, color: active ? D.ink : 'rgba(250,250,248,0.78)' }}>{tier.name}</div>
                  <span style={{ ...mono, color: D.inkFaint }}>{tier.range}</span>
                </div>
                {active && <span style={{ ...mono, color: '#FF5500', fontWeight: 600 }}>YOU</span>}
                {tier.locked && !active && <span style={{ ...mono, color: D.inkFaint }}>PRO</span>}
              </div>
            )
          })}
        </DCard>

        {/* Badges */}
        <div style={{ marginBottom: 12, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...mono, color: D.inkDim }}>BADGES · {BADGES.filter(b => b.earned).length} OF {BADGES.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {BADGES.map(b => (
            <div key={b.id} style={{
              flexShrink: 0, width: 92, padding: 12,
              borderRadius: 18, background: D.bg2, border: `1px solid ${b.earned ? 'rgba(255,208,0,0.2)' : D.hair}`,
              opacity: b.earned ? 1 : 0.5, position: 'relative', overflow: 'hidden',
            }}>
              {b.earned && (
                <div style={{ position: 'absolute', top: -10, right: -10, width: 40, height: 40, background: 'radial-gradient(circle, rgba(255,208,0,0.35), transparent 70%)' }} />
              )}
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: b.earned ? 'linear-gradient(135deg, #FFD000, rgba(255,208,0,0.7))' : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: b.earned ? '0 4px 10px -2px rgba(255,208,0,0.55)' : 'none',
                fontSize: 14, position: 'relative',
              }}>{b.earned ? b.emoji : '🔒'}</div>
              <div style={{ fontWeight: 600, fontSize: 11, color: D.ink, marginTop: 10, lineHeight: 1.2 }}>{b.name}</div>
              {b.earned && (
                <span style={{ ...mono, color: '#FFD000', fontSize: 9, marginTop: 4, display: 'block' }}>EARNED</span>
              )}
            </div>
          ))}
        </div>

        {/* Get first roast CTA */}
        {!loading && !roasts?.length && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button onClick={() => navigate('/upload')} style={{
              background: 'linear-gradient(135deg,#FF5500,#FF1040)', border: 'none', borderRadius: 14,
              padding: '14px 28px', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              boxShadow: '0 8px 24px -8px rgba(255,85,0,0.5)',
            }}>Get Your First Roast →</button>
          </div>
        )}
      </div>
    </div>
  )
}
