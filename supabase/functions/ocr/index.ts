const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image } = await req.json()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const mathpixRes = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: {
        'app_id': Deno.env.get('MATHPIX_APP_ID') ?? '',
        'app_key': Deno.env.get('MATHPIX_APP_KEY') ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        src: image,
        formats: ['latex_styled'],
        data_options: { include_svg: false },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!mathpixRes.ok) {
      return new Response(
        JSON.stringify({ error: 'OCR failed', confidence_flag: 'ocr_uncertain' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const data = await mathpixRes.json()

    if (data.error) {
      throw new Error(`Mathpix error: ${data.error}`)
    }

    const latex = data.latex_styled ?? ''
    const confidenceFlag = latex.trim().length === 0 ? 'ocr_uncertain' : 'ok'

    return new Response(
      JSON.stringify({ latex, confidence_flag: confidenceFlag }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
