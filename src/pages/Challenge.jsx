import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  getChallengeStatus, getStatusColor, getDaysRemaining, formatINR,
} from '../lib/challenges'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function Challenge() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [challenge, setChallenge]       = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [amount, setAmount]             = useState('')
  const [description, setDescription]  = useState('')
  const [adding, setAdding]             = useState(false)
  const [error, setError]               = useState('')
  const [deletingId, setDeletingId]     = useState(null)

  useEffect(() => {
    if (user) fetchData()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    setLoading(true)
    const { data: ch } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setChallenge(ch ?? null)

    if (ch) {
      const { data: txns } = await supabase
        .from('challenge_transactions')
        .select('*')
        .eq('challenge_id', ch.id)
        .order('created_at', { ascending: false })
      setTransactions(txns ?? [])
    }
    setLoading(false)
  }

  async function addTransaction() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0 || isNaN(amt)) {
      setError('Enter a valid amount greater than 0')
      return
    }
    if (!challenge) return

    setAdding(true)
    setError('')

    const { data: txn, error: txnErr } = await supabase
      .from('challenge_transactions')
      .insert({ challenge_id: challenge.id, user_id: user.id, amount: amt, description: description.trim() || null })
      .select()
      .single()

    if (txnErr) {
      setError('Failed to add — ' + txnErr.message)
      setAdding(false)
      return
    }

    const newTotal = Number(challenge.current_amount) + amt
    await supabase.from('challenges').update({ current_amount: newTotal }).eq('id', challenge.id)

    setChallenge(prev => ({ ...prev, current_amount: newTotal }))
    setTransactions(prev => [txn, ...prev])
    setAmount('')
    setDescription('')
    setAdding(false)
  }

  async function deleteTransaction(txn) {
    setDeletingId(txn.id)
    const { error: delErr } = await supabase
      .from('challenge_transactions')
      .delete()
      .eq('id', txn.id)

    if (delErr) {
      console.error('[VRDIKT] Delete failed:', delErr.message)
      setDeletingId(null)
      return
    }

    const newTotal = Math.max(0, Number(challenge.current_amount) - Number(txn.amount))
    await supabase.from('challenges').update({ current_amount: newTotal }).eq('id', challenge.id)

    setChallenge(prev => ({ ...prev, current_amount: newTotal }))
    setTransactions(prev => prev.filter(t => t.id !== txn.id))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100svh', background: '#0A0A0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: '32px', height: '32px',
          border: '2px solid #1A1A1A', borderTopColor: '#F5C518',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    )
  }

  if (!challenge) {
    return (
      <div style={{
        minHeight: '100svh', background: '#0A0A0A',
        fontFamily: 'Inter, sans-serif', color: '#F0F0F0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center',
      }}>
        <span style={{ fontSize: '48px' }}>🤷</span>
        <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
          No active challenge
        </h2>
        <p style={{ color: '#555', fontSize: '14px', margin: 0 }}>
          Complete onboarding to get your first challenge.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '8px', background: '#F5C518', border: 'none',
            borderRadius: '12px', padding: '12px 28px',
            color: '#0A0A0A', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  const status      = getChallengeStatus(challenge.current_amount, challenge.target_amount)
  const statusColor = getStatusColor(status)
  const pct         = Math.min((challenge.current_amount / challenge.target_amount) * 100, 100)
  const daysLeft = getDaysRemaining(challenge.month)
  // isOver is only true the day AFTER the last day of the challenge month.
  // daysLeft===0 alone is insufficient — it's also 0 on the final day itself.
  const isOver = (() => {
    if (!challenge.month) return false
    const [mName, yr] = challenge.month.split(' ')
    const ref      = new Date(`${mName} 1, ${yr}`)
    const lastDay  = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
    const today    = new Date()
    today.setHours(0, 0, 0, 0)
    return today > lastDay
  })()
  const saved       = challenge.target_amount - challenge.current_amount
  const overspent   = challenge.current_amount - challenge.target_amount
  const zomatoOrders = Math.round(overspent / 350)
  const monthName   = challenge.month?.split(' ')[0] ?? 'this month'

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
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent', border: 'none',
            color: '#555', fontSize: '13px', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#F0F0F0'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >
          ← Dashboard
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent', border: 'none', padding: 0,
            cursor: 'pointer', fontSize: '18px', fontWeight: 900,
            letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
        </button>
        <div style={{ width: '80px' }} />
      </nav>

      <div style={{ flex: 1, maxWidth: 600, width: '100%', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px', animation: 'fade-in 0.5s ease forwards' }}>
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900,
            letterSpacing: '-0.04em', margin: '0 0 6px', lineHeight: 1.1,
          }}>
            Your {monthName} Challenge
          </h1>
          <p style={{ color: '#F5C518', fontSize: '14px', fontWeight: 500, margin: 0, fontStyle: 'italic' }}>
            Can you actually do it this time?
          </p>
        </div>

        {/* ── End-of-month verdict ── */}
        {isOver && (
          <div style={{
            background: status === 'FAILED'
              ? 'rgba(255,59,48,0.07)' : 'rgba(48,209,88,0.07)',
            border: `1px solid ${status === 'FAILED' ? 'rgba(255,59,48,0.3)' : 'rgba(48,209,88,0.3)'}`,
            borderRadius: '20px', padding: '28px 24px',
            marginBottom: '20px', textAlign: 'center',
          }}>
            {status !== 'FAILED' ? (
              <>
                <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🏆</p>
                <h2 style={{ color: '#30D158', fontSize: '20px', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                  YOU DID IT.
                </h2>
                <p style={{ color: '#888', fontSize: '15px', margin: 0 }}>
                  You saved <span style={{ color: '#30D158', fontWeight: 700 }}>{formatINR(saved)}</span> this month. Genuinely impressed.
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '40px', margin: '0 0 12px' }}>💀</p>
                <h2 style={{ color: '#FF3B30', fontSize: '20px', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                  YOU FAILED.
                </h2>
                <p style={{ color: '#888', fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
                  You overspent by <span style={{ color: '#FF3B30', fontWeight: 700 }}>{formatINR(overspent)}</span>. That's approximately{' '}
                  <span style={{ color: '#FF3B30', fontWeight: 700 }}>{zomatoOrders} unnecessary Zomato orders</span>.
                  {' '}Congratulations on your choices.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Main challenge card ── */}
        <div style={{
          background: '#0D0D0D', border: '1px solid #161616',
          borderRadius: '20px', padding: '24px', marginBottom: '16px',
        }}>
          {/* Goal + status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
            <p style={{ color: '#C0C0C0', fontSize: '15px', fontWeight: 500, margin: 0, lineHeight: 1.5, flex: 1 }}>
              {challenge.goal}
            </p>
            <span style={{
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}44`,
              borderRadius: '20px', padding: '4px 10px',
              color: statusColor, fontSize: '10px',
              fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', flexShrink: 0,
            }}>
              {status}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ background: '#1A1A1A', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: statusColor,
                borderRadius: '6px',
                transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
          </div>

          {/* Amounts */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: statusColor, fontSize: '15px', fontWeight: 700 }}>
              {formatINR(challenge.current_amount)} spent
            </span>
            <span style={{ color: '#444', fontSize: '13px' }}>
              of {formatINR(challenge.target_amount)} limit
            </span>
          </div>

          {/* Days remaining */}
          {!isOver && (
            <p style={{ color: '#333', fontSize: '12px', margin: '12px 0 0', borderTop: '1px solid #161616', paddingTop: '12px' }}>
              {daysLeft === 1 ? '1 day left' : `${daysLeft} days left`} in {monthName}
              {daysLeft <= 5 && daysLeft > 0 && (
                <span style={{ color: '#FF3B30', marginLeft: '6px' }}>— final stretch</span>
              )}
            </p>
          )}
        </div>

        {/* ── Log transaction ── */}
        {!isOver && (
          <div style={{
            background: '#0D0D0D', border: '1px solid #161616',
            borderRadius: '20px', padding: '24px', marginBottom: '16px',
          }}>
            <p style={{
              color: '#555', fontSize: '11px', letterSpacing: '0.18em',
              textTransform: 'uppercase', fontWeight: 600, margin: '0 0 16px',
            }}>
              Log a Transaction
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ position: 'relative', flex: '0 0 120px' }}>
                <span style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: '#555', fontSize: '14px', fontWeight: 600, pointerEvents: 'none',
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && addTransaction()}
                  style={{
                    width: '100%', padding: '13px 12px 13px 26px',
                    background: '#0A0A0A', border: '1px solid #1C1C1C',
                    borderRadius: '12px', color: '#F0F0F0',
                    fontSize: '15px', fontFamily: 'Inter, sans-serif',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#F5C518'}
                  onBlur={e => e.target.style.borderColor = '#1C1C1C'}
                />
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTransaction()}
                style={{
                  flex: 1, padding: '13px 14px',
                  background: '#0A0A0A', border: '1px solid #1C1C1C',
                  borderRadius: '12px', color: '#F0F0F0',
                  fontSize: '14px', fontFamily: 'Inter, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#F5C518'}
                onBlur={e => e.target.style.borderColor = '#1C1C1C'}
              />
            </div>

            {error && (
              <p style={{ color: '#FF3B30', fontSize: '12px', margin: '0 0 10px', animation: 'slide-down 0.2s ease' }}>
                {error}
              </p>
            )}

            <button
              onClick={addTransaction}
              disabled={adding}
              style={{
                width: '100%', background: adding ? '#1A1A1A' : '#F5C518',
                border: 'none', borderRadius: '12px', padding: '13px 20px',
                color: adding ? '#333' : '#0A0A0A',
                fontSize: '14px', fontWeight: 700,
                cursor: adding ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { if (!adding) e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {adding ? 'Adding…' : 'Add Transaction'}
            </button>
          </div>
        )}

        {/* ── Transaction history ── */}
        {transactions.length > 0 && (
          <div style={{
            background: '#0D0D0D', border: '1px solid #161616',
            borderRadius: '20px', overflow: 'hidden',
          }}>
            <p style={{
              color: '#555', fontSize: '11px', letterSpacing: '0.18em',
              textTransform: 'uppercase', fontWeight: 600,
              margin: 0, padding: '20px 24px 16px',
              borderBottom: '1px solid #161616',
            }}>
              Transactions ({transactions.length})
            </p>
            {transactions.map((txn, i) => (
              <div
                key={txn.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 24px',
                  borderBottom: i < transactions.length - 1 ? '1px solid #111' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#111'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: txn.description ? '#C0C0C0' : '#555',
                    fontSize: '14px', fontWeight: txn.description ? 500 : 400,
                    margin: '0 0 2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {txn.description || 'No description'}
                  </p>
                  <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>
                    {formatDate(txn.created_at)}
                  </p>
                </div>
                <span style={{ color: '#FF3B30', fontSize: '15px', fontWeight: 700, flexShrink: 0 }}>
                  −{formatINR(txn.amount)}
                </span>
                <button
                  onClick={() => deleteTransaction(txn)}
                  disabled={deletingId === txn.id}
                  style={{
                    background: 'transparent', border: '1px solid #1E1E1E',
                    borderRadius: '8px', padding: '5px 10px',
                    color: '#333', fontSize: '11px', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', flexShrink: 0,
                    opacity: deletingId === txn.id ? 0.4 : 1,
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF3B30'; e.currentTarget.style.color = '#FF3B30' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#333' }}
                >
                  {deletingId === txn.id ? '…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}

        {transactions.length === 0 && !isOver && (
          <p style={{ color: '#2A2A2A', fontSize: '13px', textAlign: 'center', margin: '8px 0 0' }}>
            No transactions logged yet. Start tracking above.
          </p>
        )}
      </div>
    </div>
  )
}
