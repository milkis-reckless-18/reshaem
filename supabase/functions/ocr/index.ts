const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const imageSizeKB = Math.round((body.image?.length || 0) * 0.75 / 1024)
    console.log('[OCR] Received image size:', imageSizeKB, 'KB')

    if (!body.image) {
      return new Response(
        JSON.stringify({ error: 'Missing image field', confidence_flag: 'ocr_uncertain' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (imageSizeKB > 500) {
      console.log('[OCR] Image too large, returning ocr_uncertain')
      return new Response(
        JSON.stringify({ latex: '', confidence_flag: 'ocr_uncertain' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const mathpixRes = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: {
        'app_id': Deno.env.get('MATHPIX_APP_ID') ?? '',
        'app_key': Deno.env.get('MATHPIX_APP_KEY') ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        src: `data:image/jpeg;base64,${body.image}`,
        formats: ['latex_styled', 'text'],
        data_options: { include_svg: false },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    console.log('Mathpix response status:', mathpixRes.status)

    if (!mathpixRes.ok) {
      const errText = await mathpixRes.text()
      console.log('Mathpix error body:', errText)
      return new Response(
        JSON.stringify({ error: 'OCR failed', confidence_flag: 'ocr_uncertain' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const data = await mathpixRes.json()

    console.log('Mathpix result:', JSON.stringify(data))

    if (data.error) {
      throw new Error(`Mathpix error: ${data.error}`)
    }

    const field = data.latex_styled ? 'latex_styled' : data.text ? 'text' : 'none'
    const latex = data.latex_styled || data.text || ''
    const confidenceFlag = latex.trim().length === 0 ? 'ocr_uncertain' : 'ok'
    console.log('OCR field used:', field)
    console.log('OCR char count:', latex.length)
    console.log('OCR preview:', latex.slice(0, 100))

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
