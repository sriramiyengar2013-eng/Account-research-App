import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { company } = body
  if (!company || typeof company !== 'string' || company.trim().length === 0) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Company name is required.' }) }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'API key not configured. Set ANTHROPIC_API_KEY in Netlify environment variables.' }) }
  }

  const systemPrompt = `You are a senior value consultant preparing account research briefs.
Use ONLY data from official annual reports, 10-K SEC filings, and investor relations publications.
Always return a single valid JSON object. No preamble, no markdown, no extra text.`

  const userPrompt = `Research ${company.trim()} as a publicly listed company using their most recent annual report, 10-K filing, or official investor relations materials. Search the web for the latest official filings.

Return ONLY a valid JSON object with this exact schema — no other text:
{
  "company": "Official company name",
  "ticker": "Stock ticker",
  "exchange": "Exchange name",
  "fiscalYear": "e.g. FY2024",
  "fyEnded": "e.g. FY ended Sep 28, 2024",
  "industry": "Sector / industry",
  "tagline": "Strategic priorities, transformation moves & FY2024 financials",
  "strategicPriorities": [
    "Full sentence priority 1 from annual report (15-25 words)",
    "Priority 2",
    "Priority 3",
    "Priority 4"
  ],
  "accountReadout": "2-3 sentence analyst summary of strategic posture and financial trajectory (50-70 words)",
  "transformationMoves": [
    "Specific initiative with concrete detail (15-25 words)",
    "Move 2",
    "Move 3",
    "Move 4",
    "Move 5",
    "Move 6"
  ],
  "financials": [
    {"metric": "Annual revenue",   "value": "$XXB"},
    {"metric": "Revenue growth",   "value": "X% YoY"},
    {"metric": "Gross profit",     "value": "$XXB"},
    {"metric": "Operating income", "value": "$XXB"},
    {"metric": "Net profit",       "value": "$XXB"},
    {"metric": "Free cash flow",   "value": "$XXB"},
    {"metric": "Operating margin", "value": "X%"},
    {"metric": "Net margin",       "value": "X%"}
  ],
  "marginStory": "One sentence on the key margin or profitability narrative (20-30 words)",
  "source": "${company.trim()} FY20XX Annual Report / 10-K and IR supplementals"
}

Use N/A for any unavailable values. Return ONLY valid JSON, nothing else.`

  try {
    const messages = [{ role: 'user', content: userPrompt }]
    let finalText = ''
    let iterations = 0

    // Agentic loop - handles web_search tool calls properly
    while (iterations < 8) {
      iterations++

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages
      })

      // Collect text from this turn
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text
      }

      if (response.stop_reason === 'end_turn') break

      if (response.stop_reason === 'tool_use') {
        // Add assistant message with tool calls
        messages.push({ role: 'assistant', content: response.content })

        // Add tool results (web_search handles itself internally, we just ack)
        const toolResults = response.content
          .filter(b => b.type === 'tool_use')
          .map(b => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: ''
          }))

        if (toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults })
        } else {
          break
        }
      } else {
        break
      }
    }

    if (!finalText.trim()) {
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: 'No response received. Please try again.' })
      }
    }

    const jsonMatch = finalText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON in response:', finalText.slice(0, 400))
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Could not extract structured data. Please try again.' })
      }
    }

    let data
    try {
      data = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('JSON parse failed:', e.message)
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Failed to parse research data. Please try again.' })
      }
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) }

  } catch (err) {
    console.error('Function error:', err)
    const msg = err?.status === 401
      ? 'Invalid API key. Check ANTHROPIC_API_KEY in Netlify environment variables.'
      : err?.status === 529
      ? 'Anthropic API is overloaded. Please try again.'
      : err.message || 'Research failed. Please try again.'

    return { statusCode: err?.status || 500, headers: HEADERS, body: JSON.stringify({ error: msg }) }
  }
}
