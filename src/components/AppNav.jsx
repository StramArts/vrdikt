import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobile } from '../hooks/useMobile'

function Logo() {
  return (
    <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
      <span style={{ color: '#F0F0F0' }}>VRD</span>
      <span style={{ color: '#F5C518' }}>IKT</span>
    </span>
  )
}

function HamburgerIcon({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      {open
        ? <path d="M3 3L15 15M15 3L3 15" stroke="#888" strokeWidth="1.6" strokeLinecap="round" />
        : <path d="M2 5H16M2 9H16M2 13H16" stroke="#888" strokeWidth="1.6" strokeLinecap="round" />
      }
    </svg>
  )
}

const GHOST = {
  background: 'transparent', border: 'none', padding: 0,
  color: '#444', fontSize: '13px', fontWeight: 500,
  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
}

const OUTLINE = {
  background: 'transparent', border: '1px solid #1E1E1E', borderRadius: '8px',
  padding: '6px 14px', color: '#555', fontSize: '13px', fontWeight: 500,
  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.2s, color 0.2s',
}

const GOLD = {
  background: '#F5C518', border: 'none', borderRadius: '8px',
  padding: '7px 14px', color: '#0A0A0A',
  fontSize: '13px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
}

/**
 * Shared nav bar used across all authenticated (and some public) pages.
 *
 * Props:
 *   loggedIn        — drives hamburger menu contents
 *   showDashboardBtn — show the gold "Dashboard" CTA button (false on the Dashboard page itself)
 *   user            — { email } for desktop email display
 *   onSignOut       — if provided, adds Sign out to desktop nav + hamburger
 */
export default function AppNav({ loggedIn = true, showDashboardBtn = true, user = null, onSignOut = null }) {
  const navigate = useNavigate()
  const isMobile = useMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown on outside tap/click
  useEffect(() => {
    if (!menuOpen) return
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [menuOpen])

  const loggedInMenu = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Trips',     onClick: () => navigate('/trips') },
    { label: 'Profile',   onClick: () => navigate('/profile') },
    { label: 'Pricing',   onClick: () => navigate('/pricing') },
    ...(onSignOut ? [{ label: 'Sign out', onClick: onSignOut, danger: true }] : []),
  ]

  const loggedOutMenu = [
    { label: 'Pricing',     onClick: () => navigate('/pricing') },
    { label: 'Log in',      onClick: () => navigate('/auth') },
    { label: 'Get Roasted', onClick: () => navigate('/upload') },
  ]

  const menuItems = loggedIn ? loggedInMenu : loggedOutMenu

  // On mobile, render a floating pill nav
  if (isMobile && loggedIn) {
    const TABS = [
      { label: 'Home',       path: '/dashboard' },
      { label: 'Challenges', path: '/challenge' },
      { label: 'Roast',      path: '/upload',   special: true },
      { label: 'Trips',      path: '/trips' },
      { label: 'You',        path: '/profile' },
    ]
    const current = typeof window !== 'undefined' ? window.location.pathname : ''

    return (
      <nav style={{
        position: 'fixed', bottom: 18, left: 12, right: 12, zIndex: 100,
        padding: '10px 14px',
        borderRadius: 28,
        background: 'rgba(20,20,22,0.88)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset',
        WebkitTapHighlightColor: 'transparent',
      }}>
        {TABS.map(({ label, path, special }) => {
          const active = current === path || (path === '/dashboard' && current === '/')
          if (special) return (
            <button key={path} onClick={() => navigate(path)} style={{ appearance: 'none', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF5500, #FF1040)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px -4px rgba(255,85,0,0.53), 0 0 24px rgba(255,85,0,0.33)',
                marginTop: -4,
              }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" stroke="none"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>
              </div>
            </button>
          )
          return (
            <button key={path} onClick={() => navigate(path)} style={{ appearance: 'none', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '4px 10px',
                color: active ? '#FF5500' : 'rgba(250,250,248,0.55)',
              }}>
                {label === 'Home' && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 9-8 9 8M5 9v12h14V9"/></svg>}
                {label === 'Challenges' && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>}
                {label === 'Trips' && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.5C22 19 20 21 17.5 21S13 19 13 16.5c0-3.5 4.5-9 4.5-9S22 13 22 16.5ZM5.5 3 2 7.5l7 4-2 3h5l3-7-4.5-1L5.5 3Z"/></svg>}
                {label === 'You' && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
                <span style={{ fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
              </div>
            </button>
          )
        })}
      </nav>
    )
  }

  // Desktop: original top nav
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 'max(12px, env(safe-area-inset-top))',
      paddingBottom: '18px',
      paddingLeft: '24px',
      paddingRight: '24px',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(12px)',
    }}>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
      >
        <Logo />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {loggedIn && (
          <>
            <button onClick={() => navigate('/trips')}   style={GHOST}>Trips</button>
            <button onClick={() => navigate('/pricing')} style={GHOST}>Pricing</button>
          </>
        )}
        {!loggedIn && (
          <button onClick={() => navigate('/pricing')} style={GHOST}>Pricing</button>
        )}

        {loggedIn && user?.email && (
          <button
            onClick={() => navigate('/profile')}
            title="Profile"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--bg-card)', border: '1px solid var(--border-hot)',
              color: 'var(--orange)', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,85,0,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            {user.email[0].toUpperCase()}
          </button>
        )}

        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 14px',
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF1040'; e.currentTarget.style.color = '#FF1040' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            Sign out
          </button>
        )}

        {showDashboardBtn && (
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'linear-gradient(135deg, #FF5500, #FF1040)',
              border: 'none', borderRadius: 8, padding: '7px 16px',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              boxShadow: '0 0 16px rgba(255,85,0,0.25)',
            }}
          >Dashboard</button>
        )}

        {/* Hamburger still available on non-loggedIn mobile flows */}
        {!loggedIn && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{
                background: menuOpen ? '#1A1A1A' : 'transparent',
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '7px 9px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 6, minWidth: 200, zIndex: 200,
                boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
              }}>
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.onClick(); setMenuOpen(false) }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      borderRadius: 8, padding: '13px 16px',
                      color: item.danger ? '#FF1040' : 'var(--text-primary)',
                      fontSize: 15, fontWeight: item.danger ? 600 : 500,
                      cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      textAlign: 'left', transition: 'background 0.1s',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1A1A1A'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
