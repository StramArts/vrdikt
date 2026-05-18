import { useNavigate } from 'react-router-dom'
import { useMobile } from '../hooks/useMobile'
import { useAuth } from '../contexts/AuthContext'
import AppNav from '../components/AppNav'

const TIERS = [
  {
    id: 'free',
    name: 'FREE',
    price: '₹0',
    period: 'forever',
    popular: false,
    cta: 'Get Roasted Free',
    ctaLink: '/upload',
    features: [
      '3 roasts/month',
      'Full roast experience',
      'Roast Card — always free',
      'Basic spending breakdown',
      '1 active challenge',
      'Last 3 roasts history',
      'Basic XP',
    ],
  },
  {
    id: 'couple',
    name: 'COUPLE',
    price: '₹99',
    period: '/month per person',
    subtext: 'Less than one Zomato order a month.',
    popular: false,
    cta: 'Coming Soon',
    ctaLink: null,
    note: 'Already on Pro? Couple Mode is included. Just link your partner.',
    features: [
      'Link with your partner via invite code',
      'Combined spending dashboard',
      'Full transparency — see everything',
      'Couple Spending Personality',
      'Shared Savings Goal + Savings Pot',
      'Monthly Couple Roast (on demand + auto on 1st)',
      'Shareable Couple Roast Card',
      'Couple Challenges',
      'One Pro unlocks Couple for both',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '₹199',
    period: '/month',
    yearlyNote: 'or ₹1,999/year — save 2 months',
    popular: true,
    cta: 'Coming Soon',
    ctaLink: null,
    features: [
      'Unlimited roasts',
      'Full roast history',
      'All challenges unlocked',
      'Full XP & streaks',
      'All badges',
      'PDF parsing',
      'Monthly Report Card',
      'Spending Personality deep dive',
      'Morning Burn notification',
      'Gmail automatic tracking',
      'AI memory — roasts that remember your history',
      'Streak consequences and milestones',
      'Merchant categorisation',
      'Group Trip Tracker',
      'Couple Mode',
    ],
  },
]

const D = {
  bg: '#070707', bg2: '#0E0E0F', bg3: '#161617',
  ink: '#FAFAF8', inkDim: 'rgba(250,250,248,0.55)', inkFaint: 'rgba(250,250,248,0.32)',
  hair: 'rgba(255,255,255,0.06)', hair2: 'rgba(255,255,255,0.10)',
}
const BRAND = { orange: '#FF5500', red: '#FF1040', gold: '#FFD000' }

const TIER_ACCENT = { free: BRAND.orange, couple: BRAND.gold, pro: BRAND.red }

const mono = {
  fontFamily: 'Geist Mono, ui-monospace, monospace',
  fontSize: 10, fontWeight: 500,
  letterSpacing: '0.18em', textTransform: 'uppercase',
}

export default function Pricing() {
  const navigate = useNavigate()
  const isMobile = useMobile()
  const { user } = useAuth()

  return (
    <div style={{ minHeight: '100svh', background: D.bg, color: D.ink, fontFamily: 'Geist, system-ui, sans-serif', position: 'relative' }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', left: '15%', top: '20%', width: 500, height: 500, transform: 'translate(-50%,-50%)', pointerEvents: 'none', background: 'radial-gradient(circle, #FF5500 0%, transparent 60%)', filter: 'blur(2px)', opacity: 0.12, zIndex: 0 }} />
      <div style={{ position: 'fixed', left: '88%', top: '8%', width: 300, height: 300, transform: 'translate(-50%,-50%)', pointerEvents: 'none', background: 'radial-gradient(circle, #FF1040 0%, transparent 60%)', filter: 'blur(2px)', opacity: 0.09, zIndex: 0 }} />
      <div style={{ position: 'fixed', left: '72%', top: '60%', width: 360, height: 360, transform: 'translate(-50%,-50%)', pointerEvents: 'none', background: 'radial-gradient(circle, #FFD000 0%, transparent 60%)', filter: 'blur(2px)', opacity: 0.06, zIndex: 0 }} />
      {/* Subtle grid */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.4, zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <AppNav loggedIn={!!user} showDashboardBtn user={user} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1040, margin: '0 auto', padding: isMobile ? '32px 20px 100px' : '48px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 36 : 52 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, background: BRAND.orange, transform: 'rotate(45deg)', borderRadius: 1, display: 'inline-block' }} />
            <span style={{ ...mono, color: D.inkDim }}>PICK YOUR PLAN</span>
            <span style={{ width: 6, height: 6, background: BRAND.orange, transform: 'rotate(45deg)', borderRadius: 1, display: 'inline-block' }} />
          </div>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 900,
            fontSize: 'clamp(32px, 7vw, 56px)',
            letterSpacing: '-0.04em', margin: '0 0 14px', lineHeight: 1.05,
            color: D.ink,
          }}>
            Pick your level of<br />
            <span style={{ color: BRAND.orange }}>financial punishment.</span>
          </h1>
          <p style={{ color: D.inkDim, fontSize: 15, margin: 0, maxWidth: 400, marginInline: 'auto', lineHeight: 1.55 }}>
            The roast is free. The pain is optional.
          </p>
        </div>

        {/* Tier cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 14,
          alignItems: 'start',
        }}>
          {TIERS.map(tier => {
            const accent = TIER_ACCENT[tier.id]
            const isActive = !!tier.ctaLink
            return (
              <div
                key={tier.id}
                style={{
                  position: 'relative',
                  background: D.bg2,
                  border: `1px solid ${tier.popular ? `${accent}33` : D.hair}`,
                  borderRadius: 24,
                  padding: '26px 22px 24px',
                  display: 'flex', flexDirection: 'column', gap: 20,
                  boxShadow: tier.popular ? `0 0 56px -16px ${accent}55` : 'none',
                  overflow: 'hidden',
                }}
              >
                {/* Glow corner for popular */}
                {tier.popular && (
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
                )}

                {/* Popular badge */}
                {tier.popular && (
                  <div style={{
                    position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.red})`,
                    borderRadius: '0 0 10px 10px',
                    padding: '5px 16px',
                    color: '#fff', fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Header */}
                <div style={{ paddingTop: tier.popular ? 12 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <span style={{ width: 5, height: 5, background: accent, transform: 'rotate(45deg)', borderRadius: 1, display: 'inline-block' }} />
                    <span style={{ ...mono, color: accent }}>{tier.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 42, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: D.ink }}>
                      {tier.price}
                    </span>
                    <span style={{ ...mono, color: D.inkFaint, fontSize: 9 }}>{tier.period}</span>
                  </div>
                  {tier.subtext && (
                    <p style={{ color: D.inkFaint, fontSize: 11, margin: '8px 0 0', lineHeight: 1.4 }}>{tier.subtext}</p>
                  )}
                  {tier.yearlyNote && (
                    <p style={{ color: D.inkFaint, fontSize: 11, margin: '6px 0 0', lineHeight: 1.4 }}>{tier.yearlyNote}</p>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: D.hair }} />

                {/* Features */}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'rgba(250,250,248,0.78)', fontSize: 13, lineHeight: 1.45 }}>
                      <span style={{ color: accent, fontSize: 10, marginTop: 3, flexShrink: 0, fontWeight: 700 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                  <button
                    onClick={() => tier.ctaLink && navigate(tier.ctaLink)}
                    disabled={!tier.ctaLink}
                    style={{
                      width: '100%', height: 50,
                      background: isActive ? `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.red})` : 'rgba(255,255,255,0.04)',
                      border: isActive ? 'none' : `1px solid ${D.hair2}`,
                      borderRadius: 14,
                      color: isActive ? '#fff' : D.inkFaint,
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 14, fontWeight: 800,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      cursor: isActive ? 'pointer' : 'default',
                      boxShadow: isActive ? `0 8px 24px -8px ${BRAND.orange}88` : 'none',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => { if (tier.ctaLink) e.currentTarget.style.opacity = '0.85' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                  >
                    {tier.cta}
                  </button>
                  {tier.note && (
                    <p style={{ ...mono, color: D.inkFaint, textAlign: 'center', margin: 0, lineHeight: 1.5, fontSize: 9 }}>{tier.note}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: D.inkFaint, fontSize: 13, margin: '40px 0 0', lineHeight: 1.5 }}>
          Payments coming soon. Get roasted free while it lasts.
        </p>
      </div>
    </div>
  )
}
