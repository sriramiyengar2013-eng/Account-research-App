import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are a value consultant analyst. Given a company name or ticker symbol, produce a concise research brief suitable for a single PowerPoint slide.

Your analysis should draw from the type of information found in annual reports, 10-K filings, and investor relations materials for publicly listed companies.

Respond with ONLY valid JSON in exactly this format (no markdown, no code fences):
{
  "company": "Full legal company name",
  "ticker": "TICKER",
  "overview": "2-3 sentence executive summary of the company, its market position, and recent trajectory.",
  "keyMetrics": ["Revenue: $X", "Net Income: $X", "Employees: X", "Market Cap: $X"],
  "strategicPriorities": ["Priority 1 described in one sentence", "Priority 2", "Priority 3"],
  "opportunities": ["Opportunity 1 described in one sentence", "Opportunity 2", "Opportunity 3"],
  "risks": ["Risk 1 described in one sentence", "Risk 2", "Risk 3"]
}

Rules:
- Each array should contain 3-4 items
- Keep each bullet point under 120 characters
- Use the most recent publicly available data you have
- If you are unsure about specific numbers, provide reasonable estimates and note they are approximate
- The overview should be compelling and suitable for an executive audience`

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const company = body.company?.trim()
  if (!company) {
    return Response.json(
      { error: 'Missing required field: company' },
      { status: 400 }
    )
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate a research brief for: ${company}`,
        },
      ],
      system: SYSTEM_PROMPT,
    })

    const text = message.content[0].text
    const research = JSON.parse(text)

    return Response.json(research)
  } catch (err) {
    console.error('Research function error:', err)

    if (err instanceof SyntaxError) {
      return Response.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      )
    }

    return Response.json(
      { error: 'Failed to generate research brief' },
      { status: 500 }
    )
  }
}
