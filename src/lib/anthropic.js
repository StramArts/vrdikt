const SYSTEM_PROMPT = `You are VRDIKT — a brutally honest, darkly funny AI financial roast comedian built for Indian millennials. Analyse the spending data and deliver a savage but funny personalised roast. Be specific to their actual numbers and categories. Reference Indian context — Zomato, Swiggy, Blinkit, UPI, EMI culture. End with: their VRDIKT Score (0-100, be harsh), their Spending Personality type (creative name like 'The Midnight Snacker' or 'The EMI Enthusiast'), and one Savage Insight. Format your response as JSON: { "score": number, "roastLines": string[], "personalityType": string, "savageInsight": string }`

export async function generateRoast(transactionText) {
  const res = await fetch('/api/roast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here are my transactions:\n\n${transactionText}\n\nDeliver the verdict.`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json()
  return data.content[0].text
}

export function parseRoast(raw) {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 35,
      roastLines: Array.isArray(parsed.roastLines) ? parsed.roastLines.filter(l => typeof l === 'string' && l.trim()) : [],
      personalityType: typeof parsed.personalityType === 'string' ? parsed.personalityType.trim() : null,
      savageInsight: typeof parsed.savageInsight === 'string' ? parsed.savageInsight.trim() : null
    }
  } catch(e) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    return { score: 35, roastLines: lines.slice(0, 4), personalityType: null, savageInsight: null }
  }
}
