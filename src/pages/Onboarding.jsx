import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const INCOME_OPTIONS = [
  { label: 'Under ₹25,000',       value: 'under_25k' },
  { label: '₹25,000 – ₹50,000',   value: '25k_50k' },
  { label: '₹50,000 – ₹1,00,000', value: '50k_1l' },
  { label: 'Above ₹1,00,000',      value: 'above_1l' },
]

const SIN_OPTIONS = [
  { label: 'Food Delivery',              icon: '🍕', value: 'food_delivery' },
  { label: 'Online Shopping',            icon: '🛒', value: 'online_shopping' },
  { label: 'Subscriptions',              icon: '📱', value: 'subscriptions' },
  { label: 'Going Out',                  icon: '🍻', value: 'going_out' },
  { label: 'Impulse Buys',               icon: '⚡', value: 'impulse_buys' },
  { label: 'Investing in crypto and crying', icon: '📉', value: 'crypto' },
]

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]           = useState(0)
  const [animKey, setAnimKey]     = useState(0)
  const [income, setIncome]       = useState('')
  const [sins, setSins]           = useState([])        // multi-select array
  const [savingGoal, setSavingGoal] = useState('')
  const [saving, setSaving]       = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    if (profile?.onboarding_complete) navigate('/dashboard', { replace: true })
  }, [profile, navigate])

  function goNext() {
    setStep(s => s + 1)
    setAnimKey(k => k + 1)
  }

  function toggleSin(value) {
    setSins(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const canNext = [
    income !== '',
    sins.length > 0,
    savingGoal.trim() !== '',
  ][step]

  async function handleFinish() {
    if (!canNext || saving) return
    setSaving(true)
    setTransitioning(true)

    supabase
      .from('profiles')
      .update({
        income_range:        income,
        spending_weakness:   sins,
        savings_goal:        savingGoal.trim(),
        onboarding_complete: true,
      })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) console.error('[VRDIKT] Onboarding save failed:', error.message)
      })

    setTimeout(async () => {
      await refreshProfile()
      navigate('/dashboard', { replace: true })
    }, 1600)
  }

  if (transitioning) {
    return (
      <div style={{
        minHeight: '100svh', background: '#0A0A0A',
        fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '28px',
        padding: '24px', textAlign: 'center',
      }}>
        <div style={{
          width: '52px', height: '52px',
          border: '3px solid #1A1A1A',
          borderTopColor: '#F5C518',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div>
          <p style={{ color: '#F5C518', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 12px' }}>
            Setting up your profile
          </p>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.3 }}>
            VRDIKT is personalising<br />your financial punishment...
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '36px 24px 60px',
    }}>
      {/* Logo */}
      <div style={{ width: '100%', maxWidth: '480px', marginBottom: '44px' }}>
        <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.04em' }}>
          <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
        </span>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '52px', width: '100%', maxWidth: '480px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            height: '4px', flex: 1, borderRadius: '2px',
            background: i <= step ? '#F5C518' : '#1A1A1A',
            transition: 'background 0.4s ease',
          }} />
        ))}
        <span style={{ color: '#444', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap', marginLeft: '4px' }}>
          {step + 1} / 3
        </span>
      </div>

      {/* Step content */}
      <div
        key={animKey}
        style={{
          width: '100%', maxWidth: '480px',
          animation: 'step-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* SCREEN 1 — Income */}
        {step === 0 && (
          <>
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: 1.2 }}>
                What's your monthly income?
              </h1>
              <p style={{ color: '#4A4A4A', fontSize: '15px', margin: 0, fontStyle: 'italic' }}>
                We won't judge. Actually we will, but only about spending.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {INCOME_OPTIONS.map(opt => {
                const active = income === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setIncome(opt.value)}
                    style={{
                      padding: '15px 18px',
                      background: active ? 'rgba(245,197,24,0.07)' : '#0F0F0F',
                      border: `1px solid ${active ? '#F5C518' : '#1C1C1C'}`,
                      borderRadius: '14px',
                      color: active ? '#F5C518' : '#888',
                      fontSize: '15px', fontWeight: active ? 600 : 400,
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'Inter, sans-serif', width: '100%',
                      transition: 'all 0.15s ease',
                      transform: active ? 'translateX(4px)' : 'translateX(0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>{opt.label}</span>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: `2px solid ${active ? '#F5C518' : '#2A2A2A'}`,
                      background: active ? '#F5C518' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {active && <span style={{ color: '#0A0A0A', fontSize: '11px', fontWeight: 900 }}>✓</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={goNext}
              disabled={!income}
              style={ctaStyle(!!income)}
            >
              Next →
            </button>
            <SkipButton user={user} refreshProfile={refreshProfile} navigate={navigate} />
          </>
        )}

        {/* SCREEN 2 — Money sins (multi-select) */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: 1.2 }}>
                Your biggest money sin?
              </h1>
              <p style={{ color: '#4A4A4A', fontSize: '15px', margin: 0, fontStyle: 'italic' }}>
                Pick all that apply. Be honest.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {SIN_OPTIONS.map(opt => {
                const active = sins.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleSin(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '15px 18px',
                      background: active ? 'rgba(245,197,24,0.07)' : '#0F0F0F',
                      border: `1px solid ${active ? '#F5C518' : '#1C1C1C'}`,
                      borderRadius: '14px',
                      color: active ? '#F5C518' : '#888',
                      fontSize: '15px', fontWeight: active ? 600 : 400,
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'Inter, sans-serif', width: '100%',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{opt.icon}</span>
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '4px',
                      border: `2px solid ${active ? '#F5C518' : '#2A2A2A'}`,
                      background: active ? '#F5C518' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {active && <span style={{ color: '#0A0A0A', fontSize: '11px', fontWeight: 900 }}>✓</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            <button onClick={goNext} disabled={sins.length === 0} style={ctaStyle(sins.length > 0)}>
              Next →
            </button>
          </>
        )}

        {/* SCREEN 3 — Saving goal (text input) */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: 1.2 }}>
                What are you saving for?
              </h1>
              <p style={{ color: '#4A4A4A', fontSize: '15px', margin: 0, fontStyle: 'italic' }}>
                Or trying to. We know how this usually ends.
              </p>
            </div>
            <textarea
              value={savingGoal}
              onChange={e => setSavingGoal(e.target.value)}
              placeholder="A trip to Bali, a new MacBook, literally anything other than Zomato..."
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0F0F0F', border: '1px solid #1C1C1C',
                borderRadius: '14px', padding: '16px 18px',
                color: '#F0F0F0', fontSize: '15px',
                fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
                resize: 'vertical', outline: 'none',
                transition: 'border-color 0.2s',
                marginBottom: '20px',
              }}
              onFocus={e => e.target.style.borderColor = '#F5C518'}
              onBlur={e => e.target.style.borderColor = '#1C1C1C'}
            />
            <button
              onClick={handleFinish}
              disabled={!savingGoal.trim() || saving}
              style={ctaStyle(!!savingGoal.trim() && !saving)}
            >
              {saving ? 'Setting up…' : 'Get My Verdict →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ctaStyle(enabled) {
  return {
    width: '100%',
    background: enabled ? '#F5C518' : '#141414',
    border: `1px solid ${enabled ? '#F5C518' : '#1C1C1C'}`,
    borderRadius: '14px', padding: '17px 24px',
    color: enabled ? '#0A0A0A' : '#2A2A2A',
    fontSize: '16px', fontWeight: 800,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em',
    transition: 'all 0.2s ease',
  }
}

function SkipButton({ user, refreshProfile, navigate }) {
  return (
    <button
      onClick={async () => {
        await supabase.from('profiles').update({ onboarding_complete: true }).eq('user_id', user.id)
        await refreshProfile()
        navigate('/dashboard', { replace: true })
      }}
      style={{
        display: 'block', margin: '16px auto 0',
        background: 'transparent', border: 'none',
        color: '#2A2A2A', fontSize: '13px',
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#555'}
      onMouseLeave={e => e.currentTarget.style.color = '#2A2A2A'}
    >
      Skip for now
    </button>
  )
}
