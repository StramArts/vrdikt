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
      const rawRoast = await generateRoast(transactionText)
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
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(10,10,10,0.97)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '24px',
        }}>
          <div style={{
            width: '48px', height: '48px',
            border: '3px solid #1A1A1A',
            borderTopColor: '#F5C518',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{
            color: '#F5C518', fontSize: '16px', fontWeight: 500,
            fontFamily: 'Inter, sans-serif', margin: 0,
          }}>
            {LOADING_MSGS[loadingMsgIdx]}
          </p>
          <p style={{
            color: '#333', fontSize: '13px',
            fontFamily: 'Inter, sans-serif', margin: 0,
          }}>
            This usually takes 5–10 seconds
          </p>
        </div>
      )}

      <div style={{
        minHeight: '100svh', background: '#0A0A0A',
        fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Nav */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #111111',
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent', border: 'none',
              color: '#6B6B6B', fontSize: '13px', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', padding: 0,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#F0F0F0'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B6B6B'}
          >
            ← Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              cursor: 'pointer', fontSize: '18px', fontWeight: 900,
              letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
          </button>
          <div style={{ width: '80px' }} />
        </nav>

        {/* Main */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '48px 24px 64px',
        }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fade-in 0.6s ease forwards' }}>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900,
              letterSpacing: '-0.04em', margin: '0 0 12px', lineHeight: 1.1,
            }}>
              Face the music 🔥
            </h1>
            <p style={{ color: '#6B6B6B', fontSize: '16px', margin: 0 }}>
              Paste your bank statement and get brutally roasted by AI
            </p>
          </div>

          {/* Card */}
          <div style={{
            width: '100%', maxWidth: '600px',
            background: '#111111', border: '1px solid #1A1A1A',
            borderRadius: '20px', overflow: 'hidden',
            animation: 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1A1A1A' }}>
              {[
                { id: 'paste', label: '📋 Paste Transactions' },
                { id: 'pdf',   label: '📄 Upload PDF' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); setError('') }}
                  style={{
                    flex: 1, padding: '16px 12px',
                    background: 'transparent', border: 'none',
                    borderBottom: tab === id ? '2px solid #F5C518' : '2px solid transparent',
                    color: tab === id ? '#F5C518' : '#6B6B6B',
                    fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'color 0.2s, border-color 0.2s',
                    marginBottom: '-1px',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px' }}>
              {/* Auto-tracked banner */}
              {tab === 'paste' && autoTxData && (
                <div style={{
                  background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.2)',
                  borderRadius: '10px', padding: '10px 14px', marginBottom: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ fontSize: '13px' }}>✅</span>
                  <p style={{ color: '#30D158', fontSize: '12px', fontWeight: 600, margin: 0 }}>
                    We found {autoTxData.count} auto-tracked transactions. Your roast will use this data + anything you add below.
                  </p>
                </div>
              )}

              {/* Paste tab */}
              {tab === 'paste' && (
                <textarea
                  value={text}
                  onChange={e => { setText(e.target.value); setError('') }}
                  placeholder={PLACEHOLDER}
                  style={{
                    width: '100%', minHeight: '260px',
                    background: '#0A0A0A',
                    border: '1px solid #1A1A1A',
                    borderRadius: '12px', padding: '16px',
                    color: '#F0F0F0', fontSize: '13px',
                    fontFamily: 'Monaco, "Courier New", monospace',
                    lineHeight: 1.7, resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#F5C518'}
                  onBlur={e => e.target.style.borderColor = '#1A1A1A'}
                />
              )}

              {/* PDF tab */}
              {tab === 'pdf' && (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    minHeight: '220px', borderRadius: '12px',
                    border: `2px dashed ${isDragging ? '#F5C518' : pdfFile ? 'rgba(245,197,24,0.4)' : '#2A2A2A'}`,
                    background: isDragging ? 'rgba(245,197,24,0.03)' : 'transparent',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '12px', cursor: 'pointer', padding: '40px 24px',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) { setPdfFile(e.target.files[0]); setError('') } }}
                  />
                  {pdfFile ? (
                    <>
                      <span style={{ fontSize: '36px' }}>📄</span>
                      <p style={{ color: '#F5C518', fontWeight: 600, margin: 0, textAlign: 'center', fontSize: '14px' }}>
                        {pdfFile.name}
                      </p>
                      <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>Click to change file</p>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '40px' }}>📂</span>
                      <p style={{ color: '#6B6B6B', fontWeight: 500, margin: 0, textAlign: 'center', fontSize: '15px' }}>
                        Drop your bank statement PDF here
                      </p>
                      <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>or click to browse</p>
                    </>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <p style={{
                  color: '#FF3B30', fontSize: '13px', margin: '12px 0 0',
                  animation: 'slide-down 0.2s ease',
                }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  width: '100%', marginTop: '20px',
                  background: '#F5C518', border: 'none',
                  borderRadius: '12px', padding: '16px 24px',
                  color: '#0A0A0A', fontSize: '16px', fontWeight: 800,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em',
                  opacity: isLoading ? 0.5 : 1,
                  transition: 'opacity 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => { if (!isLoading) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { if (!isLoading) e.currentTarget.style.opacity = '1' }}
                onMouseDown={e => { if (!isLoading) e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                Get Roasted 🔥
              </button>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{
            display: 'flex', gap: '28px', marginTop: '28px',
            flexWrap: 'wrap', justifyContent: 'center',
            animation: 'fade-in 0.6s ease 0.4s both',
          }}>
            {[
              { icon: '🔒', label: 'Private & Secure' },
              { icon: '🔥', label: 'Brutally Honest' },
              { icon: '⚡', label: 'AI-Powered' },
            ].map(({ icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: '#3A3A3A', fontSize: '12px', fontWeight: 500,
              }}>
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
