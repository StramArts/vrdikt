export function checkZomatoDetox(roasts) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentRoasts = roasts.filter(r => new Date(r.created_at) >= sevenDaysAgo)

  if (recentRoasts.length === 0) {
    return { daysClean: 0, status: 'active', message: 'Submit your spending to start tracking' }
  }

  const deliveryKeywords = ['zomato', 'swiggy', 'blinkit', 'zepto', 'food delivery', 'dunzo']

  let daysClean = 0
  let failed = false

  for (const roast of recentRoasts) {
    const lines = roast.roast_lines ?? []
    const hasDelivery = lines.some(line =>
      deliveryKeywords.some(kw => line.toLowerCase().includes(kw))
    )
    if (hasDelivery) {
      failed = true
      break
    }
    daysClean++
  }

  if (failed) return { daysClean, status: 'failed', message: 'You caved. Zomato wins again.' }
  if (daysClean >= 7) return { daysClean: 7, status: 'completed', message: 'Challenge complete. Your kitchen is proud.' }
  return { daysClean, status: 'active', message: `${7 - daysClean} days left. Stay strong.` }
}

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
