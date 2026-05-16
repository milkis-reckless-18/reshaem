# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
A Russian-language web app for ЕГЭ math preparation.
Students photograph their handwritten math solutions, get Socratic feedback from AI tutor "Макс", and track progress over time.
Tagline: "Пиши. Фоткай. Понимай."

## Core product thesis
Physical-digital loop: student writes by hand → photographs solution → gets intelligent voice feedback.
This is the differentiator vs Photomath (which solves FOR the student).
Макс never gives the answer. He asks one question that leads the student to find their own mistake.

## Commands
```bash
npm run dev      # start dev server on localhost:3000
npm run build    # production build (run to catch errors before deploying)
```

Deploy an edge function (requires Supabase CLI login):
```bash
npx supabase functions deploy ocr --no-verify-jwt
```

## Architecture

### Frontend
Single-page React app. All UI lives in `src/App.jsx` — no component files yet. State flows top-down from the `App` component. Supabase client is initialized once in `src/lib/supabase.js`.

### API routing: two different paths
- **TTS** (`/api/tts`): Vite dev proxy defined in `vite.config.js`. Forwards to `https://api.openai.com/v1/audio/speech` and injects `VITE_OPENAI_API_KEY` server-side so the key never reaches the browser.
- **OCR** (`supabase.functions.invoke("ocr")`): Supabase Edge Function (Deno), source at `supabase/functions/ocr/index.ts`. Deployed to Supabase, not run locally.

### Data flow on photo upload
1. File → `FileReader.readAsDataURL` → base64 string
2. Insert row to `sessions` table: `{ user_id, image_url: base64 }`
3. Call OCR edge function with base64 → Mathpix returns LaTeX
4. Update session row with `ocr_result`
5. (Next) Call `explain` edge function with LaTeX → Claude returns JSON
6. (Next) Play button calls `/api/tts` with `message` field from JSON

### Supabase
- Anonymous auth: `signInAnonymously()` on mount, session reused on refresh via `getSession()`
- `sessions` table stores everything: image (base64), LaTeX, Claude JSON fields, topic
- Images stored as base64 `text` in the DB for now — Supabase Storage not yet connected

### Edge functions
Deno runtime. Source in `supabase/functions/<name>/index.ts`. Secrets (`MATHPIX_APP_ID`, `MATHPIX_APP_KEY`, `ANTHROPIC_API_KEY`) are set in Supabase dashboard → Edge Functions → Manage secrets, not in `.env`.

## Environment variables
`.env` (frontend only, must have `VITE_` prefix):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENAI_API_KEY=     # used by Vite proxy server-side for TTS
```

Supabase Edge Function secrets (set in dashboard, not in .env):
```
MATHPIX_APP_ID=
MATHPIX_APP_KEY=
ANTHROPIC_API_KEY=
```

## Supabase sessions table schema
```
id            uuid primary key
user_id       uuid (anonymous auth)
image_url     text (base64 data URL for now)
ocr_result    text (LaTeX from Mathpix)
explanation   text (Макс message)
topic         text (one of 12 ЕГЭ topics)
is_correct    boolean nullable
nudge_question text nullable
created_at    timestamptz default now()
```

## ЕГЭ topic taxonomy (12 topics)
Алгебра, Геометрия, Тригонометрия, Производная, Интеграл, Вероятность, Статистика, Уравнения, Неравенства, Функции, Числа, Текстовая задача

## What Макс returns (JSON structure)
```json
{
  "message": "explanation shown and spoken — plain text, no LaTeX",
  "input_type": "solution" | "problem_only" | "unreadable",
  "is_correct": true | false | null,
  "topic": "one of 12 ЕГЭ topics",
  "confidence_flag": "ok" | "ocr_uncertain",
  "nudge_question": "Socratic question if wrong, null if correct"
}
```
Full system prompt: `claude_system_prompt.md` in project root.

## Design system (do not change)
- Background: `#ffffff`, Text: `#1a1a2e`, Accent: `#f59e0b` (amber)
- Border radius: 16px, Transitions: 200ms ease
- Font: Inter or system sans-serif
- No gradients, no badges, no decorative elements
- All styles are inline (no CSS modules, no Tailwind classes in JSX yet)
- Full design system with CSS tokens, components and rules: see design-system.md in project root.

## AI persona constraints
- Model: `claude-sonnet-4-6` only
- Voice: OpenAI TTS `echo`, Russian
- Never give the final answer
- One Socratic question per response
- No autoplay — play button only

## What NOT to do
- Do not add a login/signup flow — anonymous auth only
- Do not add unnecessary npm dependencies
- Do not change the Claude model
- Do not store secrets in `.env` that belong in Supabase Edge Function secrets

## Current status
- UI scaffold: complete
- TTS voice (OpenAI echo): connected via Vite proxy
- Supabase anonymous auth + sessions table: connected
- Mathpix OCR edge function: deployed
- Claude API explanation: not yet connected
- Knowledge gap visualization: not yet built

## Next steps in order
1. Connect Claude API (`explain` edge function)
2. Wire explanation JSON into the UI (replace `ocr_done` placeholder state)
3. Connect knowledge gap visualization
4. Switch image storage from base64 to Supabase Storage
5. UI polish
6. Deploy

## File writing note (Windows + WSL environment)
Bash heredocs fail on files containing single quotes or em dashes (common in Russian strings). Use **PowerShell** with `@'...'@` here-strings to write or update source files — it handles Unicode and special characters correctly.