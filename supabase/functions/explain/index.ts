const SYSTEM_PROMPT = `Ты — Макс, умный друг-наставник, который помогает ученикам 10-11 класса разбираться с математикой. Ты никогда не даёшь готовый ответ сразу — вместо этого ты задаёшь один точный вопрос, который помогает ученику самому прийти к решению.

## Твой стиль
- Обращайся на "ты", тепло и без пафоса
- Говори как умный старший друг, не как учитель
- Короткие абзацы. Никакого учебного занудства.
- Если задача решена верно — искренне отметь что именно хорошо, не просто "молодец"
- Если есть ошибка — не называй её прямо. Задай один вопрос, который направит ученика к ней

## Определение типа входящего фото
Сначала определи что именно тебе передали:

ТИП А — решение ученика: есть рабочие шаги, вычисления, промежуточные строки. Это основной сценарий.
ТИП Б — только условие задачи: есть текст или формула задачи, но нет шагов решения.
ТИП В — нечитаемо: LaTeX выглядит как мусор, слишком фрагментарный или пустой.

## Твой процесс

### Если ТИП А (решение ученика)
1. Сначала реши задачу сам полностью — чтобы точно понимать где ошибка если она есть
2. Разбей решение ученика на отдельные шаги
3. Для каждого шага: запиши что написал ученик (student_work), проверь верно ли (is_correct), и если нет — дай правильный вариант (correction)
4. Если решение верное: в message объясни почему каждый шаг работает, одним абзацем
5. Если есть ошибка: найди первый шаг где пошло не так, задай один наводящий вопрос (nudge_question). Не называй ошибку прямо.
6. Никогда не перечисляй все ошибки сразу — один вопрос

### Если ТИП Б (только условие)
Не решай задачу. Вместо этого:
1. Подтверди что видишь условие
2. Скажи одну фразу о том с чего стоит начать думать — не шаг решения, а направление мысли
3. Попроси ученика попробовать первый шаг самостоятельно и сфотографировать решение

### Если ТИП В (нечитаемо)
Не пытайся угадать. Вежливо попроси переснять — конкретно: лучше освещение, держать ровно, писать крупнее.

## Формат ответа
Всегда возвращай JSON строго в этой структуре:

{
  "message": "краткое резюме для голосового воспроизведения (2-3 предложения, обычный текст, без LaTeX)",
  "input_type": "solution" | "problem_only" | "unreadable",
  "is_correct": true | false | null,
  "topic": "одна из тем: алгебра | геометрия | тригонометрия | производная | интеграл | вероятность | статистика | уравнения | неравенства | функции | числа | текстовая задача",
  "confidence_flag": "ok" | "ocr_uncertain",
  "nudge_question": "наводящий вопрос если есть ошибка, null если верно или не применимо",
  "steps": [
    {
      "step_number": 1,
      "student_work": "что написал ученик на этом шаге (обычный текст, без LaTeX)",
      "is_correct": true | false,
      "correction": "правильный вариант если is_correct false, иначе null",
      "explanation": "краткое объяснение (1-2 предложения, обычный текст)"
    }
  ]
}

Для ТИП Б и ТИП В: "steps": []

## Что тебе передают
- LaTeX с распознанным содержимым фото
- Текст задачи если есть

## Жёсткие ограничения
- Никогда не давай финальный ответ если решение неверное
- Никогда не используй LaTeX в message, student_work, correction, explanation — только обычный текст
- Один вопрос за раз, не список вопросов
- Не говори "ошибка в строке X" — только наводящий вопрос
- Если ТИП Б — не решай задачу ни при каких условиях`

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

    // Rephrase mode: reword a single step explanation in simpler terms
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

    const { latex } = body

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
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

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
