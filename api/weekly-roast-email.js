const RESEND_API_KEY = 're_5WrRtMh8_4crRDGXbQcXUuxJpxbUMqN52'

function scoreColor(s) {
  if (s == null) return '#888'
  return s < 40 ? '#FF3B30' : s > 70 ? '#30D158' : '#F5C518'
}

function buildHtml({ weekScore, weekPersonality, roastLines, prediction, weekRange }) {
  const color = scoreColor(weekScore)
  const lines = (roastLines ?? []).slice(0, 3).map(l =>
    `<p style="color:#F0F0F0;font-size:15px;margin-bottom:12px;line-height:1.6;">"${l}"</p>`
  ).join('')

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0A0A;margin:0;padding:40px;font-family:Inter,sans-serif;">
  <div style="max-width:500px;margin:0 auto;">
    <h1 style="color:#F5C518;font-size:24px;margin-bottom:8px;letter-spacing:-0.5px;">VRDIKT</h1>
    <p style="color:#666;font-size:12px;margin-bottom:32px;letter-spacing:2px;text-transform:uppercase;">Your money. Unfiltered.</p>

    <p style="color:#555;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">WEEKLY VERDICT</p>
    <p style="color:#444;font-size:13px;margin-bottom:28px;">${weekRange ?? ''}</p>

    <p style="color:#444;font-size:12px;margin-bottom:4px;letter-spacing:1px;text-transform:uppercase;">Week Score</p>
    <p style="color:${color};font-size:56px;font-weight:900;margin-bottom:0;line-height:1;letter-spacing:-2px;">${weekScore ?? '—'}<span style="color:#333;font-size:20px;font-weight:700;">/100</span></p>

    <p style="color:#F5C518;font-size:20px;font-weight:800;margin-top:16px;margin-bottom:24px;letter-spacing:-0.5px;">${weekPersonality ?? ''}</p>

    <div style="border-left:2px solid #1A1A1A;padding-left:16px;margin-bottom:28px;">
      ${lines}
    </div>

    ${prediction ? `<p style="color:#555;font-size:14px;font-style:italic;margin-bottom:32px;line-height:1.6;">${prediction}</p>` : ''}

    <a href="https://vrdikt.vercel.app/dashboard" style="background:#F5C518;color:#0A0A0A;padding:16px 32px;text-decoration:none;font-weight:800;font-size:15px;display:inline-block;border-radius:8px;">See Full Dashboard</a>

    <p style="color:#333;font-size:12px;margin-top:40px;">VRDIKT · Your money. Unfiltered.</p>
  </div>
</body>
</html>`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userEmail, weekScore, weekPersonality, roastLines, prediction } = req.body ?? {}
  if (!userEmail) return res.status(400).json({ error: 'userEmail required' })

  const now   = new Date()
  const start = new Date(now); start.setDate(now.getDate() - 7)
  const fmt   = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const weekRange = `${fmt(start)} – ${fmt(now)}`

  const html = buildHtml({ weekScore, weekPersonality, roastLines, prediction, weekRange })

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'VRDIKT <onboarding@resend.dev>',
      to: [userEmail],
      subject: 'Your Weekly Verdict Is In',
      html,
    }),
  })

  const data = await r.json()
  if (!r.ok) return res.status(502).json({ error: data.message ?? 'Failed to send email' })
  return res.status(200).json({ success: true, id: data.id })
}
