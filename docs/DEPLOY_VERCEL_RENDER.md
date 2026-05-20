# Outflo - Free Deploy Guide (Vercel + Render + MongoDB Atlas)

## Quick Start (Windows)

Double-click to run:
```bat
deploy-one-click.bat
```

This script generates secrets, creates `deploy/generated/render.env` + `vercel.env`, and offers Vercel/Render CLI deployment.

**Docker is not required.** You can deploy directly from Git.

| Service | Platform | Free Tier | Role |
|---------|----------|-----------|------|
| Frontend (Next.js) | **Vercel** | Hobby | UI |
| Backend (FastAPI) | **Render** | Free Web Service | API |
| Database | **MongoDB Atlas** | M0 cluster | Data |

---

## Pre-requisites

First, verify locally:
```bat
cd D:\Py_Projects\Outflo
.\run.bat
```

- System Owner: http://localhost:3000/system-owner/login  
  - Email: `admin@outflo.com`  
  - Password: `Outflo@2024!`
- Platform Setup: http://localhost:3000/system-owner/setup

---

## Part A — MongoDB Atlas (Free Database)

### Step 1: Create Cluster

1. https://cloud.mongodb.com → Sign up (free)
2. **Build a Database** → **M0 FREE**
3. Region: ap-south-1 (Mumbai) or closest
4. Cluster name: `outflo`

### Step 2: Create Database User

1. **Database Access** → Add user  
2. Username: `outflo_user`  
3. Password: strong password (save it)  
4. Role: **Read and write to any database**

### Step 3: Network Access

1. **Network Access** → Add IP  
2. For deployment: **Allow Access from Anywhere** (`0.0.0.0/0`)

### Step 4: Connection String

1. **Database** → Connect → **Drivers**  
2. Copy URI, format:
```
mongodb+srv://outflo_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

3. Add database name `/outflo` at end:
```
mongodb+srv://outflo_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/outflo?retryWrites=true&w=majority
```

This becomes `MONGO_URL` on Render.

---

## Part B — Backend on Render (Free)

### Step 1: Push to GitHub

Render deploys from GitHub. Push your repo (public or private).

### Step 2: Create Web Service

1. https://render.com → Sign up  
2. **New +** → **Web Service**  
3. Connect GitHub repo `Outflo`  
4. Settings:

| Field | Value |
|-------|-------|
| **Name** | `outflo-api` |
| **Root Directory** | `apps/backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free |

> Optional: `apps/backend/render.yaml` exists for Blueprint deployment.

### Step 3: Environment Variables (Render)

Render dashboard → **Environment** → Add:

| Key | Value | Notes |
|-----|-------|-------|
| `MONGO_URL` | Atlas URI (from Part A) | Required |
| `MONGO_DATABASE` | `outflo` | |
| `SECRET_KEY` | 32+ random chars | `openssl rand -hex 32` |
| `SYSTEM_OWNER_EMAIL` | `admin@outflo.com` | |
| `SYSTEM_OWNER_PASSWORD` | Strong password | Change for production |
| `SYSTEM_OWNER_JWT_SECRET` | Random string | |
| `DEBUG` | `false` | Production |
| `APP_ENV` | `production` | |
| `APP_URL` | `https://YOUR-APP.vercel.app` | Update after Vercel deploy |
| `CORS_ORIGINS` | `["https://YOUR-APP.vercel.app"]` | JSON array format |
| `SMTP_HOST` | `smtp.gmail.com` | Optional for email |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | your@gmail.com | |
| `SMTP_PASSWORD` | Gmail App Password | |

### Step 4: Deploy & Test

1. **Deploy** wait (5–10 min first time)  
2. API URL: `https://outflo-api.onrender.com`  
3. Test endpoints:
   - https://outflo-api.onrender.com/api/v1/ready  
   - https://outflo-api.onrender.com/docs (if DEBUG=true)

**Free tier note:** 15 min idle → service sleeps. First request 30–60s slow.

---

## Part C — Frontend on Vercel (Free)

### Step 1: Import Project

1. https://vercel.com → Sign up  
2. **Add New** → **Project**  
3. Import same GitHub repo

### Step 2: Project Settings

| Field | Value |
|-------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/frontend` |
| **Build Command** | `npm run build` (default) |
| **Install Command** | `npm install --legacy-peer-deps` |

### Step 3: Environment Variables (Vercel)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://outflo-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` (update after deploy) |

### Step 4: Deploy

After deploy, copy Vercel URL (e.g. `https://outflo.vercel.app`).

### Step 5: Update Render Env

Go back to Render and update:
- `APP_URL` = Vercel URL  
- `CORS_ORIGINS` = `["https://outflo.vercel.app"]`  

Then **Manual Deploy** → Redeploy backend.

---

## Part D — System Owner Setup (Points 1–6)

Login: `https://YOUR-APP.vercel.app/system-owner/login`

Then open: **`/system-owner/setup`**

| # | Task | How |
|---|------|-----|
| **1** | MongoDB | Setup → MongoDB status green. Set Atlas URI on Render. |
| **2** | Real email | Setup → SMTP configs + **Send test email**. |
| **3** | Campaigns | Create org → leads → campaign → **Launch**. |
| **4** | Health | Setup → **Run full health check** |
| **5** | Plans | `/system-owner/plans` — create/edit plans |
| **6** | Deploy | This guide + env vars on Vercel/Render |

### Add SMTP via Swagger

1. https://outflo-api.onrender.com/docs  
2. `POST /api/v1/smtp/configs` — body (Gmail example):

```json
{
  "name": "Gmail Production",
  "provider": "gmail",
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "you@gmail.com",
  "password": "your-app-password",
  "use_tls": true,
  "is_default": true,
  "is_active": true,
  "daily_limit": 500
}
```

3. Send test email from setup page.

### Auth Flows Test Checklist

- [ ] System owner login  
- [ ] `/system-owner/setup` — Mongo green  
- [ ] Test email received  
- [ ] Register new org (`/register`)  
- [ ] Org login (`/login`)  
- [ ] Forgot password → dev/prod link → reset → login  

---

## Part E — Docker Needed?

| Question | Answer |
|----------|--------|
| Docker required? | **No** — Vercel + Render + Atlas sufficient |
| When use Docker? | Local Playwright scraping, complex workers, self-hosted |
| Direct deploy? | **Yes** — Git push → Vercel + Render |

---

## Part F — Cloud AI (vs Ollama local)

Render cannot run Ollama. Use paid AI APIs:

### OpenAI (Simplest)

Render Environment:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxx
AI_DEFAULT_MODEL=gpt-4o-mini
```

### Azure OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-azure-key
OPENAI_BASE_URL=https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT
AI_DEFAULT_MODEL=gpt-4o
```

### Anthropic (Claude)

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
AI_DEFAULT_MODEL=claude-3-5-haiku-20241022
```

### Groq / Together (OpenAI-compatible)

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-groq-key
OPENAI_BASE_URL=https://api.groq.com/openai/v1
AI_DEFAULT_MODEL=llama-3.3-70b-versatile
```

Test: login → `/app/ai` → connection status green.

Local dev: `AI_PROVIDER=ollama` + Ollama desktop running.

---

## Part G — Free Tier Limits (Honest)

| Feature | Free Tier |
|---------|-----------|
| Render API | Sleep after idle, cold start |
| Vercel | Bandwidth/build limits |
| Atlas M0 | 512MB storage |
| Ollama AI | Not on Render — use paid API |
| Playwright scraping | Hard on Render free — optional disable |
| Stripe payments | UI/mock only — real keys later |

---

## Part H — Troubleshooting

### CORS Error (Browser)

- Render `CORS_ORIGINS` must have exact Vercel URL (https, no trailing slash)

### MongoDB Connection Failed

- Atlas Network: `0.0.0.0/0`  
- Password special chars: URL-encode (`@` → `%40`)

### System Owner Login Fail

- Render env: `SYSTEM_OWNER_PASSWORD` set  
- Redeploy — startup `ensure_system_owner()` syncs password

### Forgot Password Email Not Received

- Configure SMTP + test email  
- Dev: API response includes `reset_url` when `DEBUG=true`

### 502 / Slow First Request

- Render free cold start — wait 60s, retry

---

## Quick Reference — URLs After Deploy

```
Frontend:  https://YOUR-APP.vercel.app
Backend:   https://outflo-api.onrender.com
API Docs:  https://outflo-api.onrender.com/docs
SO Login:  https://YOUR-APP.vercel.app/system-owner/login
SO Setup:  https://YOUR-APP.vercel.app/system-owner/setup
Health:    https://outflo-api.onrender.com/api/v1/ready
```

---

## Files in Repo (Deploy Helpers)

- `apps/frontend/vercel.json` — Vercel hints  
- `apps/backend/render.yaml` — Render Blueprint (optional)  
- `docs/DEPLOY_VERCEL_RENDER.md` — this guide  

---

**Last updated:** May 2026 — Outflo MVP stack (Next.js 14 + FastAPI + MongoDB)
