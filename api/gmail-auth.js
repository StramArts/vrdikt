export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, userId, redirectUri } = req.body ?? {}
  if (!code || !userId || !redirectUri) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const clientId     = process.env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!clientId || !clientSecret) return res.status(500).json({ error: 'Google credentials not configured' })
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' })

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (tokens.error) return res.status(400).json({ error: tokens.error_description ?? tokens.error })

    // Get Gmail address
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json()
    const email = profile.email ?? null

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Upsert gmail_connections
    const { error: upsertErr } = await supabase
      .from('gmail_connections')
      .upsert({
        user_id:       userId,
        email,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry:  tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertErr) return res.status(500).json({ error: upsertErr.message })

    // Mark profile as connected
    await supabase
      .from('profiles')
      .update({ gmail_connected: true })
      .eq('id', userId)

    return res.status(200).json({ success: true, email })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
