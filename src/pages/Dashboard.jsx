import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useMobile } from '../hooks/useMobile'
import { parseRoast } from '../lib/anthropic'
import { checkZomatoDetox, generateMonthlyChallenge, calculateXP } from '../lib/challenges'

// ─── helpers ──────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
      <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
    </span>
  )
}

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

const SPEND_CATEGORIES = [
  { name: 'Food Delivery', color: '#FF3B30', keywords: ['zomato', 'swiggy', 'dunzo', 'eatfit', 'box8'] },
  { name: 'Groceries',     color: '#F5C518', keywords: ['blinkit', 'zepto', 'bigbasket', 'instamart', 'grofers'] },
  { name: 'Shopping',      color: '#FF9F0A', keywords: ['amazon', 'flipkart', 'meesho', 'myntra', 'ajio', 'nykaa'] },
  { name: 'Entertainment', color: '#BF5AF2', keywords: ['netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'jiosaavn'] },
  { name: 'Transport',     color: '#30D158', keywords: ['uber', 'ola', 'rapido', 'petrol', 'irctc'] },
  { name: 'Finance / EMI', color: '#30B0C7', keywords: ['emi', 'sip', 'lic ', ' loan', 'insurance'] },
]

function parseSpendingCategories(raw) {
  if (!raw || typeof raw !== 'string') return null
  const totals = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/₹\s*([\d,]+)/)
    if (!m) continue
    const amount = parseInt(m[1].replace(/,/g, ''), 10)
    if (!amount) continue
    const lower = line.toLowerCase()
    let matched = false
    for (const cat of SPEND_CATEGORIES) {
      if (cat.keywords.some(kw => lower.includes(kw))) {
        totals[cat.name] = (totals[cat.name] ?? 0) + amount
        matched = true; break
      }
    }
    if (!matched) totals['Other'] = (totals['Other'] ?? 0) + amount
  }
  if (!Object.keys(totals).length) return null
  return Object.entries(totals)
    .map(([name, amount]) => ({ name, amount, color: SPEND_CATEGORIES.find(c => c.name === name)?.color ?? '#555' }))
    .sort((a, b) => b.amount - a.amount)
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      background: '#0D0D0D', border: '1px solid #161616',
      borderRadius: '16px', padding: '16px 14px',
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <span style={{ color: '#333', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: accent, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ color: '#333', fontSize: '10px', fontWeight: 500 }}>{sub}</span>}
    </div>
  )
}

function SpendingBreakdown({ latestRoast }) {
  const raw = latestRoast?.spending_data?.raw ?? null
  const categories = raw ? parseSpendingCategories(raw) : null
  const max = categories ? Math.max(...categories.map(c => c.amount)) : 0

  return (
    <div style={{
      background: '#0D0D0D', border: '1px solid #161616',
      borderRadius: '20px', padding: '22px',
    }}>
      <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 18px' }}>
        Spending Breakdown
      </p>
      {!categories ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ color: '#2A2A2A', fontSize: '13px', margin: '0 0 4px' }}>No breakdown available yet.</p>
          <p style={{ color: '#1E1E1E', fontSize: '12px', margin: 0 }}>Submit spending data with ₹ amounts to see category breakdown.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {categories.map(({ name, amount, color }) => (
            <div key={name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#888', fontSize: '12px', fontWeight: 600 }}>{name}</span>
                <span style={{ color, fontSize: '12px', fontWeight: 700 }}>₹{amount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ background: '#1A1A1A', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(amount / max) * 100}%`, background: color,
                  borderRadius: '4px', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CompactActiveCard({ emoji, name, progress, total, status, message }) {
  const c = { active: '#F5C518', failed: '#FF3B30', completed: '#30D158' }[status] ?? '#F5C518'
  const pct = total > 0 ? Math.min((progress / total) * 100, 100) : 0
  return (
    <div style={{
      background: '#111', border: '1px solid rgba(245,197,24,0.15)',
      borderRadius: '18px', padding: '18px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '18px' }}>{emoji}</span>
          <p style={{ color: '#F0F0F0', fontSize: '13px', fontWeight: 800, margin: 0 }}>{name}</p>
        </div>
        <span style={{
          background: `${c}15`, border: `1px solid ${c}44`,
          borderRadius: '20px', padding: '2px 8px',
          color: c, fontSize: '9px', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {status}
        </span>
      </div>
      <div>
        <div style={{ background: '#1A1A1A', borderRadius: '3px', height: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: '3px', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span style={{ color: '#2A2A2A', fontSize: '10px' }}>{message}</span>
          <span style={{ color: c, fontSize: '10px', fontWeight: 700 }}>Day {progress}/{total}</span>
        </div>
      </div>
    </div>
  )
}

function CompactLockedCard({ emoji, name }) {
  return (
    <div style={{
      background: '#0A0A0A', border: '1px solid #141414',
      borderRadius: '18px', padding: '18px', position: 'relative',
      display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.55,
    }}>
      <div style={{
        position: 'absolute', top: '12px', right: '12px',
        background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.15)',
        borderRadius: '20px', padding: '2px 7px',
        color: '#F5C518', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>SOON</div>
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      <p style={{ color: '#444', fontSize: '13px', fontWeight: 800, margin: 0, paddingRight: '44px' }}>{name}</p>
      <span style={{ position: 'absolute', bottom: '12px', right: '12px', fontSize: '14px' }}>🔒</span>
    </div>
  )
}

// ─── tab views ────────────────────────────────────────────────────────────────

function OverviewTab({ roasts, loading, stats, zomato, navigate, isMobile }) {
  const latestRoast = roasts[0] ?? null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '10px',
      }}>
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Spending Breakdown */}
      <SpendingBreakdown latestRoast={latestRoast} />

      {/* Active Challenges mini grid */}
      <div>
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px' }}>
          Active Challenges
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
          <CompactActiveCard
            emoji="🍕" name="Zomato Detox"
            progress={zomato?.daysClean ?? 0} total={7}
            status={zomato?.status ?? 'active'}
            message={zomato?.message ?? 'Submit spending to track'}
          />
          <CompactLockedCard emoji="💰" name="Savings Sprint" />
          <CompactLockedCard emoji="📱" name="Subscription Audit" />
        </div>
      </div>

      {/* Roast History */}
      <div>
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px' }}>
          Roast History
        </p>
        {loading && <p style={{ color: '#333', fontSize: '14px', padding: '32px 0', textAlign: 'center' }}>Loading…</p>}
        {!loading && roasts.length === 0 && (
          <div style={{
            background: '#0D0D0D', border: '1px solid #161616', borderRadius: '20px', padding: '48px 24px',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          }}>
            <span style={{ fontSize: '36px' }}>📂</span>
            <p style={{ color: '#555', fontSize: '18px', fontWeight: 700, margin: 0 }}>No crimes on record. Yet.</p>
            <button onClick={() => navigate('/upload')} style={{
              background: '#F5C518', border: 'none', borderRadius: '10px',
              padding: '11px 22px', color: '#0A0A0A', fontSize: '14px', fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>Get Roasted →</button>
          </div>
        )}
        {!loading && roasts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {roasts.map(r => {
              const parsed = parseRoast(r.roast_text ?? '')
              const preview = r.roast_lines?.[0] ?? parsed.roastLines?.[0] ?? '—'
              const personality = r.personality_type ?? parsed.personalityType
              const sc = r.score ?? parsed.score
              return (
                <div key={r.id} style={{
                  background: '#0D0D0D', border: '1px solid #161616', borderRadius: '18px', padding: '20px 22px',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#333', fontSize: '12px' }}>{formatDate(r.created_at)}</span>
                      {personality && (
                        <span style={{
                          background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.15)',
                          borderRadius: '20px', padding: '2px 9px', color: '#F5C518', fontSize: '11px', fontWeight: 600,
                        }}>{personality}</span>
                      )}
                    </div>
                    <p style={{
                      color: '#666', fontSize: '13px', margin: 0, lineHeight: 1.5, overflow: 'hidden',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>"{preview}"</p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ color: scoreColor(sc), fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em' }}>{sc ?? '—'}</span>
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
        background: '#0A0A0A', border: '1px solid #141414', borderRadius: '20px', padding: '28px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top left, rgba(245,197,24,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🔒</span>
            <p style={{ color: '#555', fontSize: '15px', fontWeight: 800, margin: 0 }}>BROक Mode</p>
          </div>
          <span style={{
            background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.15)',
            borderRadius: '20px', padding: '3px 10px', color: '#F5C518', fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase', flexShrink: 0,
          }}>Coming Soon</span>
        </div>
        <p style={{ color: '#2E2E2E', fontSize: '13px', margin: '0 0 18px', lineHeight: 1.5 }}>
          Challenge a friend. Whoever spends worse loses. Bragging rights included.
        </p>
        <button disabled style={{
          background: 'transparent', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '10px 20px',
          color: '#252525', fontSize: '13px', fontWeight: 700, cursor: 'not-allowed', fontFamily: 'Inter, sans-serif',
        }}>Coming Soon</button>
      </div>
    </div>
  )
}

function ChallengesTab({ roasts, profile, zomato, navigate }) {
  const xp = calculateXP(roasts)
  const monthly = generateMonthlyChallenge(profile, roasts)

  const statusColors = { not_started: '#555', on_track: '#30D158', at_risk: '#FF9F0A', exceeded: '#FF3B30', completed: '#30D158' }
  const statusColor  = statusColors[monthly.status] ?? '#555'
  const daysColor    = monthly.daysLeft > 15 ? '#30D158' : monthly.daysLeft > 7 ? '#FF9F0A' : '#FF3B30'

  const QUICK = [
    { emoji: '🍕', name: 'Zomato Detox',       xp: 100, locked: false },
    { emoji: '💰', name: 'Savings Sprint',      xp: 150, locked: true  },
    { emoji: '⚡', name: 'No Impulse Buys',     xp: 120, locked: true  },
    { emoji: '📱', name: 'Subscription Audit',  xp: 80,  locked: true  },
    { emoji: '🥊', name: 'Friend Duel',         xp: 200, locked: true  },
    { emoji: '🏆', name: 'Annual Challenge',    xp: 500, locked: true  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* XP & Level card */}
      <div style={{
        background: '#0D0D0D', border: '1px solid rgba(245,197,24,0.15)',
        borderRadius: '20px', padding: '24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at top right, rgba(245,197,24,0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#F5C518', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
              Current Level
            </p>
            <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#F0F0F0' }}>
              {xp.levelName.toUpperCase()}
            </h2>
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                background: '#1A1A1A', borderRadius: '6px', height: '8px', overflow: 'hidden',
                boxShadow: '0 0 12px rgba(245,197,24,0.1)',
              }}>
                <div style={{
                  height: '100%', width: `${xp.progressPct}%`,
                  background: 'linear-gradient(90deg, #F5C518, #FFD93D)',
                  borderRadius: '6px', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ color: '#F5C518', fontSize: '12px', fontWeight: 700 }}>{xp.xp} XP</span>
                {xp.nextThreshold && (
                  <span style={{ color: '#333', fontSize: '12px' }}>{xp.nextThreshold} XP next level</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, minWidth: '140px' }}>
            <p style={{ color: '#333', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>XP Breakdown</p>
            {[
              { label: 'Roasts',     val: (roasts?.length ?? 0) * 10 },
              { label: 'Challenges', val: 0 },
              { label: 'Streaks',    val: xp.xp - (roasts?.length ?? 0) * 10 },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ color: '#444', fontSize: '12px' }}>{label}</span>
                <span style={{ color: '#F5C518', fontSize: '12px', fontWeight: 700 }}>+{Math.max(0, val)} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Challenge */}
      <div>
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px' }}>
          Your Monthly Challenge
        </p>
        <div style={{
          background: '#111', border: '1px solid rgba(245,197,24,0.2)',
          borderRadius: '20px', padding: '24px',
          boxShadow: '0 0 40px rgba(245,197,24,0.05)',
        }}>
          {monthly.status === 'not_started' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ color: '#555', fontSize: '16px', fontWeight: 700, margin: '0 0 12px' }}>
                Submit your first roast to activate your challenge 🔥
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
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: '#F0F0F0' }}>
                  {monthly.title}
                </h3>
                <span style={{
                  background: `${statusColor}15`, border: `1px solid ${statusColor}44`,
                  borderRadius: '20px', padding: '3px 10px',
                  color: statusColor, fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{monthly.status.replace('_', ' ')}</span>
              </div>
              <p style={{ color: '#555', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.5 }}>{monthly.description}</p>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ background: '#1A1A1A', borderRadius: '6px', height: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{
                    height: '100%', width: `${monthly.percentComplete}%`, background: statusColor,
                    borderRadius: '6px', transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontSize: '12px' }}>
                    ₹{monthly.current.toLocaleString('en-IN')} spent
                  </span>
                  <span style={{ color: '#333', fontSize: '12px' }}>
                    ₹{monthly.target.toLocaleString('en-IN')} target
                  </span>
                </div>
              </div>
              {monthly.projectedSavings > 0 && (
                <div style={{
                  background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.15)',
                  borderRadius: '12px', padding: '12px 16px', marginBottom: '12px',
                }}>
                  <p style={{ color: '#30D158', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                    Hit this target = save ₹{monthly.projectedSavings.toLocaleString('en-IN')} this month
                    {monthly.savingFor ? ` toward "${monthly.savingFor}"` : ''}
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: daysColor, fontSize: '13px', fontWeight: 700 }}>
                  {monthly.daysLeft} days left
                </span>
                <span style={{ color: '#F5C518', fontSize: '12px', fontWeight: 600 }}>
                  +{monthly.xpReward} XP on completion
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Challenges 2-col grid */}
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

          {/* Locked quick challenges */}
          {QUICK.filter(q => q.locked).map(q => (
            <div key={q.name} style={{
              background: '#0A0A0A', border: '1px solid #141414',
              borderRadius: '18px', padding: '18px', position: 'relative',
              display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.55,
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
              <span style={{ position: 'absolute', bottom: '14px', right: '14px', fontSize: '16px' }}>🔒</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div style={{
        background: '#0A0A0A', border: '1px solid #141414',
        borderRadius: '20px', padding: '24px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
            <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
              Leaderboard
            </p>
            <span style={{
              background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.15)',
              borderRadius: '20px', padding: '2px 9px',
              color: '#F5C518', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>₹899 Plan</span>
          </div>
          <p style={{ color: '#2A2A2A', fontSize: '13px', margin: 0 }}>
            See how you rank against other financially hopeless Indians
          </p>
        </div>
        {/* Blurred fake entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
          {[
            { rank: 1, name: '██████ M.', xp: 1240, level: 'Getting There' },
            { rank: 2, name: '████ K.',   xp: 890,  level: 'Almost Responsible' },
            { rank: 3, name: '███████ S.', xp: 650, level: 'Almost Responsible' },
          ].map(e => (
            <div key={e.rank} style={{
              background: '#111', borderRadius: '12px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{ color: '#F5C518', fontSize: '14px', fontWeight: 900, width: '20px' }}>#{e.rank}</span>
              <span style={{ flex: 1, color: '#888', fontSize: '13px', fontWeight: 600 }}>{e.name}</span>
              <span style={{ color: '#F5C518', fontSize: '12px', fontWeight: 700 }}>{e.xp} XP</span>
            </div>
          ))}
        </div>
        {/* Overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, top: '50%',
          background: 'linear-gradient(to bottom, transparent, rgba(10,10,10,0.95) 60%)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '20px',
        }}>
          <p style={{ color: '#333', fontSize: '13px', fontWeight: 600, margin: 0, textAlign: 'center' }}>
            Friend Comparisons — Coming with ₹899 plan
          </p>
        </div>
      </div>
    </div>
  )
}

function CoupleModeTab({ navigate }) {
  const FEATURES = [
    { emoji: '💸', text: 'Shared spending dashboard — both partners, one view' },
    { emoji: '🔥', text: 'Couple Roast — get judged together, suffer together' },
    { emoji: '🏆', text: 'Who spent more this month? (loser does dishes)' },
    { emoji: '🎯', text: 'Joint savings goals & challenge tracking' },
    { emoji: '📊', text: 'His vs. Her spending breakdown' },
    { emoji: '💌', text: 'Surprise spending alerts — no more secret Zomato binges' },
    { emoji: '🗓️', text: 'Monthly Couple Report Card' },
    { emoji: '✈️', text: 'Group Trip Tracker built-in' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0F0F0F 0%, #0A0A0A 100%)',
        border: '1px solid #C9A227',
        borderRadius: '24px',
        padding: '40px 32px',
        boxShadow: '0 0 80px rgba(245,197,24,0.07), inset 0 1px 0 rgba(245,197,24,0.08)',
      }}>
        {/* ambient glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(245,197,24,0.06) 0%, transparent 65%)',
        }} />

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <span style={{
            background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.35)',
            borderRadius: '999px', padding: '5px 16px',
            color: '#C9A227', fontSize: '10px', fontWeight: 800,
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>PRO Feature</span>
        </div>

        {/* Emoji + heading */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '16px' }}>💑</div>
          <h2 style={{
            fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900,
            letterSpacing: '-0.04em', margin: '0 0 10px', color: '#F0F0F0',
          }}>
            Couple Mode
          </h2>
          <p style={{ color: '#555', fontSize: '14px', margin: 0, lineHeight: 1.6, maxWidth: 380, marginInline: 'auto' }}>
            Finance is the #1 reason couples fight. We make it the #1 reason you laugh — then fix it.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.2), transparent)', margin: '28px 0' }} />

        {/* Features */}
        <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {FEATURES.map(({ emoji, text }) => (
            <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.4 }}>{emoji}</span>
              <span style={{ color: '#AAA', fontSize: '14px', lineHeight: 1.5 }}>{text}</span>
            </li>
          ))}
        </ul>

        {/* COMING SOON label */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{
            background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.2)',
            borderRadius: '8px', padding: '6px 18px',
            color: '#C9A227', fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>Coming Soon</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/pricing')}
          style={{
            display: 'block', width: '100%',
            background: '#F5C518', border: 'none', borderRadius: '14px',
            padding: '15px', color: '#0A0A0A',
            fontSize: '15px', fontWeight: 900, letterSpacing: '-0.01em',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 0 32px rgba(245,197,24,0.2)',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          See PRO Plan →
        </button>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useMobile()

  const [roasts, setRoasts] = useState(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    if (!user) return
    supabase
      .from('roasts')
      .select('id, created_at, roast_text, personality_type, score, roast_lines, spending_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRoasts(data ?? []))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const loading    = roasts === null
  const scores     = roasts?.map(r => r.score).filter(s => typeof s === 'number') ?? []
  const streak     = calcStreak(roasts ?? [])
  const worstScore = scores.length ? Math.min(...scores) : null
  const bestScore  = scores.length ? Math.max(...scores) : null
  const zomato     = roasts ? checkZomatoDetox(roasts) : null
  const xpData     = calculateXP(roasts ?? [])

  const STATS = [
    { label: 'Total Roasts',   value: loading ? '—' : roasts.length,                   accent: '#FF3B30' },
    { label: 'Current Streak', value: loading ? '—' : `${streak}d`,                     accent: '#F5C518' },
    { label: 'Worst Score',    value: loading || worstScore === null ? '—' : worstScore, accent: '#FF3B30' },
    { label: 'Best Score',     value: loading || bestScore  === null ? '—' : bestScore,  accent: '#30D158' },
    { label: 'XP Level',       value: loading ? '—' : `${xpData.xp} XP`,               accent: '#F5C518', sub: xpData.levelName },
  ]

  const TABS = [
    { id: 'overview',    label: 'OVERVIEW' },
    { id: 'challenges',  label: 'CHALLENGES' },
    { id: 'couple',      label: 'COUPLE MODE' },
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
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          <Logo />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate('/pricing')} style={{
            background: 'transparent', border: 'none', padding: 0,
            color: '#444', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>Pricing</button>
          {!isMobile && <span style={{ color: '#252525', fontSize: '13px' }}>{user?.email}</span>}
          <button
            onClick={handleSignOut}
            style={{
              background: 'transparent', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '6px 14px',
              color: '#555', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF3B30'; e.currentTarget.style.color = '#FF3B30' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#555' }}
          >Sign out</button>
        </div>
      </nav>

      {/* Content */}
      <div style={{
        flex: 1, maxWidth: 800, width: '100%',
        margin: '0 auto', padding: '44px 20px 80px',
        display: 'flex', flexDirection: 'column', gap: '28px',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#333', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px' }}>
              Financial Crime Record
            </p>
            <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>
              Your Dashboard
            </h1>
          </div>
          <button
            onClick={() => navigate('/upload')}
            style={{
              background: '#F5C518', border: 'none', borderRadius: '12px',
              padding: '13px 22px', color: '#0A0A0A', fontSize: '14px', fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
              boxShadow: '0 0 32px rgba(245,197,24,0.2)', transition: 'opacity 0.15s, transform 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >Get Roasted 🔥</button>
        </div>

        {/* Tab Pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {TABS.map(({ id, label }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: active ? '#F5C518' : 'transparent',
                  border: `1px solid ${active ? '#F5C518' : '#1E1E1E'}`,
                  borderRadius: '999px', padding: '8px 20px',
                  color: active ? '#0A0A0A' : '#555',
                  fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#F5C518'; e.currentTarget.style.color = '#F5C518' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#555' } }}
              >{label}</button>
            )
          })}
        </div>

        {tab === 'overview' && (
          <OverviewTab roasts={roasts ?? []} loading={loading} stats={STATS} zomato={zomato} navigate={navigate} isMobile={isMobile} />
        )}
        {tab === 'challenges' && (
          <ChallengesTab roasts={roasts ?? []} profile={profile} zomato={zomato} navigate={navigate} />
        )}
        {tab === 'couple' && (
          <CoupleModeTab navigate={navigate} />
        )}
      </div>
    </div>
  )
}
