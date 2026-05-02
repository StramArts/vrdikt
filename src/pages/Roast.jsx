import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateXP } from '../lib/challenges'
import html2canvas from 'html2canvas'

// ─── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ displayScore, finalScore }) {
  const color = finalScore < 40 ? '#FF3B30' : finalScore > 70 ? '#30D158' : '#F5C518'
  const r = 72
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - displayScore / 100)
  return (
    <div style={{ position: 'relative', width: 184, height: 184 }}>
      <svg width="184" height="184" viewBox="0 0 184 184" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="92" cy="92" r={r} fill="none" stroke="#1A1A1A" strokeWidth="12" />
        <circle
          cx="92" cy="92" r={r} fill="none"
          stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1, fontFamily: 'Inter, sans-serif' }}>
          {displayScore}
        </span>
        <span style={{ fontSize: 12, color: '#444', fontWeight: 600, letterSpacing: '0.05em', marginTop: 4 }}>
          /100
        </span>
      </div>
    </div>
  )
}

// ─── hidden share card (captured by html2canvas) ──────────────────────────────

function ShareCard({ caseNo, score, personalityType, firstRoastLine, cardRef }) {
  const scoreColor = score < 40 ? '#FF3B30' : score > 70 ? '#30D158' : '#F5C518'
  const pct = score

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: 390,
        background: '#0A0A0A',
        fontFamily: 'Inter, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Gold top stripe */}
      <div style={{ height: 5, background: '#F5C518', width: '100%' }} />

      <div style={{ padding: '28px 28px 0' }}>
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
            <span style={{ color: '#F0F0F0' }}>VRD</span>
            <span style={{ color: '#F5C518' }}>IKT</span>
          </span>
          <span style={{ color: '#2A2A2A', fontSize: 12, fontWeight: 400 }}>vrdikt.vercel.app</span>
        </div>

        {/* Case No. */}
        <p style={{
          color: '#333', fontSize: 11, letterSpacing: '0.22em',
          textTransform: 'uppercase', fontWeight: 600, margin: '0 0 10px',
        }}>
          CASE NO. {caseNo}
        </p>

        {/* THE VERDICT IS IN */}
        <h1 style={{
          color: '#F5C518',
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: '-0.04em',
          margin: '0 0 24px',
          lineHeight: 1.05,
        }}>
          THE VERDICT<br />IS IN
        </h1>

        {/* Divider */}
        <div style={{ height: 1, background: '#1A1A1A', marginBottom: 24 }} />

        {/* Spending personality */}
        {personalityType && (
          <div style={{ marginBottom: 24 }}>
            <p style={{
              color: '#444', fontSize: 10, letterSpacing: '0.22em',
              textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px',
            }}>
              SPENDING PERSONALITY
            </p>
            <p style={{
              color: '#F5C518', fontSize: 22, fontWeight: 900,
              letterSpacing: '-0.03em', margin: 0, lineHeight: 1.2,
            }}>
              {personalityType}
            </p>
          </div>
        )}

        {/* Score ring (CSS conic gradient) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${scoreColor} ${pct}%, #1C1C1C ${pct}%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#0A0A0A',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: scoreColor, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{score}</span>
              <span style={{ color: '#444', fontSize: 9, fontWeight: 600 }}>/100</span>
            </div>
          </div>
          <div>
            <p style={{ color: '#333', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>
              VRDIKT SCORE
            </p>
            <p style={{ color: scoreColor, fontSize: 14, fontWeight: 700, margin: 0 }}>
              {score < 30 ? 'Financially Ruined' :
               score < 50 ? 'Could Be Worse (Barely)' :
               score < 70 ? 'Room For Improvement' :
               'Actually Decent'}
            </p>
          </div>
        </div>

        {/* First roast line */}
        {firstRoastLine && (
          <div style={{
            background: 'rgba(255,59,48,0.06)',
            border: '1px solid rgba(255,59,48,0.15)',
            borderRadius: 14,
            padding: '16px 18px',
            marginBottom: 28,
          }}>
            <p style={{
              color: '#FF3B30', fontSize: 15, fontWeight: 600,
              lineHeight: 1.55, margin: 0,
            }}>
              "{firstRoastLine}"
            </p>
          </div>
        )}
      </div>

      {/* Watermark footer */}
      <div style={{
        padding: '0 28px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingBottom: 5,
      }}>
        <p style={{ color: '#1E1E1E', fontSize: 11, fontWeight: 500, margin: 0, letterSpacing: '0.05em' }}>
          vrdikt.vercel.app
        </p>
      </div>

      {/* Gold bottom stripe */}
      <div style={{ height: 5, background: '#F5C518', width: '100%' }} />
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Roast() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()
  const { roastLines = [], personalityType = null, score = 35, savageInsight = null } =
    location.state || {}

  const caseNoRef = useRef(String(Date.now()).slice(-6))
  const cardRef   = useRef(null)

  // ── animation state ─────────────────────────────────────────────────────────
  const [showLogo,        setShowLogo]        = useState(false)
  const [showVerdict,     setShowVerdict]      = useState(false)
  const [lineTexts,       setLineTexts]        = useState(roastLines.map(() => ''))
  const [activeLineIdx,   setActiveLineIdx]    = useState(-1)
  const [allLinesTyped,   setAllLinesTyped]    = useState(false)
  const [showPersonality, setShowPersonality]  = useState(false)
  const [scoreStarted,    setScoreStarted]     = useState(false)
  const [displayScore,    setDisplayScore]     = useState(0)
  const [showInsight,     setShowInsight]      = useState(false)
  const [showActions,     setShowActions]      = useState(false)
  const [sharing,         setSharing]          = useState(false)
  const [xpToast,         setXpToast]          = useState(false)
  const [xpData,          setXpData]           = useState(null)

  const typingCancelledRef = useRef(false)

  // ── guard: no data ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roastLines.length) navigate('/upload', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── phase 1: logo + verdict ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roastLines.length) return
    const t1 = setTimeout(() => setShowLogo(true), 400)
    const t2 = setTimeout(() => setShowVerdict(true), 1300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── phase 2: typewriter lines (start when verdict appears) ──────────────────
  useEffect(() => {
    if (!showVerdict || !roastLines.length) return
    typingCancelledRef.current = false

    async function typeAllLines() {
      await sleep(700)
      for (let i = 0; i < roastLines.length; i++) {
        if (typingCancelledRef.current) return
        setActiveLineIdx(i)
        const text = roastLines[i]
        for (let c = 1; c <= text.length; c++) {
          if (typingCancelledRef.current) return
          setLineTexts(prev => { const n = [...prev]; n[i] = text.slice(0, c); return n })
          await sleep(18)
        }
        await sleep(480)
      }
      setAllLinesTyped(true)
      setActiveLineIdx(-1)
    }

    typeAllLines()
    return () => { typingCancelledRef.current = true }
  }, [showVerdict]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── phase 3+: personality → score → insight → actions ───────────────────────
  useEffect(() => {
    if (!allLinesTyped) return
    const t1 = setTimeout(() => setShowPersonality(true), 400)
    const t2 = setTimeout(() => setScoreStarted(true), 1300)
    const t3 = setTimeout(() => setShowInsight(true), 3300)
    const t4 = setTimeout(() => setShowActions(true), 4100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [allLinesTyped])

  // ── score count-up (rAF eased) ───────────────────────────────────────────────
  useEffect(() => {
    if (!scoreStarted) return
    const duration = 1700
    const start = performance.now()
    let rafId

    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayScore(Math.round(score * eased))
      if (t < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [scoreStarted, score])

  // ── XP toast (fires once when actions appear) ────────────────────────────────
  useEffect(() => {
    if (!showActions || !user) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('roasts')
        .select('created_at, score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (cancelled) return
      const xp = calculateXP(data ?? [])
      setXpData(xp)
      setXpToast(true)
      setTimeout(() => { if (!cancelled) setXpToast(false) }, 3500)
    })()
    return () => { cancelled = true }
  }, [showActions]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── share handler ────────────────────────────────────────────────────────────
  async function handleShare() {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0A0A0A',
        scale: 2,
        useCORS: true,
        logging: false,
      })

      if (typeof navigator.canShare === 'function') {
        await new Promise(resolve => {
          canvas.toBlob(async blob => {
            const file = new File([blob], 'vrdikt-verdict.png', { type: 'image/png' })
            if (navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({ files: [file], title: 'My VRDIKT Verdict' })
                resolve(); return
              } catch { /* fall through to download */ }
            }
            downloadCanvas(canvas)
            resolve()
          })
        })
      } else {
        downloadCanvas(canvas)
      }
    } catch {
      // fallback: nothing to do
    }
    setSharing(false)
  }

  function downloadCanvas(canvas) {
    const a = document.createElement('a')
    a.download = 'vrdikt-verdict.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  const scoreColor = score < 40 ? '#FF3B30' : score > 70 ? '#30D158' : '#F5C518'

  const fade = (visible, extra = {}) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.7s ease, transform 0.7s ease',
    ...extra,
  })

  return (
    <div style={{
      minHeight: '100svh',
      background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif',
      color: '#F0F0F0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '56px 24px 80px',
      overflowX: 'hidden',
    }}>

      {/* Hidden share card — captured by html2canvas */}
      <ShareCard
        caseNo={caseNoRef.current}
        score={score}
        personalityType={personalityType}
        firstRoastLine={roastLines[0] ?? null}
        cardRef={cardRef}
      />

      {/* ── Logo ── */}
      <div style={{
        marginBottom: '44px',
        ...fade(showLogo),
        animation: showLogo ? 'pulse-logo 3s ease-in-out 1s infinite' : undefined,
      }}>
        <span style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
          <span style={{ color: '#F0F0F0' }}>VRD</span>
          <span style={{ color: '#F5C518' }}>IKT</span>
        </span>
      </div>

      {/* ── THE VERDICT IS IN ── */}
      <div style={{ textAlign: 'center', marginBottom: '52px', ...fade(showVerdict) }}>
        <p style={{
          color: '#333', fontSize: '11px', letterSpacing: '0.24em',
          textTransform: 'uppercase', fontWeight: 600, margin: '0 0 14px',
        }}>
          CASE NO. {caseNoRef.current}
        </p>
        <h1 style={{
          fontSize: 'clamp(30px, 7vw, 56px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: '#F5C518',
          margin: 0,
          lineHeight: 1.05,
          animation: showVerdict ? 'glow-gold 2.5s ease-in-out infinite' : undefined,
        }}>
          THE VERDICT IS IN
        </h1>
      </div>

      {/* ── Roast lines ── */}
      <div style={{
        maxWidth: 620, width: '100%',
        display: 'flex', flexDirection: 'column', gap: '26px',
        marginBottom: '52px',
      }}>
        {roastLines.map((line, i) => {
          const isActive = activeLineIdx === i
          const hasStarted = lineTexts[i].length > 0
          return (
            <p
              key={i}
              style={{
                color: '#FF3B30',
                fontSize: 'clamp(16px, 3.2vw, 21px)',
                fontWeight: 600,
                lineHeight: 1.55,
                margin: 0,
                textAlign: 'center',
                opacity: hasStarted ? 1 : 0,
                transition: 'opacity 0.3s ease',
                minHeight: '1.55em',
              }}
            >
              {lineTexts[i]}
              {isActive && lineTexts[i].length < line.length && (
                <span style={{ animation: 'blink 0.9s step-end infinite', marginLeft: '1px' }}>|</span>
              )}
            </p>
          )
        })}
      </div>

      {/* ── Personality type ── */}
      {personalityType && (
        <div style={{
          background: 'rgba(245,197,24,0.06)',
          border: '1px solid rgba(245,197,24,0.2)',
          borderRadius: '18px', padding: '22px 36px',
          textAlign: 'center', marginBottom: '44px',
          maxWidth: 500, width: '100%',
          ...fade(showPersonality),
        }}>
          <p style={{
            color: '#444', fontSize: '10px', letterSpacing: '0.24em',
            textTransform: 'uppercase', fontWeight: 700, margin: '0 0 10px',
          }}>
            YOUR SPENDING PERSONALITY
          </p>
          <p style={{
            color: '#F5C518',
            fontSize: 'clamp(20px, 5vw, 28px)',
            fontWeight: 900,
            margin: 0,
            letterSpacing: '-0.03em',
            animation: showPersonality ? 'glow-gold 2s ease-in-out infinite' : undefined,
          }}>
            {personalityType}
          </p>
        </div>
      )}

      {/* ── VRDIKT Score ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '12px', marginBottom: '44px',
        ...fade(scoreStarted),
      }}>
        <p style={{
          color: '#333', fontSize: '10px', letterSpacing: '0.24em',
          textTransform: 'uppercase', fontWeight: 700, margin: 0,
        }}>
          VRDIKT SCORE
        </p>
        <ScoreRing displayScore={displayScore} finalScore={score} />
        <p style={{
          color: scoreColor, fontSize: '13px', fontWeight: 600,
          margin: 0, letterSpacing: '0.05em',
        }}>
          {score < 30 ? 'Financially Ruined' :
           score < 50 ? 'Could Be Worse (Barely)' :
           score < 70 ? 'Room For Improvement' :
           'Actually Decent'}
        </p>
      </div>

      {/* ── Savage Insight ── */}
      {savageInsight && (
        <div style={{
          maxWidth: 560, width: '100%',
          background: '#0D0D0D', border: '1px solid #1A1A1A',
          borderRadius: '16px', padding: '20px 24px',
          textAlign: 'center', marginBottom: '48px',
          ...fade(showInsight),
        }}>
          <p style={{
            color: '#333', fontSize: '10px', letterSpacing: '0.22em',
            textTransform: 'uppercase', fontWeight: 700, margin: '0 0 10px',
          }}>
            SAVAGE INSIGHT
          </p>
          <p style={{ color: '#888', fontSize: 'clamp(14px, 2.5vw, 16px)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
            "{savageInsight}"
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: '12px', alignItems: 'center',
        width: '100%', maxWidth: 340,
        ...fade(showActions),
      }}>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            width: '100%', background: sharing ? '#1A1A1A' : '#F5C518',
            border: 'none', borderRadius: '14px', padding: '16px 24px',
            color: sharing ? '#444' : '#0A0A0A',
            fontSize: '15px', fontWeight: 800,
            cursor: sharing ? 'default' : 'pointer',
            fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!sharing) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          onMouseDown={e => { if (!sharing) e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {sharing ? 'Generating image…' : '📸 Share your verdict'}
        </button>

        <button
          onClick={() => {
            const text = `I just got financially roasted by VRDIKT 😭 Score: ${score}/100. "${roastLines[0] ?? ''}" Get roasted at vrdikt.vercel.app`
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
          }}
          style={{
            width: '100%', background: 'transparent',
            border: '1px solid #25D366', borderRadius: '14px', padding: '15px 24px',
            color: '#25D366', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          💬 Share on WhatsApp
        </button>

        <button
          onClick={() => navigate('/upload')}
          style={{
            width: '100%', background: 'transparent',
            border: '1px solid #1E1E1E', borderRadius: '14px', padding: '15px 24px',
            color: '#555', fontSize: '15px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5C518'; e.currentTarget.style.color = '#F5C518' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#555' }}
        >
          Get Roasted Again 🔥
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent', border: 'none',
            color: '#222', fontSize: '13px', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', padding: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#555'}
          onMouseLeave={e => e.currentTarget.style.color = '#222'}
        >
          Back to dashboard
        </button>
      </div>

      {/* ── XP Toast ── */}
      <div style={{
        position: 'fixed', bottom: '28px', left: '50%',
        transform: xpToast ? 'translate(-50%, 0)' : 'translate(-50%, 24px)',
        opacity: xpToast ? 1 : 0,
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        pointerEvents: 'none', zIndex: 99,
        background: '#F5C518', borderRadius: '40px',
        padding: '12px 22px',
        display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: '0 8px 32px rgba(245,197,24,0.35)',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '18px' }}>🔥</span>
        <span style={{ color: '#0A0A0A', fontSize: '14px', fontWeight: 800, letterSpacing: '-0.01em' }}>
          +10 XP earned
        </span>
        {xpData && (
          <>
            <span style={{ color: 'rgba(10,10,10,0.35)', fontSize: '13px' }}>·</span>
            <span style={{ color: '#0A0A0A', fontSize: '13px', fontWeight: 600 }}>
              Total: {xpData.xp} XP
            </span>
            <span style={{ color: 'rgba(10,10,10,0.35)', fontSize: '13px' }}>·</span>
            <span style={{ color: '#0A0A0A', fontSize: '13px', fontWeight: 600 }}>
              {xpData.levelName}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
