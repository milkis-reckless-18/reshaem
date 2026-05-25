# Решаем

**Пиши. Фоткай. Понимай.**

Веб-приложение для подготовки к ЕГЭ по математике. Ученик фотографирует рукописное решение — AI-наставник Макс разбирает его пошагово, никогда не давая готового ответа.

🌐 **[reshaem-foundation.website.yandexcloud.net](https://reshaem-foundation.website.yandexcloud.net)**

---

## Как это работает

1. Ученик пишет решение от руки и фотографирует его
2. Mathpix OCR распознаёт рукописный LaTeX
3. Claude (Макс) анализирует решение пошагово и задаёт один наводящий вопрос — не даёт ответ
4. OpenAI TTS озвучивает разбор голосом
5. История решений сохраняется для отслеживания прогресса

> **Отличие от Photomath:** мы не решаем за ученика.

---

## Стек

| Слой | Технология |
|------|-----------|
| Фронтенд | React 19 + Vite + Tailwind CSS |
| Auth + БД | Supabase (анонимная авторизация + RLS) |
| Хранилище | Supabase Storage |
| Edge Functions | Supabase (Deno) |
| OCR | Mathpix API |
| AI-наставник | Claude claude-sonnet-4-6 (Anthropic) |
| TTS | OpenAI TTS, голос `echo` |
| Деплой | Yandex Cloud Object Storage |

---

## Локальная разработка

### Требования

- Node.js 18+
- Аккаунт Supabase с настроенными Edge Functions
- API-ключи: Mathpix, Anthropic, OpenAI

### Установка

```bash
git clone https://github.com/milkis-reckless-18/reshaem.git
cd reshaem
npm install
```

### Переменные окружения

Создай файл `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-anon-key>
```

Секреты для Edge Functions задаются через Supabase Dashboard → Settings → Edge Functions:

```
MATHPIX_APP_ID=
MATHPIX_APP_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

### Запуск

```bash
npm run dev      # dev-сервер на localhost:3000
npm run build    # production-сборка в dist/
```

---

## Архитектура

```
Браузер
  │
  ├── supabase.auth.signInAnonymously()   # анонимный пользователь
  ├── Canvas resize → 1200px max          # сжатие изображения
  ├── Supabase Storage upload             # сохранение фото
  │
  ├── /ocr  (Edge Function)
  │     └── Mathpix API → LaTeX
  │
  ├── /explain  (Edge Function)
  │     └── Claude API → JSON {steps, message, nudge_question, ...}
  │
  └── /speak  (Edge Function)
        └── OpenAI TTS → audio/mpeg
```

Все Edge Functions требуют валидный Supabase JWT — анонимные пользователи получают его автоматически при инициализации.

---

## Схема БД (Supabase)

```sql
CREATE TABLE sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  image_url   TEXT,
  ocr_result  TEXT,
  explanation TEXT,
  topic       TEXT,
  is_correct  BOOLEAN,
  nudge_question TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions only"
  ON sessions FOR ALL USING (auth.uid() = user_id);
```

---

## Деплой

```bash
npm run build
# Загрузи содержимое dist/ в публичный бакет Yandex Cloud Object Storage
# Бакет: reshaem-foundation, регион: ru-central1
```

Edge Functions деплоятся через Supabase CLI или MCP:

```bash
supabase functions deploy ocr
supabase functions deploy explain
supabase functions deploy speak
```

---

## Структура проекта

```
src/
  App.jsx                  # основное приложение
  App.css                  # глобальные стили
  assets/
    reshaem-logo.svg       # логотип (wordmark)
    hero.png

supabase/
  functions/
    ocr/index.ts           # Mathpix OCR
    explain/index.ts       # Claude разбор + rephrase
    speak/index.ts         # OpenAI TTS

public/
  favicon.svg

claude_system_prompt.md    # системный промпт Макса (только для владельца продукта)
design-system.md           # дизайн-система
```

---

## Лицензия

Частный проект. Все права защищены.
