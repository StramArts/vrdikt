const SPEND_CATS = [
  { key: 'food_delivery',   label: 'Food Delivery',   keywords: ['zomato', 'swiggy', 'blinkit', 'zepto', 'dunzo', 'eatfit'] },
  { key: 'online_shopping', label: 'Shopping',         keywords: ['amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'nykaa', 'snapdeal'] },
  { key: 'subscriptions',   label: 'Subscriptions',    keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'disney', 'jiosaavn', 'zee5'] },
  { key: 'transport',       label: 'Transport',         keywords: ['uber', 'ola', 'rapido', 'petrol', 'fuel', 'irctc'] },
  { key: 'going_out',       label: 'Going Out',         keywords: ['bar', 'pub', 'restaurant', 'cafe', 'bistro'] },
]

const INCOME_DEFAULTS = {
  under_25k: { food_delivery: 2000, online_shopping: 3000, subscriptions: 500,  transport: 1500, going_out: 1000 },
  '25k_50k': { food_delivery: 4000, online_shopping: 5000, subscriptions: 1000, transport: 2500, going_out: 2500 },
  '50k_1l':  { food_delivery: 6000, online_shopping: 8000, subscriptions: 2000, transport: 3500, going_out: 4000 },
  above_1l:  { food_delivery: 8000, online_shopping: 12000,subscriptions: 3000, transport: 5000, going_out: 6000 },
}

function streakDays(roasts) {
  if (!roasts?.length) return 0
  const days = new Set(roasts.map(r => new Date(r.created_at).toDateString()))
  let n = 0
  const d = new Date()
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1) }
  return n
}

function extractCatSpend(roasts, catKey) {
  const cat = SPEND_CATS.find(c => c.key === catKey)
  if (!cat) return 0
  let total = 0
  for (const roast of roasts ?? []) {
    for (const line of (roast?.spending_data?.raw ?? '').split('\n')) {
      const m = line.match(/₹\s*([\d,]+)/)
      if (!m) continue
      const amt = parseInt(m[1].replace(/,/g, ''), 10)
      if (!amt) continue
      if (cat.keywords.some(kw => line.toLowerCase().includes(kw))) total += amt
    }
  }
  return total
}

export function generateMonthlyChallenge(profile, roasts) {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastOfMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysLeft = Math.max(0, lastOfMonth.getDate() - now.getDate())

  const weaknesses = Array.isArray(profile?.spending_weakness)
    ? profile.spending_weakness
    : [profile?.spending_weakness ?? 'food_delivery']

  const challengeCat = SPEND_CATS.find(c => weaknesses.includes(c.key)) ?? SPEND_CATS[0]
  const incomeKey    = profile?.income_range ?? '25k_50k'
  const defaults     = INCOME_DEFAULTS[incomeKey] ?? INCOME_DEFAULTS['25k_50k']

  const roastCount    = Math.max(roasts?.length ?? 0, 1)
  const totalSpend    = extractCatSpend(roasts, challengeCat.key)
  const avgMonthly    = totalSpend > 0 ? Math.round(totalSpend / roastCount) : (defaults[challengeCat.key] ?? 5000)
  const target        = Math.round(avgMonthly * 0.7)

  const thisMonthRoasts = (roasts ?? []).filter(r => new Date(r.created_at) >= firstOfMonth)
  const current = extractCatSpend(thisMonthRoasts, challengeCat.key)
  const percentComplete = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  let status
  if (!roasts?.length || thisMonthRoasts.length === 0) status = 'not_started'
  else if (current > target)              status = 'exceeded'
  else if (current / target > 0.75)       status = 'at_risk'
  else if (daysLeft === 0 && current <= target) status = 'completed'
  else                                    status = 'on_track'

  return {
    title:            `${challengeCat.label} Detox`,
    category:         challengeCat.key,
    description:      `Spend under ₹${target.toLocaleString('en-IN')} on ${challengeCat.label.toLowerCase()} this month.${avgMonthly > 0 ? ` Your average is ₹${avgMonthly.toLocaleString('en-IN')}.` : ''}`,
    savingFor:        profile?.savings_goal ?? null,
    target,
    current,
    percentComplete,
    daysLeft,
    status,
    projectedSavings: Math.max(0, avgMonthly - target),
    xpReward:         100,
  }
}

export function calculateXP(roasts, challenges = []) {
  let xp = (roasts?.length ?? 0) * 10

  const scores = (roasts ?? []).map(r => r.score).filter(s => typeof s === 'number')
  for (let i = 0; i < scores.length - 1; i++) {
    if (scores[i] > scores[i + 1]) xp += 15
  }

  const streak = streakDays(roasts ?? [])
  if (streak >= 7)      xp += 75
  else if (streak >= 3) xp += 25

  xp += (challenges ?? []).filter(c => c.status === 'completed').length * 100

  const LEVELS = [
    { min: 0,    max: 99,         name: 'Financial Disaster' },
    { min: 100,  max: 299,        name: 'Broke but Aware' },
    { min: 300,  max: 599,        name: 'Almost Responsible' },
    { min: 600,  max: 999,        name: 'Getting There' },
    { min: 1000, max: Infinity,   name: 'Reformed' },
  ]
  const idx   = LEVELS.findIndex(l => xp >= l.min && xp <= l.max)
  const level = LEVELS[Math.max(idx, 0)]
  const next  = LEVELS[idx + 1]
  const progressPct = next
    ? Math.round(((xp - level.min) / (next.min - level.min)) * 100)
    : 100

  return { xp, levelName: level.name, nextThreshold: next?.min ?? null, progressPct }
}

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

export function getCouplePersonality(score1, score2) {
  const avg = (score1 + score2) / 2
  const diff = Math.abs(score1 - score2)

  if (avg < 30) return 'The Chaos Collective'
  if (avg < 40 && diff > 15) return 'The Functional Disaster'
  if (avg < 40 && diff <= 15) return 'The Delusional Savers'
  if (avg >= 40 && avg < 55 && diff > 15) return 'The Balanced Mess'
  if (avg >= 40 && avg < 55 && diff <= 15) return 'The Comfortable Spenders'
  if (avg >= 55 && avg < 70) return 'The Almost Responsible Couple'
  if (avg >= 70 && diff > 20) return 'The Unlikely Pair'
  if (avg >= 70 && diff <= 20) return 'The Reformed Couple'
  return 'The Financial Enigmas'
}
