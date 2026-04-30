import { useState, useId, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMobile } from '../hooks/useMobile'
import { useAuth } from '../contexts/AuthContext'

// ─── Error message normaliser ─────────────────────────────────────────────────

function friendlyError(error) {
  if (!error) return ''
  const msg = (error.message ?? '').toLowerCase()
  if (msg.includes('invalid login credentials'))  return 'Incorrect email or password.'
  if (msg.includes('email not confirmed'))         return 'Please verify your email before logging in. Check your inbox.'
  if (msg.includes('user already registered'))     return 'An account with this email already exists. Try logging in instead.'
  if (msg.includes('password should be at least')) return 'Password must be at least 6 characters.'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a moment and try again.'
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error — check your connection and try again.'
  if (msg.includes('placeholder'))                 return 'Supabase is not configured yet. Add your keys to .env (see .env.example).'
  return error.message || 'Something went wrong. Please try again.'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function Spinner({ dark = true }) {
  return (
    <span style={{
      display: 'inline-block',
      width: '18px', height: '18px',
      border: dark ? '2px solid rgba(10,10,10,0.3)' : '2px solid rgba(245,197,24,0.2)',
      borderTopColor: dark ? '#0A0A0A' : '#F5C518',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ─── Floating Label Input ─────────────────────────────────────────────────────

function FloatingInput({ label, type = 'text', value, onChange, error, autoComplete, disabled }) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const isPassword = type === 'password'
  const isActive   = focused || value.length > 0

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={isPassword ? (showPw ? 'text' : 'password') : type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        disabled={disabled}
        style={{
          width: '100%',
          background: disabled ? '#0D0D0D' : '#0F0F0F',
          border: `1.5px solid ${error ? '#FF3B30' : focused ? '#F5C518' : '#1E1E1E'}`,
          borderRadius: '12px',
          padding: isActive ? '22px 16px 8px' : '15px 16px',
          paddingRight: isPassword ? '48px' : '16px',
          color: disabled ? '#4A4A4A' : '#F0F0F0',
          fontSize: '15px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          outline: 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, padding 0.18s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(255,59,48,0.1)' : 'rgba(245,197,24,0.08)'}` : 'none',
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'text',
          WebkitTapHighlightColor: 'transparent',
        }}
      />
      <label
        htmlFor={id}
        style={{
          position: 'absolute',
          left: '16px',
          top: isActive ? '7px' : '50%',
          transform: isActive ? 'none' : 'translateY(-50%)',
          fontSize: isActive ? '10px' : '15px',
          color: error ? '#FF3B30' : focused ? '#F5C518' : '#555',
          fontWeight: isActive ? 700 : 400,
          letterSpacing: isActive ? '0.06em' : 0,
          textTransform: isActive ? 'uppercase' : 'none',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
          fontFamily: 'Inter, sans-serif',
          userSelect: 'none',
        }}
      >
        {label}
      </label>
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          tabIndex={-1}
          style={{
            position: 'absolute', right: '14px', top: '50%',
            transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: focused ? '#F5C518' : '#555',
            padding: '4px', display: 'flex', alignItems: 'center',
            transition: 'color 0.2s', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {showPw ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
    </div>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <p style={{
      margin: '6px 0 0 4px', fontSize: '12px', color: '#FF3B30', fontWeight: 500,
      animation: 'slide-down 0.2s ease forwards',
      display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      <span style={{ fontSize: '10px' }}>●</span> {message}
    </p>
  )
}

// ─── Email confirmation success state ─────────────────────────────────────────

function EmailSent({ email, onBack }) {
  return (
    <div style={{ textAlign: 'center', animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards', opacity: 0 }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '20px',
        background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', margin: '0 auto 24px',
      }}>
        ✉️
      </div>
      <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', color: '#F0F0F0' }}>
        Check your inbox
      </h2>
      <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#6B6B6B', lineHeight: 1.65 }}>
        We sent a verification link to
      </p>
      <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#F5C518', fontWeight: 600 }}>
        {email}
      </p>
      <p style={{ margin: '0 0 32px', fontSize: '13px', color: '#444', lineHeight: 1.65 }}>
        Click the link in the email to activate your account, then come back to log in.
      </p>
      <button
        onClick={onBack}
        style={{
          background: 'transparent', border: '1.5px solid #1E1E1E',
          borderRadius: '12px', padding: '13px 32px',
          color: '#F0F0F0', fontSize: '14px', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          transition: 'border-color 0.2s', WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#F5C518'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1E'}
      >
        Back to Log In
      </button>
    </div>
  )
}

// ─── Auth Page ────────────────────────────────────────────────────────────────

const TABS = ['login', 'signup']

export default function Auth() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isMobile  = useMobile()
  const { user, signIn, signUp, signInWithGoogle } = useAuth()

  // After login/OAuth redirect, go back to wherever the user came from
  const from = location.state?.from?.pathname || '/dashboard'

  // Already signed in → redirect immediately
  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  const [tab, setTab]                       = useState('login')
  const [loading, setLoading]               = useState(false)
  const [googleLoading, setGoogleLoading]   = useState(false)
  const [shaking, setShaking]               = useState(false)
  const [globalError, setGlobalError]       = useState('')
  const [signupDone, setSignupDone]         = useState(false)

  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors]                 = useState({})

  function switchTab(t) {
    setTab(t); setErrors({}); setGlobalError('')
    setEmail(''); setPassword(''); setConfirmPassword('')
    setSignupDone(false)
  }

  function validate() {
    const e = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address'
    if (!password) e.password = 'Password is required'
    else if (tab === 'signup' && password.length < 8) e.password = 'Password must be at least 8 characters'
    if (tab === 'signup') {
      if (!confirmPassword) e.confirmPassword = 'Please confirm your password'
      else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match'
    }
    return e
  }

  function triggerShake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGlobalError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs); triggerShake(); return
    }
    setErrors({})
    setLoading(true)

    if (tab === 'signup') {
      const { error } = await signUp(email, password)
      setLoading(false)
      if (error) { setGlobalError(friendlyError(error)); triggerShake(); return }
      setSignupDone(true)
    } else {
      const { error } = await signIn(email, password)
      setLoading(false)
      if (error) { setGlobalError(friendlyError(error)); triggerShake(); return }
      // onAuthStateChange fires → useEffect above handles redirect
    }
  }

  async function handleGoogle() {
    setGlobalError('')
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    // On success the browser redirects away; we only reach here on error
    setGoogleLoading(false)
    if (error) setGlobalError(friendlyError(error))
  }

  const busy = loading || googleLoading

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>

      {/* Background glows */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(245,197,24,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-10%',
          width: '400px', height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(255,59,48,0.03) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(245,197,24,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,197,24,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }} />
      </div>

      {/* Back to home */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed', top: '20px', left: isMobile ? '16px' : '28px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#555', fontSize: '13px', fontFamily: 'Inter, sans-serif',
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px', borderRadius: '8px', transition: 'color 0.2s',
          WebkitTapHighlightColor: 'transparent', zIndex: 10,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#F5C518'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </button>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '420px',
        animation: shaking
          ? 'shake 0.45s ease'
          : 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        opacity: shaking ? 1 : undefined,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span onClick={() => navigate('/')} style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.04em', cursor: 'pointer' }}>
            <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
          </span>
          {!signupDone && (
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#555' }}>
              {tab === 'login' ? 'Welcome back. Ready for more truth?' : 'Join 47,000+ people facing their finances.'}
            </p>
          )}
        </div>

        {/* Email-confirmed success view */}
        {signupDone ? (
          <EmailSent email={email} onBack={() => switchTab('login')} />
        ) : (
          <>
            {/* Tab switcher */}
            <div style={{
              display: 'flex', background: '#0F0F0F',
              border: '1px solid #1A1A1A', borderRadius: '12px',
              padding: '4px', marginBottom: '28px',
            }}>
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  style={{
                    flex: 1,
                    background: tab === t ? '#1A1A1A' : 'transparent',
                    border: 'none', borderRadius: '9px', padding: '10px',
                    color: tab === t ? '#F0F0F0' : '#555',
                    fontSize: '14px', fontWeight: tab === t ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s ease',
                    letterSpacing: tab === t ? '-0.01em' : 0,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {t === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Global error banner */}
            {globalError && (
              <div style={{
                background: 'rgba(255,59,48,0.08)',
                border: '1px solid rgba(255,59,48,0.25)',
                borderRadius: '10px', padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                animation: 'slide-down 0.25s ease forwards',
              }}>
                <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>⚠</span>
                <p style={{ margin: 0, fontSize: '13px', color: '#FF3B30', fontWeight: 500, lineHeight: 1.5 }}>
                  {globalError}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column' }}>

              <div style={{ marginBottom: errors.email ? '4px' : '16px' }}>
                <FloatingInput
                  label="Email address" type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
                  error={errors.email} autoComplete="email" disabled={busy}
                />
                <FieldError message={errors.email} />
              </div>

              <div style={{ marginBottom: errors.password ? '4px' : tab === 'signup' ? '16px' : '8px' }}>
                <FloatingInput
                  label="Password" type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                  error={errors.password}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  disabled={busy}
                />
                <FieldError message={errors.password} />
              </div>

              {tab === 'login' && !errors.password && (
                <div style={{ textAlign: 'right', marginBottom: '20px', marginTop: '-4px' }}>
                  <button
                    type="button"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#555', fontSize: '12px', fontFamily: 'Inter, sans-serif',
                      transition: 'color 0.2s', padding: '2px 0',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F5C518'}
                    onMouseLeave={e => e.currentTarget.style.color = '#555'}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {tab === 'signup' && (
                <div style={{ marginBottom: errors.confirmPassword ? '4px' : '20px' }}>
                  <FloatingInput
                    label="Confirm password" type="password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })) }}
                    error={errors.confirmPassword}
                    autoComplete="new-password" disabled={busy}
                  />
                  <FieldError message={errors.confirmPassword} />
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                style={{
                  width: '100%', background: loading ? '#C9A414' : '#F5C518',
                  border: 'none', borderRadius: '12px', padding: '16px',
                  color: '#0A0A0A', fontSize: '15px', fontWeight: 800,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  boxShadow: loading ? 'none' : '0 0 30px rgba(245,197,24,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: errors.confirmPassword ? '12px' : '0',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = '#FFD740'; e.currentTarget.style.boxShadow = '0 0 40px rgba(245,197,24,0.35)' } }}
                onMouseLeave={e => { if (!busy) { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.boxShadow = '0 0 30px rgba(245,197,24,0.2)' } }}
              >
                {loading ? <Spinner dark /> : tab === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#1A1A1A' }} />
              <span style={{ fontSize: '12px', color: '#333', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#1A1A1A' }} />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              style={{
                width: '100%', background: '#111111',
                border: `1.5px solid ${googleLoading ? '#F5C518' : '#1E1E1E'}`,
                borderRadius: '12px', padding: '14px',
                color: '#F0F0F0', fontSize: '14px', fontWeight: 500,
                cursor: busy ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = '#161616' } }}
              onMouseLeave={e => { if (!busy) { e.currentTarget.style.borderColor = googleLoading ? '#F5C518' : '#1E1E1E'; e.currentTarget.style.background = '#111111' } }}
            >
              {googleLoading ? <Spinner dark={false} /> : <GoogleLogo />}
              {!googleLoading && 'Continue with Google'}
            </button>

            {/* Footer copy */}
            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#3A3A3A', lineHeight: 1.7 }}>
              {tab === 'signup' ? (
                <>
                  By signing up you agree to our{' '}
                  <a href="#" style={{ color: '#555', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F5C518'}
                    onMouseLeave={e => e.currentTarget.style.color = '#555'}>Terms</a>
                  {' '}and{' '}
                  <a href="#" style={{ color: '#555', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F5C518'}
                    onMouseLeave={e => e.currentTarget.style.color = '#555'}>Privacy Policy</a>.
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => switchTab('signup')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#F5C518', fontWeight: 600, fontSize: '12px',
                      fontFamily: 'Inter, sans-serif', padding: 0,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Sign up free
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
