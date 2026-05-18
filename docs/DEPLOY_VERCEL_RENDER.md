# Outflo — Free Deploy Guide (Vercel + Render + MongoDB Atlas)

## One-click setup (Windows)

Double-click ya run:

```bat
deploy-one-click.bat
```

Yeh script secrets generate karegi, `deploy/generated/render.env` + `vercel.env` likhegi, aur Vercel/Render CLI se deploy karne ka option degi.

**Docker zaroori nahi hai.** Tum direct Git se deploy kar sakte ho.

| Service | Platform | Free tier | Role |
|---------|----------|-----------|------|
| Frontend (Next.js) | **Vercel** | Hobby | UI |
| Backend (FastAPI) | **Render** | Free Web Service | API |
| Database | **MongoDB Atlas** | M0 cluster | Data |

---

## Pehle local par confirm karo

```bat
cd D:\Py_Projects\Outflo
.\run.bat
```

- System Owner: http://localhost:3000/system-owner/login  
  - Email: `admin@outflo.com`  
  - Password: `Outflo@2024!`
- Platform Setup (naya): http://localhost:3000/system-owner/setup

---

## Part A — MongoDB Atlas (free database)

### Step 1: Cluster banao

1. https://cloud.mongodb.com → Sign up (free)
2. **Build a Database** → **M0 FREE**
3. Region: ap-south-1 (Mumbai) ya closest
4. Cluster name: `outflo`

### Step 2: Database user

1. **Database Access** → Add user  
2. Username: `outflo_user`  
3. Password: strong password (save karo)  
4. Role: **Read and write to any database**

### Step 3: Network access

1. **Network Access** → Add IP  
2. Deploy ke liye: **Allow Access from Anywhere** (`0.0.0.0/0`)  
   - Free tier par Render ka IP fixed nahi hota

### Step 4: Connection string

1. **Database** → Connect → **Drivers**  
2. Copy URI, example:

```
mongodb+srv://outflo_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

3. Database name ke liye end mein `/outflo` add karo:

```
mongodb+srv://outflo_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/outflo?retryWrites=true&w=majority
```

Yeh value baad mein Render par `MONGO_URL` banegi.

---

## Part B — Backend on Render (free)

### Step 1: GitHub par code push karo

Render GitHub se deploy karta hai. Repo public/private dono chal sakte hain.

### Step 2: New Web Service

1. https://render.com → Sign up  
2. **New +** → **Web Service**  
3. Connect GitHub repo `Outflo`  
4. Settings:

| Field | Value |
|-------|--------|
| **Name** | `outflo-api` |
| **Root Directory** | `apps/backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free |

> Optional: repo mein `apps/backend/render.yaml` hai — Blueprint se bhi deploy ho sakta hai.

### Step 3: Environment variables (Render)

Render dashboard → **Environment** → Add:

| Key | Value | Notes |
|-----|--------|--------|
| `MONGO_URL` | Atlas URI (step A) | Required |
| `MONGO_DATABASE` | `outflo` | |
| `SECRET_KEY` | 32+ random chars | `openssl rand -hex 32` |
| `SYSTEM_OWNER_EMAIL` | `admin@outflo.com` | |
| `SYSTEM_OWNER_PASSWORD` | Strong password | Production mein change karo |
| `SYSTEM_OWNER_JWT_SECRET` | Random string | |
| `DEBUG` | `false` | Production |
| `APP_ENV` | `production` | |
| `APP_URL` | `https://YOUR-APP.vercel.app` | Vercel URL (baad mein update) |
| `CORS_ORIGINS` | `["https://YOUR-APP.vercel.app"]` | JSON array format |
| `SMTP_HOST` | `smtp.gmail.com` | Optional — email ke liye |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | your@gmail.com | |
| `SMTP_PASSWORD` | Gmail App Password | |

### Step 4: Deploy & test

1. **Deploy** wait karo (5–10 min first time)  
2. API URL milega: `https://outflo-api.onrender.com`  
3. Test:
   - https://outflo-api.onrender.com/api/v1/ready  
   - https://outflo-api.onrender.com/docs (agar DEBUG=true ho)

**Free tier note:** 15 min inactive ke baad service sleep karti hai — pehli request 30–60 sec slow ho sakti hai.

---

## Part C — Frontend on Vercel (free)

### Step 1: Import project

1. https://vercel.com → Sign up  
2. **Add New** → **Project**  
3. Import same GitHub repo

### Step 2: Project settings

| Field | Value |
|-------|--------|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/frontend` |
| **Build Command** | `npm run build` (default) |
| **Install Command** | `npm install --legacy-peer-deps` |

### Step 3: Environment variables (Vercel)

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://outflo-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` (deploy ke baad exact URL) |

### Step 4: Deploy

Deploy complete hone ke baad Vercel URL copy karo (e.g. `https://outflo.vercel.app`).

### Step 5: Render env update (important)

Wapas Render par jao aur update karo:

- `APP_URL` = Vercel URL  
- `CORS_ORIGINS` = `["https://outflo.vercel.app"]`  

Phir **Manual Deploy** → Redeploy backend.

---

## Part D — System Owner se sab set & test (points 1–6)

Login: `https://YOUR-APP.vercel.app/system-owner/login`

Phir open karo: **`/system-owner/setup`**

| # | Kya | System Owner se kaise |
|---|-----|------------------------|
| **1** | MongoDB | Setup page → MongoDB status green. Atlas URI Render par set. |
| **2** | Real email | Setup → SMTP configs + **Send test email**. Ya Swagger `/api/v1/smtp/configs` |
| **3** | Campaigns | Org banao → leads → campaign → **Launch** (UI). Auto-scheduler abhi manual mode. |
| **4** | Health | Setup → **Run full health check** |
| **5** | Plans | `/system-owner/plans` — plans create/edit (Stripe abhi optional) |
| **6** | Deploy | Yeh document + env vars Vercel/Render par |

### SMTP API se add karna (Swagger)

1. https://outflo-api.onrender.com/docs  
2. `POST /api/v1/smtp/configs` — body example (Gmail):

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

3. Setup page se test email bhejo.

### Auth flows test checklist

- [ ] System owner login  
- [ ] `/system-owner/setup` — Mongo green  
- [ ] Test email received  
- [ ] Register new org (`/register`)  
- [ ] Org login (`/login`)  
- [ ] Forgot password → dev/prod link → reset → login  

---

## Part E — Docker ki zaroorat?

| Question | Answer |
|----------|--------|
| Kya Docker chahiye? | **Nahi** — Vercel + Render + Atlas enough |
| Kab Docker use karein? | Local Playwright scraping, complex workers, ya self-hosted |
| Kya direct deploy? | **Haan** — Git push → Vercel + Render |

---

## Part F — Paid AI (Ollama ki jagah — cloud par recommended)

Render par Ollama **nahi** chalega. Paid API use karo:

### OpenAI (sabse simple)

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

Local dev: `AI_PROVIDER=ollama` + Ollama desktop chalao.

---

## Part G — Free tier limitations (honest)

| Feature | Free par |
|---------|----------|
| Render API | Sleep after idle, cold start |
| Vercel | Bandwidth/build limits |
| Atlas M0 | 512MB storage |
| Ollama AI | Render par **nahi** chalega — local ya paid AI API chahiye |
| Playwright scraping | Render free par browser install mushkil — optional disable |
| Stripe payments | Abhi UI/mock — real Stripe keys baad mein |

---

## Part H — Troubleshooting

### CORS error (browser)

- Render `CORS_ORIGINS` mein exact Vercel URL (https, no trailing slash mismatch check)

### MongoDB connection failed

- Atlas Network: `0.0.0.0/0`  
- Password special chars URL-encode (`@` → `%40`)

### System owner login fail

- Render env: `SYSTEM_OWNER_PASSWORD` set  
- Redeploy — startup `ensure_system_owner()` password sync karta hai

### Forgot password email nahi aata

- SMTP configure karo + test email  
- Dev: API response mein `reset_url` aata hai jab `DEBUG=true`

### 502 / slow first request

- Render free cold start — wait 60s, retry

---

## Quick reference — URLs after deploy

```
Frontend:  https://YOUR-APP.vercel.app
Backend:   https://outflo-api.onrender.com
API Docs:  https://outflo-api.onrender.com/docs
SO Login:  https://YOUR-APP.vercel.app/system-owner/login
SO Setup:  https://YOUR-APP.vercel.app/system-owner/setup
Health:    https://outflo-api.onrender.com/api/v1/ready
```

---

## Files in repo (deploy helpers)

- `apps/frontend/vercel.json` — Vercel hints  
- `apps/backend/render.yaml` — Render Blueprint (optional)  
- `docs/DEPLOY_VERCEL_RENDER.md` — yeh guide  

---

**Last updated:** May 2026 — Outflo MVP stack (Next.js 14 + FastAPI + MongoDB)
