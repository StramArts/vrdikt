import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useMobile } from '../hooks/useMobile'
import { formatAmount } from '../lib/currency'
import { calculateSettlements, getMemberTotals } from '../lib/tripCalculations'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// ─── constants ─────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
      <span style={{ color: '#F0F0F0' }}>VRD</span><span style={{ color: '#F5C518' }}>IKT</span>
    </span>
  )
}

const EXPENSE_CATEGORIES = [
  { key: 'food',          label: 'Food',          color: '#FF3B30' },
  { key: 'accommodation', label: 'Stay',           color: '#F5C518' },
  { key: 'transport',     label: 'Transport',      color: '#4CAF50' },
  { key: 'activities',    label: 'Activities',     color: '#AF52DE' },
  { key: 'shopping',      label: 'Shopping',       color: '#FF9500' },
  { key: 'other',         label: 'Other',          color: '#636366' },
]

const TABS = [
  { id: 'expenses', label: 'EXPENSES' },
  { id: 'summary',  label: 'SUMMARY'  },
  { id: 'balances', label: 'BALANCES' },
  { id: 'members',  label: 'MEMBERS'  },
]

const INPUT_STYLE = {
  width: '100%', background: '#0A0A0A', border: '1px solid #1E1E1E',
  borderRadius: '10px', padding: '11px 14px', color: '#F0F0F0',
  fontSize: '14px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  outline: 'none',
}

const LABEL_STYLE = {
  color: '#444', fontSize: '11px', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px',
}

function emailLabel(email) {
  if (!email) return 'Unknown'
  return email.split('@')[0]
}

function catColor(key) {
  return EXPENSE_CATEGORIES.find(c => c.key === key)?.color ?? '#636366'
}

function catLabel(key) {
  return EXPENSE_CATEGORIES.find(c => c.key === key)?.label ?? key
}

// ─── sub-components ────────────────────────────────────────────────────────────

function TabPill({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        background: active ? '#F5C518' : 'transparent',
        border: `1px solid ${active ? '#F5C518' : '#1E1E1E'}`,
        borderRadius: '999px', padding: '8px 18px',
        color: active ? '#0A0A0A' : '#555',
        fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em',
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#F5C518'; e.currentTarget.style.color = '#F5C518' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#555' } }}
    >
      {label}
    </button>
  )
}

// ─── Expenses Tab ──────────────────────────────────────────────────────────────

function ExpensesTab({ trip, expenses, members, splits, user, onAdd, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    description: '', amount: '', category: 'food', paid_by: user.id,
  })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  function closeAdd() {
    setShowAdd(false); setAddError('')
    setForm({ description: '', amount: '', category: 'food', paid_by: user.id })
  }

  async function handleAdd() {
    if (!form.description.trim()) { setAddError('Description is required'); return }
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { setAddError('Enter a valid amount'); return }
    if (!members.length) { setAddError('No members in this trip'); return }

    setAdding(true); setAddError('')

    const { data: expense, error: expErr } = await supabase
      .from('trip_expenses')
      .insert({
        trip_id: trip.id,
        paid_by: form.paid_by,
        description: form.description.trim(),
        amount: amt,
        category: form.category,
      })
      .select()
      .single()

    if (expErr) { setAddError(expErr.message); setAdding(false); return }

    const splitAmt = Math.round((amt / members.length) * 100) / 100
    const splitRows = members.map(m => ({
      expense_id: expense.id,
      trip_id: trip.id,
      user_id: m.user_id,
      amount: splitAmt,
      settled: false,
    }))

    await supabase.from('trip_expense_splits').insert(splitRows)

    setAdding(false)
    closeAdd()
    onRefresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: '#444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: '#F5C518', border: 'none', borderRadius: '10px',
            padding: '9px 16px', color: '#0A0A0A', fontSize: '13px', fontWeight: 800,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          + Add Expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div style={{
          background: '#0D0D0D', border: '1px dashed #1A1A1A', borderRadius: '16px',
          padding: '40px', textAlign: 'center',
        }}>
          <p style={{ color: '#333', fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>No expenses yet</p>
          <p style={{ color: '#222', fontSize: '12px', margin: 0 }}>Add the first expense and split it with your group.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {expenses.map(exp => {
            const payer = members.find(m => m.user_id === exp.paid_by)
            const expSplits = splits.filter(s => s.expense_id === exp.id)
            return (
              <div
                key={exp.id}
                style={{
                  background: '#0D0D0D', border: '1px solid #161616',
                  borderRadius: '14px', padding: '16px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: catColor(exp.category), flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#F0F0F0', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>
                    {exp.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#333', fontSize: '11px' }}>
                      Paid by {payer ? emailLabel(payer.email) : 'someone'}
                    </span>
                    <span style={{ color: '#1E1E1E', fontSize: '11px' }}>·</span>
                    <span style={{ color: '#333', fontSize: '11px' }}>{catLabel(exp.category)}</span>
                    <span style={{ color: '#1E1E1E', fontSize: '11px' }}>·</span>
                    <span style={{ color: '#333', fontSize: '11px' }}>
                      {new Date(exp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {expSplits.length > 0 && (
                    <p style={{ color: '#222', fontSize: '11px', margin: '4px 0 0' }}>
                      Split {expSplits.length} way{expSplits.length !== 1 ? 's' : ''} · {formatAmount(expSplits[0]?.amount ?? 0, trip.currency)} each
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ color: '#F5C518', fontSize: '17px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                    {formatAmount(exp.amount, trip.currency)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Expense modal */}
      {showAdd && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeAdd() }}
        >
          <div style={{
            background: '#111', border: '1px solid #1E1E1E', borderRadius: '24px',
            padding: '28px', width: '100%', maxWidth: '440px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <p style={{ color: '#333', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
              Add Expense
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
              What did you spend on?
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={LABEL_STYLE}>Description</label>
                <input
                  style={INPUT_STYLE}
                  placeholder="Hotel, dinner, tickets..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Amount ({trip.currency})</label>
                <input
                  style={INPUT_STYLE}
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Category</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                      style={{
                        background: form.category === cat.key ? cat.color : 'transparent',
                        border: `1px solid ${form.category === cat.key ? cat.color : '#1E1E1E'}`,
                        borderRadius: '8px', padding: '7px 12px',
                        color: form.category === cat.key ? '#0A0A0A' : '#555',
                        fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={LABEL_STYLE}>Paid by</label>
                <select
                  style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                  value={form.paid_by}
                  onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}
                >
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {emailLabel(m.email)} {m.user_id === user.id ? '(you)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{
                background: '#0A0A0A', border: '1px solid #1A1A1A',
                borderRadius: '10px', padding: '12px 14px',
              }}>
                <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>
                  Split equally among all {members.length} member{members.length !== 1 ? 's' : ''}
                  {form.amount ? ` · ${formatAmount(Math.round((parseFloat(form.amount) / members.length) * 100) / 100, trip.currency)} each` : ''}
                </p>
              </div>

              {addError && (
                <p style={{ color: '#FF3B30', fontSize: '13px', margin: 0 }}>{addError}</p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={closeAdd}
                  style={{
                    flex: 1, background: 'transparent', border: '1px solid #1E1E1E',
                    borderRadius: '12px', padding: '13px',
                    color: '#444', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  style={{
                    flex: 2, background: '#F5C518', border: 'none',
                    borderRadius: '12px', padding: '13px',
                    color: '#0A0A0A', fontSize: '14px', fontWeight: 800,
                    cursor: adding ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif', opacity: adding ? 0.7 : 1,
                  }}
                >
                  {adding ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Summary Tab ───────────────────────────────────────────────────────────────

function SummaryTab({ trip, expenses, members, splits }) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const memberTotals = getMemberTotals(members, expenses, splits)

  const catMap = {}
  for (const exp of expenses) {
    const key = exp.category
    if (!catMap[key]) catMap[key] = { amount: 0, color: catColor(key), label: catLabel(key) }
    catMap[key].amount += Number(exp.amount)
  }
  const donutData = Object.entries(catMap).map(([, v]) => v).sort((a, b) => b.amount - a.amount)

  if (expenses.length === 0) {
    return (
      <div style={{
        background: '#0D0D0D', border: '1px dashed #1A1A1A', borderRadius: '16px',
        padding: '40px', textAlign: 'center',
      }}>
        <p style={{ color: '#333', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>No expenses yet</p>
        <p style={{ color: '#222', fontSize: '12px', margin: 0 }}>Summary will appear once you add expenses.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Total */}
      <div style={{
        background: '#0D0D0D', border: '1px solid #161616', borderRadius: '20px', padding: '22px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px' }}>
          Total Spent
        </p>
        <p style={{ color: '#F5C518', fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>
          {formatAmount(total, trip.currency)}
        </p>
        {trip.budget && (
          <p style={{ color: '#333', fontSize: '12px', margin: '6px 0 0' }}>
            of {formatAmount(trip.budget, trip.currency)} budget
            {' '}({Math.round((total / trip.budget) * 100)}%)
          </p>
        )}
      </div>

      {/* Donut */}
      {donutData.length > 0 && (
        <div style={{ background: '#0D0D0D', border: '1px solid #161616', borderRadius: '20px', padding: '22px' }}>
          <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 16px' }}>
            By Category
          </p>
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [formatAmount(value, trip.currency), name]}
                  contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none',
            }}>
              <p style={{ color: '#F5C518', fontSize: '18px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                {formatAmount(total, trip.currency)}
              </p>
              <p style={{ color: '#333', fontSize: '10px', margin: 0 }}>total</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {donutData.map(cat => (
              <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ color: '#888', fontSize: '12px', flex: 1 }}>{cat.label}</span>
                <span style={{ color: '#F0F0F0', fontSize: '12px', fontWeight: 700 }}>
                  {formatAmount(cat.amount, trip.currency)}
                </span>
                <span style={{ color: '#333', fontSize: '11px', width: '36px', textAlign: 'right' }}>
                  {Math.round((cat.amount / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per person */}
      <div style={{ background: '#0D0D0D', border: '1px solid #161616', borderRadius: '20px', padding: '22px' }}>
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 16px' }}>
          Per Person
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {memberTotals.sort((a, b) => b.paid - a.paid).map(m => (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#1A1A1A', border: '1px solid #252525',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#555', fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>
                {(m.email?.[0] ?? '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#F0F0F0', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>
                  {emailLabel(m.email)}
                </p>
                <p style={{ color: '#333', fontSize: '11px', margin: 0 }}>
                  Paid {formatAmount(m.paid, trip.currency)} · Share {formatAmount(m.owes, trip.currency)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  color: m.net >= 0 ? '#30D158' : '#FF3B30',
                  fontSize: '14px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em',
                }}>
                  {m.net >= 0 ? '+' : ''}{formatAmount(m.net, trip.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Balances Tab ──────────────────────────────────────────────────────────────

function BalancesTab({ trip, expenses, members, splits, onRefresh }) {
  const [settling, setSettling] = useState(null)

  const unsettledSplits = splits.filter(s => !s.settled)
  const settlements = calculateSettlements(members, expenses, unsettledSplits)

  async function markSettled(settlement) {
    setSettling(`${settlement.from}-${settlement.to}`)
    const paidByCreditor = expenses.filter(e => e.paid_by === settlement.to).map(e => e.id)
    if (paidByCreditor.length) {
      await supabase
        .from('trip_expense_splits')
        .update({ settled: true })
        .eq('user_id', settlement.from)
        .in('expense_id', paidByCreditor)
        .eq('settled', false)
    }
    setSettling(null)
    onRefresh()
  }

  const memberMap = {}
  for (const m of members) memberMap[m.user_id] = m

  if (expenses.length === 0) {
    return (
      <div style={{
        background: '#0D0D0D', border: '1px dashed #1A1A1A', borderRadius: '16px',
        padding: '40px', textAlign: 'center',
      }}>
        <p style={{ color: '#333', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>Nothing to settle</p>
        <p style={{ color: '#222', fontSize: '12px', margin: 0 }}>Add expenses and balances will appear here.</p>
      </div>
    )
  }

  if (settlements.length === 0) {
    return (
      <div style={{
        background: '#0D0D0D', border: '1px solid #161616', borderRadius: '20px',
        padding: '40px', textAlign: 'center',
      }}>
        <p style={{ color: '#30D158', fontSize: '24px', margin: '0 0 12px' }}>All squared up!</p>
        <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>Everyone is settled. No outstanding balances.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ color: '#444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
        {settlements.length} outstanding settlement{settlements.length !== 1 ? 's' : ''}
      </p>
      {settlements.map((s, i) => {
        const from = memberMap[s.from]
        const to = memberMap[s.to]
        const key = `${s.from}-${s.to}`
        const isSettling = settling === key

        return (
          <div
            key={i}
            style={{
              background: '#0D0D0D', border: '1px solid #161616',
              borderRadius: '16px', padding: '18px',
              display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: '#F0F0F0', fontSize: '14px', fontWeight: 700 }}>
                  {emailLabel(from?.email)}
                </span>
                <span style={{ color: '#333', fontSize: '12px' }}>owes</span>
                <span style={{ color: '#F0F0F0', fontSize: '14px', fontWeight: 700 }}>
                  {emailLabel(to?.email)}
                </span>
              </div>
              <p style={{ color: '#FF3B30', fontSize: '20px', fontWeight: 900, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                {formatAmount(s.amount, trip.currency)}
              </p>
            </div>
            <button
              onClick={() => markSettled(s)}
              disabled={!!isSettling}
              style={{
                background: 'transparent', border: '1px solid #30D158',
                borderRadius: '10px', padding: '9px 16px',
                color: '#30D158', fontSize: '12px', fontWeight: 700,
                cursor: isSettling ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif', flexShrink: 0,
                opacity: isSettling ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isSettling) e.currentTarget.style.background = 'rgba(48,209,88,0.08)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {isSettling ? 'Settling...' : 'Mark Settled'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Members Tab ───────────────────────────────────────────────────────────────

function MembersTab({ trip, members, expenses, splits }) {
  const [copied, setCopied] = useState(false)
  const memberTotals = getMemberTotals(members, expenses, splits)

  function copyCode() {
    navigator.clipboard.writeText(trip.invite_code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Join my trip "${trip.name}" on VRDIKT! Use invite code: ${trip.invite_code}\nhttps://vrdikt.com/trips`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Members list */}
      <div style={{ background: '#0D0D0D', border: '1px solid #161616', borderRadius: '20px', padding: '22px' }}>
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 16px' }}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {memberTotals.map(m => (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#1A1A1A', border: '1px solid #252525',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#555', fontSize: '13px', fontWeight: 800, flexShrink: 0,
              }}>
                {(m.email?.[0] ?? '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ color: '#F0F0F0', fontSize: '13px', fontWeight: 700, margin: 0 }}>
                    {emailLabel(m.email)}
                  </p>
                  {m.role === 'admin' && (
                    <span style={{
                      background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)',
                      borderRadius: '4px', padding: '1px 6px', color: '#F5C518', fontSize: '9px', fontWeight: 800,
                      letterSpacing: '0.1em',
                    }}>
                      ADMIN
                    </span>
                  )}
                </div>
                <p style={{ color: '#333', fontSize: '11px', margin: '2px 0 0' }}>
                  Paid {formatAmount(m.paid, trip.currency)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  color: m.net >= 0 ? '#30D158' : '#FF3B30',
                  fontSize: '14px', fontWeight: 900, margin: 0,
                }}>
                  {m.net >= 0 ? '+' : ''}{formatAmount(m.net, trip.currency)}
                </p>
                <p style={{ color: '#333', fontSize: '10px', margin: '2px 0 0' }}>
                  {m.net >= 0 ? 'to receive' : 'to pay'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite section */}
      <div style={{ background: '#0D0D0D', border: '1px solid #161616', borderRadius: '20px', padding: '22px' }}>
        <p style={{ color: '#444', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
          Invite to Trip
        </p>
        <p style={{ color: '#333', fontSize: '13px', margin: '0 0 16px' }}>
          Share this code with anyone you want to add.
        </p>

        <div style={{
          background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '14px',
          padding: '18px', textAlign: 'center', marginBottom: '14px',
        }}>
          <p style={{ color: '#F5C518', fontSize: '32px', fontWeight: 900, letterSpacing: '0.28em', margin: 0 }}>
            {trip.invite_code}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={copyCode}
            style={{
              flex: 1, background: copied ? 'rgba(48,209,88,0.08)' : 'transparent',
              border: `1px solid ${copied ? '#30D158' : '#1E1E1E'}`,
              borderRadius: '10px', padding: '11px',
              color: copied ? '#30D158' : '#555', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
            }}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <button
            onClick={shareWhatsApp}
            style={{
              flex: 1, background: 'rgba(37,211,102,0.08)',
              border: '1px solid rgba(37,211,102,0.2)',
              borderRadius: '10px', padding: '11px',
              color: '#25D366', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,211,102,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,211,102,0.08)'}
          >
            Share on WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useMobile()

  const [tab, setTab] = useState('expenses')
  const [trip, setTrip] = useState(null)
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [splits, setSplits] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchData = useCallback(async () => {
    const [tripRes, membersRes, expensesRes, splitsRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('trip_members').select('*').eq('trip_id', id),
      supabase.from('trip_expenses').select('*').eq('trip_id', id).order('created_at', { ascending: false }),
      supabase.from('trip_expense_splits').select('*').eq('trip_id', id),
    ])

    if (tripRes.error || !tripRes.data) { setNotFound(true); setLoading(false); return }

    setTrip(tripRes.data)
    setMembers(membersRes.data ?? [])
    setExpenses(expensesRes.data ?? [])
    setSplits(splitsRes.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{
        minHeight: '100svh', background: '#0A0A0A', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}>
        <p style={{ color: '#2A2A2A', fontSize: '13px' }}>Loading trip...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{
        minHeight: '100svh', background: '#0A0A0A', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <p style={{ color: '#333', fontSize: '16px', fontWeight: 700 }}>Trip not found</p>
        <button
          onClick={() => navigate('/trips')}
          style={{
            background: '#F5C518', border: 'none', borderRadius: '10px',
            padding: '10px 20px', color: '#0A0A0A', fontSize: '13px', fontWeight: 800,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Back to Trips
        </button>
      </div>
    )
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/trips')}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              color: '#444', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            All Trips
          </button>
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

      {/* Content */}
      <div style={{
        flex: 1, maxWidth: 800, width: '100%',
        margin: '0 auto', padding: '44px 20px 80px',
        display: 'flex', flexDirection: 'column', gap: '24px',
      }}>

        {/* Trip header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#333', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>
                Group Trip
              </p>
              <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>
                {trip.name}
              </h1>
              {trip.description && (
                <p style={{ color: '#444', fontSize: '13px', margin: '6px 0 0', lineHeight: 1.4 }}>
                  {trip.description}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {trip.start_date && (
                <p style={{ color: '#333', fontSize: '12px', margin: '0 0 4px' }}>
                  {new Date(trip.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              )}
              <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
                {members.length} member{members.length !== 1 ? 's' : ''} · {trip.currency}
              </p>
            </div>
          </div>
        </div>

        {/* Tab pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {TABS.map(t => (
            <TabPill key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={setTab} />
          ))}
        </div>

        {/* Tab content */}
        {tab === 'expenses' && (
          <ExpensesTab
            trip={trip}
            expenses={expenses}
            members={members}
            splits={splits}
            user={user}
            onRefresh={fetchData}
          />
        )}
        {tab === 'summary' && (
          <SummaryTab
            trip={trip}
            expenses={expenses}
            members={members}
            splits={splits}
          />
        )}
        {tab === 'balances' && (
          <BalancesTab
            trip={trip}
            expenses={expenses}
            members={members}
            splits={splits}
            onRefresh={fetchData}
          />
        )}
        {tab === 'members' && (
          <MembersTab
            trip={trip}
            members={members}
            expenses={expenses}
            splits={splits}
          />
        )}
      </div>
    </div>
  )
}
