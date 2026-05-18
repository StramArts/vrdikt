import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getCouplePersonality } from '../lib/challenges'

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
  if (s == null) return 'rgba(255,255,255,0.38)'
  return '#FF1040'
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

// ─── main component ───────────────────────────────────────────────────────────

export default function CoupleMode() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading]               = useState(true)
  const [coupleLink, setCoupleLink]         = useState(null)
  const [partnerDisplay, setPartnerDisplay] = useState('your partner')
  const [myRoasts, setMyRoasts]             = useState([])
  const [partnerRoasts, setPartnerRoasts]   = useState([])

  const [myCode, setMyCode]                   = useState(null)
  const [myCodeExpiry, setMyCodeExpiry]       = useState(null)
  const [countdown, setCountdown]             = useState('')
  const [generatingCode, setGeneratingCode]   = useState(false)
  const [copied, setCopied]                   = useState(false)

  const [partnerCode, setPartnerCode] = useState('')
  const [linking, setLinking]         = useState(false)
  const [linkError, setLinkError]     = useState(null)

  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)

  const [generatingRoast, setGeneratingRoast] = useState(false)
  const [coupleRoast, setCoupleRoast]         = useState(null)

  const [editingGoal, setEditingGoal] = useState(false)
  const [goalName, setGoalName]       = useState('')
  const [goalAmount, setGoalAmount]   = useState('')
  const [goalDate, setGoalDate]       = useState('')
  const [goalSaved, setGoalSaved]     = useState('')
  const [savingGoal, setSavingGoal]   = useState(false)

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
    } else {
      const { data: pending } = await supabase
        .from('couple_links')
        .select('invite_code, expires_at')
        .eq('initiator_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .limit(1)

      if (pending?.[0]) {
        setMyCode(pending[0].invite_code)
        setMyCodeExpiry(pending[0].expires_at)
      }
    }

    setLoading(false)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCoupleData() }, [fetchCoupleData])

  useEffect(() => {
    if (!myCodeExpiry) return
    const iv = setInterval(() => setCountdown(fmtCountdown(new Date(myCodeExpiry) - Date.now())), 1000)
    return () => clearInterval(iv)
  }, [myCodeExpiry])

  // ── actions ──────────────────────────────────────────────────────────────────

  async function handleGenerateCode() {
    setGeneratingCode(true)
    const code      = genCode()
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    const { error } = await supabase.from('couple_links').insert({
      initiator_id: user.id, initiator_email: user.email,
      invite_code: code, status: 'pending', expires_at: expiresAt,
    })
    if (!error) { setMyCode(code); setMyCodeExpiry(expiresAt) }
    setGeneratingCode(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(myCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLinkUp() {
    if (partnerCode.length < 6 || linking) return
    setLinking(true); setLinkError(null)
    const code = partnerCode.trim().toUpperCase()
    const { data: found } = await supabase.from('couple_links').select('*').eq('invite_code', code).limit(1)
    const link = found?.[0]
    if (!link)                                        { setLinkError('Code not found.'); setLinking(false); return }
    if (link.status !== 'pending')                    { setLinkError('Code already used.'); setLinking(false); return }
    if (new Date(link.expires_at) < new Date())       { setLinkError('Code expired.'); setLinking(false); return }
    if (link.initiator_id === user.id)                { setLinkError("Can't link with your own code."); setLinking(false); return }
    const { error } = await supabase.from('couple_links').update({
      partner_id: user.id, partner_email: user.email,
      status: 'active', linked_at: new Date().toISOString(),
    }).eq('id', link.id)
    if (error) { setLinkError('Something went wrong.'); setLinking(false); return }
    await supabase.from('profiles').update({ couple_id: link.id }).eq('user_id', user.id)
    await fetchCoupleData()
    setLinking(false)
  }

  async function handleUnlink() {
    if (!coupleLink) return
    await supabase.from('couple_links').update({ status: 'dissolved' }).eq('id', coupleLink.id)
    await supabase.from('profiles').update({ couple_id: null }).eq('user_id', user.id)
    setCoupleLink(null); setPartnerRoasts([])
    setShowUnlinkConfirm(false)
  }

  async function handleCoupleRoast() {
    setGeneratingRoast(true); setCoupleRoast(null)
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
          model: 'claude-haiku-4-5-20251001', max_tokens: 800,
          system: COUPLE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Combined spending data:\n\n${combined}\n\nIndividual VRDIKT scores — Person A: ${myScore}/100, Person B: ${partnerScore}/100\n\nDeliver the couple verdict.` }],
        }),
      })
      if (res.ok) {
        const data = await res.json()
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
    } catch { /* fall through */ }
    if (!result) {
      result = {
        score: Math.round((myRoasts[0]?.score ?? 50 + partnerRoasts[0]?.score ?? 50) / 2),
        roastLines: ['Your combined finances are a masterpiece of mutual denial.'],
        personalityType: getCouplePersonality(myRoasts[0]?.score ?? 50, partnerRoasts[0]?.score ?? 50),
        savageInsight: 'Two people, one bad financial plan.',
        myScore: myRoasts[0]?.score ?? 50, partnerScore: partnerRoasts[0]?.score ?? 50,
      }
    }
    setCoupleRoast(result)
    await supabase.from('roasts').insert({
      user_id: user.id, score: result.score, roast_lines: result.roastLines,
      personality_type: result.personalityType, spending_data: { couple: true, couple_id: coupleLink?.id },
    })
    setGeneratingRoast(false)
  }

  async function handleSaveGoal() {
    if (!goalName || !goalAmount) return
    setSavingGoal(true)
    const updates = {
      goal_name: goalName, goal_amount: parseFloat(goalAmount),
      goal_date: goalDate || null,
      goal_saved: goalSaved ? parseFloat(goalSaved) : (coupleLink?.goal_saved ?? 0),
    }
    await supabase.from('couple_links').update(updates).eq('id', coupleLink.id)
    setCoupleLink(prev => ({ ...prev, ...updates }))
    setEditingGoal(false); setSavingGoal(false)
  }

  // ── derived ───────────────────────────────────────────────────────────────────

  const myScore      = myRoasts[0]?.score ?? null
  const partnerScore = partnerRoasts[0]?.score ?? null
  const avgScore     = myScore != null && partnerScore != null
    ? Math.round((myScore + partnerScore) / 2)
    : (myScore ?? partnerScore)
  const personality  = myScore != null && partnerScore != null
    ? getCouplePersonality(myScore, partnerScore)
    : null
  const linkedSince = coupleLink?.linked_at ? formatDate(coupleLink.linked_at) : 'Recently'

  const myCats      = parseCategories(myRoasts[0]?.spending_data?.raw ?? '')
  const partnerCats = parseCategories(partnerRoasts[0]?.spending_data?.raw ?? '')
  const myTotal     = Object.values(myCats).reduce((s, v) => s + v, 0)
  const partnerTotal = Object.values(partnerCats).reduce((s, v) => s + v, 0)
  const myTopCat    = Object.entries(myCats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const partnerTopCat = Object.entries(partnerCats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // ── loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '14px' }}>Loading…</p>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // STATE A — Not Linked
  // ════════════════════════════════════════════════════════════════════════

  if (!coupleLink) {
    const inputStyle = {
      background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px',
      padding: '12px 16px', color: '#F0F0F0',
      fontSize: '22px', fontWeight: 800, letterSpacing: '0.22em',
      fontFamily: 'monospace', textAlign: 'center', outline: 'none', width: '100%',
      boxSizing: 'border-box', transition: 'border-color 0.2s',
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Single centered card */}
        <div style={{
          background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px', padding: '32px 24px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900,
            letterSpacing: '-0.04em', margin: '0 0 8px', color: '#F0F0F0',
            fontFamily: 'var(--font-display, Outfit), sans-serif',
          }}>
            Couple Mode
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', margin: '0 0 28px' }}>
            Get financially destroyed together.
          </p>

          {/* Pending code: show only the code */}
          {myCode ? (
            <div style={{ maxWidth: 320, margin: '0 auto' }}>
              <p style={{ color: '#FF5500', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 12px' }}>
                Your Invite Code
              </p>
              <div style={{
                background: '#1E1E1E', border: '1px solid rgba(255,85,0,0.2)',
                borderRadius: '14px', padding: '20px 16px', marginBottom: '14px',
              }}>
                <p style={{
                  color: '#FF5500', fontSize: '36px', fontWeight: 900,
                  letterSpacing: '0.18em', margin: '0 0 12px', fontFamily: 'monospace',
                }}>
                  {myCode}
                </p>
                <button
                  onClick={copyCode}
                  style={{
                    background: copied ? 'rgba(255,85,0,0.1)' : 'rgba(255,85,0,0.08)',
                    border: `1px solid ${copied ? 'rgba(255,85,0,0.4)' : 'rgba(255,85,0,0.2)'}`,
                    borderRadius: '8px', padding: '8px 22px',
                    color: copied ? '#FF5500' : '#FF5500',
                    fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif', transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy Code'}
                </button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', margin: 0, fontFeatureSettings: '"tnum"' }}>
                Expires in <span style={{ color: '#FF5500', fontWeight: 700 }}>{countdown}</span>
              </p>
            </div>
          ) : (
            /* Side-by-side panels */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', textAlign: 'left' }}>

              {/* Generate code */}
              <div style={{
                background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '18px', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '14px',
              }}>
                <p style={{ color: '#FF5500', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
                  Generate Code
                </p>
                <button
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  style={{
                    background: 'linear-gradient(135deg,#FF5500,#FF1040)', border: 'none', borderRadius: '10px', padding: '12px',
                    color: '#fff', fontSize: '13px', fontWeight: 800,
                    cursor: generatingCode ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                    opacity: generatingCode ? 0.7 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  {generatingCode ? 'Generating…' : 'Generate Code'}
                </button>
              </div>

              {/* Enter code */}
              <div style={{
                background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '18px', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '14px',
              }}>
                <p style={{ color: '#FF5500', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
                  Enter Code
                </p>
                <input
                  value={partnerCode}
                  onChange={e => { setPartnerCode(e.target.value.toUpperCase().slice(0, 6)); setLinkError(null) }}
                  placeholder="X7K2P9"
                  maxLength={6}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#FF5500' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
                />
                {linkError && (
                  <p style={{ color: '#FF1040', fontSize: '12px', margin: 0, textAlign: 'center' }}>{linkError}</p>
                )}
                <button
                  onClick={handleLinkUp}
                  disabled={partnerCode.length < 6 || linking}
                  style={{
                    background: partnerCode.length === 6 ? 'linear-gradient(135deg,#FF5500,#FF1040)' : '#1E1E1E',
                    border: 'none', borderRadius: '10px', padding: '12px',
                    color: partnerCode.length === 6 ? '#fff' : 'rgba(255,255,255,0.2)',
                    fontSize: '13px', fontWeight: 800,
                    cursor: partnerCode.length === 6 ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-ui, Space Grotesk), sans-serif', transition: 'all 0.15s',
                  }}
                >
                  {linking ? 'Linking…' : 'Link Up'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // STATE B — Linked
  // ════════════════════════════════════════════════════════════════════════

  const goalPct      = coupleLink.goal_amount ? Math.min(100, Math.round(((coupleLink.goal_saved ?? 0) / coupleLink.goal_amount) * 100)) : 0
  const goalRemaining = coupleLink.goal_amount ? Math.max(0, coupleLink.goal_amount - (coupleLink.goal_saved ?? 0)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Hero: You & partner */}
      <div style={{
        background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '24px', padding: '28px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ color: '#F0F0F0', fontSize: '20px', fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em', fontFamily: 'var(--font-display, Outfit), sans-serif' }}>
              You & {partnerDisplay}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', margin: 0 }}>Linked since {linkedSince}</p>
          </div>
          {!showUnlinkConfirm ? (
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '8px', padding: '6px 12px',
                color: 'rgba(255,255,255,0.38)', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                transition: 'border-color 0.2s, color 0.2s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF1040'; e.currentTarget.style.color = '#FF1040' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}
            >
              Unlink
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>Sure?</span>
              <button onClick={handleUnlink} style={{
                background: '#FF1040', border: 'none', borderRadius: '8px', padding: '6px 12px',
                color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
              }}>Yes</button>
              <button onClick={() => setShowUnlinkConfirm(false)} style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', padding: '6px 12px',
                color: 'rgba(255,255,255,0.38)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
              }}>Cancel</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {personality && (
            <span style={{
              background: 'rgba(255,85,0,0.1)', border: '1px solid rgba(255,85,0,0.25)',
              borderRadius: '999px', padding: '4px 14px',
              color: '#FF5500', fontSize: '12px', fontWeight: 700,
            }}>
              {personality}
            </span>
          )}
          {avgScore != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span style={{ color: '#FF1040', fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>{avgScore}</span>
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', fontWeight: 700 }}>/100</span>
            </div>
          )}
        </div>
      </div>

      {/* Comparison: 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { name: 'You', total: myTotal, topCat: myTopCat, score: myScore, isMe: true },
          { name: partnerDisplay, total: partnerTotal, topCat: partnerTopCat, score: partnerScore, isMe: false },
        ].map(({ name, total, topCat, score, isMe }) => (
          <div key={name} style={{
            background: '#141414',
            border: isMe ? '1px solid rgba(255,85,0,0.3)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius: '18px', padding: '18px',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <p style={{ color: isMe ? '#FF5500' : 'rgba(255,255,255,0.38)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>{name}</p>
            <p style={{ color: '#F0F0F0', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}>
              {total > 0 ? `₹${total.toLocaleString('en-IN')}` : '—'}
            </p>
            {topCat && <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', margin: 0 }}>Top: {topCat}</p>}
            {score != null && (
              <p style={{ color: '#FF1040', fontSize: '12px', fontWeight: 700, margin: 0 }}>{score}/100</p>
            )}
          </div>
        ))}
      </div>

      {/* Shared Savings Goal — compact */}
      <div style={{
        background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '18px', padding: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
            Shared Goal
          </p>
          {coupleLink.goal_name && !editingGoal && (
            <button
              onClick={() => {
                setGoalName(coupleLink.goal_name ?? '')
                setGoalAmount(String(coupleLink.goal_amount ?? ''))
                setGoalDate(coupleLink.goal_date ?? '')
                setGoalSaved(String(coupleLink.goal_saved ?? ''))
                setEditingGoal(true)
              }}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', padding: '4px 10px',
                color: 'rgba(255,255,255,0.38)', fontSize: '10px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
              }}
            >
              Edit
            </button>
          )}
        </div>

        {(editingGoal || !coupleLink.goal_name) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { value: goalName,   onChange: e => setGoalName(e.target.value),   placeholder: 'Goal name (e.g. Goa trip)', type: 'text' },
              { value: goalAmount, onChange: e => setGoalAmount(e.target.value), placeholder: 'Target amount (₹)', type: 'number' },
              { value: goalSaved,  onChange: e => setGoalSaved(e.target.value),  placeholder: 'Already saved (₹)', type: 'number' },
            ].map((props, i) => (
              <input key={i} {...props} style={{
                background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px',
                padding: '10px 14px', color: '#F0F0F0', fontSize: '13px',
                fontFamily: 'var(--font-ui, Space Grotesk), sans-serif', outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#FF5500' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }} />
            ))}
            <input type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} style={{
              background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px',
              padding: '10px 14px', color: '#F0F0F0', fontSize: '13px',
              fontFamily: 'var(--font-ui, Space Grotesk), sans-serif', outline: 'none', colorScheme: 'dark',
            }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSaveGoal}
                disabled={!goalName || !goalAmount || savingGoal}
                style={{
                  flex: 1,
                  background: goalName && goalAmount ? 'linear-gradient(135deg,#FF5500,#FF1040)' : '#1E1E1E',
                  border: 'none', borderRadius: '10px', padding: '10px',
                  color: goalName && goalAmount ? '#fff' : 'rgba(255,255,255,0.2)',
                  fontSize: '13px', fontWeight: 800,
                  cursor: goalName && goalAmount ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                }}
              >
                {savingGoal ? 'Saving…' : 'Set Goal'}
              </button>
              {coupleLink.goal_name && (
                <button
                  onClick={() => setEditingGoal(false)}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '10px 14px',
                    color: 'rgba(255,255,255,0.38)', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <p style={{ color: '#FF5500', fontSize: '14px', fontWeight: 700, margin: 0 }}>{coupleLink.goal_name}</p>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', margin: 0 }}>
                ₹{Number(coupleLink.goal_saved ?? 0).toLocaleString('en-IN')} / ₹{Number(coupleLink.goal_amount).toLocaleString('en-IN')}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '6px', height: '8px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{
                height: '100%', width: `${goalPct}%`,
                background: 'linear-gradient(90deg,#FF5500,#FF1040)',
                borderRadius: '6px', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#FF5500', fontSize: '11px', fontWeight: 700 }}>{goalPct}% saved</span>
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px' }}>₹{goalRemaining.toLocaleString('en-IN')} to go</span>
            </div>
            {goalPct >= 100 && (
              <p style={{ color: '#FF5500', fontSize: '12px', fontWeight: 700, textAlign: 'center', margin: '10px 0 0' }}>
                Goal reached!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Couple Roast — full-width gold at bottom */}
      {coupleRoast ? (
        <div style={{
          background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              color: '#FF5500', fontSize: '10px', letterSpacing: '0.22em',
              textTransform: 'uppercase', fontWeight: 700, margin: '0 0 10px',
            }}>
              WE GOT ROASTED
            </p>
            <p style={{ color: '#F0F0F0', fontSize: '20px', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: 'var(--font-display, Outfit), sans-serif' }}>
              {coupleRoast.personalityType}
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: '#FF1040', fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em' }}>
                {coupleRoast.score}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '14px', fontWeight: 600 }}>/100</span>
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {coupleRoast.roastLines.map((line, i) => (
              <p key={i} style={{
                color: '#FF1040', fontSize: '14px', fontWeight: 600,
                margin: 0, lineHeight: 1.55, textAlign: 'center',
              }}>
                "{line}"
              </p>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'You', score: coupleRoast.myScore },
              { label: partnerDisplay, score: coupleRoast.partnerScore },
            ].map(({ label, score }) => (
              <div key={label} style={{
                background: '#1E1E1E', borderRadius: '14px', padding: '14px', textAlign: 'center',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', fontWeight: 600, margin: '0 0 4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {label}
                </p>
                <p style={{ margin: 0 }}>
                  <span style={{ color: '#FF1040', fontSize: '26px', fontWeight: 900 }}>{score}</span>
                  <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>/100</span>
                </p>
              </div>
            ))}
          </div>
          {coupleRoast.savageInsight && (
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', textAlign: 'center', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
              "{coupleRoast.savageInsight}"
            </p>
          )}
          <button
            onClick={() => {
              const text = `We just got financially roasted as a couple 💀 Score: ${coupleRoast.score}/100. "${coupleRoast.roastLines[0] ?? ''}" Get roasted at vrdikt.vercel.app`
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
            }}
            style={{
              background: 'transparent', border: '1px solid #25D366',
              borderRadius: '12px', padding: '12px',
              color: '#25D366', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
            }}
          >
            Share on WhatsApp
          </button>
          <button
            onClick={() => setCoupleRoast(null)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '12px', padding: '11px',
              color: 'rgba(255,255,255,0.38)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
            }}
          >
            Generate New Roast
          </button>
        </div>
      ) : generatingRoast ? (
        <div style={{
          background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '28px 24px', textAlign: 'center',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '14px', margin: 0, fontStyle: 'italic' }}>
            Analysing your combined financial crimes…
          </p>
        </div>
      ) : (
        <button
          onClick={handleCoupleRoast}
          style={{
            background: 'linear-gradient(135deg,#FF5500,#FF1040)', border: 'none', borderRadius: '14px', padding: '16px',
            color: '#fff', fontSize: '15px', fontWeight: 900,
            cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
            boxShadow: '0 0 32px rgba(255,85,0,0.2)',
            letterSpacing: '-0.01em', width: '100%',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Couple Roast
        </button>
      )}
    </div>
  )
}
