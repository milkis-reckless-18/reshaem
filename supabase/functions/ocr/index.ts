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

    // Accept { url: storageUrl } or { image: base64 }
    let imageData: string

    if (body.url) {
      const fetchCtrl = new AbortController()
      const fetchTimeout = setTimeout(() => fetchCtrl.abort(), 8000)

      const imgRes = await fetch(body.url, { signal: fetchCtrl.signal })
      clearTimeout(fetchTimeout)

      if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`)

      const arrayBuf = await imgRes.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuf)

      // Convert to base64 in chunks to avoid stack overflow on large images
      const chunkSize = 8192
      let binary = ''
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize))
      }
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      imageData = `data:${contentType};base64,${btoa(binary)}`
    } else {
      imageData = body.image
    }

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
        src: imageData,
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
