import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { text } = await req.json()
    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const spoken = text
      .replace(/1\/2/g, 'одна вторая')
      .replace(/1\/4/g, 'одна четвёртая')
      .replace(/1\/3/g, 'одна третья')
      .replace(/3\/2/g, 'три вторых')
      .replace(/sqrt\(/g, 'корень из ')
      .replace(/cos\(/g, 'косинус от ')
      .replace(/sin\(/g, 'синус от ')
      .replace(/tan\(/g, 'тангенс от ')
      .replace(/ln\(/g, 'натуральный логарифм от ')
      .replace(/log\(/g, 'логарифм от ')
      .replace(/\^/g, ' в степени ')
      .replace(/\//g, ' делить на ')
      .replace(/>=/g, ' больше или равно ')
      .replace(/<=/g, ' меньше или равно ')
      .replace(/=>/g, ' следовательно ')
      .replace(/ - /g, ' минус ')
      .replace(/ \+ /g, ' плюс ')
      .replace(/ = /g, ' равно ')

    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY') ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: spoken,
        voice: 'echo',
      }),
    })

    if (!r.ok) {
      const errText = await r.text()
      throw new Error(`OpenAI TTS error ${r.status}: ${errText}`)
    }

    const audioBuffer = await r.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
