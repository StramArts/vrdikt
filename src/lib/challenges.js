export const CHALLENGE_CONFIGS = {
  food_delivery:   { category: 'Food Delivery',  target: 3000,  goal: 'Spend under ₹3,000 on food delivery this month' },
  online_shopping: { category: 'Online Shopping', target: 4000,  goal: 'Spend under ₹4,000 on online shopping this month' },
  subscriptions:   { category: 'Subscriptions',  target: 1500,  goal: 'Cut subscriptions to under ₹1,500 this month' },
  going_out:       { category: 'Going Out',       target: 3500,  goal: 'Spend under ₹3,500 going out this month' },
  all:             { category: 'Everything',      target: 10000, goal: 'Keep total discretionary spending under ₹10,000 this month' },
}

export function getMonthLabel(date = new Date()) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function getDaysRemaining(monthLabel) {
  if (!monthLabel) return 0
  const [monthName, year] = monthLabel.split(' ')
  const d = new Date(`${monthName} 1, ${year}`)
  const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((endOfMonth - today) / 86400000))
}

export function getChallengeStatus(current, target) {
  if (current >= target) return 'FAILED'
  if (current / target >= 0.75) return 'DANGER ZONE'
  return 'ON TRACK'
}

export function getStatusColor(status) {
  if (status === 'FAILED') return '#FF3B30'
  if (status === 'DANGER ZONE') return '#F5C518'
  return '#30D158'
}

export function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN')
}
