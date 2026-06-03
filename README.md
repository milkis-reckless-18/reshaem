# Решаем

> Пиши. Фоткай. Понимай.

AI-наставник для подготовки к ЕГЭ по математике. Ученик фотографирует рукописное решение — получает пошаговый разбор от Макса, который никогда не даёт готовый ответ.

**Live:** https://reshaem-foundation.website.yandexcloud.net

---

## Как это работает

1. Ученик пишет решение от руки и фотографирует его
2. Mathpix OCR переводит фото в LaTeX
3. Claude анализирует решение и возвращает JSON с пошаговым разбором
4. Макс ведёт ученика через шаги — один вопрос за раз
5. OpenAI TTS озвучивает каждый шаг

Ключевое отличие от Photomath: Макс **не решает задачу за ученика**.

---

## Стек

| Слой | Технология |
|---|---|
| Фронтенд | React + Vite + Tailwind CSS |
| Auth + DB | Supabase (анонимная авторизация, таблица sessions) |
| Storage | Supabase Storage (bucket: solution-images) |
| OCR | Mathpix API → LaTeX |
| AI | Claude claude-sonnet-4-6 (Anthropic) |
| TTS | OpenAI TTS, голос echo |
| Деплой | Yandex Cloud Object Storage |
| Edge functions | Supabase (eu-central-1, Frankfurt) |

---

## Локальный запуск

```bash
npm install
npm run dev
```

Нужен файл `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Секреты edge functions хранятся в Supabase Dashboard → Edge Functions → Secrets:
```
MATHPIX_APP_ID
MATHPIX_APP_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
```

---

## Edge functions

| Функция | Описание |
|---|---|
| `/ocr` | Принимает base64 изображение, возвращает LaTeX через Mathpix |
| `/explain` | Принимает LaTeX, возвращает JSON-разбор от Макса через Claude |
| `/speak` | Принимает текст, возвращает аудио через OpenAI TTS |

---

## Деплой фронтенда

```bash
npm run build
# Загрузить содержимое dist/ в Yandex Cloud Object Storage bucket: reshaem-foundation
```

---

## Структура JSON от Макса

```json
{
  "message": "общий вердикт одной фразой",
  "steps": [
    {
      "step_number": 1,
      "is_correct": true,
      "student_work": "что написал ученик",
      "explanation": "комментарий Макса",
      "correction": null
    }
  ],
  "input_type": "solution | problem_only | unreadable",
  "is_correct": true,
  "topic": "алгебра | геометрия | ...",
  "confidence_flag": "ok | ocr_uncertain",
  "nudge_question": "наводящий вопрос или null"
}
```

---

## Дизайн-система

- Фон: Midnight `#0D0F1C`, Deep Navy `#1A1D2E`
- Акцент (верно): Cyan Mint `#5EECD8`
- Акцент (ошибка): Coral Rose `#FF6B6B`
- Текст: Warm White `#F0EEE6`
- Шрифт: Inter / системный sans-serif

Подробнее: `design-system.md`

---

*Foundation Lab EdTech — 2026*
