import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobile } from '../hooks/useMobile'

const ROAST_LINES = [
  "You spent $847 on 'miscellaneous' last month. We both know that's just DoorDash and shame.",
  "Your savings rate is technically negative. That's not a financial strategy, that's a cry for help.",
  "Three subscriptions to streaming services you haven't opened since 2022. Bold choice.",
  "You withdrew $200 cash on a Friday night 11 times this year. The receipts don't lie.",
  "Your coffee spend could have funded a small country's infrastructure. Grande waste.",
]

// Single-word logo: VRD white, IKT gold, no gap
function Logo({ size = 20 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
      <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
    </span>
  )
}

function AnimatedBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '500px',
        background: 'radial-gradient(ellipse at center, rgba(245,197,24,0.06) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(ellipse at center, rgba(255,59,48,0.04) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(245,197,24,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245,197,24,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }} />
    </div>
  )
}

function RoastCardPreview() {
  const [lineIndex, setLineIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const isMobile = useMobile()

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setLineIndex(i => (i + 1) % ROAST_LINES.length)
        setVisible(true)
      }, 400)
    }, 3800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1A1A1A',
      borderRadius: isMobile ? '16px' : '20px',
      padding: isMobile ? '20px' : '32px',
      width: '100%',
      maxWidth: isMobile ? '100%' : '520px',
      position: 'relative',
      boxShadow: '0 0 0 1px rgba(245,197,24,0.08), 0 32px 64px rgba(0,0,0,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0,
        }}>🔥</div>
        <div>
          <div style={{ color: '#F5C518', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>VRDIKT</div>
          <div style={{ color: '#6B6B6B', fontSize: '11px' }}>Financial Roast Report</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#FF3B30', opacity: 0.8 }} />
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F5C518', opacity: 0.4 }} />
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#30D158', opacity: 0.3 }} />
        </div>
      </div>

      <div style={{
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        minHeight: isMobile ? '72px' : '90px',
      }}>
        <p style={{
          color: '#FF3B30', fontSize: isMobile ? '13px' : '15px',
          lineHeight: '1.7', fontStyle: 'italic', fontWeight: 500, margin: 0,
        }}>
          "{ROAST_LINES[lineIndex]}"
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        {[
          { label: 'Dining', pct: 72, color: '#FF3B30' },
          { label: 'Shopping', pct: 48, color: '#F5C518' },
          { label: 'Savings', pct: 8, color: '#30D158' },
        ].map(({ label, pct, color }) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ color: '#6B6B6B', fontSize: '11px' }}>{label}</span>
              <span style={{ color, fontSize: '11px', fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ height: '3px', background: '#1A1A1A', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', opacity: 0.8 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', top: '16px', right: '16px',
        background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.25)',
        borderRadius: '20px', padding: '3px 8px',
        fontSize: '10px', fontWeight: 700, color: '#FF3B30', letterSpacing: '0.06em',
      }}>BRUTAL</div>
    </div>
  )
}

function StatPill({ value, label }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '100px' }}>
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#F5C518', letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#141414' : '#111111',
        border: `1px solid ${hovered ? 'rgba(245,197,24,0.2)' : '#1A1A1A'}`,
        borderRadius: '16px', padding: '24px',
        transition: 'all 0.25s ease', cursor: 'default',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 20px 40px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div style={{ fontSize: '26px', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '16px', fontWeight: 700, color: '#F0F0F0' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '14px', color: '#6B6B6B', lineHeight: '1.6' }}>{description}</p>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const isMobile = useMobile()

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#F0F0F0' }}>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? '0 16px' : '0 32px',
        height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrollY > 40 ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: scrollY > 40 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 40 ? '1px solid #1A1A1A' : '1px solid transparent',
        transition: 'all 0.3s ease',
        // Safe area for iPhone notch
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <Logo size={isMobile ? 18 : 20} />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isMobile && (
            <button
              onClick={() => navigate('/auth')}
              style={{
                background: 'transparent', border: '1px solid #1A1A1A',
                borderRadius: '10px', padding: '8px 18px',
                color: '#F0F0F0', fontSize: '14px', fontWeight: 500,
                cursor: 'pointer', transition: 'border-color 0.2s', fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#F5C518'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1A1A1A'}
            >
              Sign in
            </button>
          )}
          <button
            onClick={() => navigate('/auth')}
            style={{
              background: '#F5C518', border: 'none',
              borderRadius: '10px', padding: isMobile ? '8px 16px' : '8px 18px',
              color: '#0A0A0A', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.2s, transform 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFD740'; e.currentTarget.style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            Get Roasted
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        ref={heroRef}
        style={{
          position: 'relative', minHeight: '100svh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? '100px 20px 80px' : '120px 24px 80px',
          textAlign: 'center', overflow: 'hidden',
        }}
      >
        <AnimatedBackground />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)',
          borderRadius: '100px', padding: isMobile ? '5px 12px' : '6px 16px',
          marginBottom: isMobile ? '28px' : '40px',
          animation: 'fade-in 0.8s ease forwards', opacity: 0, animationDelay: '0.1s',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F5C518', display: 'inline-block', animation: 'pulse-gold 2s ease-in-out infinite' }} />
          <span style={{ fontSize: isMobile ? '11px' : '13px', color: '#F5C518', fontWeight: 600, letterSpacing: '0.06em' }}>
            AI-POWERED FINANCIAL HONESTY
          </span>
        </div>

        <h1 style={{
          fontSize: isMobile ? '52px' : 'clamp(52px, 9vw, 96px)',
          fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0,
          margin: 0, marginBottom: '8px',
          animation: 'slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          opacity: 0, animationDelay: '0.2s',
        }}>
          Your money.
        </h1>
        <h1 style={{
          fontSize: isMobile ? '52px' : 'clamp(52px, 9vw, 96px)',
          fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0,
          margin: 0, marginBottom: isMobile ? '24px' : '32px',
          color: '#F5C518',
          animation: 'slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          opacity: 0, animationDelay: '0.35s',
        }}>
          Unfiltered.
        </h1>

        <p style={{
          fontSize: isMobile ? '16px' : 'clamp(16px, 2vw, 20px)',
          color: '#6B6B6B', maxWidth: '540px', lineHeight: 1.65,
          margin: '0 auto', marginBottom: isMobile ? '36px' : '48px',
          animation: 'slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          opacity: 0, animationDelay: '0.5s', paddingInline: isMobile ? '4px' : 0,
        }}>
          Upload your bank statement. Get a brutally honest, hilariously personalised AI roast of your financial decisions. No sugarcoating. Just the truth.
        </p>

        <div style={{
          display: 'flex', gap: '12px', justifyContent: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          width: isMobile ? '100%' : 'auto',
          animation: 'slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          opacity: 0, animationDelay: '0.65s',
        }}>
          <button
            onClick={() => navigate('/auth')}
            style={{
              background: '#F5C518', border: 'none', borderRadius: '14px',
              padding: isMobile ? '18px 24px' : '18px 40px',
              color: '#0A0A0A', fontSize: '17px', fontWeight: 800,
              cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease', boxShadow: '0 0 40px rgba(245,197,24,0.25)',
              WebkitTapHighlightColor: 'transparent',
              width: isMobile ? '100%' : 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFD740'; e.currentTarget.style.boxShadow = '0 0 60px rgba(245,197,24,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.boxShadow = '0 0 40px rgba(245,197,24,0.25)' }}
          >
            Get Roasted 🔥
          </button>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '14px',
              padding: isMobile ? '16px 24px' : '18px 32px',
              color: '#F0F0F0', fontSize: '17px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease', WebkitTapHighlightColor: 'transparent',
              width: isMobile ? '100%' : 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5C518'; e.currentTarget.style.color = '#F5C518' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#F0F0F0' }}
          >
            See how it works
          </button>
        </div>

        <p style={{
          marginTop: '20px', fontSize: '12px', color: '#3A3A3A',
          animation: 'fade-in 1s ease forwards', opacity: 0, animationDelay: '1s',
          paddingInline: '16px',
        }}>
          No card required · Your data is never stored · 100% brutal honesty guaranteed
        </p>

        <div style={{
          position: 'absolute', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)',
          animation: 'float 3s ease-in-out infinite', opacity: 0.4,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v14M4 11l6 6 6-6" stroke="#F5C518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: isMobile ? '0 16px 72px' : '0 24px 100px' }}>
        <div style={{
          maxWidth: '860px', margin: '0 auto',
          background: '#111111', border: '1px solid #1A1A1A',
          borderRadius: '20px', padding: isMobile ? '28px 20px' : '40px 48px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? '28px' : '0',
          alignItems: 'center',
        }}>
          <StatPill value="47,000+" label="Roasts delivered" />
          <StatPill value="$2.4M" label="Bad decisions catalogued" />
          <StatPill value="94%" label="Felt personally attacked" />
          <StatPill value="4.9★" label="Average rating" />
        </div>
      </section>

      {/* How it works + Roast Preview */}
      <section
        id="how-it-works"
        style={{
          padding: isMobile ? '40px 16px 80px' : '40px 24px 120px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '40px' : '64px' }}>
          <p style={{ color: '#F5C518', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Live preview
          </p>
          <h2 style={{ fontSize: isMobile ? '28px' : 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>
            This is what brutal<br />
            <span style={{ color: '#FF3B30' }}>honesty looks like.</span>
          </h2>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '40px' : '80px',
          justifyContent: 'center',
          maxWidth: '1100px', width: '100%',
        }}>
          <div style={{ animation: 'float 6s ease-in-out infinite', width: '100%', maxWidth: isMobile ? '100%' : '520px' }}>
            <RoastCardPreview />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: isMobile ? '100%' : '340px' }}>
            {[
              { n: '01', title: 'Upload your statement', body: 'Drop in a PDF or paste your transactions. We support all major banks.' },
              { n: '02', title: 'AI does its thing', body: 'Our model analyses every transaction and builds your financial personality profile.' },
              { n: '03', title: 'Receive the verdict', body: 'Get a personalised roast — funny, specific, and brutally accurate.' },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#F5C518', fontSize: '12px', fontWeight: 800, flexShrink: 0,
                }}>{n}</div>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '5px', fontSize: '15px', fontWeight: 700, color: '#F0F0F0' }}>{title}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6B6B6B', lineHeight: 1.6 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: isMobile ? '0 16px 80px' : '0 24px 120px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '40px' : '64px' }}>
          <h2 style={{ fontSize: isMobile ? '28px' : 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            Everything you need to<br />
            <span style={{ color: '#F5C518' }}>face your finances.</span>
          </h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px',
        }}>
          <FeatureCard icon="🧠" title="AI-Powered Analysis" description="GPT-4-level intelligence breaks down every transaction and identifies your worst financial habits." />
          <FeatureCard icon="🔒" title="Fully Encrypted" description="Your financial data is end-to-end encrypted and never stored after your roast is generated." />
          <FeatureCard icon="📊" title="Visual Breakdown" description="Beautiful charts show exactly where your money goes — and where it should be going instead." />
          <FeatureCard icon="🎯" title="Actionable Insights" description="Beyond the laughs, get real recommendations for fixing the financial trainwreck." />
          <FeatureCard icon="📄" title="PDF & Text Support" description="Upload a bank statement PDF or paste raw transaction data. We handle both flawlessly." />
          <FeatureCard icon="⚡" title="Instant Results" description="Your personalised roast is ready in under 30 seconds. No waiting. No appointments." />
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: isMobile ? '0 16px 80px' : '0 24px 120px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(245,197,24,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <div style={{
          maxWidth: '640px', margin: '0 auto',
          background: '#111111', border: '1px solid rgba(245,197,24,0.15)',
          borderRadius: '24px', padding: isMobile ? '40px 24px' : '64px 48px',
        }}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>🔥</div>
          <h2 style={{ fontSize: isMobile ? '26px' : 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, marginBottom: '14px', lineHeight: 1.1 }}>
            Ready to hear the truth?
          </h2>
          <p style={{ color: '#6B6B6B', fontSize: isMobile ? '15px' : '17px', marginBottom: '36px', lineHeight: 1.6 }}>
            Stop budgeting apps that baby you. Get a roast that actually changes behaviour.
          </p>
          <button
            onClick={() => navigate('/auth')}
            style={{
              background: '#F5C518', border: 'none', borderRadius: '14px',
              padding: isMobile ? '18px 32px' : '20px 48px',
              color: '#0A0A0A', fontSize: isMobile ? '16px' : '18px', fontWeight: 800,
              cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease', boxShadow: '0 0 50px rgba(245,197,24,0.3)',
              display: 'block', margin: '0 auto', width: isMobile ? '100%' : 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFD740'; e.currentTarget.style.boxShadow = '0 0 70px rgba(245,197,24,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.boxShadow = '0 0 50px rgba(245,197,24,0.3)' }}
          >
            Get Roasted — Free
          </button>
          <p style={{ marginTop: '14px', fontSize: '12px', color: '#3A3A3A' }}>
            First roast is on us. Premium plans from $4.99/month.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1A1A1A',
        padding: isMobile ? '28px 16px calc(28px + env(safe-area-inset-bottom, 0px))' : '32px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: isMobile ? 'center' : 'space-between',
        alignItems: 'center',
        gap: isMobile ? '20px' : '16px',
        maxWidth: '1100px', margin: '0 auto', width: '100%',
        textAlign: isMobile ? 'center' : 'left',
      }}>
        <Logo size={18} />
        <p style={{ margin: 0, color: '#3A3A3A', fontSize: '13px' }}>
          © 2026 VRDIKT. Your money, our verdict.
        </p>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['Privacy', 'Terms', 'Contact'].map(link => (
            <a key={link} href="#" style={{ color: '#3A3A3A', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F5C518'}
              onMouseLeave={e => e.currentTarget.style.color = '#3A3A3A'}>
              {link}
            </a>
          ))}
        </div>
      </footer>

    </div>
  )
}
