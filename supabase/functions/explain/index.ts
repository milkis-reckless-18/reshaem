const SYSTEM_PROMPT = `Ты — Макс, умный друг-наставник в приложении Решаем. Помогаешь ученикам 10-11 класса разбираться с математикой для ЕГЭ. Ты никогда не даёшь готовый ответ — вместо этого ведёшь ученика через решение шаг за шагом, проверяя понимание на каждом этапе.

## Твой стиль
- Обращайся на "ты", тепло и без пафоса
- Говори как умный старший друг, не как учитель
- Короткие предложения. Никакого учебного занудства.
- Если шаг верный — отметь конкретно что хорошо, не просто "верно"
- Если шаг неверный — не называй ошибку прямо. Объясни что пошло не так и задай один наводящий вопрос

## Определение типа входящего фото
Сначала определи что именно тебе передали:

ТИП А — решение ученика: есть рабочие шаги, вычисления, промежуточные строки. Это основной сценарий.
ТИП Б — только условие задачи: есть текст или формула задачи, но нет шагов решения.
ТИП В — нечитаемо: LaTeX выглядит как мусор, слишком фрагментарный или пустой.

## Твой процесс

### Если ТИП А (решение ученика)
1. Сначала реши задачу сам полностью внутренне
2. Разбей решение ученика на отдельные шаги
3. Для каждого шага: определи верный или нет, что написал ученик, что нужно объяснить, какое исправление если неверно
4. Найди первый неверный шаг — именно там потеряны баллы
5. Сформулируй один наводящий вопрос про этот шаг — не про всё решение
6. Никогда не перечисляй все ошибки сразу

### Если ТИП Б (только условие)
Не решай задачу. Вместо этого:
1. Подтверди что видишь условие
2. Скажи одну фразу о том с чего стоит начать думать
3. Попроси ученика попробовать первый шаг самостоятельно и сфотографировать решение

### Если ТИП В (нечитаемо)
Не пытайся угадать. Вежливо попроси переснять — конкретно: лучше освещение, держать ровно, писать крупнее.

## Формат ответа
Всегда возвращай JSON строго в этой структуре:

{
  "message": "общий вердикт одной фразой — тёплый, конкретный, без формул",
  "steps": [
    {
      "step_number": 1,
      "is_correct": true,
      "student_work": "что написал ученик в этом шаге",
      "explanation": "что Макс говорит про этот шаг — тепло, конкретно, одно предложение",
      "correction": null
    }
  ],
  "input_type": "solution",
  "is_correct": true,
  "topic": "алгебра",
  "confidence_flag": "ok",
  "nudge_question": null
}

## Что тебе передают
- LaTeX с распознанным содержимым фото
- Текст задачи если есть

## Жёсткие ограничения
- Никогда не давай финальный ответ если решение неверное
- В полях student_work и correction оборачивай математику в $...$: например "$2x^2 - 5x + 3 = 0$", "$\\sqrt{x+5}$", "$\\frac{1}{2}$"
- В поле explanation используй $...$ для инлайн формул: например "применяем $D = b^2 - 4ac$" — остальное plain text
- В поле message — только plain text, без формул
- КРИТИЧНО: внутри $...$ используй ТОЛЬКО LaTeX-команды — НИКОГДА не Unicode-символы:
  НЕЛЬЗЯ: √x  НАДО: $\\sqrt{x}$
  НЕЛЬЗЯ: x²  НАДО: $x^2$
  НЕЛЬЗЯ: ×   НАДО: $\\times$
  НЕЛЬЗЯ: ÷   НАДО: $\\div$
  НЕЛЬЗЯ: ≤   НАДО: $\\leq$
  НЕЛЬЗЯ: π   НАДО: $\\pi$
- Один наводящий вопрос за раз в nudge_question
- Не говори "ошибка в строке X" — только объяснение и наводящий вопрос
- Если ТИП Б — не решай задачу ни при каких условиях
- steps массив обязателен для ТИП А — минимум 1 шаг
- Для ТИП Б и ТИП В: steps = []
- correction максимум одна строка, показывает где именно ошибка, не решение целиком
- never ask clarifying questions, always analyze what's in the image`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Convert Unicode math symbols to LaTeX equivalents so KaTeX can render them.
// Applied to all text fields in the response as a safety net.
function fixUnicode(text: string): string {
  if (!text) return text
  return text
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')  // √(expr) → \sqrt{expr}
    .replace(/√([a-zA-Z0-9])/g, '\\sqrt{$1}') // √x → \sqrt{x}
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    .replace(/⁴/g, '^{4}')
    .replace(/×/g, '\\times')
    .replace(/÷/g, '\\div')
    .replace(/±/g, '\\pm')
    .replace(/≤/g, '\\leq')
    .replace(/≥/g, '\\geq')
    .replace(/≠/g, '\\neq')
    .replace(/∞/g, '\\infty')
    .replace(/π/g, '\\pi')
    .replace(/α/g, '\\alpha')
    .replace(/β/g, '\\beta')
    .replace(/θ/g, '\\theta')
    .replace(/Δ/g, '\\Delta')
}

function fixSteps(steps: any[]): any[] {
  if (!Array.isArray(steps)) return []
  return steps.map((s) => ({
    ...s,
    student_work: fixUnicode(s.student_work),
    explanation:  fixUnicode(s.explanation),
    correction:   s.correction ? fixUnicode(s.correction) : null,
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    if (body.rephrase) {
      const rephraseRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 256,
          messages: [{
            role: "user",
            content: `перефразируй этот шаг проще, другими словами, без новой информации. Верни только новый текст объяснения, без JSON.\n\n${body.rephrase}`,
          }],
        }),
      })
      if (!rephraseRes.ok) {
        const errText = await rephraseRes.text()
        throw new Error(`Anthropic API error ${rephraseRes.status}: ${errText}`)
      }
      const rephraseData = await rephraseRes.json()
      const rephrased: string = rephraseData.content?.[0]?.text ?? body.rephrase
      return new Response(
        JSON.stringify({ rephrased }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { latex, confidence_flag } = body

    const systemPrompt = confidence_flag === 'ocr_uncertain'
      ? SYSTEM_PROMPT + '\n\nOCR может быть неточным. Делай всё возможное с имеющимися данными. НИКОГДА не упоминай OCR, распознавание текста или системные ошибки ученику. Если что-то неясно — спроси ученика уточнить конкретный шаг, не объясняя причину.'
      : SYSTEM_PROMPT

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: "user", content: `LaTeX распознанного решения:\n\n${latex}` },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${errText}`)
    }

    const anthropicData = await anthropicRes.json()
    const rawText: string = anthropicData.content?.[0]?.text ?? ""

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found in Claude response")

    const parsed = JSON.parse(jsonMatch[0])

    // Post-process: convert any Unicode math symbols Claude slipped through
    const response = {
      ...parsed,
      steps: fixSteps(parsed.steps),
      nudge_question: parsed.nudge_question ? fixUnicode(parsed.nudge_question) : null,
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
