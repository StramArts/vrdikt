import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { id: 'bug',     label: '🐛 Bug Report' },
  { id: 'feature', label: '💡 Feature Idea' },
  { id: 'general', label: '💬 General Feedback' },
]

export default function FeedbackButton() {
  const location = useLocation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (location.pathname === '/') return null

  function openModal() {
    setCategory('general')
    setMessage('')
    setEmail(user?.email ?? '')
    setDone(false)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
  }

  async function handleSubmit() {
    if (!message.trim() || submitting) return
    setSubmitting(true)
    await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      category,
      message: message.trim(),
      email: email.trim() || null,
      page_url: location.pathname,
    })
    setSubmitting(false)
    setDone(true)
    setTimeout(() => {
      setOpen(false)
      setDone(false)
    }, 2200)
  }

  return (
    <>
      <button
        onClick={openModal}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          background: 'rgba(10,10,10,0.88)',
          border: '1px solid #C9A227',
          borderRadius: '999px',
          padding: '10px 18px',
          color: '#C9A227',
          fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5C518'; e.currentTarget.style.color = '#F5C518' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#C9A227'; e.currentTarget.style.color = '#C9A227' }}
      >
        💬 Feedback
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            background: '#0F0F0F', border: '1px solid #1E1E1E',
            borderRadius: '20px', padding: '28px',
            width: '100%', maxWidth: '440px',
            display: 'flex', flexDirection: 'column', gap: '20px',
            fontFamily: 'Inter, sans-serif',
          }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: '36px', marginBottom: '14px' }}>🫡</div>
                <p style={{ color: '#F0F0F0', fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  Received. We're on it.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ color: '#F0F0F0', fontSize: '16px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                    Send Feedback
                  </h3>
                  <button
                    onClick={closeModal}
                    style={{
                      background: 'transparent', border: 'none',
                      color: '#444', fontSize: '22px', cursor: 'pointer',
                      lineHeight: 1, padding: '0 2px',
                    }}
                  >×</button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      style={{
                        background: category === cat.id ? 'rgba(245,197,24,0.1)' : 'transparent',
                        border: `1px solid ${category === cat.id ? '#F5C518' : '#1E1E1E'}`,
                        borderRadius: '999px', padding: '7px 14px',
                        color: category === cat.id ? '#F5C518' : '#555',
                        fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  rows={5}
                  style={{
                    background: '#0A0A0A', border: '1px solid #1E1E1E',
                    borderRadius: '12px', padding: '14px',
                    color: '#F0F0F0', fontSize: '14px',
                    fontFamily: 'Inter, sans-serif', resize: 'vertical',
                    outline: 'none', lineHeight: 1.6,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#333' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1E1E1E' }}
                />

                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  style={{
                    background: '#0A0A0A', border: '1px solid #1E1E1E',
                    borderRadius: '10px', padding: '11px 14px',
                    color: '#F0F0F0', fontSize: '13px',
                    fontFamily: 'Inter, sans-serif', outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#333' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1E1E1E' }}
                />

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !message.trim()}
                  style={{
                    background: message.trim() ? '#F5C518' : '#141414',
                    border: 'none', borderRadius: '12px', padding: '13px',
                    color: message.trim() ? '#0A0A0A' : '#2A2A2A',
                    fontSize: '14px', fontWeight: 800,
                    cursor: message.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (message.trim()) e.currentTarget.style.opacity = '0.88' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  {submitting ? 'Sending…' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
