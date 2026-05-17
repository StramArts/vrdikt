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

  // On mobile, render a bottom tab bar instead of the top hamburger nav
  if (isMobile && loggedIn) {
    const TABS = [
      { label: 'Home',      path: '/dashboard', icon: '⊞' },
      { label: 'Trips',     path: '/trips',     icon: '✈' },
      { label: 'Upload',    path: '/upload',    icon: '＋' },
      { label: 'Challenges',path: '/challenge', icon: '⚡' },
      { label: 'Profile',   path: '/profile',   icon: '◎' },
    ]
    const current = typeof window !== 'undefined' ? window.location.pathname : ''

    return (
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        padding: '10px 0 28px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start',
        WebkitTapHighlightColor: 'transparent',
      }}>
        {TABS.map(({ label, path, icon }) => {
          const active = current === path || (path === '/dashboard' && current === '/')
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                background: 'transparent', border: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                cursor: 'pointer', padding: '0 8px', minWidth: 52,
              }}
            >
              {/* Active indicator bar */}
              <div style={{
                width: 18, height: 2, borderRadius: 1,
                background: active
                  ? 'linear-gradient(90deg, #FF5500, #FF1040)'
                  : 'transparent',
                marginBottom: 2,
                transition: 'background 0.2s',
              }} />
              <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
              <span style={{
                fontFamily: 'var(--font-ui)', fontWeight: 500, fontSize: 10,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: active ? 'var(--orange)' : 'var(--text-muted)',
                transition: 'color 0.2s',
              }}>{label}</span>
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
