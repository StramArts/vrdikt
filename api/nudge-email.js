const RESEND_API_KEY = 're_5WrRtMh8_4crRDGXbQcXUuxJpxbUMqN52'

const HTML = `<!DOCTYPE html>
<html>
<body style="background:#0A0A0A;margin:0;padding:40px;font-family:Inter,sans-serif;">
  <div style="max-width:500px;margin:0 auto;">
    <h1 style="color:#F5C518;font-size:24px;margin-bottom:8px;letter-spacing:-0.5px;">VRDIKT</h1>
    <p style="color:#666;font-size:12px;margin-bottom:40px;letter-spacing:2px;text-transform:uppercase;">Your money. Unfiltered.</p>
    <h2 style="color:#fff;font-size:28px;font-weight:900;margin-bottom:16px;line-height:1.2;">Your finances have been unsupervised for 5 days.</h2>
    <p style="color:#888;font-size:16px;margin-bottom:8px;">Your money has been making its own decisions while you weren't watching.</p>
    <p style="color:#888;font-size:16px;margin-bottom:40px;">Come see the damage.</p>
    <a href="https://vrdikt.vercel.app/upload" style="background:#F5C518;color:#0A0A0A;padding:16px 32px;text-decoration:none;font-weight:800;font-size:16px;display:inline-block;border-radius:8px;">Get Roasted</a>
    <p style="color:#333;font-size:12px;margin-top:40px;">VRDIKT · Your money. Unfiltered.</p>
  </div>
</body>
</html>`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userEmail } = req.body ?? {}
  if (!userEmail) return res.status(400).json({ error: 'userEmail required' })

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'VRDIKT <onboarding@resend.dev>',
      to: [userEmail],
      subject: 'Your finances have been unsupervised for 5 days.',
      html: HTML,
    }),
  })

  const data = await r.json()
  if (!r.ok) return res.status(502).json({ error: data.message ?? 'Failed to send email' })
  return res.status(200).json({ success: true, id: data.id })
}
