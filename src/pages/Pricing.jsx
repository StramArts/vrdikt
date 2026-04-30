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
    id: 'free',
    name: 'FREE',
    price: '₹0',
    period: 'forever',
    popular: false,
    coming: false,
    features: [
      '1 manual roast per month',
      'Paste or upload data yourself',
      'Basic roast only',
    ],
    locked: [
      'No spending personality',
      'No roast history',
      'No challenges',
    ],
    cta: 'Get Roasted Free',
    ctaLink: '/upload',
  },
  {
    id: '499',
    name: 'THE ROASTED',
    price: '₹499',
    period: '/month',
    popular: true,
    coming: true,
    features: [
      'Automatic transaction tracking',
      'Monthly auto-roast on the 1st',
      'Spending Personality',
      'Savings Challenge with automatic tracking',
      'Morning Burn notifications',
      'Roast Card generation and sharing',
      '3 month history',
      'Basic savings suggestions',
    ],
    locked: [],
    cta: 'Coming Soon',
    ctaLink: null,
  },
  {
    id: '899',
    name: 'THE BRUTALLY HONEST',
    price: '₹899',
    period: '/month',
    popular: false,
    coming: true,
    features: [
      'Everything in ₹499',
      'Weekly spending check-ins',
      'Merchant Hall of Shame',
      'Category Deep Dive',
      'VRDIKT Score',
      'Spending Personality deep dive',
      'Savings Pot visual',
      'Friend Comparisons',
    ],
    locked: [],
    cta: 'Coming Soon',
    ctaLink: null,
  },
  {
    id: '1299',
    name: 'THE REFORMED',
    price: '₹1299',
    period: '/month',
    popular: false,
    coming: true,
    features: [
      'Everything in ₹899',
      'Predictive Alerts',
      'AI Financial Advisor Mode',
      'The Spending Duel',
      'Priority roast quality',
      'The Annual VRDIKT Report',
      'Early access to all new features',
    ],
    locked: [],
    cta: 'Coming Soon',
    ctaLink: null,
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
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          <Logo />
        </button>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
          fontSize: 'clamp(30px, 6vw, 50px)', fontWeight: 900,
          letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.05,
        }}>
          Pick your level of<br />
          <span style={{ color: '#F5C518' }}>financial punishment</span>
        </h1>
        <p style={{ color: '#555', fontSize: '15px', margin: 0, maxWidth: 440, marginInline: 'auto' }}>
          The roast is free. The pain is optional.
        </p>
      </div>

      {/* Tiers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: '14px',
        maxWidth: 900, width: '100%',
        margin: '0 auto',
        padding: isMobile ? '0 16px 64px' : '0 24px 80px',
        alignItems: 'start',
      }}>
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            style={{
              position: 'relative',
              background: tier.popular ? '#0F0F0F' : '#0A0A0A',
              border: tier.popular ? '1px solid #F5C518' : '1px solid #161616',
              borderRadius: '24px',
              padding: '28px 24px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              boxShadow: tier.popular ? '0 0 48px rgba(245,197,24,0.08)' : 'none',
            }}
          >
            {tier.popular && (
              <div style={{
                position: 'absolute', top: '-13px', left: '50%',
                transform: 'translateX(-50%)',
                background: '#F5C518', borderRadius: '20px',
                padding: '4px 14px',
                color: '#0A0A0A', fontSize: '10px', fontWeight: 800,
                letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                Most Popular
              </div>
            )}
            {tier.coming && (
              <div style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.15)',
                borderRadius: '20px', padding: '2px 9px',
                color: '#F5C518', fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                COMING SOON
              </div>
            )}

            {/* Header */}
            <div>
              <p style={{
                color: '#F5C518', fontSize: '11px', letterSpacing: '0.18em',
                textTransform: 'uppercase', fontWeight: 700, margin: '0 0 10px',
                paddingRight: tier.coming ? '80px' : 0,
              }}>
                {tier.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {tier.price}
                </span>
                <span style={{ color: '#444', fontSize: '14px' }}>{tier.period}</span>
              </div>
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {tier.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', color: '#C0C0C0', fontSize: '13px' }}>
                  <span style={{ color: '#F5C518', fontSize: '11px', marginTop: '2px', flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
              {tier.locked.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', color: '#2A2A2A', fontSize: '13px' }}>
                  <span style={{ fontSize: '11px', marginTop: '2px', flexShrink: 0 }}>🔒</span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => !tier.coming && navigate(tier.ctaLink)}
              disabled={tier.coming}
              style={{
                width: '100%',
                background: tier.coming ? 'transparent' : '#F5C518',
                border: tier.coming ? '1px solid #1E1E1E' : 'none',
                borderRadius: '12px', padding: '13px',
                color: tier.coming ? '#333' : '#0A0A0A',
                fontSize: '14px', fontWeight: 800,
                cursor: tier.coming ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (!tier.coming) e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p style={{
        textAlign: 'center', color: '#333', fontSize: '13px',
        padding: '0 24px 48px', margin: 0,
      }}>
        Payments coming soon. Get roasted free while it lasts.
      </p>
    </div>
  )
}
