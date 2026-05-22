# Outflo — Pull & Verify Checklist

> **Use this after every `git pull`** (or before release) to confirm the platform still works.  
> **Audit scope:** #4 findings closed via L13–L19 · **Gate:** audit #5 (2026-05-22)  
> **Related:** `AUDIT_REPORT.md` · `SYSTEM_FIX_PLAN.md` · `apps/backend/scripts/live_smoke_l19.py`

---

## 1. Prerequisites

| Requirement | Check |
|-------------|-------|
| MongoDB running | `mongodb://localhost:27017` (see `apps/backend/.env`) |
| Backend `.env` | Copy from `apps/backend/.env.example` if missing |
| Frontend `.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:8000` |
| Node 18+ & Python 3.11+ | Installed |

**Start stack (repo root):**

```powershell
# Terminal 1 — API
cd d:\Py_Projects\Outflo\apps\backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — UI
cd d:\Py_Projects\Outflo\apps\frontend
npm run dev
```

Or from root: `npm run dev` (both services).

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Frontend |
| http://localhost:8000/docs | API Swagger |

**Default system owner (dev):** `admin@outflo.com` / see `SYSTEM_OWNER_PASSWORD` in `apps/backend/.env`

**Important:** Log out before SO login so old org `access_token` is cleared (fixes “Access denied”).

---

## 2. Automated gate (run first — ~2 min)

Run from **repo root** (`Outflo/`). All must pass before manual browser QA.

### 2.1 Platform structure

```powershell
cd d:\Py_Projects\Outflo
python validate_platform.py
```

| Expected |
|----------|
| **0 errors**, **0 warnings** |

### 2.2 Phase 3 layer tests

```powershell
cd apps\backend
python -m pytest tests/test_l13_unified_auth.py tests/test_l14_rbac_ui.py tests/test_l15_sequences_smoke.py tests/test_l15_leads_mutations.py tests/test_l16_team_inbox_calendar.py tests/test_l17_settings_billing.py tests/test_l18_platform_polish.py tests/test_l19_persona_e2e.py tests/test_l20_system_owner_ops.py -q
```

| Expected |
|----------|
| **48 passed**, 0 failed |

### 2.3 Live API smoke (backend must be on :8000)

```powershell
cd apps\backend
python scripts/live_smoke_l19.py
```

| Expected |
|----------|
| **11/11** checks passed |

### 2.4 Frontend build

```powershell
cd apps\frontend
npm run build
```

| Expected |
|----------|
| Exit **0** · ~**45** routes |

### 2.5 Full backend suite (optional, CI-like)

```powershell
cd apps\backend
python -m pytest tests/ -q
```

| Expected |
|----------|
| **0 failed** (skips OK — Mongo/DB integration tests) |

---

## 3. Manual browser checklist

Mark each row after testing. **Pass** = works as described · **N/A** = hidden/disabled by design for that role.

### 3.1 Anonymous visitor

| # | Step | URL | Pass? | Notes |
|---|------|-----|-------|-------|
| A1 | Marketing home loads | `/landing` | ☐ | Content or fallback |
| A2 | Pricing section | `/landing` | ☐ | Plans from API |
| A3 | CMS slug (published page) | `/landing/{slug}` | ☐ | No login prompt; 404 OK if slug missing |
| A4 | Register wizard (5 steps) | `/register` | ☐ | Finish → lands on dashboard |
| A5 | Login page | `/login` | ☐ | Org login works |

### 3.2 Organization admin (new or existing admin)

Use account from A4 or existing org admin.

| # | Step | URL | Pass? | Notes |
|---|------|-----|-------|-------|
| O1 | Dashboard stats | `/app/dashboard` | ☐ | Leads/campaigns/emails load |
| O2 | Leads list + delete/edit | `/app/leads` | ☐ | Actions hit API (not toast-only) |
| O3 | Campaigns CRUD / launch | `/app/campaigns` | ☐ | |
| O4 | Sequences | `/app/sequences` | ☐ | List from API, not static mock |
| O5 | Scraping hub + jobs tab | `/app/scraping` | ☐ | Jobs from API |
| O6 | Scraping jobs redirect | `/app/scraping/jobs` | ☐ | Redirects to `?tab=jobs`, no fake jobs |
| O7 | Analytics | `/app/analytics` | ☐ | Charts load |
| O8 | AI settings save | `/app/ai` | ☐ | Reload page → settings persist |
| O9 | Inbox | `/app/inbox` | ☐ | Messages from API |
| O10 | Calendar | `/app/calendar` | ☐ | Meetings load |
| O11 | Billing plans | `/app/billing` | ☐ | Plans from API; subscribe flow |
| O12 | Settings save | `/app/settings` | ☐ | Org name change persists after refresh |
| O13 | Team | `/app/team` | ☐ | Members from API |

### 3.3 Team member

Invite or use a `team_member` account in same org.

| # | Step | URL | Pass? | Notes |
|---|------|-----|-------|-------|
| T1 | Sidebar hides billing/analytics | `/app/dashboard` | ☐ | Or items disabled |
| T2 | Direct URL analytics blocked | `/app/analytics` | ☐ | Redirect or permission denied |
| T3 | Campaign create hidden/disabled | `/app/campaigns` | ☐ | No false “success” on launch |
| T4 | Scraping create denied | `/app/scraping` | ☐ | Read OK; create 403 or hidden |
| T5 | Leads read works | `/app/leads` | ☐ | |

### 3.4 System owner

Login with `admin@outflo.com` (routes to SO auth).

| # | Step | URL | Pass? | Notes |
|---|------|-----|-------|-------|
| S1 | SO dashboard | `/system-owner/dashboard` | ☐ | Stats load |
| S2 | System Health in nav (≤2 clicks) | `/system-owner/health` | ☐ | Replaces Setup; run health-check |
| S2b | Purge demo CRM data (optional) | `/system-owner/health` | ☐ | Dashboard counts reset |
| S3 | Notifications (≤2 clicks) | `/system-owner/notifications` | ☐ | **No 401** with SO session |
| S4 | Email → Bounces (≤2 clicks) | `/system-owner/email/bounces` | ☐ | Stats load |
| S5 | Email sub-routes | queue, analytics, templates, triggers | ☐ | Nav expandable |
| S6 | Organizations list loads | `/system-owner/organizations` | ☐ | No “Access denied”; rows visible |
| S6b | Delete org (modal) | `/system-owner/organizations` | ☐ | Click row → Delete → confirm |
| S7 | Plans / SMTP / CMS | respective routes | ☐ | |

---

## 4. Sign-off

| Check | Date | Name |
|-------|------|------|
| Automated §2 all green | | |
| Manual §3 all Pass/N/A | | |
| Audit #4 IDs still 0 open | | |

**Production-ready (audit #5)** when:

- §2: validator + 48 layer tests + 11/11 live smoke + build pass  
- §3: no ❌ on org admin or SO critical paths  
- No new HIGH/MEDIUM in `AUDIT_REPORT.md` open table  

---

## 5. Quick troubleshooting

| Symptom | Fix |
|---------|-----|
| Port 8000 in use | `Get-NetTCPConnection -LocalPort 8000 \| % { Stop-Process -Id $_.OwningProcess -Force }` |
| Register fails locally | Standalone Mongo: fixed via non-transaction fallback; ensure Mongo is up |
| SO notifications 500 | Ensure latest `notification_service.py` (single `NotificationService` class) |
| Live smoke fails | Restart backend after pull; re-run `python scripts/live_smoke_l19.py` |
| Frontend API errors | Check `apps/frontend/.env.local` → `NEXT_PUBLIC_API_URL` |

---

## 6. One-liner summary (copy to PR)

```
validate_platform.py OK · pytest L13-L19 48/48 · live_smoke 11/11 · npm run build OK · manual checklist §3 done
```
