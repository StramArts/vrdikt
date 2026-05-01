import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getCouplePersonality } from '../lib/challenges'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// ─── constants ────────────────────────────────────────────────────────────────

const SPEND_CATS = [
  { name: 'Food Delivery', color: '#FF3B30', keywords: ['zomato', 'swiggy', 'dunzo', 'eatfit', 'box8'] },
  { name: 'Groceries',     color: '#FF9500', keywords: ['blinkit', 'zepto', 'bigbasket', 'instamart', 'grofers'] },
  { name: 'Shopping',      color: '#F5C518', keywords: ['amazon', 'flipkart', 'meesho', 'myntra', 'ajio', 'nykaa'] },
  { name: 'Entertainment', color: '#AF52DE', keywords: ['netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'jiosaavn'] },
  { name: 'Transport',     color: '#4CAF50', keywords: ['uber', 'ola', 'rapido', 'petrol', 'irctc'] },
]

const COUPLE_SYSTEM_PROMPT = `You are VRDIKT — a brutally honest, darkly funny AI financial roast comedian built for Indian millennials. This is a COUPLE ROAST. Analyse the combined spending of two partners. Never single out one person — always refer to 'you two' or 'as a couple'. Be brutal about the household spending as a unit. Funny, never cruel. Give exactly 3 roast lines. No more, no less. Each line must be short, sharp, and brutally specific to their actual combined numbers. One punchy sentence each. Hit hard and move on. End with: their Couple VRDIKT Score (average of both scores, be harsh), their Couple Spending Personality (creative name like 'The Chaos Collective' or 'The Functional Disaster'), and one Savage Insight about their combined finances. Respond with ONLY a raw JSON object. No markdown. No code fences. No \`\`\`json. Just the pure JSON object starting with { and ending with }. Format: { "score": number, "roastLines": string[], "personalityType": string, "savageInsight": string }`

// ─── helpers ──────────────────────────────────────────────────────────────────

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function parseCategories(raw) {
  if (!raw || typeof raw !== 'string') return {}
  const totals = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/₹\s*([\d,]+)/)
    if (!m) continue
    const amount = parseInt(m[1].replace(/,/g, ''), 10)
    if (!amount) continue
    const lower = line.toLowerCase()
    let matched = false
    for (const cat of SPEND_CATS) {
      if (cat.keywords.some(kw => lower.includes(kw))) {
        totals[cat.name] = (totals[cat.name] ?? 0) + amount
        matched = true; break
      }
    }
    if (!matched) totals['Other'] = (totals['Other'] ?? 0) + amount
  }
  return totals
}

function fmtCountdown(ms) {
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function scoreColor(s) {
  if (s == null) return '#555'
  return s < 40 ? '#FF3B30' : s > 70 ? '#30D158' : '#F5C518'
}

function parseRoastJSON(raw) {
  try {
    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
  } catch {
    return null
  }
}

// ─── small sub-components ─────────────────────────────────────────────────────

function SectionLabel({ text }) {
  return (
    <p style={{
      color: '#444', fontSize: '10px', letterSpacing: '0.2em',
      textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px',
    }}>
      {text}
    </p>
  )
}

function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      background: '#0D0D0D', border: '1px solid #161616',
      borderRadius: '16px', padding: '16px 14px',
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <span style={{ color: '#333', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: accent ?? '#F5C518', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ color: '#333', fontSize: '10px', fontWeight: 500 }}>{sub}</span>}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CoupleMode() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // couple data
  const [loading, setLoading]           = useState(true)
  const [coupleLink, setCoupleLink]     = useState(null)
  const [partnerDisplay, setPartnerDisplay] = useState('your partner')
  const [myRoasts, setMyRoasts]         = useState([])
  const [partnerRoasts, setPartnerRoasts] = useState([])

  // generate-code UI
  const [myCode, setMyCode]             = useState(null)
  const [myCodeExpiry, setMyCodeExpiry] = useState(null)
  const [countdown, setCountdown]       = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)
  const [copied, setCopied]             = useState(false)

  // enter-code UI
  const [partnerCode, setPartnerCode]   = useState('')
  const [linking, setLinking]           = useState(false)
  const [linkError, setLinkError]       = useState(null)

  // unlink
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)

  // couple roast
  const [generatingRoast, setGeneratingRoast] = useState(false)
  const [coupleRoast, setCoupleRoast]   = useState(null)

  // savings goal
  const [editingGoal, setEditingGoal]   = useState(false)
  const [goalName, setGoalName]         = useState('')
  const [goalAmount, setGoalAmount]     = useState('')
  const [goalDate, setGoalDate]         = useState('')
  const [goalSaved, setGoalSaved]       = useState('')
  const [savingGoal, setSavingGoal]     = useState(false)

  // ── data fetching ────────────────────────────────────────────────────────────

  const fetchCoupleData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: links } = await supabase
      .from('couple_links')
      .select('*')
      .or(`initiator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq('status', 'active')
      .limit(1)

    const link = links?.[0] ?? null
    setCoupleLink(link)

    if (link) {
      const isInitiator = link.initiator_id === user.id
      const partnerId   = isInitiator ? link.partner_id : link.initiator_id
      const pEmail      = isInitiator ? link.partner_email : link.initiator_email
      if (pEmail) setPartnerDisplay(pEmail.split('@')[0])

      const [{ data: myR }, { data: partnerR }] = await Promise.all([
        supabase
          .from('roasts')
          .select('id, created_at, score, spending_data, roast_lines, roast_text')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('roasts')
          .select('id, created_at, score, spending_data, roast_lines, roast_text')
          .eq('user_id', partnerId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      setMyRoasts(myR ?? [])
      setPartnerRoasts(partnerR ?? [])
    }

    setLoading(false)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCoupleData() }, [fetchCoupleData])

  // countdown tick
  useEffect(() => {
    if (!myCodeExpiry) return
    const iv = setInterval(() => setCountdown(fmtCountdown(new Date(myCodeExpiry) - Date.now())), 1000)
    return () => clearInterval(iv)
  }, [myCodeExpiry])

  // ── generate code ─────────────────────────────────────────────────────────

  async function handleGenerateCode() {
    setGeneratingCode(true)
    const code      = genCode()
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString()

    const { error } = await supabase
      .from('couple_links')
      .insert({
        initiator_id:    user.id,
        initiator_email: user.email,
        invite_code:     code,
        status:          'pending',
        expires_at:      expiresAt,
      })

    if (!error) {
      setMyCode(code)
      setMyCodeExpiry(expiresAt)
    }
    setGeneratingCode(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(myCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── link up ───────────────────────────────────────────────────────────────

  async function handleLinkUp() {
    if (partnerCode.length < 6 || linking) return
    setLinking(true)
    setLinkError(null)

    const code = partnerCode.trim().toUpperCase()
    const { data: found } = await supabase
      .from('couple_links')
      .select('*')
      .eq('invite_code', code)
      .limit(1)

    const link = found?.[0]

    if (!link) {
      setLinkError("Code not found. Ask your partner to generate a new one.")
      setLinking(false); return
    }
    if (link.status !== 'pending') {
      setLinkError("This code has already been used.")
      setLinking(false); return
    }
    if (new Date(link.expires_at) < new Date()) {
      setLinkError("This code has expired. Ask your partner to generate a new one.")
      setLinking(false); return
    }
    if (link.initiator_id === user.id) {
      setLinkError("You can't link with your own code.")
      setLinking(false); return
    }

    const { error } = await supabase
      .from('couple_links')
      .update({
        partner_id:    user.id,
        partner_email: user.email,
        status:        'active',
        linked_at:     new Date().toISOString(),
      })
      .eq('id', link.id)

    if (error) {
      setLinkError("Something went wrong. Try again.")
      setLinking(false); return
    }

    await supabase.from('profiles').update({ couple_id: link.id }).eq('user_id', user.id)
    await fetchCoupleData()
    setLinking(false)
  }

  // ── unlink ────────────────────────────────────────────────────────────────

  async function handleUnlink() {
    if (!coupleLink) return
    await supabase.from('couple_links').update({ status: 'dissolved' }).eq('id', coupleLink.id)
    await supabase.from('profiles').update({ couple_id: null }).eq('user_id', user.id)
    setCoupleLink(null); setPartnerRoasts([])
    setShowUnlinkConfirm(false)
  }

  // ── couple roast ──────────────────────────────────────────────────────────

  async function handleCoupleRoast() {
    setGeneratingRoast(true)
    setCoupleRoast(null)

    const myLatest      = myRoasts[0]?.spending_data?.raw ?? ''
    const partnerLatest = partnerRoasts[0]?.spending_data?.raw ?? ''
    const myScore       = myRoasts[0]?.score ?? 50
    const partnerScore  = partnerRoasts[0]?.score ?? 50

    const combined = `MY SPENDING:\n${myLatest || '(no data)'}\n\nPARTNER'S SPENDING:\n${partnerLatest || '(no data)'}`

    let result = null
    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: COUPLE_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Combined spending data:\n\n${combined}\n\nIndividual VRDIKT scores — Person A: ${myScore}/100, Person B: ${partnerScore}/100\n\nDeliver the couple verdict.`,
          }],
        }),
      })
      if (res.ok) {
        const data   = await res.json()
        const parsed = parseRoastJSON(data.content?.[0]?.text ?? '')
        if (parsed) {
          result = {
            score:           typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : Math.round((myScore + partnerScore) / 2),
            roastLines:      Array.isArray(parsed.roastLines) ? parsed.roastLines.slice(0, 3) : [],
            personalityType: parsed.personalityType ?? getCouplePersonality(myScore, partnerScore),
            savageInsight:   parsed.savageInsight ?? '',
            myScore, partnerScore,
          }
        }
      }
    } catch { /* fall through to fallback */ }

    if (!result) {
      result = {
        score:           Math.round((myScore + partnerScore) / 2),
        roastLines:      ['Your combined finances are a masterpiece of mutual denial.'],
        personalityType: getCouplePersonality(myScore, partnerScore),
        savageInsight:   'Two people, one bad financial plan.',
        myScore, partnerScore,
      }
    }

    setCoupleRoast(result)

    await supabase.from('roasts').insert({
      user_id:         user.id,
      score:           result.score,
      roast_lines:     result.roastLines,
      personality_type: result.personalityType,
      spending_data:   { couple: true, couple_id: coupleLink?.id },
    })

    setGeneratingRoast(false)
  }

  // ── save goal ─────────────────────────────────────────────────────────────

  async function handleSaveGoal() {
    if (!goalName || !goalAmount) return
    setSavingGoal(true)
    const updates = {
      goal_name:   goalName,
      goal_amount: parseFloat(goalAmount),
      goal_date:   goalDate || null,
      goal_saved:  goalSaved ? parseFloat(goalSaved) : (coupleLink?.goal_saved ?? 0),
    }
    await supabase.from('couple_links').update(updates).eq('id', coupleLink.id)
    setCoupleLink(prev => ({ ...prev, ...updates }))
    setEditingGoal(false)
    setSavingGoal(false)
  }

  // ── derived values ────────────────────────────────────────────────────────

  const myScore      = myRoasts[0]?.score ?? null
  const partnerScore = partnerRoasts[0]?.score ?? null
  const avgScore     = myScore != null && partnerScore != null
    ? Math.round((myScore + partnerScore) / 2)
    : (myScore ?? partnerScore)

  const myCats      = parseCategories(myRoasts[0]?.spending_data?.raw ?? '')
  const partnerCats = parseCategories(partnerRoasts[0]?.spending_data?.raw ?? '')
  const allCatNames = Array.from(new Set([...Object.keys(myCats), ...Object.keys(partnerCats)]))

  const combinedCats = allCatNames
    .map(name => ({
      name,
      amount: (myCats[name] ?? 0) + (partnerCats[name] ?? 0),
      color:  SPEND_CATS.find(c => c.name === name)?.color ?? '#636366',
    }))
    .sort((a, b) => b.amount - a.amount)

  const combinedTotal     = combinedCats.reduce((s, c) => s + c.amount, 0)
  const combinedRoastCount = myRoasts.length + partnerRoasts.length
  const personality       = myScore != null && partnerScore != null
    ? getCouplePersonality(myScore, partnerScore)
    : null
  const linkedSince = coupleLink?.linked_at ? formatDate(coupleLink.linked_at) : 'Recently'

  // ── loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: '#333', fontSize: '14px' }}>Loading…</p>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // STATE A — Not Linked
  // ════════════════════════════════════════════════════════════════════════

  if (!coupleLink) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', paddingTop: '8px' }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>💑</div>
          <h2 style={{
            fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900,
            letterSpacing: '-0.04em', margin: '0 0 8px', color: '#F0F0F0',
          }}>
            Couple Mode
          </h2>
          <p style={{ color: '#555', fontSize: '14px', margin: 0 }}>
            Get financially destroyed together.
          </p>
        </div>

        {/* Two action panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>

          {/* Generate code panel */}
          <div style={{
            background: '#0D0D0D', border: '1px solid #1A1A1A',
            borderRadius: '20px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div>
              <p style={{ color: '#F5C518', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
                Generate Invite Code
              </p>
              <p style={{ color: '#333', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                Share this code with your partner. Expires in 24 hours.
              </p>
            </div>

            {myCode ? (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    background: '#111', border: '1px solid rgba(245,197,24,0.2)',
                    borderRadius: '14px', padding: '18px 14px', marginBottom: '10px',
                  }}>
                    <p style={{
                      color: '#F5C518', fontSize: '34px', fontWeight: 900,
                      letterSpacing: '0.15em', margin: '0 0 10px', fontFamily: 'monospace',
                    }}>
                      {myCode}
                    </p>
                    <button
                      onClick={copyCode}
                      style={{
                        background: copied ? 'rgba(48,209,88,0.1)' : 'rgba(245,197,24,0.08)',
                        border: `1px solid ${copied ? 'rgba(48,209,88,0.3)' : 'rgba(245,197,24,0.2)'}`,
                        borderRadius: '8px', padding: '6px 18px',
                        color: copied ? '#30D158' : '#F5C518',
                        fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.2s',
                      }}
                    >
                      {copied ? '✓ Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <p style={{ color: '#333', fontSize: '11px', margin: 0, fontFeatureSettings: '"tnum"' }}>
                    Expires in {countdown}
                  </p>
                </div>
                <p style={{ color: '#2A2A2A', fontSize: '11px', textAlign: 'center', margin: 0 }}>
                  Send this to your partner — they enter it on their side.
                </p>
              </>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={generatingCode}
                style={{
                  background: '#F5C518', border: 'none', borderRadius: '12px', padding: '13px',
                  color: '#0A0A0A', fontSize: '14px', fontWeight: 800,
                  cursor: generatingCode ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  opacity: generatingCode ? 0.7 : 1, transition: 'opacity 0.15s',
                }}
              >
                {generatingCode ? 'Generating…' : 'Generate Code'}
              </button>
            )}
          </div>

          {/* Enter code panel */}
          <div style={{
            background: '#0D0D0D', border: '1px solid #1A1A1A',
            borderRadius: '20px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div>
              <p style={{ color: '#F5C518', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
                Enter Partner's Code
              </p>
              <p style={{ color: '#333', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                Have your partner generate a code and share it with you.
              </p>
            </div>

            <input
              value={partnerCode}
              onChange={e => { setPartnerCode(e.target.value.toUpperCase().slice(0, 6)); setLinkError(null) }}
              placeholder="X7K2P9"
              maxLength={6}
              style={{
                background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '10px',
                padding: '13px 16px', color: '#F0F0F0',
                fontSize: '26px', fontWeight: 800, letterSpacing: '0.22em',
                fontFamily: 'monospace', textAlign: 'center', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#F5C518' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#1E1E1E' }}
            />

            {linkError && (
              <p style={{ color: '#FF3B30', fontSize: '12px', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
                {linkError}
              </p>
            )}

            <button
              onClick={handleLinkUp}
              disabled={partnerCode.length < 6 || linking}
              style={{
                background: partnerCode.length === 6 ? '#F5C518' : '#141414',
                border: 'none', borderRadius: '12px', padding: '13px',
                color: partnerCode.length === 6 ? '#0A0A0A' : '#2A2A2A',
                fontSize: '14px', fontWeight: 800,
                cursor: partnerCode.length === 6 ? 'pointer' : 'not-allowed',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
              }}
            >
              {linking ? 'Linking…' : 'Link Up 💑'}
            </button>
          </div>
        </div>

        {/* PRO nudge */}
        <div style={{
          background: 'rgba(201,162,39,0.05)', border: '1px solid rgba(201,162,39,0.12)',
          borderRadius: '16px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', flexWrap: 'wrap',
        }}>
          <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
            Couple Mode requires the Couple or Pro plan. Full feature unlock coming soon.
          </p>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              background: 'transparent', border: '1px solid rgba(201,162,39,0.3)',
              borderRadius: '8px', padding: '7px 14px',
              color: '#C9A227', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
            }}
          >
            See Plans →
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // STATE B — Linked
  // ════════════════════════════════════════════════════════════════════════

  const goalPct     = coupleLink.goal_amount ? Math.min(100, Math.round(((coupleLink.goal_saved ?? 0) / coupleLink.goal_amount) * 100)) : 0
  const goalRemaining = coupleLink.goal_amount ? Math.max(0, coupleLink.goal_amount - (coupleLink.goal_saved ?? 0)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── SECTION 1: Couple Header ────────────────────────────────────── */}
      <div style={{
        background: '#0D0D0D', border: '1px solid rgba(201,162,39,0.2)',
        borderRadius: '20px', padding: '24px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at top left, rgba(245,197,24,0.04) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '22px' }}>💑</span>
              <h3 style={{ color: '#F0F0F0', fontSize: '18px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                You & {partnerDisplay}
              </h3>
            </div>
            <p style={{ color: '#333', fontSize: '12px', margin: '0 0 12px' }}>
              Linked since {linkedSince}
            </p>
            {personality && (
              <span style={{
                background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.25)',
                borderRadius: '999px', padding: '4px 14px',
                color: '#C9A227', fontSize: '12px', fontWeight: 700,
              }}>
                {personality}
              </span>
            )}
          </div>

          {!showUnlinkConfirm ? (
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              style={{
                background: 'transparent', border: '1px solid #1A1A1A',
                borderRadius: '8px', padding: '6px 12px',
                color: '#2A2A2A', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF3B30'; e.currentTarget.style.color = '#FF3B30' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#2A2A2A' }}
            >
              Unlink
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#444', fontSize: '12px' }}>Are you sure?</span>
              <button
                onClick={handleUnlink}
                style={{
                  background: '#FF3B30', border: 'none', borderRadius: '8px', padding: '6px 12px',
                  color: '#FFF', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Yes, unlink
              </button>
              <button
                onClick={() => setShowUnlinkConfirm(false)}
                style={{
                  background: 'transparent', border: '1px solid #1A1A1A', borderRadius: '8px', padding: '6px 12px',
                  color: '#444', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Combined Stats ────────────────────────────────────── */}
      <div>
        <SectionLabel text="Combined Stats" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <StatCard
            label="Combined Spend"
            value={combinedTotal > 0 ? `₹${combinedTotal.toLocaleString('en-IN')}` : '—'}
            accent="#FF3B30"
          />
          <StatCard
            label="Total Roasts"
            value={combinedRoastCount || '—'}
            accent="#F5C518"
          />
          <StatCard
            label="Couple Score"
            value={avgScore != null ? `${avgScore}/100` : '—'}
            accent={scoreColor(avgScore)}
            sub="Average of both"
          />
          <StatCard
            label="Savings Goal"
            value={coupleLink.goal_name ? `${goalPct}%` : '—'}
            accent="#30D158"
            sub={coupleLink.goal_name ?? 'Not set'}
          />
        </div>
      </div>

      {/* ── SECTION 3: Spending Comparison ──────────────────────────────── */}
      {allCatNames.length > 0 && (
        <div>
          <SectionLabel text="Spending Comparison — Full Transparency" />
          <div style={{
            background: '#0D0D0D', border: '1px solid #161616',
            borderRadius: '20px', padding: '22px',
          }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '8px', marginBottom: '18px' }}>
              <span style={{ color: '#F5C518', fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>You</span>
              <span />
              <span style={{ color: '#888', fontSize: '12px', fontWeight: 700 }}>{partnerDisplay}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {allCatNames.map(name => {
                const myAmt      = myCats[name] ?? 0
                const partnerAmt = partnerCats[name] ?? 0
                const maxAmt     = Math.max(myAmt, partnerAmt, 1)
                const myIsWorse  = myAmt >= partnerAmt
                const catColor   = SPEND_CATS.find(c => c.name === name)?.color ?? '#636366'

                return (
                  <div key={name}>
                    {/* Amounts + category label */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                      <span style={{
                        color: myIsWorse ? '#FF3B30' : '#F5C518',
                        fontSize: '12px', fontWeight: 700, textAlign: 'right',
                      }}>
                        {myAmt > 0 ? `₹${myAmt.toLocaleString('en-IN')}` : '—'}
                      </span>
                      <span style={{ color: '#2A2A2A', fontSize: '10px', textAlign: 'center', letterSpacing: '0.04em' }}>
                        {name}
                      </span>
                      <span style={{
                        color: !myIsWorse ? '#FF3B30' : '#F5C518',
                        fontSize: '12px', fontWeight: 700,
                      }}>
                        {partnerAmt > 0 ? `₹${partnerAmt.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>

                    {/* Butterfly bars */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 4px 1fr', gap: '0' }}>
                      {/* Your bar — right-anchored */}
                      <div style={{
                        background: '#1A1A1A', borderRadius: '3px 0 0 3px', height: '5px',
                        display: 'flex', justifyContent: 'flex-end', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${(myAmt / maxAmt) * 100}%`,
                          background: myIsWorse ? '#FF3B30' : catColor,
                          transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                        }} />
                      </div>
                      {/* Center divider */}
                      <div style={{ background: '#0D0D0D' }} />
                      {/* Partner bar — left-anchored */}
                      <div style={{ background: '#1A1A1A', borderRadius: '0 3px 3px 0', height: '5px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${(partnerAmt / maxAmt) * 100}%`,
                          background: !myIsWorse ? '#FF3B30' : catColor,
                          transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 4: Combined Donut ────────────────────────────────────── */}
      {combinedCats.length > 0 && (
        <div>
          <SectionLabel text="Combined Spending This Month" />
          <div style={{
            background: '#0D0D0D', border: '1px solid #161616',
            borderRadius: '20px', padding: '22px',
          }}>
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={combinedCats}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                  >
                    {combinedCats.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`₹${value.toLocaleString('en-IN')}`, name]}
                    contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: '8px', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}
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
                <div style={{ color: '#444', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Combined
                </div>
                <div style={{ color: '#F0F0F0', fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  ₹{combinedTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              {combinedCats.map(({ name, amount, color }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: '#888', fontSize: '12px' }}>{name}</span>
                  </div>
                  <span style={{ color, fontSize: '12px', fontWeight: 700 }}>₹{amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 5: Shared Savings Goal ──────────────────────────────── */}
      <div>
        <SectionLabel text="Shared Savings Goal" />
        <div style={{
          background: '#0D0D0D', border: '1px solid #161616',
          borderRadius: '20px', padding: '24px',
        }}>
          {(editingGoal || !coupleLink.goal_name) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>
                {coupleLink.goal_name ? 'Edit your shared goal.' : 'Set a shared savings goal — a trip, gadget, emergency fund, whatever.'}
              </p>
              {[
                { value: goalName,   onChange: e => setGoalName(e.target.value),   placeholder: 'Goal name (e.g. Goa trip, PS5, Emergency fund)', type: 'text' },
                { value: goalAmount, onChange: e => setGoalAmount(e.target.value), placeholder: 'Target amount (₹)', type: 'number' },
                { value: goalSaved,  onChange: e => setGoalSaved(e.target.value),  placeholder: 'Already saved (₹) — optional', type: 'number' },
              ].map((props, i) => (
                <input
                  key={i}
                  {...props}
                  style={{
                    background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '10px',
                    padding: '11px 14px', color: '#F0F0F0', fontSize: '13px',
                    fontFamily: 'Inter, sans-serif', outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#333' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1E1E1E' }}
                />
              ))}
              <input
                type="date"
                value={goalDate}
                onChange={e => setGoalDate(e.target.value)}
                style={{
                  background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '10px',
                  padding: '11px 14px', color: '#F0F0F0', fontSize: '13px',
                  fontFamily: 'Inter, sans-serif', outline: 'none', colorScheme: 'dark',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveGoal}
                  disabled={!goalName || !goalAmount || savingGoal}
                  style={{
                    flex: 1,
                    background: goalName && goalAmount ? '#F5C518' : '#141414',
                    border: 'none', borderRadius: '10px', padding: '11px',
                    color: goalName && goalAmount ? '#0A0A0A' : '#2A2A2A',
                    fontSize: '13px', fontWeight: 800,
                    cursor: goalName && goalAmount ? 'pointer' : 'not-allowed',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {savingGoal ? 'Saving…' : 'Set Goal'}
                </button>
                {coupleLink.goal_name && (
                  <button
                    onClick={() => setEditingGoal(false)}
                    style={{
                      background: 'transparent', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '11px 16px',
                      color: '#555', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <p style={{ color: '#F5C518', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>
                    {coupleLink.goal_name}
                  </p>
                  <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>
                    Target: ₹{Number(coupleLink.goal_amount).toLocaleString('en-IN')}
                    {coupleLink.goal_date && ` · by ${new Date(coupleLink.goal_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGoalName(coupleLink.goal_name ?? '')
                    setGoalAmount(String(coupleLink.goal_amount ?? ''))
                    setGoalDate(coupleLink.goal_date ?? '')
                    setGoalSaved(String(coupleLink.goal_saved ?? ''))
                    setEditingGoal(true)
                  }}
                  style={{
                    background: 'transparent', border: '1px solid #1A1A1A', borderRadius: '8px', padding: '5px 12px',
                    color: '#333', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
                  }}
                >
                  Edit
                </button>
              </div>

              {/* Savings pot bar */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ background: '#1A1A1A', borderRadius: '8px', height: '14px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{
                    height: '100%', width: `${goalPct}%`,
                    background: 'linear-gradient(90deg, #30D158, #4CAF50)',
                    borderRadius: '8px', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                    position: 'relative',
                  }}>
                    {goalPct > 12 && (
                      <span style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        color: '#0A0A0A', fontSize: '9px', fontWeight: 800,
                      }}>
                        {goalPct}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#30D158', fontSize: '13px', fontWeight: 700 }}>
                    ₹{Number(coupleLink.goal_saved ?? 0).toLocaleString('en-IN')} saved
                  </span>
                  <span style={{ color: '#333', fontSize: '12px' }}>
                    ₹{goalRemaining.toLocaleString('en-IN')} to go
                  </span>
                </div>
              </div>

              {goalPct >= 100 && (
                <p style={{ color: '#30D158', fontSize: '13px', fontWeight: 700, textAlign: 'center', margin: 0 }}>
                  🎉 Goal reached! Congratulations.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 6: Couple Roast ──────────────────────────────────────── */}
      <div>
        <SectionLabel text="Couple Roast" />

        {coupleRoast ? (
          <div style={{
            background: '#0D0D0D', border: '1px solid rgba(245,197,24,0.15)',
            borderRadius: '20px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '20px',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <p style={{
                color: '#F5C518', fontSize: '10px', letterSpacing: '0.22em',
                textTransform: 'uppercase', fontWeight: 700, margin: '0 0 10px',
              }}>
                WE GOT ROASTED 💀
              </p>
              <p style={{ color: '#C9A227', fontSize: '22px', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {coupleRoast.personalityType}
              </p>
              <p style={{ margin: 0 }}>
                <span style={{ color: scoreColor(coupleRoast.score), fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em' }}>
                  {coupleRoast.score}
                </span>
                <span style={{ color: '#333', fontSize: '14px', fontWeight: 600 }}>/100</span>
              </p>
            </div>

            {/* Roast lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {coupleRoast.roastLines.map((line, i) => (
                <p key={i} style={{
                  color: '#FF3B30', fontSize: '14px', fontWeight: 600,
                  margin: 0, lineHeight: 1.55, textAlign: 'center',
                }}>
                  "{line}"
                </p>
              ))}
            </div>

            {/* Individual scores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Your Score',           score: coupleRoast.myScore },
                { label: `${partnerDisplay}'s`,  score: coupleRoast.partnerScore },
              ].map(({ label, score }) => (
                <div key={label} style={{
                  background: '#111', borderRadius: '14px', padding: '14px', textAlign: 'center',
                }}>
                  <p style={{ color: '#333', fontSize: '10px', fontWeight: 600, margin: '0 0 4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {label}
                  </p>
                  <p style={{ margin: 0 }}>
                    <span style={{ color: scoreColor(score), fontSize: '26px', fontWeight: 900 }}>{score}</span>
                    <span style={{ color: '#2A2A2A', fontSize: '12px' }}>/100</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Savage insight */}
            {coupleRoast.savageInsight && (
              <p style={{
                color: '#444', fontSize: '13px', textAlign: 'center',
                fontStyle: 'italic', margin: 0, lineHeight: 1.6,
              }}>
                "{coupleRoast.savageInsight}"
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  const text = `We just got financially roasted as a couple 💀 Score: ${coupleRoast.score}/100. "${coupleRoast.roastLines[0] ?? ''}" Get roasted at vrdikt.vercel.app`
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                }}
                style={{
                  background: 'transparent', border: '1px solid #25D366',
                  borderRadius: '12px', padding: '12px',
                  color: '#25D366', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                💬 Share on WhatsApp
              </button>
              <button
                onClick={() => setCoupleRoast(null)}
                style={{
                  background: 'transparent', border: '1px solid #1A1A1A',
                  borderRadius: '12px', padding: '11px',
                  color: '#333', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Generate New Roast
              </button>
            </div>

            <p style={{ color: '#1A1A1A', fontSize: '10px', textAlign: 'center', margin: 0, letterSpacing: '0.08em' }}>
              vrdikt.vercel.app
            </p>
          </div>
        ) : (
          <div style={{
            background: '#0D0D0D', border: '1px solid #161616',
            borderRadius: '20px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            {generatingRoast ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: '#555', fontSize: '14px', margin: 0, fontStyle: 'italic' }}>
                  Analysing your combined financial crimes…
                </p>
              </div>
            ) : (
              <>
                <p style={{ color: '#444', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                  Get brutally judged together. Your combined spending, one shared verdict.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={handleCoupleRoast}
                    style={{
                      background: '#F5C518', border: 'none', borderRadius: '12px', padding: '13px',
                      color: '#0A0A0A', fontSize: '14px', fontWeight: 800,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      boxShadow: '0 0 24px rgba(245,197,24,0.15)',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                  >
                    Generate Couple Roast 🔥
                  </button>
                  <button
                    disabled
                    style={{
                      background: 'transparent', border: '1px solid #1A1A1A',
                      borderRadius: '12px', padding: '13px',
                      color: '#1E1E1E', fontSize: '14px', fontWeight: 700,
                      cursor: 'not-allowed', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    View Last Roast
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 7: Couple Challenges ─────────────────────────────────── */}
      <div>
        <SectionLabel text="Couple Challenges" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Household Zomato Detox — active */}
          <div style={{
            background: '#111', border: '1px solid rgba(245,197,24,0.15)',
            borderRadius: '18px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🍕</span>
                <p style={{ color: '#F0F0F0', fontSize: '13px', fontWeight: 800, margin: 0 }}>
                  Household Zomato Detox
                </p>
              </div>
              <span style={{
                background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)',
                borderRadius: '20px', padding: '3px 10px',
                color: '#F5C518', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              }}>
                ACTIVE
              </span>
            </div>
            <p style={{ color: '#555', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
              No food delivery for 7 days — both of you. If either orders, you both fail.
            </p>
            <div style={{ background: '#1A1A1A', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '43%', background: '#F5C518', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#333', fontSize: '11px' }}>Day 3 of 7</span>
              <span style={{ color: '#F5C518', fontSize: '11px', fontWeight: 700 }}>+100 XP each</span>
            </div>
          </div>

          {/* Locked challenges */}
          {[
            { emoji: '💰', name: 'Combined Savings Sprint', desc: 'Save 20% of combined income this month.' },
            { emoji: '⚡', name: 'No Impulse Buys',         desc: 'No unplanned purchase over ₹500 for 14 days — either of you.' },
          ].map(c => (
            <div key={c.name} style={{
              background: '#0A0A0A', border: '1px solid #141414',
              borderRadius: '18px', padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '8px',
              opacity: 0.55, position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: '14px', right: '14px',
                background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.15)',
                borderRadius: '20px', padding: '2px 8px',
                color: '#F5C518', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em',
              }}>
                SOON
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{c.emoji}</span>
                <p style={{ color: '#444', fontSize: '13px', fontWeight: 800, margin: 0, paddingRight: '48px' }}>
                  {c.name}
                </p>
              </div>
              <p style={{ color: '#2A2A2A', fontSize: '12px', margin: 0 }}>{c.desc}</p>
              <span style={{ position: 'absolute', bottom: '14px', right: '14px', fontSize: '16px' }}>🔒</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
