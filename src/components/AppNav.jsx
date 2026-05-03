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
    { label: 'Pricing',   onClick: () => navigate('/pricing') },
    ...(onSignOut ? [{ label: 'Sign out', onClick: onSignOut, danger: true }] : []),
  ]

  const loggedOutMenu = [
    { label: 'Pricing',     onClick: () => navigate('/pricing') },
    { label: 'Log in',      onClick: () => navigate('/auth') },
    { label: 'Get Roasted', onClick: () => navigate('/upload') },
  ]

  const menuItems = loggedIn ? loggedInMenu : loggedOutMenu

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 'max(12px, env(safe-area-inset-top))',
      paddingBottom: isMobile ? '14px' : '18px',
      paddingLeft: isMobile ? '16px' : '24px',
      paddingRight: isMobile ? '16px' : '24px',
      borderBottom: '1px solid #111',
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
    }}>
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}
      >
        <Logo />
      </button>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '14px' }}>

        {/* Desktop: secondary links */}
        {!isMobile && loggedIn && (
          <>
            <button onClick={() => navigate('/trips')}   style={GHOST}>Trips</button>
            <button onClick={() => navigate('/pricing')} style={GHOST}>Pricing</button>
          </>
        )}
        {!isMobile && !loggedIn && (
          <button onClick={() => navigate('/pricing')} style={GHOST}>Pricing</button>
        )}

        {/* Desktop: email badge */}
        {!isMobile && user?.email && (
          <span style={{ color: '#252525', fontSize: '13px' }}>{user.email}</span>
        )}

        {/* Desktop: sign out */}
        {!isMobile && onSignOut && (
          <button
            onClick={onSignOut}
            style={OUTLINE}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF3B30'; e.currentTarget.style.color = '#FF3B30' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#555' }}
          >
            Sign out
          </button>
        )}

        {/* Gold CTA — shown on all pages except the Dashboard itself */}
        {showDashboardBtn && (
          <button onClick={() => navigate('/dashboard')} style={GOLD}>
            Dashboard
          </button>
        )}

        {/* Hamburger — mobile only */}
        {isMobile && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{
                background: menuOpen ? '#1A1A1A' : 'transparent',
                border: '1px solid #1E1E1E', borderRadius: '8px',
                padding: '7px 9px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <HamburgerIcon open={menuOpen} />
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#111', border: '1px solid #1E1E1E',
                borderRadius: '14px', padding: '6px',
                minWidth: 200, zIndex: 200,
                boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
              }}>
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.onClick(); setMenuOpen(false) }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      borderRadius: '8px', padding: '13px 16px',
                      color: item.danger ? '#FF3B30' : '#C0C0C0',
                      fontSize: '15px', fontWeight: item.danger ? 600 : 500,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
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
