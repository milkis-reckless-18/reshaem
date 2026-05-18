# HANDOFF.md — Решаем API Backend
*For Claude Code — May 18, 2026*

## Mission
Deploy a standalone Express.js API server to Railway so the Решаем frontend can call OCR, explain, and TTS without Supabase Edge Function payload limits (EarlyDrop bug).

## Context
The frontend (React + Vite) is already deployed and working at:
`https://reshaem-foundation.website.yandexcloud.net`

The backend logic (OCR, explain, speak) was previously in Supabase Edge Functions but kept hitting EarlyDrop timeouts on mobile camera photos. The fix is a standalone Express server with no payload limits.

The Express server code already exists at `reshaem/server/index.js` in the main repo. We are moving it to a **separate dedicated repo** to avoid Railway builder confusion.

---

## What needs to be done (numbered, in order)

### STEP 1 — Create new GitHub repo
Create a new GitHub repository called `reshaem-api` under `milkis-reckless-18`.

### STEP 2 — Copy server files
Copy these files from the current repo's `/server` folder into the new repo root:
- `index.js` — Express server (already written, do not rewrite)
- `package.json` — dependencies
- `railway.json` — Railway config
- `.env.example` — env var template
- `.gitignore` — must include `node_modules` and `.env`

Do NOT copy `nixpacks.toml` or `Dockerfile` — clean start.

### STEP 3 — Verify package.json
Confirm `package.json` has exactly:
```json
{
  "name": "reshaem-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  }
}
```

No devDependencies needed. No build step needed.

### STEP 4 — Verify railway.json
Confirm `railway.json` has exactly:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### STEP 5 — Verify index.js structure
Confirm `index.js` has:
- `require('dotenv').config()` at the top
- `express.json({ limit: '10mb' })` — no payload size limits
- `cors({ origin: '*' })` — allow all origins
- `app.options('*', cors())` — handle preflight
- Three routes: `POST /ocr`, `POST /explain`, `POST /speak`
- `app.listen(process.env.PORT || 3001)`
- Health check: `GET /health` returns `{ status: 'ok' }`

### STEP 6 — Test locally
```bash
cd reshaem-api
npm install
node index.js
```
Server should start on port 3001. Test health check:
```bash
curl http://localhost:3001/health
```
Should return `{"status":"ok"}`.

### STEP 7 — Push to GitHub
```bash
git init
git add .
git commit -m "initial: Express API server for Решаем"
git remote add origin https://github.com/milkis-reckless-18/reshaem-api.git
git push -u origin main
```

### STEP 8 — Connect to Railway
In Railway dashboard (railway.app):
- Go to project `giving-ambition`
- Delete the broken `astonishing-reprieve` service
- Click + New → GitHub Repository → select `milkis-reckless-18/reshaem-api`
- Root directory: leave EMPTY (repo root, not a subfolder)
- Railway will auto-detect Node.js from package.json

### STEP 9 — Add environment variables in Railway
In Railway → service → Variables, add:
```
MATHPIX_APP_ID=
MATHPIX_APP_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

### STEP 10 — Generate domain
Railway → service → Settings → Public Networking → Generate Domain
Note the URL: `reshaem-api-production.up.railway.app` (will vary)

### STEP 11 — Test Railway deployment
```bash
curl https://[your-railway-url]/health
```
Should return `{"status":"ok"}`.

Then test OCR endpoint with a real image.

### STEP 12 — Update frontend
In the main `reshaem` repo, update `.env`:
```
VITE_API_URL=https://[your-railway-url]
```

Then rebuild and redeploy frontend to Yandex:
```bash
npm run build
```
Upload `dist/` contents to Yandex Cloud Object Storage bucket `reshaem-foundation`.

### STEP 13 — End-to-end test
Open `https://reshaem-foundation.website.yandexcloud.net` on mobile.
Upload a real handwritten math solution photo.
Confirm:
- OCR returns LaTeX (no EarlyDrop)
- Макс's explanation appears with steps
- TTS plays on speaker button tap

---

## Architecture (current state)

```
┌─────────────────────────────────────────────────────────┐
│  STUDENT (mobile browser)                               │
│  https://reshaem-foundation.website.yandexcloud.net     │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌────────────────────┐
│  Supabase     │    │  Railway           │
│  - Auth       │    │  Express API       │
│  - Sessions   │    │  reshaem-api       │
│    table      │    │                    │
│  - Storage    │    │  POST /ocr         │
│    bucket     │    │  POST /explain     │
└───────────────┘    │  POST /speak       │
                     │  GET  /health      │
                     └────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌──────────────┐ ┌────────────┐ ┌──────────────┐
     │  Mathpix API │ │ Claude API │ │ OpenAI TTS   │
     │  OCR         │ │ sonnet-4-6 │ │ voice: echo  │
     │  handwriting │ │ Socratic   │ │ Russian      │
     │  → LaTeX     │ │ feedback   │ │ preprocessing│
     └──────────────┘ └────────────┘ └──────────────┘
```

---

## What NOT to do
- Do not put the Express server back inside the main `reshaem` repo
- Do not create a Dockerfile unless Railway fails to detect Node.js automatically
- Do not use Supabase Edge Functions for OCR/explain/speak — they have payload limits
- Do not change the Claude model — only `claude-sonnet-4-6`
- Do not add authentication to the API — it's a prototype
- Do not autoplay TTS — play button only

---

## Environment variables reference

### Railway (reshaem-api)
```
MATHPIX_APP_ID=        # Mathpix account app ID
MATHPIX_APP_KEY=       # Mathpix account app key
ANTHROPIC_API_KEY=     # Anthropic API key
OPENAI_API_KEY=        # OpenAI API key for TTS
PORT=                  # Railway sets this automatically, do not hardcode
```

### Frontend .env (reshaem repo root)
```
VITE_SUPABASE_URL=     # Supabase project URL
VITE_SUPABASE_ANON_KEY= # Supabase publishable key
VITE_API_URL=          # Railway Express server URL (update after deploy)
```

### Supabase Edge Function secrets (no longer used for API, keep for reference)
```
MATHPIX_APP_ID=
MATHPIX_APP_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## Claude system prompt
Location: `claude_system_prompt.md` in the main `reshaem` repo root.
The Express server reads this file at startup: `../claude_system_prompt.md`
**After moving to separate repo:** copy `claude_system_prompt.md` into the `reshaem-api` repo root and update the path in `index.js` to `./claude_system_prompt.md`.

---

## Known issues to fix after deployment
1. KaTeX student_work + explanation still concatenating in some steps
2. Strikethrough not rendering correctly (showing ~~ markdown instead of CSS)
3. History tap showing "Разбор недоступен" for some old sessions
4. OCR fourth-wall breaking when confidence_flag is ocr_uncertain
5. TTS preprocessing needs more trig function patterns

## Success criteria
Student opens the URL on mobile → photographs handwritten math → gets step-by-step Socratic feedback from Макс → TTS reads explanation → session saved to history.
No EarlyDrop. No CORS errors. No empty LaTeX.
