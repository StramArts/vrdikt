import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { checkZomatoDetox, generateMonthlyChallenge, calculateXP } from '../lib/challenges'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import CoupleMode from './CoupleMode'
import AppNav from '../components/AppNav'

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s) {
  if (s == null) return '#555'
  return s < 40 ? '#FF3B30' : s > 70 ? '#30D158' : '#F5C518'
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcStreak(roasts) {
  if (!roasts?.length) return 0
  const days = new Set(roasts.map(r => new Date(r.created_at).toDateString()))
  let n = 0; const d = new Date()
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1) }
  return n
}

function calcPrevStreak(roasts) {
  if (!roasts?.length) return 0
  const days = new Set(roasts.map(r => new Date(r.created_at).toDateString()))
  let n = 0
  const d = new Date(roasts[0].created_at)
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1) }
  return n
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (sec < 60)   return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  const d = Math.floor(sec / 86400)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

const CATEGORY_COLORS = {
  'Food Delivery': '#FF3B30',
  'Groceries':     '#FF9500',
  'Shopping':      '#F5C518',
  'Entertainment': '#AF52DE',
  'Transport':     '#4CAF50',
  'Finance / EMI': '#636366',
  'Dining':        '#FF6B35',
  'Health':        '#30D158',
  'Bills':         '#5E5CE6',
  'Other':         '#444',
}

// ─── STREAK OVERLAYS ─────────────────────────────────────────────────────────

function StreakOverlay({ type, data, onClose, navigate }) {
  const overlay = {
    position: 'fixed', inset: 0, zIndex: 1000, background: '#0A0A0A',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '40px 24px', textAlign: 'center',
  }
  const badge = {
    background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)',
    borderRadius: '16px', padding: '16px 28px', marginBottom: '36px',
  }

  if (type === 'broken') return (
    <div style={overlay}>
      <p style={{ color: '#FF3B30', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 20px' }}>STREAK OVER</p>
      <h1 style={{ color: '#FF3B30', fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 20px', lineHeight: 1 }}>
        STREAK BROKEN.
      </h1>
      <p style={{ color: '#888', fontSize: '16px', maxWidth: 420, margin: '0 0 36px', lineHeight: 1.6 }}>
        Your {data.prevStreak}-day streak is gone. Every day you don't track is a day your money goes wherever it wants.
      </p>
      <button
        onClick={() => navigate('/upload')}
        style={{ background: '#F5C518', border: 'none', borderRadius: '12px', padding: '15px 32px', color: '#0A0A0A', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '20px' }}
      >
        Get Roasted Now
      </button>
      <button
        onClick={onClose}
        style={{ background: 'transparent', border: 'none', color: '#333', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
      >
        Running from your finances doesn't make them go away.
      </button>
    </div>
  )

  if (type === '7') return (
    <div style={overlay}>
      <p style={{ color: '#F5C518', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 20px' }}>MILESTONE</p>
      <h1 style={{ color: '#F5C518', fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 20px', lineHeight: 1.1 }}>
        7 DAYS STRAIGHT.
      </h1>
      <p style={{ color: '#888', fontSize: '16px', maxWidth: 400, margin: '0 0 28px', lineHeight: 1.6 }}>
        Most people quit by day 3. You're still here.
      </p>
      <div style={badge}>
        <p style={{ color: '#F5C518', fontSize: '14px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.08em' }}>WEEK WARRIOR</p>
        <p style={{ color: '#F5C518', fontSize: '13px', fontWeight: 700, margin: 0 }}>+75 XP unlocked</p>
      </div>
      <button
        onClick={onClose}
        style={{ background: '#F5C518', border: 'none', borderRadius: '12px', padding: '15px 32px', color: '#0A0A0A', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
      >
        Keep Going
      </button>
    </div>
  )

  if (type === '30') return (
    <div style={overlay}>
      <p style={{ color: '#F5C518', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 20px' }}>MILESTONE</p>
      <h1 style={{ color: '#F5C518', fontSize: 'clamp(28px, 5vw, 50px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 20px', lineHeight: 1.1 }}>
        30 DAYS.<br />You might actually be changing.
      </h1>
      <p style={{ color: '#888', fontSize: '16px', maxWidth: 420, margin: '0 0 28px', lineHeight: 1.6 }}>
        A full month of tracking. That's more financial discipline than most people manage all year.
      </p>
      <div style={badge}>
        <p style={{ color: '#F5C518', fontSize: '14px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.04em' }}>OBSESSED (IN A GOOD WAY)</p>
        <p style={{ color: '#F5C518', fontSize: '13px', fontWeight: 700, margin: 0 }}>+200 XP unlocked</p>
      </div>
      <button
        onClick={() => { onClose(); navigate('/profile') }}
        style={{ background: '#F5C518', border: 'none', borderRadius: '12px', padding: '15px 32px', color: '#0A0A0A', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
      >
        View Your Journey
      </button>
    </div>
  )

  return null
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

function OverviewTab({ roasts, loading, gmailStatus, autoTxns, navigate }) {
  const latestRoast = roasts[0] ?? null
  const latestScore = latestRoast?.score ?? null
  const streak      = calcStreak(roasts)
  const scores      = roasts.map(r => r.score).filter(s => typeof s === 'number')
  const bestScore   = scores.length ? Math.max(...scores) : null
  const xpData      = calculateXP(roasts)

  // Build donut from auto transactions (debits only)
  const catTotals = {}
  for (const tx of (autoTxns ?? [])) {
    if (tx.type !== 'debit') continue
    catTotals[tx.category] = (catTotals[tx.category] ?? 0) + tx.amount
  }
  const catData = Object.entries(catTotals)
    .map(([name, amount]) => ({ name, amount, color: CATEGORY_COLORS[name] ?? '#636366' }))
    .sort((a, b) => b.amount - a.amount)
  const top3  = catData.slice(0, 3)
  const total = catData.reduce((s, c) => s + c.amount, 0)
  const hasSpend = catData.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 3-stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[
          { label: 'Roasts',     value: loading ? '—' : roasts.length,                  accent: '#FF3B30' },
          { label: 'XP Level',   value: loading ? '—' : `${xpData.xp} XP`,              accent: '#F5C518', sub: xpData.levelName },
          { label: 'Best Score', value: loading || bestScore === null ? '—' : bestScore, accent: '#30D158' },
        ].map(({ label, value, accent, sub }) => (
          <div key={label} style={{
            background: '#0D0D0D', border: '1px solid #161616',
            borderRadius: '16px', padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <span style={{ color: '#333', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ color: accent, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{value}</span>
            {sub && <span style={{ color: '#2A2A2A', fontSize: '10px', fontWeight: 500 }}>{sub}</span>}
          </div>
        ))}
      </div>

      {/* Spending Snapshot */}
      <div style={{
        background: '#0D0D0D', border: '1px solid #161616',
        borderRadius: '20px', padding: '22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
            Spending Snapshot
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: gmailStatus?.connected ? '#30D158' : '#252525',
            }} />
            <span style={{ color: '#252525', fontSize: '10px', fontWeight: 600 }}>
              {gmailStatus?.connected ? 'Gmail synced' : 'Gmail not connected'}
            </span>
          </div>
        </div>

        {!hasSpend ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: '#2A2A2A', fontSize: '13px', margin: '0 0 4px' }}>No spending data yet.</p>
            <p style={{ color: '#1E1E1E', fontSize: '12px', margin: 0 }}>
              {gmailStatus?.connected ? 'Sync Gmail to import transactions.' : 'Connect Gmail or submit a roast to see your breakdown.'}
            </p>
            {!gmailStatus?.connected && (
              <button
                onClick={() => navigate('/connect-gmail')}
                style={{
                  marginTop: '14px', background: 'transparent',
                  border: '1px solid rgba(245,197,24,0.25)', borderRadius: '8px',
                  padding: '7px 16px', color: '#F5C518', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >Connect Gmail →</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', flexShrink: 0, width: '110px', height: '110px' }}>
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie
                    data={catData}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={34}
                    outerRadius={52}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                  >
                    {catData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`₹${value.toLocaleString('en-IN')}`, name]}
                    contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: '8px', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}
                    itemStyle={{ color: '#F0F0F0' }}
                    labelStyle={{ display: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none',
              }}>
                <div style={{ color: '#E0E0E0', fontSize: '11px', fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1 }}>
                  ₹{total >= 100000
                    ? `${(total / 100000).toFixed(1)}L`
                    : total >= 1000
                    ? `${(total / 1000).toFixed(1)}k`
                    : total}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {top3.map(({ name, amount, color }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: '#888', fontSize: '12px', fontWeight: 500 }}>{name}</span>
                  </div>
                  <span style={{ color, fontSize: '12px', fontWeight: 700 }}>₹{amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CHALLENGES TAB ───────────────────────────────────────────────────────────

function ChallengesTab({ roasts, profile, zomato, navigate }) {
  const xp      = calculateXP(roasts)
  const monthly = generateMonthlyChallenge(profile, roasts)

  const statusColors = { not_started: '#555', on_track: '#30D158', at_risk: '#FF9F0A', exceeded: '#FF3B30', completed: '#30D158' }
  const statusColor  = statusColors[monthly.status] ?? '#555'
  const daysColor    = monthly.daysLeft > 15 ? '#30D158' : monthly.daysLeft > 7 ? '#FF9F0A' : '#FF3B30'

  const QUICK_LOCKED = [
    { emoji: '💰', name: 'Savings Sprint',      xp: 150 },
    { emoji: '⚡', name: 'No Impulse Buys',     xp: 120 },
    { emoji: '📱', name: 'Subscription Audit',  xp: 80  },
    { emoji: '🥊', name: 'Friend Duel',         xp: 200 },
    { emoji: '🏆', name: 'Annual Challenge',    xp: 500 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Monthly Challenge — hero */}
      <div style={{
        background: '#111', border: '1px solid rgba(245,197,24,0.25)',
        borderRadius: '24px', padding: '28px 24px',
        boxShadow: '0 0 40px rgba(245,197,24,0.05)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at top left, rgba(245,197,24,0.04) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 18px' }}>
          Monthly Challenge
        </p>

        {monthly.status === 'not_started' ? (
          <div style={{ padding: '4px 0 8px' }}>
            <p style={{ color: '#555', fontSize: '15px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.5 }}>
              Submit your first roast to activate your challenge
            </p>
            {!profile && (
              <button onClick={() => navigate('/onboarding')} style={{
                background: '#F5C518', border: 'none', borderRadius: '10px',
                padding: '10px 20px', color: '#0A0A0A', fontSize: '13px', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>Complete setup →</button>
            )}
          </div>
        ) : (
          <>
            {monthly.savingFor && (
              <p style={{ color: '#F5C518', fontSize: '11px', fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.02em' }}>
                Saving for: {monthly.savingFor}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: '#F0F0F0' }}>
                {monthly.title}
              </h3>
              <span style={{
                background: `${statusColor}15`, border: `1px solid ${statusColor}44`,
                borderRadius: '20px', padding: '3px 10px',
                color: statusColor, fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
              }}>{monthly.status.replace('_', ' ')}</span>
            </div>
            <p style={{ color: '#444', fontSize: '13px', margin: '0 0 20px', lineHeight: 1.5 }}>{monthly.description}</p>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ background: '#1A1A1A', borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{
                  height: '100%', width: `${monthly.percentComplete}%`, background: statusColor,
                  borderRadius: '8px', transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ color: '#F0F0F0', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em' }}>
                    ₹{monthly.current.toLocaleString('en-IN')}
                  </span>
                  <span style={{ color: '#333', fontSize: '13px', fontWeight: 600 }}> of ₹{monthly.target.toLocaleString('en-IN')}</span>
                </div>
                <span style={{ color: daysColor, fontSize: '13px', fontWeight: 700 }}>
                  {monthly.daysLeft}d left
                </span>
              </div>
            </div>

            {monthly.projectedSavings > 0 && (
              <p style={{ color: '#30D158', fontSize: '12px', margin: '10px 0 0', fontWeight: 600 }}>
                Hit target → save ₹{monthly.projectedSavings.toLocaleString('en-IN')} this month
              </p>
            )}
            <p style={{ color: '#2A2A2A', fontSize: '11px', margin: '6px 0 0' }}>
              +{monthly.xpReward} XP on completion
            </p>
          </>
        )}
      </div>

      {/* Quick Challenges 2-col */}
      <div>
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px' }}>
          Quick Challenges
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {/* Zomato Detox — active */}
          <div style={{
            background: '#111', border: '1px solid rgba(245,197,24,0.15)',
            borderRadius: '18px', padding: '18px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '22px' }}>🍕</span>
              <span style={{
                background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)',
                borderRadius: '20px', padding: '2px 8px',
                color: '#F5C518', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
              }}>+100 XP</span>
            </div>
            <p style={{ color: '#F0F0F0', fontSize: '13px', fontWeight: 800, margin: 0 }}>Zomato Detox</p>
            <div style={{ background: '#1A1A1A', borderRadius: '3px', height: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(((zomato?.daysClean ?? 0) / 7) * 100, 100)}%`,
                background: { active: '#F5C518', failed: '#FF3B30', completed: '#30D158' }[zomato?.status ?? 'active'],
                borderRadius: '3px',
              }} />
            </div>
            <span style={{ color: '#333', fontSize: '10px' }}>Day {zomato?.daysClean ?? 0}/7</span>
          </div>

          {QUICK_LOCKED.map(q => (
            <div key={q.name} style={{
              background: '#0A0A0A', border: '1px solid #141414',
              borderRadius: '18px', padding: '18px', position: 'relative',
              display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.5,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '22px' }}>{q.emoji}</span>
                <span style={{
                  background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.12)',
                  borderRadius: '20px', padding: '2px 8px',
                  color: '#555', fontSize: '9px', fontWeight: 700,
                }}>+{q.xp} XP SOON</span>
              </div>
              <p style={{ color: '#444', fontSize: '13px', fontWeight: 800, margin: 0 }}>{q.name}</p>
              <span style={{ position: 'absolute', bottom: '14px', right: '14px', fontSize: '14px' }}>🔒</span>
            </div>
          ))}
        </div>
      </div>

      {/* XP & Level — compact */}
      <div style={{
        background: '#0D0D0D', border: '1px solid rgba(245,197,24,0.1)',
        borderRadius: '16px', padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ color: '#F5C518', fontSize: '13px', fontWeight: 800 }}>{xp.levelName}</span>
          <span style={{ color: '#F5C518', fontSize: '13px', fontWeight: 700 }}>{xp.xp} XP</span>
        </div>
        <div style={{ background: '#1A1A1A', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${xp.progressPct}%`,
            background: 'linear-gradient(90deg, #F5C518, #FFD93D)',
            borderRadius: '4px', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        {xp.nextThreshold && (
          <p style={{ color: '#222', fontSize: '10px', margin: '6px 0 0' }}>
            {xp.nextThreshold} XP to next level
          </p>
        )}
      </div>

      {/* BROक Mode — locked small card */}
      <div style={{
        background: '#0A0A0A', border: '1px solid #141414',
        borderRadius: '16px', padding: '16px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        opacity: 0.65,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <div>
            <p style={{ color: '#555', fontSize: '13px', fontWeight: 800, margin: 0 }}>BROक Mode</p>
            <p style={{ color: '#2A2A2A', fontSize: '11px', margin: '2px 0 0' }}>Challenge a friend. Loser gets roasted publicly.</p>
          </div>
        </div>
        <span style={{
          background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.12)',
          borderRadius: '20px', padding: '3px 9px',
          color: '#444', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>Soon</span>
      </div>
    </div>
  )
}

// ─── TRANSACTIONS TAB ─────────────────────────────────────────────────────────

function TransactionsTab({ transactions, gmailStatus, navigate, onSync, syncing, roasts }) {
  const [filterCat, setFilterCat]       = useState('')
  const [filterType, setFilterType]     = useState('all')
  const [visibleCount, setVisibleCount] = useState(30)

  useEffect(() => { setVisibleCount(30) }, [filterCat, filterType])

  if (!gmailStatus?.connected) {
    return (
      <div style={{
        background: '#0D0D0D', border: '1px solid #161616', borderRadius: '20px', padding: '48px 24px',
        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
      }}>
        <p style={{ color: '#555', fontSize: '15px', fontWeight: 700, margin: 0 }}>Connect Gmail to track transactions automatically</p>
        <button onClick={() => navigate('/connect-gmail')} style={{
          background: '#F5C518', border: 'none', borderRadius: '10px',
          padding: '11px 22px', color: '#0A0A0A', fontSize: '13px', fontWeight: 800,
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}>Connect Gmail →</button>
      </div>
    )
  }

  const txns = transactions ?? []
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const getDate = (tx) => tx.date ?? tx.created_at
  const isThisMonth = (tx) => {
    const raw = getDate(tx)
    if (!raw) return false
    const dt = new Date(raw)
    if (isNaN(dt)) return false
    // Use month/year equality so YYYY-MM-DD strings (UTC midnight) don't fail
    // the <= now check for users in UTC+ timezones where today's UTC midnight > local now
    return dt.getUTCFullYear() === now.getFullYear() && dt.getUTCMonth() === now.getMonth()
  }
  const thisMonth = txns.filter(isThisMonth)

  if (txns.length > 0) {
    console.log('[VRDIKT] tx debug — total:', txns.length, 'thisMonth:', thisMonth.length,
      '| first 3:', JSON.stringify(txns.slice(0, 3)),
      '| types seen:', [...new Set(txns.map(t => t.type))].join(','))
  }

  const normalizeType = (t) => (t.type ?? '').toLowerCase()
  const totalDebit  = thisMonth.filter(t => normalizeType(t).includes('debit')).reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const totalCredit = thisMonth.filter(t => normalizeType(t).includes('credit')).reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const net         = totalCredit - totalDebit

  const suspectRLS  = txns.length === 0 && (gmailStatus?.txCount ?? 0) > 0
  const suspectType = txns.length > 0 && thisMonth.length > 0 && totalDebit === 0 && totalCredit === 0

  const categories = [...new Set(txns.map(t => t.category).filter(Boolean))].sort()

  const filtered = txns.filter(tx => {
    if (filterCat && tx.category !== filterCat) return false
    if (filterType !== 'all' && tx.type !== filterType) return false
    return true
  })

  const pill = (active) => ({
    background: active ? 'rgba(245,197,24,0.1)' : 'transparent',
    border: `1px solid ${active ? 'rgba(245,197,24,0.35)' : '#1E1E1E'}`,
    borderRadius: '999px', padding: '4px 11px',
    color: active ? '#F5C518' : '#3A3A3A',
    fontSize: '10px', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Hero: spending summary */}
      <div style={{
        background: '#0D0D0D', border: '1px solid #161616',
        borderRadius: '20px', padding: '24px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      }}>
        {[
          { label: 'Debited',  value: `₹${totalDebit.toLocaleString('en-IN')}`,                         color: '#FF3B30' },
          { label: 'Credited', value: `₹${totalCredit.toLocaleString('en-IN')}`,                        color: '#30D158' },
          { label: 'Net',      value: `${net >= 0 ? '+' : ''}₹${Math.abs(net).toLocaleString('en-IN')}`, color: net >= 0 ? '#30D158' : '#FF3B30' },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{
            borderLeft: i > 0 ? '1px solid #161616' : 'none',
            paddingLeft: i > 0 ? '18px' : '0',
            paddingRight: i < 2 ? '18px' : '0',
          }}>
            <p style={{ color: '#333', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
              {label}
            </p>
            <p style={{ color, fontSize: '18px', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ color: '#2A2A2A', fontSize: '10px', margin: '4px 0 0' }}>this month</p>
          </div>
        ))}
      </div>
      {suspectType && (
        <p style={{ color: '#FF9500', fontSize: '11px', margin: '-12px 0 0', fontWeight: 600 }}>
          ⚠ Transactions loaded but type values don't match — check console for raw data.
        </p>
      )}

      {/* Compact filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
        {['all', 'debit', 'credit'].map(t => (
          <button key={t} style={pill(filterType === t)} onClick={() => setFilterType(t)}>
            {t === 'all' ? 'All' : t === 'debit' ? 'Debits' : 'Credits'}
          </button>
        ))}
        <div style={{ width: '1px', height: '14px', background: '#1E1E1E' }} />
        <button style={pill(filterCat === '')} onClick={() => setFilterCat('')}>All</button>
        {categories.map(cat => (
          <button key={cat} style={pill(filterCat === cat)} onClick={() => setFilterCat(cat)}>{cat}</button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={onSync} disabled={syncing} style={pill(false)}>
            {syncing ? 'Syncing…' : '↻ Sync'}
          </button>
        </div>
      </div>

      {/* Dense divider-line list */}
      {transactions === null ? (
        <p style={{ color: '#333', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#2A2A2A', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>
          {txns.length === 0
            ? suspectRLS ? 'Transactions exist but couldn\'t be loaded — try signing out and back in.' : 'Sync Gmail to import transactions.'
            : 'No transactions match the filters.'}
        </p>
      ) : (
        <div style={{ background: '#0D0D0D', border: '1px solid #161616', borderRadius: '16px', overflow: 'hidden' }}>
          {filtered.slice(0, visibleCount).map((tx, i) => {
            const catColor = CATEGORY_COLORS[tx.category] ?? '#444'
            const isLast   = i === Math.min(filtered.length, visibleCount) - 1 && filtered.length <= visibleCount
            return (
              <div
                key={tx.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: isLast ? 'none' : '1px solid #0F0F0F',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ color: '#CCCCCC', fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      {tx.merchant}
                    </span>
                    <span style={{
                      color: catColor, fontSize: '9px', fontWeight: 700,
                      background: `${catColor}12`, borderRadius: '4px', padding: '1px 5px',
                      flexShrink: 0,
                    }}>{tx.category}</span>
                  </div>
                  <span style={{ color: '#2A2A2A', fontSize: '10px' }}>{timeAgo(tx.date)}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, flexShrink: 0, color: tx.type === 'credit' ? '#30D158' : '#FF3B30' }}>
                  {tx.type === 'credit' ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
                </span>
              </div>
            )
          })}
          {filtered.length > visibleCount && (
            <div style={{ padding: '13px 16px', borderTop: '1px solid #0F0F0F', textAlign: 'center' }}>
              <button
                onClick={() => setVisibleCount(v => v + 30)}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#444', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Roast History */}
      {roasts.length > 0 && (
        <div>
          <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 12px' }}>
            Roast History
          </p>
          <div style={{ background: '#0D0D0D', border: '1px solid #161616', borderRadius: '16px', overflow: 'hidden' }}>
            {roasts.slice(0, 10).map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: '13px 16px',
                  borderBottom: i < Math.min(roasts.length, 10) - 1 ? '1px solid #0F0F0F' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}
              >
                <div>
                  <p style={{ color: '#888', fontSize: '12px', fontWeight: 600, margin: 0 }}>
                    {r.personality_type ?? 'Roast'}
                  </p>
                  <p style={{ color: '#2A2A2A', fontSize: '10px', margin: '2px 0 0' }}>{formatDate(r.created_at)}</p>
                </div>
                {r.score != null && (
                  <p style={{ margin: 0, flexShrink: 0 }}>
                    <span style={{ color: scoreColor(r.score), fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {r.score}
                    </span>
                    <span style={{ color: '#1E1E1E', fontSize: '10px', fontWeight: 700 }}>/100</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [roasts, setRoasts]                   = useState(null)
  const [tab, setTab]                         = useState('overview')
  const [gmailStatus, setGmailStatus]         = useState(null)
  const [syncing, setSyncing]                 = useState(false)
  const [autoTxns, setAutoTxns]               = useState(null)
  const [streakOverlay, setStreakOverlay]     = useState(null)
  const [streakOverlayData, setStreakOverlayData] = useState({})

  useEffect(() => {
    if (!user) return
    supabase
      .from('roasts')
      .select('id, created_at, roast_text, personality_type, score, roast_lines, spending_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRoasts(data ?? []))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    supabase
      .from('gmail_connections')
      .select('email, last_synced_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setGmailStatus({ connected: false }); return }
        const { count } = await supabase
          .from('auto_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
        setGmailStatus({ connected: true, email: data.email, lastSyncedAt: data.last_synced_at, txCount: count ?? 0 })
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAutoTxns(uid) {
    const { data } = await supabase
      .from('auto_transactions')
      .select('id, merchant, category, amount, type, date, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(300)
    setAutoTxns(data ?? [])
  }

  useEffect(() => {
    if (!user) return
    loadAutoTxns(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Raw debug: log first 5 records with all fields to diagnose type/date issues
  useEffect(() => {
    if (!user) return
    supabase
      .from('auto_transactions')
      .select('*')
      .eq('user_id', user.id)
      .limit(5)
      .then(({ data, error }) => {
        console.log('[VRDIKT] raw tx debug — count:', data?.length ?? 0,
          '| error:', error?.message ?? null,
          '| first record:', JSON.stringify(data?.[0] ?? null),
          '| unique types:', [...new Set((data ?? []).map(t => t.type))].join(','),
          '| unique date formats:', [...new Set((data ?? []).map(t => typeof t.date + ':' + t.date))].slice(0, 3).join(' | '))
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Streak consequence logic
  useEffect(() => {
    if (!roasts || roasts.length === 0) return
    const streak = calcStreak(roasts)

    if (streak >= 30 && !localStorage.getItem('streak30Shown')) {
      localStorage.setItem('streak30Shown', 'true')
      setStreakOverlay('30')
      return
    }
    if (streak >= 7 && !localStorage.getItem('streak7Shown')) {
      localStorage.setItem('streak7Shown', 'true')
      setStreakOverlay('7')
      return
    }

    const lastRoast = new Date(roasts[0].created_at)
    const hoursAgo  = (Date.now() - lastRoast) / 3600000
    if (hoursAgo > 48) {
      const prevStreak     = calcPrevStreak(roasts)
      const lastRoastKey   = lastRoast.toDateString()
      const alreadyShown   = localStorage.getItem('lastStreakBrokenShown')
      if (prevStreak >= 3 && alreadyShown !== lastRoastKey) {
        localStorage.setItem('lastStreakBrokenShown', lastRoastKey)
        setStreakOverlayData({ prevStreak })
        setStreakOverlay('broken')
      }
    }
  }, [roasts]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !profile?.gmail_connected) return
    fetch('/api/gmail-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setGmailStatus(prev => prev ? { ...prev, lastSyncedAt: new Date().toISOString(), txCount: data.count ?? prev.txCount } : prev)
          loadAutoTxns(user.id)
        }
      })
      .catch(() => {})
  }, [user?.id, profile?.gmail_connected]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGmailSync() {
    if (!user || syncing) return
    setSyncing(true)
    try {
      const res = await fetch('/api/gmail-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.success) {
        setGmailStatus(prev => ({ ...prev, lastSyncedAt: new Date().toISOString(), txCount: data.count ?? prev?.txCount }))
        await loadAutoTxns(user.id)
      }
    } finally {
      setSyncing(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const loading = roasts === null
  const zomato  = roasts ? checkZomatoDetox(roasts) : null

  const TABS = [
    { id: 'overview',     label: 'OVERVIEW' },
    { id: 'transactions', label: 'TRANSACTIONS' },
    { id: 'couple',       label: 'COUPLE' },
  ]

  const latestRoast  = roasts?.[0] ?? null
  const latestScore  = latestRoast?.score ?? null
  const streak       = roasts ? calcStreak(roasts) : 0
  const tierLabel    = latestRoast?.personality_type ?? (latestScore == null ? 'NOT ROASTED YET' : 'VRDIKT MEMBER')

  // Debited this month from auto transactions
  const now = new Date()
  const isThisMonth = (tx) => {
    const raw = tx.date ?? tx.created_at
    if (!raw) return false
    const dt = new Date(raw)
    return !isNaN(dt) && dt.getUTCFullYear() === now.getFullYear() && dt.getUTCMonth() === now.getMonth()
  }
  const spentThisMonth = (autoTxns ?? [])
    .filter(tx => isThisMonth(tx) && (tx.type ?? '').toLowerCase().includes('debit'))
    .reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

  // Days until next Sunday
  const daysToSunday = (7 - now.getDay()) % 7 || 7

  // Recent 5 transactions for activity list
  const recentTxns = (autoTxns ?? []).slice(0, 5)

  const CATEGORY_ICONS = {
    'Food Delivery': '🍕', 'Groceries': '🛒', 'Shopping': '🛍️',
    'Entertainment': '🎬', 'Transport': '🚗', 'Finance / EMI': '💳',
    'Dining': '🍽️', 'Health': '💊', 'Bills': '⚡', 'Other': '💸',
  }

  return (
    <>
    {streakOverlay && (
      <StreakOverlay
        type={streakOverlay}
        data={streakOverlayData}
        onClose={() => setStreakOverlay(null)}
        navigate={navigate}
      />
    )}

    {/* Full-screen column */}
    <div style={{
      minHeight: '100svh', background: '#1B1B1D',
      color: '#0A0A0A', display: 'flex', flexDirection: 'column',
      fontFamily: 'Geist, system-ui, sans-serif',
    }}>

      {/* ── ZONE 1: HERO (peach pastel) ── */}
      <div style={{
        background: '#FFE7D4',
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
        position: 'relative',
        paddingBottom: 28,
      }}>
        {/* Ambient highlight */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top bar — safe-area-aware top padding so greeting clears the status bar */}
        <div style={{
          paddingTop: 'max(60px, env(safe-area-inset-top))',
          paddingLeft: 24, paddingRight: 18,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          position: 'relative', zIndex: 2,
        }}>
          {/* Greeting block */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0A0A0A', textTransform: 'capitalize' }}>
              Hi {(profile?.full_name && profile.full_name.trim()) ? profile.full_name.split(' ')[0] : (user?.email?.split('@')[0] ?? 'there')}!
            </div>
            <div style={{ fontSize: 15, color: '#6B6B70', fontWeight: 500 }}>
              {new Date().toLocaleString('default', { month: 'long' })} session.
            </div>
          </div>
          {/* Two circle icon buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Grid — opens profile/settings */}
            <button
              onClick={() => navigate('/profile')}
              style={{
                width: 44, height: 44, background: '#fff',
                border: '1px solid rgba(10,10,10,0.08)', borderRadius: '50%',
                boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(10,10,10,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                {[0,1,2].map(row => [0,1,2].map(col => (
                  <circle key={`${row}-${col}`} cx={3 + col * 6} cy={3 + row * 6} r="1.5" fill="#0A0A0A" />
                )))}
              </svg>
            </button>
            {/* Bell — notifications placeholder */}
            <button
              onClick={() => alert('No new notifications')}
              style={{
                width: 44, height: 44, background: '#fff',
                border: '1px solid rgba(10,10,10,0.08)', borderRadius: '50%',
                boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(10,10,10,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0, position: 'relative',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <div style={{
                position: 'absolute', top: 9, right: 9,
                width: 7, height: 7, borderRadius: '50%',
                background: '#FF1040', border: '1.5px solid #fff',
                pointerEvents: 'none',
              }} />
            </button>
          </div>
        </div>

        {/* Score section — all centered in a column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 14, position: 'relative', zIndex: 2 }}>
          {/* Score chip */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px 5px 8px', borderRadius: 99, background: '#0d0d0d', color: '#fff', fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: '#FF5500', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0d0d0d', fontWeight: 800, fontSize: 11, lineHeight: 1 }}>$</span>
            VRDIKT SCORE
          </div>

          {/* Score number */}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', lineHeight: 0.9 }}>
            <span style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 800, fontSize: 108, color: '#0A0A0A', letterSpacing: '-0.055em' }}>
              {loading ? '—' : latestScore ?? '—'}
            </span>
            <span style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 500, fontSize: 32, color: '#6B6B70', letterSpacing: '-0.03em', marginLeft: 2, alignSelf: 'flex-end', paddingBottom: 14 }}>
              /100
            </span>
          </div>

          {/* Score underline bar */}
          <div style={{ width: 200, height: 4, borderRadius: 99, background: 'rgba(10,10,10,0.08)', marginTop: 8, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${latestScore ?? 0}%`, background: '#FF5500', borderRadius: 99 }} />
          </div>

          {/* Tier badge — in flow below progress bar */}
          <div style={{ marginTop: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, background: 'rgba(255,16,64,0.12)', color: '#c20a30', fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 600, fontSize: 13, border: '1px solid rgba(255,16,64,0.2)' }}>
              {tierLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── ZONE 2: SEAM (dark strip) ── */}
      <div style={{
        background: '#1B1B1D',
        padding: '12px 16px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Center bolt — only CTA in the bridge strip */}
        <button
          onClick={() => navigate('/upload')}
          style={{
            width: 56, height: 56, borderRadius: 18, border: 'none', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 0 0 4px #1B1B1D, 0 12px 26px -8px rgba(255,85,0,0.33), 0 0 18px rgba(255,85,0,0.2)',
            flexShrink: 0,
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #FF5500, rgba(255,85,0,0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px -4px rgba(255,85,0,0.53)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" stroke="none"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>
          </div>
        </button>
      </div>

      {/* ── ZONE 3: CONTENT (dark card) ── */}
      <div style={{
        flex: 1,
        background: '#0A0A0A',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Seam pill badge */}
        <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', height: 26, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, background: '#1B1B1D', color: '#fff', borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, boxShadow: '0 4px 10px -2px rgba(0,0,0,0.25)', zIndex: 1, whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 700, fontSize: 9, letterSpacing: '0.22em', color: '#fff' }}>VRDIKT</span>
          <span style={{ display: 'inline-block', width: 5, height: 5, background: '#FF5500', transform: 'rotate(45deg)', borderRadius: 1 }} />
        </div>

        {/* Scrollable inner */}
        <div style={{ overflowY: 'auto', height: '100%', padding: '36px 20px 120px' }}>

          {/* Tab pills row */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, scrollbarWidth: 'none' }}>
            {TABS.map(({ id, label }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    background: active ? '#F0F0F0' : 'transparent',
                    border: `1px solid ${active ? '#F0F0F0' : 'rgba(255,255,255,0.14)'}`,
                    color: active ? '#0A0A0A' : 'rgba(255,255,255,0.38)',
                    borderRadius: 999, padding: '6px 14px',
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                    fontFamily: 'Geist, system-ui, sans-serif',
                    cursor: 'pointer',
                  }}
                >{label}</button>
              )
            })}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <>
              {/* Bento row: Sunday Roast + Streak */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 12 }}>
                {/* Sunday Roast card */}
                <div style={{ padding: 16, borderRadius: 22, background: '#141414', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(255,16,64,0.13), transparent 70%)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#F0F0F0' }}>Sunday Roast</span>
                    <div style={{ width: 22, height: 22, borderRadius: 99, background: '#1E1E1E', border: '1px solid rgba(255,16,64,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔥</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 28, color: '#F0F0F0', letterSpacing: '-0.03em', lineHeight: 1, marginTop: 18 }}>
                    {daysToSunday === 0 ? 'Today!' : daysToSunday + 'd'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>until next verdict</div>
                </div>

                {/* Streak card */}
                <div style={{ padding: 16, borderRadius: 22, background: '#141414', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#F0F0F0' }}>Streak</span>
                    <div style={{ width: 22, height: 22, borderRadius: 99, background: '#1E1E1E', border: '1px solid rgba(255,208,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔥</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 28, color: '#F0F0F0', letterSpacing: '-0.03em', lineHeight: 1, marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    {streak > 0
                      ? <>{streak}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}> days</span></>
                      : '0 🔥'
                    }
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>keep it going</div>
                </div>
              </div>

              {/* Spent card */}
              <div style={{ marginTop: 12, padding: 16, borderRadius: 22, background: '#141414', position: 'relative', overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
                      SPENT · {new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 26, color: '#F0F0F0', letterSpacing: '-0.025em', marginTop: 6 }}>
                      {spentThisMonth === 0 ? '₹—' : '₹' + spentThisMonth.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <svg width="100%" height="52" viewBox="0 0 280 52" preserveAspectRatio="none" style={{ marginTop: 10 }}>
                  <defs>
                    <linearGradient id="sf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF1040" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#FF1040" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0 42 L24 38 L48 40 L72 30 L96 32 L120 22 L144 26 L168 18 L192 24 L216 12 L240 16 L264 8 L280 6 L280 52 L0 52 Z" fill="url(#sf)" />
                  <path d="M0 42 L24 38 L48 40 L72 30 L96 32 L120 22 L144 26 L168 18 L192 24 L216 12 L240 16 L264 8 L280 6" stroke="#FF1040" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="280" cy="6" r="3.5" fill="#FF1040"/>
                  <circle cx="280" cy="6" r="6" fill="#FF1040" fillOpacity="0.2"/>
                </svg>
              </div>

              {/* Recent activity header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 4px 10px' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F0' }}>Recent activity</span>
                <button
                  onClick={() => setTab('transactions')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', fontSize: 13, padding: 0 }}
                >See all →</button>
              </div>

              {/* Transaction list */}
              {recentTxns.length === 0
                ? !gmailStatus?.connected
                  ? <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Connect Gmail to see transactions</p>
                  : <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No transactions yet</p>
                : recentTxns.map((tx, i) => {
                    const isCredit = (tx.type ?? '').toLowerCase().includes('credit')
                    return (
                      <div key={tx.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {CATEGORY_ICONS[tx.category] ?? '💸'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.merchant ?? tx.category ?? 'Transaction'}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{timeAgo(tx.date ?? tx.created_at)}</div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: isCredit ? '#30D158' : '#FF1040', letterSpacing: '-0.01em', flexShrink: 0 }}>
                          {isCredit ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )
                  })
              }

              {/* OverviewTab component (3-stat row + donut) */}
              <div style={{ marginTop: 24 }}>
                <OverviewTab roasts={roasts ?? []} loading={loading} gmailStatus={gmailStatus} autoTxns={autoTxns} navigate={navigate} />
              </div>
            </>
          )}

          {/* ── OTHER TABS ── */}
          {tab === 'transactions' && (
            <TransactionsTab
              transactions={autoTxns} gmailStatus={gmailStatus}
              navigate={navigate} onSync={handleGmailSync} syncing={syncing}
              roasts={roasts ?? []}
            />
          )}
          {tab === 'challenges' && (
            <ChallengesTab roasts={roasts ?? []} profile={profile} zomato={zomato} navigate={navigate} />
          )}
          {tab === 'couple' && <CoupleMode />}

        </div>
      </div>

      <AppNav loggedIn showDashboardBtn={false} user={user} onSignOut={handleSignOut} />
    </div>
    </>
  )
}
