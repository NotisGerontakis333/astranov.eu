/**
 * ai-router — AstranoV AI chat routing
 * Receives context from the app, calls Claude, returns {text, action}
 *
 * Deploy: supabase functions deploy ai-router
 * Secrets needed:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM = `You are the embedded AI of AstranoV — a global Internet Operating System built on a living Earth globe.
Architecture: GLOBAL → NATIONAL → PERSONAL. AVC currency (1 AVC = 1 EUR). Delivery: 3 AVC base/3km +1/km after. Owner 3% fee.
You help users navigate, find vendors, manage orders, and understand the platform.
Respond concisely (1-3 sentences). When you can trigger an action, include it as JSON after your text response on a new line starting with ACTION:.
Valid actions: {"type":"navigate","country":"X"} | {"type":"navigate","country":"X","city":"Y"} | {"type":"open_channel","channel":"global|local|private"} | {"type":"accounting"} | {"type":"back"} | {"type":"open_vendor","name":"X"} | {"type":"krypteia"}
Only include ACTION: if it genuinely helps. Never mention Claude or Anthropic.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()
    const { text, level, country, city, vendor, owner } = body

    if (!text?.trim()) {
      return new Response(JSON.stringify({ text: 'How can I help you?' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured', text: '' }), {
        status: 503,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const context = `User is at: ${level} level${country ? ', country: ' + country : ''}${city ? ', city: ' + city : ''}${vendor ? ', browsing vendor: ' + vendor : ''}${owner ? ' [Owner/Admin]' : ''}.`

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 512,
        system: SYSTEM,
        messages: [{ role: 'user', content: context + '\n\nUser says: ' + text }],
      }),
    })

    if (!r.ok) {
      const err = await r.text()
      console.error('Anthropic error:', err)
      return new Response(JSON.stringify({ error: 'AI error', text: '' }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const j = await r.json()
    const raw = j.content?.[0]?.text || ''

    // Parse optional ACTION: line
    const actionMatch = raw.match(/\nACTION:\s*(\{.*\})\s*$/s)
    let action = null
    let responseText = raw

    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1])
        responseText = raw.slice(0, actionMatch.index).trim()
      } catch (_) {}
    }

    return new Response(JSON.stringify({ text: responseText, action }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e), text: '' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
