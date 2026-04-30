import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ─── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
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

// ─── share card generator ─────────────────────────────────────────────────────

function buildShareCanvas({ roastLines, personalityType, score, savageInsight }) {
  const W = 1080, H = 1440
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0A0A0A'
  ctx.fillRect(0, 0, W, H)

  // Gold top stripe
  ctx.fillStyle = '#F5C518'
  ctx.fillRect(0, 0, W, 6)

  // Logo
  ctx.textAlign = 'left'
  ctx.font = '900 62px Arial'
  ctx.fillStyle = '#F0F0F0'
  ctx.fillText('VRD', 80, 122)
  ctx.fillStyle = '#F5C518'
  ctx.fillText('IKT', 80 + ctx.measureText('VRD').width, 122)

  ctx.textAlign = 'right'
  ctx.font = '400 24px Arial'
  ctx.fillStyle = '#2A2A2A'
  ctx.fillText('vrdikt.app', W - 80, 122)

  // "THE VERDICT IS IN"
  ctx.textAlign = 'center'
  ctx.font = '900 72px Arial'
  ctx.fillStyle = '#F5C518'
  ctx.fillText('THE VERDICT IS IN', W / 2, 270)

  // Divider
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(80, 300, W - 160, 2)

  // Roast lines
  ctx.fillStyle = '#FF3B30'
  ctx.font = '500 36px Arial'
  let y = 390
  for (const line of roastLines) {
    for (const wl of wrapText(ctx, line, W - 200)) {
      ctx.fillText(wl, W / 2, y)
      y += 52
    }
    y += 18
  }

  y += 28

  // Personality label
  ctx.fillStyle = '#333'
  ctx.font = '700 22px Arial'
  ctx.fillText('SPENDING PERSONALITY', W / 2, y)
  y += 68

  ctx.fillStyle = '#F5C518'
  ctx.font = '800 56px Arial'
  ctx.fillText(personalityType ?? '—', W / 2, y)
  y += 100

  // Score ring
  const cx = W / 2, cy = y + 96
  const r = 88
  const sc = score < 40 ? '#FF3B30' : score > 70 ? '#30D158' : '#F5C518'

  ctx.strokeStyle = '#1C1C1C'
  ctx.lineWidth = 16
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke()

  ctx.strokeStyle = sc; ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * score / 100)
  ctx.stroke()

  ctx.fillStyle = sc
  ctx.font = '900 90px Arial'
  ctx.fillText(score, cx, cy + 28)
  ctx.fillStyle = '#333'
  ctx.font = '500 26px Arial'
  ctx.fillText('VRDIKT SCORE', cx, cy + 68)

  y = cy + 140

  if (savageInsight) {
    ctx.fillStyle = '#1A1A1A'
    ctx.fillRect(80, y, W - 160, 2)
    y += 44

    ctx.fillStyle = '#444'
    ctx.font = '700 22px Arial'
    ctx.fillText('SAVAGE INSIGHT', W / 2, y)
    y += 54

    ctx.fillStyle = '#666'
    ctx.font = '400 30px Arial'
    for (const il of wrapText(ctx, savageInsight, W - 200)) {
      ctx.fillText(il, W / 2, y)
      y += 46
    }
  }

  // Gold bottom stripe
  ctx.fillStyle = '#F5C518'
  ctx.fillRect(0, H - 6, W, 6)

  return canvas
}

async function shareVerdict(data) {
  const canvas = buildShareCanvas(data)

  if (typeof navigator.canShare === 'function') {
    return new Promise(resolve => {
      canvas.toBlob(async blob => {
        const file = new File([blob], 'vrdikt-verdict.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'My VRDIKT Verdict' })
            resolve('shared')
            return
          } catch { /* fall through */ }
        }
        downloadCanvas(canvas)
        resolve('downloaded')
      })
    })
  }

  downloadCanvas(canvas)
  return 'downloaded'
}

function downloadCanvas(canvas) {
  const a = document.createElement('a')
  a.download = 'vrdikt-verdict.png'
  a.href = canvas.toDataURL('image/png')
  a.click()
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Roast() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { roastLines = [], personalityType = null, score = 35, savageInsight = null } =
    location.state || {}

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
        await sleep(480) // pause between lines
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
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplayScore(Math.round(score * eased))
      if (t < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [scoreStarted, score])

  // ── share handler ────────────────────────────────────────────────────────────
  async function handleShare() {
    setSharing(true)
    await shareVerdict({ roastLines, personalityType, score, savageInsight })
    setSharing(false)
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
          CASE NO. {String(Date.now()).slice(-6)}
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
    </div>
  )
}
