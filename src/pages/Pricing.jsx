import { useNavigate } from 'react-router-dom'
import { useMobile } from '../hooks/useMobile'

function Logo() {
  return (
    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
      <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
    </span>
  )
}

const TIERS = [
  {
    name: 'FREE',
    price: '₹0',
    sub: 'forever',
    popular: false,
    features: [
      { text: '1 roast per month', enabled: true },
      { text: 'Basic spending analysis', enabled: true },
      { text: 'VRDIKT Score', enabled: true },
    ],
    cta: 'Get Roasted',
    ctaLink: '/upload',
    disabled: false,
    accent: '#F5C518',
  },
  {
    name: 'PRO',
    price: '₹499',
    sub: '/month',
    popular: true,
    features: [
      { text: 'Unlimited roasts', enabled: true },
      { text: 'Full roast history', enabled: true },
      { text: 'Spending personality tracking', enabled: true },
      { text: 'Monthly comparison', enabled: true },
      { text: '🔒 BROक Mode (coming soon)', enabled: false },
    ],
    cta: 'Coming Soon',
    ctaLink: null,
    disabled: true,
    accent: '#F5C518',
  },
  {
    name: 'SAVAGE',
    price: '₹999',
    sub: '/month',
    popular: false,
    features: [
      { text: 'Everything in Pro', enabled: true },
      { text: 'AI financial advice', enabled: true },
      { text: 'Export reports', enabled: true },
      { text: 'Priority roasting', enabled: true },
      { text: 'Early access to all features', enabled: true },
    ],
    cta: 'Coming Soon',
    ctaLink: null,
    disabled: true,
    accent: '#FF3B30',
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const isMobile = useMobile()

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', borderBottom: '1px solid #111',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent', border: 'none', padding: 0,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          <Logo />
        </button>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              color: '#F5C518', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Pricing
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#F5C518', border: 'none', borderRadius: '8px',
              padding: '7px 16px', color: '#0A0A0A',
              fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: isMobile ? '48px 20px 36px' : '64px 20px 48px' }}>
        <p style={{
          color: '#F5C518', fontSize: '11px', letterSpacing: '0.22em',
          textTransform: 'uppercase', fontWeight: 700, margin: '0 0 16px',
        }}>
          Simple Pricing
        </p>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900,
          letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.05,
        }}>
          Pick your level of<br />
          <span style={{ color: '#F5C518' }}>financial punishment</span>
        </h1>
        <p style={{ color: '#555', fontSize: '16px', margin: 0, maxWidth: 440, marginInline: 'auto' }}>
          The roast is free. The pain is optional.
        </p>
      </div>

      {/* Tiers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '16px',
        maxWidth: 960, width: '100%',
        margin: '0 auto',
        padding: isMobile ? '0 16px 64px' : '0 24px 80px',
        alignItems: 'start',
      }}>
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            style={{
              position: 'relative',
              background: tier.popular ? '#0F0F0F' : '#0A0A0A',
              border: tier.popular ? '1px solid #F5C518' : '1px solid #161616',
              borderRadius: '24px',
              padding: '32px 28px',
              display: 'flex', flexDirection: 'column', gap: '24px',
              boxShadow: tier.popular ? '0 0 48px rgba(245,197,24,0.08)' : 'none',
            }}
          >
            {/* Most Popular badge */}
            {tier.popular && (
              <div style={{
                position: 'absolute', top: '-13px', left: '50%',
                transform: 'translateX(-50%)',
                background: '#F5C518', borderRadius: '20px',
                padding: '4px 14px',
                color: '#0A0A0A', fontSize: '10px', fontWeight: 800,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                Most Popular
              </div>
            )}

            {/* Tier header */}
            <div>
              <p style={{
                color: tier.accent, fontSize: '11px', letterSpacing: '0.18em',
                textTransform: 'uppercase', fontWeight: 700, margin: '0 0 12px',
              }}>
                {tier.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {tier.price}
                </span>
                <span style={{ color: '#444', fontSize: '14px' }}>{tier.sub}</span>
              </div>
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tier.features.map((f) => (
                <li key={f.text} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  color: f.enabled ? '#C0C0C0' : '#333',
                  fontSize: '14px',
                }}>
                  <span style={{ color: f.enabled ? '#F5C518' : '#2A2A2A', fontSize: '12px', marginTop: '2px', flexShrink: 0 }}>
                    {f.enabled ? '✓' : '○'}
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => !tier.disabled && navigate(tier.ctaLink)}
              disabled={tier.disabled}
              style={{
                width: '100%',
                background: tier.disabled ? 'transparent' : '#F5C518',
                border: tier.disabled ? '1px solid #1E1E1E' : 'none',
                borderRadius: '12px', padding: '14px',
                color: tier.disabled ? '#333' : '#0A0A0A',
                fontSize: '15px', fontWeight: 800,
                cursor: tier.disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.01em',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (!tier.disabled) e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
