import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CHALLENGE_CONFIGS, getMonthLabel } from '../lib/challenges'

const STEPS = [
  {
    headline: 'First, how much do you earn?',
    subtext: "We won't judge. Actually we will, but only about spending.",
    options: [
      { label: 'Under ₹25,000',          value: 'under_25k' },
      { label: '₹25,000 – ₹50,000',      value: '25k_50k' },
      { label: '₹50,000 – ₹1,00,000',    value: '50k_1l' },
      { label: 'Above ₹1,00,000',         value: 'above_1l' },
    ],
  },
  {
    headline: 'Where does your money actually go?',
    subtext: "Be honest. We'll find out anyway.",
    options: [
      { label: 'Food Delivery',    icon: '🍕', value: 'food_delivery' },
      { label: 'Online Shopping',  icon: '🛍️', value: 'online_shopping' },
      { label: 'Subscriptions',    icon: '📱', value: 'subscriptions' },
      { label: 'Going Out',        icon: '🍻', value: 'going_out' },
      { label: 'All of the above', icon: '💀', value: 'all' },
    ],
  },
  {
    headline: 'What are you saving for?',
    subtext: "Or trying to. We know how this usually ends.",
    options: [
      { label: 'A trip',               icon: '✈️', value: 'trip' },
      { label: 'New phone / gadget',   icon: '📱', value: 'gadget' },
      { label: 'Emergency fund',       icon: '🛡️', value: 'emergency' },
      { label: 'Nothing specific',     icon: '😬', value: 'nothing' },
      { label: 'Actually saving well', icon: '👑', value: 'saving_well' },
    ],
  },
]

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]           = useState(0)
  const [selections, setSelections] = useState(['', '', ''])
  const [saving, setSaving]       = useState(false)
  const [animKey, setAnimKey]     = useState(0)

  useEffect(() => {
    if (profile?.onboarding_complete) {
      navigate('/dashboard', { replace: true })
    }
  }, [profile, navigate])

  function select(value) {
    setSelections(prev => {
      const next = [...prev]
      next[step] = value
      return next
    })
  }

  async function handleNext() {
    const chosen = selections[step]
    if (!chosen) return

    if (step < 2) {
      setStep(s => s + 1)
      setAnimKey(k => k + 1)
      return
    }

    setSaving(true)
    const weaknessKey = selections[1]
    const config = CHALLENGE_CONFIGS[weaknessKey] ?? CHALLENGE_CONFIGS.all
    const month = getMonthLabel()

    const { error } = await supabase
      .from('profiles')
      .update({
        income_range:        selections[0],
        spending_weakness:   selections[1],
        savings_goal:        selections[2],
        onboarding_complete: true,
      })
      .eq('user_id', user.id)

    if (error) console.error('[VRDIKT] Onboarding save failed:', error.message)

    // Auto-create first challenge (skip if one already exists for this month)
    const { data: existing } = await supabase
      .from('challenges')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', month)
      .maybeSingle()

    if (!existing) {
      await supabase.from('challenges').insert({
        user_id:       user.id,
        month,
        category:      config.category,
        goal:          config.goal,
        target_amount: config.target,
      })
    }

    await refreshProfile()
    navigate('/dashboard', { replace: true })
  }

  const current  = STEPS[step]
  const chosen   = selections[step]
  const isLast   = step === 2
  const canNext  = !!chosen && !saving

  return (
    <div style={{
      minHeight: '100svh',
      background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif',
      color: '#F0F0F0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '36px 24px 60px',
    }}>
      {/* Logo */}
      <div style={{ width: '100%', maxWidth: '480px', marginBottom: '44px' }}>
        <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.04em' }}>
          <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '52px', width: '100%', maxWidth: '480px',
      }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              height: '4px',
              flex: 1,
              borderRadius: '2px',
              background: i <= step ? '#F5C518' : '#1A1A1A',
              transition: 'background 0.4s ease',
            }}
          />
        ))}
        <span style={{
          color: '#444', fontSize: '12px', fontWeight: 600,
          letterSpacing: '0.05em', whiteSpace: 'nowrap', marginLeft: '4px',
        }}>
          {step + 1} / 3
        </span>
      </div>

      {/* Step content — key swap triggers step-in animation */}
      <div
        key={animKey}
        style={{
          width: '100%', maxWidth: '480px',
          animation: 'step-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Headline */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: 'clamp(22px, 5vw, 30px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            margin: '0 0 10px',
            lineHeight: 1.2,
          }}>
            {current.headline}
          </h1>
          <p style={{
            color: '#4A4A4A', fontSize: '15px', margin: 0,
            fontStyle: 'italic', lineHeight: 1.5,
          }}>
            {current.subtext}
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
          {current.options.map(opt => {
            const active = chosen === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => select(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '15px 18px',
                  background: active ? 'rgba(245,197,24,0.07)' : '#0F0F0F',
                  border: `1px solid ${active ? '#F5C518' : '#1C1C1C'}`,
                  borderRadius: '14px',
                  color: active ? '#F5C518' : '#888',
                  fontSize: '15px',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'Inter, sans-serif',
                  width: '100%',
                  transition: 'all 0.15s ease',
                  transform: active ? 'translateX(4px)' : 'translateX(0)',
                  boxShadow: active ? '0 0 0 1px rgba(245,197,24,0.15)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = '#2A2A2A'
                    e.currentTarget.style.color = '#D0D0D0'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = '#1C1C1C'
                    e.currentTarget.style.color = '#888'
                  }
                }}
              >
                {opt.icon && (
                  <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>
                    {opt.icon}
                  </span>
                )}
                <span style={{ flex: 1 }}>{opt.label}</span>
                <span style={{
                  width: '20px', height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${active ? '#F5C518' : '#2A2A2A'}`,
                  background: active ? '#F5C518' : 'transparent',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}>
                  {active && (
                    <span style={{ color: '#0A0A0A', fontSize: '11px', fontWeight: 900, lineHeight: 1 }}>✓</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={handleNext}
          disabled={!canNext}
          style={{
            width: '100%',
            background: canNext ? '#F5C518' : '#141414',
            border: `1px solid ${canNext ? '#F5C518' : '#1C1C1C'}`,
            borderRadius: '14px',
            padding: '17px 24px',
            color: canNext ? '#0A0A0A' : '#2A2A2A',
            fontSize: '16px',
            fontWeight: 800,
            cursor: canNext ? 'pointer' : 'not-allowed',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.02em',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { if (canNext) e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          onMouseDown={e => { if (canNext) e.currentTarget.style.transform = 'scale(0.98)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {saving ? 'Setting up your profile…' : isLast ? 'Continue →' : 'Next →'}
        </button>

        {/* Skip — only for returning users hitting this unexpectedly */}
        {step === 0 && (
          <button
            onClick={async () => {
              setSaving(true)
              await supabase
                .from('profiles')
                .update({ onboarding_complete: true })
                .eq('user_id', user.id)
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
        )}
      </div>
    </div>
  )
}
