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
  const color = '#FF1040'
  const r = 72
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - displayScore / 100)
  return (
    <div style={{ position: 'relative', width: 184, height: 184 }}>
      <svg width="184" height="184" viewBox="0 0 184 184" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="92" cy="92" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
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
        <span style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--font-display, Outfit), sans-serif' }}>
          {displayScore}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 600, letterSpacing: '0.05em', marginTop: 4 }}>
          /100
        </span>
      </div>
    </div>
  )
}

// ─── CARD DATA SHAPE ──────────────────────────────────────────
// { score, name, personality, caseNo, roast }

// ─── Foil card (dark gold) ─────────────────────────────────────
function FoilCard({ data = {}, cardRef, preview }) {
  const a = '#D4A900'
  const score = data.score ?? 0
  const pos = preview ? {} : { position: 'fixed', top: -9999, left: -9999 }
  return (
    <div ref={cardRef} style={{
      ...pos,
      width: 320, height: 480, borderRadius: 24, padding: 24,
      overflow: 'hidden', fontFamily: 'Geist, system-ui, sans-serif', color: '#fff',
      background: 'linear-gradient(165deg, #1a1305 0%, #0c0801 100%)',
      border: `1.5px solid ${a}88`,
      boxShadow: `0 0 0 1px ${a}44, 0 0 30px ${a}66`,
      boxSizing: 'border-box',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55, backgroundImage: `repeating-linear-gradient(45deg, ${a}22 0 1px, transparent 1px 8px)` }} />
      {[{t:10,l:10,b:'tl'},{t:10,r:10,b:'tr'},{b2:10,l:10,b:'bl'},{b2:10,r:10,b:'br'}].map((p,i)=>(
        <div key={i} style={{
          position:'absolute',width:10,height:10,
          top:p.t,left:p.l,right:p.r,bottom:p.b2,
          borderTop:p.b[0]==='t'?`1.5px solid ${a}`:undefined,
          borderBottom:p.b[0]==='b'?`1.5px solid ${a}`:undefined,
          borderLeft:p.b[1]==='l'?`1.5px solid ${a}`:undefined,
          borderRight:p.b[1]==='r'?`1.5px solid ${a}`:undefined,
        }}/>
      ))}
      <div style={{ position:'relative',height:'100%',display:'flex',flexDirection:'column',boxSizing:'border-box' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div style={{ fontWeight:700,fontSize:13,letterSpacing:'0.2em',color:a }}>VRDIKT ◆</div>
          <span style={{ fontFamily:'Geist Mono,monospace',fontSize:10,color:`${a}cc`,letterSpacing:'0.18em' }}>#{data.caseNo}</span>
        </div>
        <div style={{ flex:1,display:'flex',flexDirection:'column',justifyContent:'center',overflow:'hidden' }}>
          <span style={{ fontFamily:'Geist Mono,monospace',fontSize:9,color:`${a}aa`,letterSpacing:'0.18em',textTransform:'uppercase' }}>PERSONALITY</span>
          <div style={{ fontWeight:800,fontSize:20,lineHeight:1.1,marginTop:6,marginBottom:12,letterSpacing:'-0.015em',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>{data.personality || 'VRDIKT MEMBER'}</div>
          {data.roast && (
            <div style={{ fontFamily:'Georgia,serif',fontStyle:'italic',fontSize:11,lineHeight:1.45,color:'rgba(255,255,255,0.88)',paddingLeft:10,borderLeft:`2px solid ${a}`,marginBottom:16,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' }}>"{data.roast}"</div>
          )}
          <div style={{ display:'flex',alignItems:'baseline',gap:4,lineHeight:0.85 }}>
            <span style={{ fontWeight:900,fontSize:64,color:a,letterSpacing:'-0.05em',textShadow:`0 0 30px ${a}aa` }}>{score}</span>
            <span style={{ fontFamily:'Geist Mono,monospace',fontSize:14,color:`${a}aa` }}>/100</span>
          </div>
          <span style={{ fontFamily:'Geist Mono,monospace',fontSize:9,color:`${a}aa`,letterSpacing:'0.18em',marginTop:6 }}>VRDIKT SCORE</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8,paddingTop:10,borderTop:`1px dashed ${a}55`,flexShrink:0 }}>
          <span style={{ width:5,height:5,background:a,transform:'rotate(45deg)',display:'inline-block' }}/>
          <span style={{ fontFamily:'Geist Mono,monospace',fontSize:9,fontWeight:600,color:'#fff',letterSpacing:'0.16em' }}>CERTIFIED ROASTED</span>
        </div>
      </div>
    </div>
  )
}

// ─── Manifesto card (editorial newspaper) ──────────────────────
function ManifestoCard({ data = {}, cardRef, preview }) {
  const score = data.score ?? 0
  const personality = data.personality || 'VRDIKT MEMBER'
  const words = personality.split(' ')
  const half = Math.ceil(words.length / 2)
  const pos = preview ? {} : { position: 'fixed', top: -9999, left: -9999 }
  return (
    <div ref={cardRef} style={{
      ...pos,
      width:320, height:480, borderRadius:6, overflow:'hidden',
      background:'#F4EDE0', color:'#0a0a0a',
      fontFamily:'Geist,system-ui,sans-serif',
      boxShadow:'0 30px 60px -16px rgba(0,0,0,0.45),inset 0 0 0 1px rgba(10,10,10,0.08)',
      display:'flex', flexDirection:'column', boxSizing:'border-box',
    }}>
      {/* header */}
      <div style={{ padding:'14px 24px 12px', borderBottom:'1.5px solid #0a0a0a', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ fontWeight:800, fontSize:18, letterSpacing:'0.18em' }}>VRDIKT<span style={{ color:'#d4a900' }}>◆</span></div>
        <span style={{ fontFamily:'Geist Mono,monospace', fontSize:9, letterSpacing:'0.18em' }}>CASE #{data.caseNo}</span>
      </div>
      {/* body */}
      <div style={{ flex:1, padding:'14px 24px', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'inline-block', padding:'3px 8px', background:'#FF1040', color:'#fff', fontFamily:'Geist Mono,monospace', fontWeight:700, fontSize:10, letterSpacing:'0.2em', alignSelf:'flex-start', marginBottom:10, flexShrink:0 }}>VERDICT</div>
        <div style={{ fontWeight:900, fontSize:28, lineHeight:0.96, letterSpacing:'-0.04em', color:'#0a0a0a', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', flexShrink:0 }}>
          {words.slice(0,half).join(' ')}<br/>
          <span style={{ color:'#FF1040' }}>{words.slice(half).join(' ').toLowerCase()}.</span>
        </div>
        {data.roast && (
          <div style={{ marginTop:12, fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:11, lineHeight:1.45, color:'#1a1a1a', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', flexShrink:0 }}>"{data.roast}"</div>
        )}
        <div style={{ flex:1 }}/>
      </div>
      {/* score + tier */}
      <div style={{ padding:'10px 24px', borderTop:'1px solid #0a0a0a', display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:'Geist Mono,monospace', fontSize:9, letterSpacing:'0.2em', color:'#666' }}>SCORE</div>
          <div style={{ fontWeight:900, fontSize:48, color:'#0a0a0a', letterSpacing:'-0.05em', lineHeight:0.85, marginTop:2 }}>{score}<span style={{ fontSize:16, color:'#999' }}>/100</span></div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'Geist Mono,monospace', fontSize:9, letterSpacing:'0.2em', color:'#666' }}>TIER</div>
          <div style={{ fontWeight:800, fontSize:11, letterSpacing:'-0.005em', marginTop:4, maxWidth:100, lineHeight:1.15, color:'#0a0a0a' }}>{(data.tier||'ROASTED').toLowerCase()}</div>
        </div>
      </div>
      {/* footer */}
      <div style={{ padding:'8px 24px 12px', borderTop:'1px dashed rgba(10,10,10,0.25)', display:'flex', justifyContent:'space-between', fontFamily:'Geist Mono,monospace', fontSize:9, letterSpacing:'0.18em', color:'#0a0a0a', flexShrink:0 }}>
        <span>{(data.name||'USER').toUpperCase()}</span>
        <span>VRDIKT.APP</span>
      </div>
    </div>
  )
}

// ─── Receipt card (thermal printer) ────────────────────────────
function ReceiptCard({ data = {}, cardRef, preview }) {
  const score = data.score ?? 0
  const pos = preview ? {} : { position: 'fixed', top: -9999, left: -9999 }
  return (
    <div ref={cardRef} style={{
      ...pos,
      width:280, height:520, fontFamily:'Geist Mono,ui-monospace,monospace', color:'#0a0a0a',
      filter:'drop-shadow(0 30px 60px rgba(0,0,0,0.45))',
      boxSizing:'border-box',
    }}>
      <div style={{ background:'#FAFAF6', padding:'20px 20px', boxSizing:'border-box' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'Geist,system-ui,sans-serif', fontWeight:800, fontSize:24, letterSpacing:'0.2em' }}>VRDIKT</div>
          <div style={{ fontSize:9, letterSpacing:'0.2em', marginTop:4 }}>──── PERSONAL FINANCE ROAST ────</div>
          <div style={{ fontSize:9, letterSpacing:'0.16em', marginTop:10, color:'#444' }}>
            CASE NO. {data.caseNo}<br/>
            CLIENT: {(data.name||'USER').toUpperCase()}
          </div>
        </div>
        <div style={{ marginTop:14, height:1, borderTop:'1px dashed #0a0a0a' }}/>
        <div style={{ marginTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', fontSize:12 }}>
            <span style={{ color:'#444', letterSpacing:'0.16em', fontSize:10, flexShrink:0 }}>VERDICT</span>
            <span style={{ flex:1, borderBottom:'1px dotted #aaa', margin:'0 6px' }}/>
            <span style={{ fontWeight:700, flexShrink:0 }}>GUILTY</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', fontSize:12 }}>
            <span style={{ color:'#444', letterSpacing:'0.16em', fontSize:10, flexShrink:0 }}>PERSONALITY</span>
            <span style={{ flex:1, borderBottom:'1px dotted #aaa', margin:'0 6px' }}/>
            <span style={{ fontWeight:700, fontSize:10, flexShrink:0 }}>{(data.personality||'ROASTED').split(' ').slice(-2).join(' ')}</span>
          </div>
        </div>
        <div style={{ marginTop:12, height:1, borderTop:'1px dashed #0a0a0a' }}/>
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:9, letterSpacing:'0.2em', color:'#444' }}>FINAL SCORE</div>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop:4 }}>
            <span style={{ fontFamily:'Geist,system-ui,sans-serif', fontWeight:900, fontSize:60, letterSpacing:'-0.05em', lineHeight:0.85 }}>{score}</span>
            <span style={{ fontSize:13, color:'#666' }}>/100 PTS</span>
          </div>
        </div>
        <div style={{ marginTop:14, height:1, borderTop:'1px dashed #0a0a0a' }}/>
        {data.roast && (
          <div style={{ marginTop:12, fontSize:11, lineHeight:1.5, color:'#1a1a1a', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>"{data.roast}"</div>
        )}
        {/* Stamp — right-aligned so it doesn't sit over the score */}
        <div style={{ marginTop:14, display:'flex', justifyContent:'flex-end' }}>
          <div style={{ transform:'rotate(-8deg)', padding:'5px 12px', border:'2px solid #FF1040', borderRadius:4, color:'#FF1040', fontFamily:'Geist,system-ui,sans-serif', fontWeight:800, fontSize:13, letterSpacing:'0.18em' }}>CERTIFIED ROASTED</div>
        </div>
        <div style={{ marginTop:14, display:'flex', justifyContent:'center', alignItems:'center', gap:1 }}>
          {Array.from({length:38}).map((_,i)=>{
            const w=[1,1,2,3,1,2,1,3][i%8]
            return <div key={i} style={{ width:w, height:28, background:'#0a0a0a' }}/>
          })}
        </div>
        <div style={{ marginTop:4, textAlign:'center', fontSize:9, letterSpacing:'0.2em', color:'#444' }}>VRDIKT.APP/B{data.caseNo}</div>
        <div style={{ marginTop:12, textAlign:'center', fontSize:9, letterSpacing:'0.18em' }}>★ THANK YOU FOR YOUR PARTICIPATION ★</div>
      </div>
    </div>
  )
}

// ─── Sticker card (orange bold pop) ────────────────────────────
function StickerCard({ data = {}, cardRef, preview }) {
  const score = data.score ?? 0
  const pos = preview ? {} : { position: 'fixed', top: -9999, left: -9999 }
  return (
    <div ref={cardRef} style={{
      ...pos,
      width:320, height:480, borderRadius:24, overflow:'hidden',
      background:'#FF5500', fontFamily:'Geist,system-ui,sans-serif', color:'#0a0a0a',
      boxShadow:'0 30px 60px -16px rgba(255,85,0,0.55)',
      boxSizing:'border-box',
    }}>
      <div style={{ position:'absolute', inset:0, opacity:0.18, backgroundImage:`radial-gradient(rgba(0,0,0,0.5) 1.2px, transparent 1.5px)`, backgroundSize:'8px 8px' }}/>
      {/* Yellow circle BEHIND the score — intentional design */}
      <div style={{ position:'absolute', top:-120, right:-120, width:320, height:320, borderRadius:'50%', background:'#FFD000', boxShadow:'0 0 0 8px rgba(0,0,0,0.06)' }}/>
      {/* VERDICT stripe */}
      <div style={{ position:'absolute', top:220, left:-40, right:-40, height:56, background:'#0a0a0a', transform:'rotate(-4deg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ display:'flex', gap:18, fontFamily:'Geist Mono,monospace', color:'#FFD000', fontSize:11, fontWeight:700, letterSpacing:'0.2em' }}>
          <span>★ VERDICT ★</span><span>★ VERDICT ★</span><span>★ VERDICT ★</span>
        </div>
      </div>
      <div style={{ position:'relative', padding:24, height:'100%', display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontWeight:800, fontSize:18, letterSpacing:'0.2em' }}>VRDIKT</div>
          <div style={{ padding:'3px 8px', border:'1.5px solid #0a0a0a', borderRadius:4, fontSize:10, fontWeight:700, letterSpacing:'0.16em' }}>#{data.caseNo}</div>
        </div>
        {/* Score — capped at 96px so it stays within bounds */}
        <div style={{ marginTop:24, position:'relative', flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:96, color:'#0a0a0a', letterSpacing:'-0.07em', lineHeight:0.85, position:'relative', zIndex:1 }}>{score}</div>
          <div style={{ position:'absolute', top:6, left:6, zIndex:0, fontWeight:900, fontSize:96, letterSpacing:'-0.07em', lineHeight:0.85, color:'#FF1040' }}>{score}</div>
        </div>
        <div style={{ marginTop:6, fontWeight:700, fontSize:14, letterSpacing:'0.18em', flexShrink:0 }}>OUT OF 100.</div>
        <div style={{ flex:1 }}/>
        {/* Personality section — own dark block, clear of orange area */}
        <div style={{ padding:16, borderRadius:16, background:'#0a0a0a', color:'#FFD000', flexShrink:0 }}>
          <div style={{ fontFamily:'Geist Mono,monospace', fontSize:9, letterSpacing:'0.2em', opacity:0.7 }}>YOU ARE</div>
          <div style={{ fontWeight:800, fontSize:16, lineHeight:1.1, marginTop:4, letterSpacing:'-0.005em', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{data.personality||'FINANCIALLY ROASTED'}</div>
        </div>
        {/* GUILTY stamp — floats in upper-right of score area */}
        <div style={{ position:'absolute', top:92, right:20, transform:'rotate(12deg)', padding:'6px 12px', border:'2px solid #0a0a0a', borderRadius:4, background:'#FFD000', fontWeight:800, fontSize:11, letterSpacing:'0.16em', boxShadow:'3px 3px 0 #0a0a0a', zIndex:2 }}>GUILTY</div>
      </div>
    </div>
  )
}

// ─── QuoteCard (used in verdict view) ─────────────────────────
function QuoteCard({ n, text, visible }) {
  return (
    <div style={{
      position: 'relative', padding: '20px 20px 18px 52px',
      borderRadius: 16, background: '#141414',
      marginBottom: 12, overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease',
    }}>
      <div style={{
        position: 'absolute', left: 14, top: 2,
        fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 52,
        color: '#FF1040', lineHeight: 1.2,
        userSelect: 'none', pointerEvents: 'none',
      }}>"</div>
      <div style={{
        fontFamily: '"DM Sans", Outfit, sans-serif', fontWeight: 400,
        fontSize: 16, lineHeight: 1.55, color: '#F0F0F0',
      }}>{text}</div>
    </div>
  )
}

// ─── Scaled-down card thumbnail for the picker ─────────────────
function CardPreview({ id, data, isSelected, accent, onSelect }) {
  const CARD_W = id === 'receipt' ? 280 : 320
  const CARD_H = id === 'receipt' ? 520 : 480
  const THUMB_W = isSelected ? 200 : 140
  const scale = THUMB_W / CARD_W
  const THUMB_H = Math.round(CARD_H * scale)
  return (
    <div
      onClick={onSelect}
      style={{
        flexShrink: 0, scrollSnapAlign: 'center',
        width: THUMB_W, height: THUMB_H,
        borderRadius: id === 'receipt' ? 4 : 18,
        overflow: 'hidden', position: 'relative',
        border: isSelected ? `1.5px solid ${accent}88` : '1.5px solid rgba(255,255,255,0.08)',
        boxShadow: isSelected
          ? `0 0 0 1px ${accent}33, 0 20px 40px -8px ${accent}77, 0 32px 64px rgba(0,0,0,0.5)`
          : '0 16px 32px rgba(0,0,0,0.4)',
        opacity: isSelected ? 1 : 0.5,
        cursor: 'pointer',
        transition: 'all 350ms cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CARD_W, height: CARD_H, pointerEvents: 'none' }}>
        {id === 'foil'      && <FoilCard      data={data} preview />}
        {id === 'manifesto' && <ManifestoCard data={data} preview />}
        {id === 'receipt'   && <ReceiptCard   data={data} preview />}
        {id === 'sticker'   && <StickerCard   data={data} preview />}
      </div>
      {isSelected && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 22, height: 22, borderRadius: '50%',
          background: accent, color: '#0a0a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 2px #0A0A0A, 0 4px 10px ${accent}88`,
          zIndex: 10,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 10-12"/>
          </svg>
        </div>
      )}
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

  // ── new picker state ─────────────────────────────────────────────────────────
  const [showPicker,    setShowPicker]    = useState(false)
  const [selectedCard,  setSelectedCard]  = useState('foil')
  const pickerScrollRef = useRef(null)
  const foilRef         = useRef(null)
  const manifestoRef    = useRef(null)
  const receiptRef      = useRef(null)
  const stickerRef      = useRef(null)

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
    const refMap = { foil: foilRef, manifesto: manifestoRef, receipt: receiptRef, sticker: stickerRef }
    const ref = refMap[selectedCard]
    if (!ref?.current) return
    setSharing(true)
    const bgColors = { foil: '#0A0A0A', manifesto: '#F4EDE0', receipt: '#FAFAF6', sticker: '#FF5500' }
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: bgColors[selectedCard],
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
              } catch { /* fall through */ }
            }
            downloadCanvas(canvas)
            resolve()
          })
        })
      } else {
        downloadCanvas(canvas)
      }
    } catch {
      // nothing
    }
    setSharing(false)
  }

  function downloadCanvas(canvas) {
    const a = document.createElement('a')
    a.download = 'vrdikt-verdict.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  const scoreColor = '#FF1040'

  const fade = (visible, extra = {}) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.7s ease, transform 0.7s ease',
    ...extra,
  })

  // ── card data for share cards ────────────────────────────────────────────────
  const cardData = {
    score,
    name: user?.email?.split('@')[0] || 'User',
    tier: 'DIGITAL COUCH POTATO',
    personality: personalityType || 'VRDIKT MEMBER',
    caseNo: caseNoRef.current,
    roast: roastLines[0] || '',
  }

  const CARD_VARIANTS = [
    { id: 'foil',      label: 'The Foil',      sub: 'Dark · gold leaf',    accent: '#D4A900' },
    { id: 'manifesto', label: 'The Manifesto', sub: 'Editorial · cream',   accent: '#FF1040' },
    { id: 'receipt',   label: 'The Receipt',   sub: 'Thermal · monospace', accent: '#0A0A0A' },
    { id: 'sticker',   label: 'The Sticker',   sub: 'Pop · halftone',      accent: '#FF5500' },
  ]
  const selectedAccent = CARD_VARIANTS.find(v => v.id === selectedCard)?.accent || '#D4A900'

  return (
    <>
      {/* ── Off-screen capture targets for html2canvas ── */}
      <FoilCard data={cardData} cardRef={foilRef} />
      <ManifestoCard data={cardData} cardRef={manifestoRef} />
      <ReceiptCard data={cardData} cardRef={receiptRef} />
      <StickerCard data={cardData} cardRef={stickerRef} />

      {showPicker ? (

        /* ══════════════════════════════════════════════════════
           STATE 4: SHARE — card picker
           ══════════════════════════════════════════════════════ */
        <div style={{
          minHeight: '100svh', background: '#0A0A0A',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Outfit, sans-serif', color: '#F0F0F0',
          position: 'relative', overflowX: 'hidden',
        }}>
          {/* Ambient glow shifts with selection */}
          <div style={{
            position: 'fixed', left: '50%', top: '40%',
            width: 500, height: 500,
            transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0,
            background: `radial-gradient(circle, ${selectedAccent}28 0%, transparent 65%)`,
            transition: 'background 400ms ease',
          }} />

          {/* Back button */}
          <div style={{
            position: 'relative', zIndex: 2,
            paddingTop: 'max(56px, env(safe-area-inset-top))',
            paddingLeft: 20, paddingRight: 20, paddingBottom: 8,
          }}>
            <button
              onClick={() => setShowPicker(false)}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                color: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M11 18l-6-6 6-6"/>
              </svg>
            </button>
          </div>

          {/* Headline */}
          <div style={{
            position: 'relative', zIndex: 2,
            textAlign: 'center', padding: '0 32px 16px',
          }}>
            <div style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 28,
              letterSpacing: '-0.025em', lineHeight: 1.15, color: '#F0F0F0',
            }}>
              Which one tells your story?
            </div>
            <div style={{ marginTop: 8, fontSize: 15, color: 'rgba(240,240,240,0.42)', lineHeight: 1.4 }}>
              Four ways to broadcast your verdict.
            </div>
          </div>

          {/* Horizontal card scroll — actual scaled card designs */}
          <div
            ref={pickerScrollRef}
            style={{
              position: 'relative', zIndex: 2,
              display: 'flex', alignItems: 'center',
              gap: 16, paddingLeft: '8%', paddingRight: '8%',
              paddingTop: 16, paddingBottom: 20,
              overflowX: 'auto', overflowY: 'visible',
              scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
            }}
          >
            {CARD_VARIANTS.map((v) => (
              <CardPreview
                key={v.id}
                id={v.id}
                data={cardData}
                isSelected={selectedCard === v.id}
                accent={v.accent}
                onSelect={() => setSelectedCard(v.id)}
              />
            ))}
          </div>

          {/* Dot indicator + card label */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {CARD_VARIANTS.map((v) => (
                <button key={v.id} onClick={() => setSelectedCard(v.id)} style={{
                  width: selectedCard === v.id ? 20 : 6, height: 6, borderRadius: 99,
                  background: selectedCard === v.id ? v.accent : 'rgba(255,255,255,0.2)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'all 280ms cubic-bezier(.2,.8,.2,1)',
                }} />
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, fontWeight: 500, letterSpacing: '0.22em', color: selectedAccent, textTransform: 'uppercase' }}>
                {CARD_VARIANTS.find(v => v.id === selectedCard)?.sub}
              </div>
              <div style={{ marginTop: 4, fontWeight: 700, fontSize: 18, color: '#F0F0F0', letterSpacing: '-0.02em' }}>
                {CARD_VARIANTS.find(v => v.id === selectedCard)?.label}
              </div>
            </div>
          </div>

          {/* Bottom buttons */}
          <div style={{
            position: 'sticky', bottom: 0, zIndex: 3, marginTop: 'auto',
            padding: '16px 20px max(28px, env(safe-area-inset-bottom))',
            background: 'linear-gradient(to top, rgba(10,10,10,1) 60%, transparent 100%)',
          }}>
            <button
              onClick={handleShare}
              disabled={sharing}
              style={{
                width: '100%', height: 56, borderRadius: 16, border: 'none',
                background: sharing ? '#1A1A1A' : 'linear-gradient(135deg, #FF5500, #FF1040)',
                color: sharing ? 'rgba(255,255,255,0.3)' : '#fff',
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: sharing ? 'default' : 'pointer',
                boxShadow: sharing ? 'none' : '0 8px 32px -8px rgba(255,85,0,0.55)',
                transition: 'all 300ms ease',
              }}
            >
              {sharing ? 'GENERATING…' : 'SHARE THIS CARD →'}
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              style={{
                width: '100%', height: 50, borderRadius: 14, marginTop: 10,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(240,240,240,0.5)', fontFamily: 'Outfit, sans-serif',
                fontWeight: 500, fontSize: 15, cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#F0F0F0' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(240,240,240,0.5)' }}
            >
              Save to camera roll
            </button>
          </div>
        </div>

      ) : (

        /* ══════════════════════════════════════════════════════
           STATE 3: VERDICT
           ══════════════════════════════════════════════════════ */
        <div style={{
          minHeight: '100svh', background: '#0A0A0A',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Outfit, sans-serif', color: '#F0F0F0',
          position: 'relative', overflowX: 'hidden',
        }}>
          {/* Red ambient glow — top-center */}
          <div style={{
            position: 'fixed', left: '50%', top: 0,
            width: 640, height: 440,
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse at 50% -10%, rgba(255,16,64,0.22) 0%, transparent 65%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Top nav */}
          <div style={{
            position: 'relative', zIndex: 2,
            paddingTop: 'max(56px, env(safe-area-inset-top))',
            paddingLeft: 20, paddingRight: 20, paddingBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'transparent', border: 'none', padding: 0,
                color: 'rgba(240,240,240,0.4)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M11 18l-6-6 6-6"/>
              </svg>
            </button>
            <div style={{ width: 20 }} />
          </div>

          {/* Scrollable content */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '0 20px 140px',
            position: 'relative', zIndex: 1,
          }}>

            {/* THE VERDICT / IS IN. */}
            <div style={{ marginBottom: 24, ...fade(showVerdict) }}>
              <div style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                fontSize: 'clamp(48px, 14vw, 64px)',
                color: '#F0F0F0', lineHeight: 0.95, letterSpacing: '-0.04em',
              }}>THE VERDICT</div>
              <div style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                fontSize: 'clamp(48px, 14vw, 64px)',
                color: '#FF1040', lineHeight: 0.95, letterSpacing: '-0.04em',
                marginTop: 4,
              }}>IS IN.</div>
            </div>

            {/* Score */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 6,
              marginBottom: 20, ...fade(scoreStarted),
            }}>
              <span style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontStyle: 'italic',
                fontSize: 96, color: '#FF1040', letterSpacing: '-0.05em', lineHeight: 1,
              }}>{displayScore}</span>
              <span style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 400, fontSize: 36,
                color: 'rgba(240,240,240,0.35)', letterSpacing: '-0.02em',
              }}>/100</span>
            </div>

            {/* Personality type */}
            {personalityType && (
              <div style={{
                marginBottom: 32,
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 13,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F0F0F0',
                ...fade(showPersonality),
              }}>
                {personalityType}
              </div>
            )}

            {/* Roast lines */}
            {roastLines.map((line, i) => (
              <QuoteCard
                key={i}
                n={i}
                text={lineTexts[i]}
                visible={lineTexts[i].length > 0}
              />
            ))}

            {/* Savage insight */}
            {savageInsight && (
              <div style={{
                background: '#141414', borderRadius: 16, padding: '18px 20px',
                marginTop: 8, ...fade(showInsight),
              }}>
                <p style={{
                  fontFamily: 'Geist Mono, monospace', fontSize: 9, fontWeight: 500,
                  letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)',
                  textTransform: 'uppercase', margin: '0 0 8px',
                }}>SAVAGE INSIGHT</p>
                <p style={{
                  color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0,
                  lineHeight: 1.6, fontStyle: 'italic',
                }}>
                  "{savageInsight}"
                </p>
              </div>
            )}

            {/* Roast again link */}
            <div style={{ marginTop: 24, ...fade(showActions) }}>
              <button
                onClick={() => navigate('/upload')}
                style={{
                  width: '100%', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px 24px',
                  color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF5500'; e.currentTarget.style.color = '#FF5500' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
              >
                Get Roasted Again →
              </button>
            </div>
          </div>

          {/* Sticky CTA: Pick your card */}
          <div style={{
            position: 'sticky', bottom: 0, zIndex: 3,
            padding: '12px 20px max(24px, env(safe-area-inset-bottom))',
            background: 'linear-gradient(to top, rgba(10,10,10,1) 55%, transparent 100%)',
            ...fade(showActions),
          }}>
            <button
              onClick={() => setShowPicker(true)}
              style={{
                width: '100%', height: 56, borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #FF5500, #FF1040)',
                color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16,
                textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
                boxShadow: '0 8px 32px -8px rgba(255,85,0,0.55)',
              }}
            >
              PICK YOUR CARD →
            </button>
          </div>

          {/* XP Toast */}
          <div style={{
            position: 'fixed', bottom: 90, left: '50%',
            transform: xpToast ? 'translate(-50%, 0)' : 'translate(-50%, 24px)',
            opacity: xpToast ? 1 : 0,
            transition: 'opacity 0.45s ease, transform 0.45s ease',
            pointerEvents: 'none', zIndex: 99,
            background: '#F5C518', borderRadius: 40, padding: '12px 22px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 32px rgba(245,197,24,0.35)', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{ color: '#0A0A0A', fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>+10 XP earned</span>
            {xpData && (
              <>
                <span style={{ color: 'rgba(10,10,10,0.35)', fontSize: 13 }}>·</span>
                <span style={{ color: '#0A0A0A', fontSize: 13, fontWeight: 600 }}>Total: {xpData.xp} XP</span>
                <span style={{ color: 'rgba(10,10,10,0.35)', fontSize: 13 }}>·</span>
                <span style={{ color: '#0A0A0A', fontSize: 13, fontWeight: 600 }}>{xpData.levelName}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
