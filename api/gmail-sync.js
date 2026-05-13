const CATEGORIES = [
  { name: 'Food Delivery',  keywords: ['zomato', 'swiggy', 'dunzo', 'blinkit', 'zepto'] },
  { name: 'Shopping',       keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho'] },
  { name: 'Transport',      keywords: ['uber', 'ola', 'rapido', 'irctc', 'petrol'] },
  { name: 'Entertainment',  keywords: ['netflix', 'spotify', 'prime', 'hotstar'] },
  { name: 'Dining',         keywords: ['restaurant', 'cafe', 'mcdonalds', 'kfc', 'dominos', 'starbucks'] },
  { name: 'Groceries',      keywords: ['dmart', 'bigbasket', 'jiomart', 'reliance fresh'] },
  { name: 'Health',         keywords: ['pharmacy', 'medical', 'hospital', 'apollo', '1mg'] },
  { name: 'Bills',          keywords: ['electricity', 'broadband', 'recharge', 'dth', 'gas'] },
]

function categorise(text) {
  const lower = text.toLowerCase()
  for (const { name, keywords } of CATEGORIES) {
    if (keywords.some(kw => lower.includes(kw))) return name
  }
  return 'Other'
}

const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/gi,
  /(\d+(?:,\d+)*(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/gi,
  /(?:Rs\.?|INR|₹)(\d+)/gi,
]

const MERCHANT_PATTERNS = [
  /\bVPA\s+([a-zA-Z0-9.\-_@]+)/i,
  /\bUPI[-/]([A-Za-z0-9\s\-&.]{2,40}?)(?:\s+on|\s+for|\s+via|\s+Ref|\s+UPI|\.|,|$)/i,
  /\btowards\s+([A-Za-z0-9\s\-&./]{2,40}?)(?:\s+on|\s+for|\s+via|\s+Ref|\.|,|$)/i,
  /\bat\s+([A-Za-z0-9\s\-&./]{2,40}?)(?:\s+on|\s+for|\s+via|\s+Ref|\.|,|$)/i,
  /\bto\s+([A-Za-z][A-Za-z0-9\s\-&./]{2,40}?)(?:\s+on|\s+for|\s+via|\s+Ref|\.|,|$)/i,
  /\bfor\s+([A-Za-z][A-Za-z0-9\s\-&./]{2,40}?)(?:\s+on|\s+via|\s+Ref|\.|,|$)/i,
]

function extractAmount(text) {
  for (const re of AMOUNT_PATTERNS) {
    re.lastIndex = 0
    const m = re.exec(text)
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''))
      if (val >= 1) return val
    }
  }
  return null
}

function extractMerchant(text, subject) {
  for (const re of MERCHANT_PATTERNS) {
    const m = text.match(re)
    if (m?.[1]) {
      const clean = m[1].trim().replace(/\s+/g, ' ')
      if (clean.length >= 2) return clean.slice(0, 50)
    }
  }
  return subject?.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 40) ?? 'Unknown'
}

function parseEmail(snippet, subject, date) {
  const combinedText = `${subject ?? ''} ${snippet}`

  const amount = extractAmount(combinedText)
  if (!amount) return null

  const isCredit = /credited|credit|received|deposited|added to/i.test(combinedText)
  const type = isCredit ? 'credit' : 'debit'

  const merchant = extractMerchant(snippet, subject)
  const category = categorise(combinedText)

  return { amount, type, merchant, category, date: date ? new Date(date).toISOString() : new Date().toISOString() }
}

async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  return r.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body ?? {}
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const clientId     = process.env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' })

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Fetch stored tokens
  const { data: conn, error: connErr } = await supabase
    .from('gmail_connections')
    .select('access_token, refresh_token, token_expiry')
    .eq('user_id', userId)
    .single()

  if (connErr || !conn) return res.status(404).json({ error: 'Gmail not connected' })

  let accessToken = conn.access_token

  // Refresh if expired
  if (conn.refresh_token && conn.token_expiry && new Date(conn.token_expiry) < new Date()) {
    const refreshed = await refreshAccessToken(conn.refresh_token, clientId, clientSecret)
    if (refreshed.access_token) {
      accessToken = refreshed.access_token
      await supabase
        .from('gmail_connections')
        .update({
          access_token: refreshed.access_token,
          token_expiry: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
        })
        .eq('user_id', userId)
    }
  }

  const searchQuery = '(subject:debited OR subject:credited OR subject:transaction OR subject:"payment made" OR subject:"amount debited" OR subject:"amount credited" OR subject:instaalert OR subject:"bank alert" OR subject:"a/c" OR subject:"your account") newer_than:30d'
  const query = encodeURIComponent(searchQuery)

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const listData = await listRes.json()

  if (!listRes.ok) return res.status(502).json({ error: listData.error?.message ?? 'Gmail API error' })

  const messages = listData.messages ?? []
  const parsed = []

  for (const { id } of messages) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!msgRes.ok) continue
    const msg = await msgRes.json()

    const headers = msg.payload?.headers ?? []
    const subject = headers.find(h => h.name === 'Subject')?.value ?? ''
    const date    = headers.find(h => h.name === 'Date')?.value ?? null
    const snippet = msg.snippet ?? ''

    const tx = parseEmail(snippet, subject, date)
    if (!tx) continue

    parsed.push({ ...tx, gmail_message_id: id, user_id: userId })
  }

  if (parsed.length > 0) {
    await supabase
      .from('auto_transactions')
      .upsert(parsed, { onConflict: 'gmail_message_id', ignoreDuplicates: true })
  }

  const [, { count }] = await Promise.all([
    supabase
      .from('gmail_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId),
    supabase
      .from('auto_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  return res.status(200).json({ success: true, count: count ?? parsed.length, transactions: parsed })
}
