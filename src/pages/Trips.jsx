import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useMobile } from '../hooks/useMobile'
import { CURRENCIES, formatAmount } from '../lib/currency'
import AppNav from '../components/AppNav'

function Logo() {
  return (
    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
      <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
    </span>
  )
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const INPUT_STYLE = {
  width: '100%', background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '10px', padding: '11px 14px', color: '#F0F0F0',
  fontSize: '14px', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif', boxSizing: 'border-box',
  outline: 'none',
}

const LABEL_STYLE = {
  color: 'rgba(255,255,255,0.38)', fontSize: '11px', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px',
}

function TripCard({ trip, onClick }) {
  const cur = CURRENCIES[trip.currency] ?? CURRENCIES.INR
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px', padding: '20px', textAlign: 'left',
        cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#FF5500'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#F0F0F0', fontSize: '16px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {trip.name}
          </p>
          {trip.description && (
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', margin: '0 0 10px', lineHeight: 1.4 }}>
              {trip.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px',
              padding: '3px 8px', color: 'rgba(255,255,255,0.38)', fontSize: '11px', fontWeight: 600,
            }}>
              {cur.symbol} {trip.currency}
            </span>
            {trip.myRole === 'admin' && (
              <span style={{
                background: 'rgba(255,85,0,0.1)', border: '1px solid rgba(255,85,0,0.25)',
                borderRadius: '6px', padding: '3px 8px', color: '#FF5500', fontSize: '11px', fontWeight: 700,
              }}>
                ADMIN
              </span>
            )}
            {trip.start_date && (
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px' }}>
                {new Date(trip.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </span>
            )}
          </div>
        </div>
        {trip.budget && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', margin: '0 0 2px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Budget</p>
            <p style={{ color: '#F0F0F0', fontSize: '18px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              {formatAmount(trip.budget, trip.currency)}
            </p>
          </div>
        )}
      </div>
    </button>
  )
}

export default function Trips() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useMobile()

  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const [createForm, setCreateForm] = useState({
    name: '', description: '', currency: 'INR', budget: '', start_date: '', end_date: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => { fetchTrips() }, [])

  async function fetchTrips() {
    setLoading(true)
    const { data } = await supabase
      .from('trip_members')
      .select('role, trip:trips(*)')
      .eq('user_id', user.id)
    if (data) {
      const sorted = data
        .map(d => ({ ...d.trip, myRole: d.role }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setTrips(sorted)
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!createForm.name.trim()) { setCreateError('Trip name is required'); return }
    setCreating(true); setCreateError('')

    const code = genCode()
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .insert({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        currency: createForm.currency,
        total_budget: createForm.budget ? parseFloat(createForm.budget) : null,
        start_date: createForm.start_date || null,
        end_date: createForm.end_date || null,
        invite_code: code,
        created_by: user.id,
      })
      .select()
      .single()

    if (tripErr) { setCreateError(tripErr.message); setCreating(false); return }

    await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      role: 'admin',
    })

    setCreating(false)
    setShowCreate(false)
    navigate(`/trips/${trip.id}`)
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { setJoinError('Enter a valid 6-character code'); return }
    setJoining(true); setJoinError('')

    const { data: trip } = await supabase
      .from('trips')
      .select('*')
      .eq('invite_code', code)
      .single()

    if (!trip) { setJoinError('Trip not found. Check the code and try again.'); setJoining(false); return }

    const { data: existing } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) { setJoining(false); navigate(`/trips/${trip.id}`); return }

    const { error: joinErr } = await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      role: 'member',
    })

    if (joinErr) { setJoinError(joinErr.message); setJoining(false); return }

    setJoining(false)
    navigate(`/trips/${trip.id}`)
  }

  function closeCreate() {
    setShowCreate(false)
    setCreateError('')
    setCreateForm({ name: '', description: '', currency: 'INR', budget: '', start_date: '', end_date: '' })
  }

  function closeJoin() {
    setShowJoin(false)
    setJoinError('')
    setJoinCode('')
  }

  return (
    <div style={{
      minHeight: '100svh', background: '#0A0A0A',
      fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Nav */}
      <AppNav loggedIn showDashboardBtn />

      {/* Content */}
      <div style={{
        flex: 1, maxWidth: 680, width: '100%',
        margin: '0 auto', padding: '44px 20px 80px',
        display: 'flex', flexDirection: 'column', gap: '28px',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px' }}>
              Split It
            </p>
            <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1, fontFamily: 'var(--font-display, Outfit), sans-serif' }}>
              Group Trips
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowJoin(true)}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px',
                padding: '11px 18px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF5500'; e.currentTarget.style.color = '#FF5500' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            >
              Join Trip
            </button>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                background: 'linear-gradient(135deg,#FF5500,#FF1040)', border: 'none', borderRadius: '12px',
                padding: '11px 18px', color: '#fff', fontSize: '13px', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              + New Trip
            </button>
          </div>
        </div>

        {/* Trips list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', margin: 0 }}>Loading trips...</p>
          </div>
        ) : trips.length === 0 ? (
          <div style={{
            background: '#141414', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '20px',
            padding: '60px 24px', textAlign: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '38px', margin: '0 0 16px' }}>✈</p>
            <p style={{ color: '#F0F0F0', fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>No trips yet</p>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.5 }}>
              Create a trip and invite your group,<br />or join with an invite code.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  background: 'linear-gradient(135deg,#FF5500,#FF1040)', border: 'none', borderRadius: '10px',
                  padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                }}
              >
                Create Trip
              </button>
              <button
                onClick={() => setShowJoin(true)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px',
                  padding: '10px 20px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                }}
              >
                Join with Code
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {trips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/trips/${trip.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeCreate() }}
        >
          <div style={{
            background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px',
            padding: '28px', width: '100%', maxWidth: '480px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
              New Trip
            </p>
            <h2 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 24px', fontFamily: 'var(--font-display, Outfit), sans-serif' }}>
              Where are you going?
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={LABEL_STYLE}>Trip Name *</label>
                <input
                  style={INPUT_STYLE}
                  placeholder="Goa trip, Manali 2025..."
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Description</label>
                <input
                  style={INPUT_STYLE}
                  placeholder="Optional — add a note"
                  value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={LABEL_STYLE}>Currency</label>
                  <select
                    style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                    value={createForm.currency}
                    onChange={e => setCreateForm(f => ({ ...f, currency: e.target.value }))}
                  >
                    {Object.values(CURRENCIES).map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Budget (optional)</label>
                  <input
                    style={INPUT_STYLE}
                    type="number"
                    placeholder="0"
                    value={createForm.budget}
                    onChange={e => setCreateForm(f => ({ ...f, budget: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={LABEL_STYLE}>Start Date</label>
                  <input
                    style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
                    type="date"
                    value={createForm.start_date}
                    onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>End Date</label>
                  <input
                    style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
                    type="date"
                    value={createForm.end_date}
                    onChange={e => setCreateForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>

              {createError && (
                <p style={{ color: '#FF1040', fontSize: '13px', margin: 0 }}>{createError}</p>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={closeCreate}
                  style={{
                    flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '12px', padding: '13px',
                    color: 'rgba(255,255,255,0.38)', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  style={{
                    flex: 2, background: 'linear-gradient(135deg,#FF5500,#FF1040)', border: 'none',
                    borderRadius: '12px', padding: '13px',
                    color: '#fff', fontSize: '14px', fontWeight: 800,
                    cursor: creating ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ui, Space Grotesk), sans-serif', opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join modal */}
      {showJoin && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeJoin() }}
        >
          <div style={{
            background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px',
            padding: '28px', width: '100%', maxWidth: '400px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
              Join a Trip
            </p>
            <h2 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px', fontFamily: 'var(--font-display, Outfit), sans-serif' }}>
              Enter invite code
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', margin: '0 0 24px' }}>
              Ask the trip organiser for their 6-character code.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                style={{
                  ...INPUT_STYLE,
                  textAlign: 'center', fontSize: '22px', fontWeight: 900,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  padding: '14px',
                }}
                placeholder="ABC123"
                maxLength={6}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />

              {joinError && (
                <p style={{ color: '#FF1040', fontSize: '13px', margin: 0 }}>{joinError}</p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={closeJoin}
                  style={{
                    flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '12px', padding: '13px',
                    color: 'rgba(255,255,255,0.38)', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font-ui, Space Grotesk), sans-serif',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{
                    flex: 2, background: 'linear-gradient(135deg,#FF5500,#FF1040)', border: 'none',
                    borderRadius: '12px', padding: '13px',
                    color: '#fff', fontSize: '14px', fontWeight: 800,
                    cursor: joining ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ui, Space Grotesk), sans-serif', opacity: joining ? 0.7 : 1,
                  }}
                >
                  {joining ? 'Joining...' : 'Join Trip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
