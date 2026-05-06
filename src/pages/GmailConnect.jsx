export default function GmailConnect() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = `${window.location.origin}/auth/gmail/callback`

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
  ].join(' ')

  function handleConnect() {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 480, width: '100%' }}>

        {/* Logo */}
        <div style={{ marginBottom: '40px' }}>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em' }}>
            <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: 1.1 }}>
          Automatic Transaction Tracking
        </h1>
        <p style={{ color: '#666', fontSize: '15px', lineHeight: 1.6, margin: '0 0 36px' }}>
          Connect Gmail to let VRDIKT automatically find your bank transactions. No more copy-pasting.
        </p>

        {/* Supported banks */}
        <div style={{
          background: '#0D0D0D', border: '1px solid #161616',
          borderRadius: '16px', padding: '20px', marginBottom: '20px',
        }}>
          <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 14px' }}>
            Supported Banks
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'IndusInd'].map(bank => (
              <span key={bank} style={{
                background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.15)',
                borderRadius: '20px', padding: '4px 12px',
                color: '#F5C518', fontSize: '12px', fontWeight: 600,
              }}>{bank}</span>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{
          background: '#0D0D0D', border: '1px solid #161616',
          borderRadius: '16px', padding: '20px', marginBottom: '20px',
        }}>
          {[
            ['No manual pasting', 'Transactions pulled directly from bank emails'],
            ['Auto-syncs', 'New transactions appear automatically'],
            ['Smart categorisation', 'Food, Shopping, Transport, and more'],
          ].map(([title, sub]) => (
            <div key={title} style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '1px',
              }}>
                <span style={{ color: '#30D158', fontSize: '11px', fontWeight: 900 }}>✓</span>
              </div>
              <div>
                <p style={{ color: '#F0F0F0', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>{title}</p>
                <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy */}
        <div style={{
          background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.1)',
          borderRadius: '12px', padding: '14px 16px', marginBottom: '28px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '14px', flexShrink: 0 }}>🔒</span>
          <p style={{ color: '#888', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: '#F5C518' }}>Privacy first.</strong> VRDIKT only reads transaction emails. We never store your full email content.
          </p>
        </div>

        <button
          onClick={handleConnect}
          style={{
            width: '100%', background: '#F5C518', border: 'none',
            borderRadius: '14px', padding: '16px 24px',
            color: '#0A0A0A', fontSize: '16px', fontWeight: 900,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.01em',
            boxShadow: '0 0 40px rgba(245,197,24,0.25)',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Connect Gmail →
        </button>
      </div>
    </div>
  )
}
