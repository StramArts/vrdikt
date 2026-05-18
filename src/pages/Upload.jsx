import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateRoast, parseRoast } from '../lib/anthropic'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const LOADING_MSGS = [
  'Analysing your poor decisions...',
  'Counting your Zomato orders...',
  'Calculating your regrets...',
  'Consulting the financial judges...',
  'Preparing your verdict...',
]

const PLACEHOLDER = `Paste your UPI history, bank statement, or list your expenses here... we won't judge. Actually we will.

Example:
15 Apr  Zomato          ₹450
14 Apr  Swiggy          ₹380
14 Apr  Amazon          ₹2,499
13 Apr  Blinkit         ₹890
12 Apr  Netflix         ₹649
12 Apr  Spotify         ₹119

Any format works — the AI will figure it out.`

function formatAutoTxns(transactions) {
  const byCategory = {}
  for (const tx of transactions) {
    if (tx.type !== 'debit') continue
    const cat = tx.category ?? 'Other'
    if (!byCategory[cat]) byCategory[cat] = {}
    const m = tx.merchant ?? 'Unknown'
    byCategory[cat][m] = (byCategory[cat][m] ?? 0) + tx.amount
  }
  const sorted = Object.entries(byCategory).sort(
    (a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)
  )
  const lines = ['[Auto-tracked from Gmail — last 30 days]', '']
  for (const [cat, merchants] of sorted) {
    const total = Object.values(merchants).reduce((s, v) => s + v, 0)
    lines.push(`${cat}: ₹${total.toLocaleString('en-IN')}`)
    for (const [m, amt] of Object.entries(merchants).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${m}: ₹${amt.toLocaleString('en-IN')}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

export default function Upload() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileRef = useRef(null)

  const [tab, setTab] = useState('paste')
  const [text, setText] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [error, setError] = useState('')
  const [autoTxData, setAutoTxData] = useState(null) // null=loading, false=none, {count,text}=found

  useEffect(() => {
    if (!user) return
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('auto_transactions')
      .select('merchant, category, amount, type')
      .eq('user_id', user.id)
      .gte('date', since)
      .then(({ data }) => {
        if (!data?.length) { setAutoTxData(false); return }
        const formatted = formatAutoTxns(data)
        setAutoTxData({ count: data.length, text: formatted })
        setText(prev => prev === '' ? formatted : prev)
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading) return
    const interval = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MSGS.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [isLoading])

  const handleDragOver = useCallback(e => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(e => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      setError('')
    } else {
      setError('Please drop a PDF file.')
    }
  }, [])

  async function handleSubmit() {
    setError('')
    let transactionText = ''

    if (tab === 'paste') {
      if (!text.trim()) {
        setError('Paste your transactions first.')
        return
      }
      transactionText = text.trim()
    } else {
      if (!pdfFile) {
        setError('Drop a PDF file first.')
        return
      }
      try {
        transactionText = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => resolve(e.target.result)
          reader.onerror = () => reject(new Error('Could not read the PDF. Try pasting the text instead.'))
          reader.readAsText(pdfFile)
        })
        if (!transactionText.trim() || transactionText.trim().length < 30) {
          setError('Could not extract text from this PDF. Please paste your transactions in the text tab instead.')
          return
        }
      } catch (err) {
        setError(err.message)
        return
      }
    }

    setIsLoading(true)
    setLoadingMsgIdx(0)

    try {
      let roastHistory = []
      if (user) {
        const { data: history } = await supabase
          .from('roasts')
          .select('roast_lines, personality_type, score, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)
        roastHistory = history ?? []
      }
      const rawRoast = await generateRoast(transactionText, roastHistory)
      const { roastLines, personalityType, score, savageInsight } = parseRoast(rawRoast)

      if (user) {
        supabase.from('roasts').insert({
          user_id:          user.id,
          roast_text:       rawRoast,
          spending_data:    { raw: transactionText.slice(0, 2000) },
          personality_type: personalityType,
          score,
          roast_lines:      roastLines,
          savage_insight:   savageInsight,
        }).then(({ error: dbErr }) => {
          if (dbErr) console.warn('[VRDIKT] Failed to save roast:', dbErr.message)
        })
      }

      navigate('/roast', { state: { roastLines, personalityType, score, savageInsight } })
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* ── ANALYZING STATE ── */}
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#0A0A0A',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Red ambient glow */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 480, height: 480,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,16,64,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 24,
              textTransform: 'uppercase', letterSpacing: '0.12em', color: '#F0F0F0',
            }}>
              TAMAS IS ANALYZING
            </span>
            <span style={{
              fontFamily: 'Outfit, monospace', fontWeight: 700, fontSize: 24,
              color: '#F0F0F0', animation: 'blink 1s step-end infinite',
            }}>_</span>
          </div>
        </div>
      )}

      {/* ── INPUT STATE ── */}
      <div style={{
        minHeight: '100svh', background: '#0A0A0A',
        fontFamily: 'Outfit, sans-serif', color: '#F0F0F0',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingLeft: 24, paddingRight: 24, paddingBottom: 16,
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              color: 'rgba(240,240,240,0.45)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6"/>
            </svg>
          </button>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.04em' }}>
            <span style={{ color: '#F0F0F0' }}>VRD</span>
            <span style={{ color: '#F5C518' }}>IKT</span>
          </span>
          <div style={{ width: 20 }} />
        </div>

        {/* Content */}
        <div style={{
          flex: 1, padding: '24px 24px 40px',
          maxWidth: 600, margin: '0 auto', width: '100%',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        }}>
          {/* Headline */}
          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
            fontSize: 'clamp(32px, 9vw, 48px)',
            color: '#F0F0F0', margin: '0 0 8px',
            letterSpacing: '-0.03em', lineHeight: 1.08,
          }}>
            Paste your expenses.
          </h1>
          <p style={{
            color: 'rgba(240,240,240,0.38)', fontSize: 16,
            margin: '0 0 24px', fontWeight: 400,
          }}>
            Tamas is watching.
          </p>

          {/* Auto-tracked banner */}
          {autoTxData && (
            <div style={{
              background: 'rgba(255,85,0,0.06)', border: '1px solid rgba(255,85,0,0.18)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <p style={{ color: '#FF5500', fontSize: 12, fontWeight: 600, margin: 0 }}>
                ⚡ {autoTxData.count} auto-tracked transactions loaded into your roast.
              </p>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            placeholder={PLACEHOLDER}
            style={{
              flex: 1, minHeight: 200, width: '100%',
              background: '#141414', border: 'none',
              borderLeft: '2px solid #FF5500',
              borderRadius: '0 8px 8px 0',
              color: '#F0F0F0', fontSize: 13,
              fontFamily: '"Geist Mono", "Courier New", monospace',
              lineHeight: 1.7, resize: 'vertical', outline: 'none',
              padding: 16, boxSizing: 'border-box',
            }}
          />

          {/* Error */}
          {error && (
            <p style={{
              color: '#FF1040', fontSize: 13, margin: '10px 0 0',
              fontFamily: 'Outfit, sans-serif',
            }}>
              {error}
            </p>
          )}

          {/* Hidden PDF input (kept for legacy logic) */}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) { setPdfFile(e.target.files[0]); setError('') } }}
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              width: '100%', height: 56, marginTop: 20,
              background: isLoading ? '#1A1A1A' : 'linear-gradient(135deg, #FF5500, #FF1040)',
              border: 'none', borderRadius: 16,
              color: isLoading ? 'rgba(255,255,255,0.3)' : '#fff',
              fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              cursor: isLoading ? 'default' : 'pointer',
              transition: 'opacity 0.15s',
              boxShadow: isLoading ? 'none' : '0 8px 32px -8px rgba(255,85,0,0.5)',
            }}
          >
            GET ROASTED →
          </button>
        </div>
      </div>
    </>
  )
}
