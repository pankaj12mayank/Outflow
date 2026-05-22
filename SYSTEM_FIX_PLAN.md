# Outflo — System Fix Plan (Layer-wise)

> **Based on:** `AUDIT_REPORT.md` audit #2 (2026-05-21 E2E)  
> **Phase 1 (L1–L7):** ✅ Complete — 0 CRITICAL open, build + smoke tests pass  
> **Phase 2 (L8–L12):** ✅ Complete 2026-05-21 — **0 open** in audit #2 scope (`AUDIT_REPORT.md` audit #3)  
> **Rule:** Fix **one layer at a time**. One layer = one commit/PR. Verify layer checklist before moving on.

---

## Layer overview

### Phase 1 — Foundation (complete)

| Layer | Focus | Issues | Risk | Status |
|-------|--------|--------|------|--------|
| **L1** | Build blocker + notification URL | 2 CRITICAL | LOW | ✅ |
| **L2** | Auth + RBAC completion | 2 CRITICAL, 4 HIGH | HIGH | ✅ |
| **L3** | Backend SQL stub → MongoDB | 1 CRITICAL, 2 HIGH | HIGH | ✅ |
| **L4** | MongoDB schema deduplication | 4 HIGH, 3 MEDIUM | MEDIUM | ✅ |
| **L5** | API gaps + template route consolidation | 3 HIGH, 2 MEDIUM | MEDIUM | ✅ |
| **L6** | CRM pages + orphan cleanup | 4 MEDIUM, 2 LOW | MEDIUM | ✅ |
| **L7** | Frontend polish (responsive, SEO, scraping hub) | 6 MEDIUM, 4 LOW | LOW | ✅ |

### Phase 2 — Data fidelity & hygiene (audit #2 backlog)

| Layer | Focus | Audit IDs | Issues | Risk | Depends on |
|-------|--------|-----------|--------|------|------------|
| **L8** | API client & fetch consistency | H-01, H-02 | 2 HIGH | LOW | L7 |
| **L9** | RBAC permission parity | H-03 | 1 HIGH | MEDIUM | L8 |
| **L10** | Scraping sub-tools → live API | M-01, M-02, M-03, L-03 | 3 MED, 1 LOW | MEDIUM | L8 |
| **L11** | CRM pages live data (no mock UI) | M-04, M-05, M-06 | 3 MEDIUM | MEDIUM | L8 |
| **L12** | Platform hygiene, hooks, CI | L-01–L-06 | 6 LOW | LOW | L11 |

**Phase 2 order:** L8 → L9 → L10 → L11 → L12 (L10 ∥ L11 after L9 if split work)

---

# LAYER 1 — BUILD & NOTIFICATION HOTFIX

**Goal:** Green production build + notification dropdown loads real data.

**Estimated effort:** 1–2 hours

## Issues

| ID | Issue | Severity |
|----|-------|----------|
| C-01 | Duplicate `getAuthHeaders` breaks `npm run build` | CRITICAL |
| C-02 | `notifications.tsx` uses `fetch("/api/v1/...")` without API base URL | CRITICAL |

## Tasks

| # | File | Action |
|---|------|--------|
| 1.1 | `apps/frontend/app/system-owner/smtp/page.tsx` | Remove local `function getAuthHeaders()`; use only `import { getAuthHeaders } from "@/app/lib/auth"` |
| 1.2 | `apps/frontend/app/components/notifications.tsx` | Replace raw `fetch()` with `api` or `notificationsAPI` from `@/app/lib/api` |
| 1.3 | Same file | Align paths: `POST /{id}/read`, `POST /read-all`, `DELETE /{id}` (match backend) |
| 1.4 | Same file | Map response: use `id` from `serialize_doc` or normalize `_id` → `id` in UI |

## Verification checklist

- [x] `cd apps/frontend && npm run build` exits 0 (2026-05-21)
- [x] Notification bell uses `notificationsAPI` → axios `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
- [x] Mark read → `POST /api/v1/notifications/{id}/read`; dismiss → `DELETE`; mark all → `POST /read-all`

---

# LAYER 2 — AUTH + RBAC (Complete Layer 1 from prior plan)

**Goal:** Single role vocabulary + backend enforces all permissions the UI checks.

**Estimated effort:** 1 day

## Issues

| ID | Issue | Severity |
|----|-------|----------|
| P-04 | `auth_service.PERMISSIONS` missing `smtp:*`, `cms:*`, `monitoring:read`, `notifications:read`, `pricing:*`, `settings:*` | HIGH |
| P-05 | Mixed middleware patterns (DI vs decorators) | MEDIUM |
| M-01 | `require_super_admin` name vs `system_owner` role | MEDIUM |
| L-07 | System owner email check | LOW (already uses settings) |

## Tasks

| # | File | Action |
|---|------|--------|
| 2.1 | `apps/backend/app/services/auth_service.py` | Extend `PERMISSIONS` for `organization_admin` and `system_owner` to match frontend `useAuth.tsx` |
| 2.2 | `apps/backend/app/middleware/auth.py` | Rename `require_super_admin` → `require_system_owner`; update imports in `admin.py`, `cms.py` |
| 2.3 | `apps/backend/app/middleware/rbac.py` | Prefer `Depends(require_permission(...))` over decorators for new code; document pattern |
| 2.4 | `apps/backend/app/api/v1/endpoints/auth.py` | Ensure `/auth/me` returns `role`, `permissions[]`, `organization_id` consistently |
| 2.5 | `apps/frontend/app/hooks/useAuth.tsx` | Load permissions from `/auth/me` when available; fallback to static map |
| 2.6 | `apps/frontend/app/hooks/usePermission.ts` | Keep as thin wrapper (no duplicate permission tables) |

## Verification checklist

- [x] Backend `PERMISSIONS` aligned with frontend `DEFAULT_PERMISSIONS` (+ notifications/monitoring)
- [x] `normalize_role` / `normalizeRole` maps legacy `admin` → `organization_admin`
- [x] `/auth/me` returns `role`, `permissions[]`, `organization_id`
- [x] System owner login sets `permissions: ["*"]` via `PermissionChecker`
- [x] `require_system_owner` added; `require_super_admin` kept as deprecated alias
- [x] `useAuth` / `usePermission` use API permissions when present
- [x] `usePermissions()` uses `user.permissions` (not static map only)

---

# LAYER 3 — BACKEND SQL STUB REMOVAL (MongoDB-only)

**Goal:** No code path uses `AsyncSessionLocal` placeholder.

**Estimated effort:** 2–3 days

## Issues

| ID | Issue | Severity |
|----|-------|----------|
| C-03 | `AsyncSessionLocal` used in 8+ files; session is always `None` | CRITICAL |
| H-03 | CMS routes may hit SQL stub | HIGH |

## Tasks

| # | File | Action |
|---|------|--------|
| 3.1 | `apps/backend/app/api/cms.py` | Migrate SQL blocks to `MongoDB.get_collection(...)` |
| 3.2 | `apps/backend/app/services/admin/service.py` | MongoDB queries (already partial) — remove all `async with AsyncSessionLocal()` |
| 3.3 | `apps/backend/app/services/admin/cms_service.py` | Same |
| 3.4 | `apps/backend/app/services/email/email_service.py` | Same |
| 3.5 | `apps/backend/app/services/email/sequence_engine.py` | Same |
| 3.6 | `apps/backend/app/services/email/tracking.py` | Same |
| 3.7 | `apps/backend/app/services/analytics/engine.py` | Same |
| 3.8 | `apps/backend/app/tasks/scheduler.py` | Same |
| 3.9 | `apps/backend/app/db/__init__.py` | Remove `AsyncSessionLocal` / `Base` exports after grep is clean |

## Verification checklist

- [x] `rg AsyncSessionLocal apps/backend` → 0 matches (2026-05-21)
- [x] `app/db/__init__.py` exports MongoDB helpers only (no `AsyncSessionLocal` / `Base`)
- [x] `python -m compileall app` and `npm run build` pass (2026-05-21)
- [x] `get_database()` helper added; CMS routes no longer silently fall back on import error
- [x] `admin/service.py` fully MongoDB (no SQLAlchemy `AsyncSession` params)
- [x] `tests/test_l3_mongo_smoke.py` — CMS + email bounce + sequence condition (requires local MongoDB)
- [x] Stale SQL imports removed from `email_service.py`, `sequence_engine.py`; `cms_models.py` uses local `Base`

---

# LAYER 4 — MONGODB SCHEMA CLEANUP

**Goal:** Each entity defined once; responses always expose `id` string.

**Estimated effort:** 2 days

## Issues

| ID | Issue | Severity |
|----|-------|----------|
| H-PLAN | Duplicate `Plan` in 4 files | HIGH |
| H-SUB | Duplicate `Subscription` in 3 files | HIGH |
| M-ORG | `Organization` in `models.py` + `documents.py` | MEDIUM |
| M-TPL | `EmailTemplate` in 2+ files | MEDIUM |

## Tasks

| # | Action |
|---|--------|
| 4.1 | **Plan:** canonical = `plan_models.py`; remove from `admin_models.py`, `documents.py` |
| 4.2 | **Subscription:** canonical = `billing_models.py`; remove duplicates |
| 4.3 | **EmailTemplate:** canonical = `notification_models.py`; remove from `documents.py` |
| 4.4 | **Organization:** canonical = `models.py`; trim `documents.py` to DB helpers only or rename to `legacy_schemas.py` and stop imports |
| 4.5 | All list/detail endpoints: return `serialize_doc()` output |
| 4.6 | Update imports across services/endpoints |

## Verification checklist

- [x] `class Plan` only in `plan_models.py` (2026-05-21)
- [x] `class Subscription` only in `billing_models.py`
- [x] `class EmailTemplate` only in `notification_models.py` (org templates → `OrganizationEmailTemplate` in `documents.py`)
- [x] `Organization` canonical in `models.py`; removed from `documents.py`
- [x] `tests/test_l4_schema.py` — dedup checks + org/plan/subscription flow

---

# LAYER 5 — API GAPS & ROUTE CONSOLIDATION

**Goal:** No 404 from `api.ts`; one email-template API surface.

**Estimated effort:** 1–2 days

## Issues

| ID | Issue | Severity |
|----|-------|----------|
| H-01 | Leads stats/verify/dedupe/bulk-delete missing | HIGH |
| H-03 | Duplicate email-template routes | HIGH |
| M-03 | Analytics campaign_id param style | MEDIUM |

## Tasks

| # | File | Action |
|---|------|--------|
| 5.1 | `apps/backend/app/api/v1/endpoints/leads.py` | Add: `GET /stats`, `POST /{id}/verify`, `POST /deduplicate`, `POST /bulk-delete` (or remove from `api.ts` if not needed) |
| 5.2 | `apps/backend/app/api/v1/endpoints/notifications.py` | Remove `/email-templates/*` CRUD (delegate to `email_templates.py`) |
| 5.3 | `apps/frontend/app/lib/api.ts` | Point template calls only to `/api/v1/email-templates` |
| 5.4 | `apps/backend/app/api/analytics.py` | Accept `campaign_id` as query on `GET /campaigns` if frontend sends it |

## Verification checklist

- [x] `leadsAPI` stats / verify / deduplicate / bulkDelete → backend routes added (2026-05-21)
- [x] Email template CRUD: single prefix `/api/v1/email-templates` (removed from `notifications.py`)
- [x] `system-owner/notifications/page.tsx` uses `/email-templates` + `NEXT_PUBLIC_API_URL`
- [x] `GET /analytics/campaigns?campaign_id=` supported
- [x] `tests/test_l5_api_gaps.py` passes

---

# LAYER 6 — CRM & ROUTE HYGIENE

**Goal:** All navigation works; no orphan admin trees.

**Estimated effort:** 1 day

## Issues

| ID | Issue | Severity |
|----|-------|----------|
| H-04 | Orphan `app/super-admin/*` pages | HIGH |
| H-05 | Automation stub | HIGH |
| M-02 | Dashboard date picker overflow | MEDIUM |
| M-05 | Bounce webhook no UI | MEDIUM |

## Tasks

| # | Action |
|---|--------|
| 6.1 | Delete or redirect `apps/frontend/app/app/super-admin/**` → `/system-owner/*` |
| 6.2 | `middleware.ts` / `next.config.js`: add redirects if external links exist |
| 6.3 | `dashboard/page.tsx`: date picker `right-0` → `left-0 sm:left-auto` or portal |
| 6.4 | Automation: either implement minimal workflow list OR remove sidebar link until ready |
| 6.5 | Optional: leads/campaigns error boundaries + empty states |
| 6.6 | Optional: billing/notifications panel for email bounces |

## Verification checklist

- [x] Every `sidebar.tsx` href resolves to existing `page.tsx` (2026-05-21)
- [x] `super-admin/*` redirects → `system-owner/*` (layout + pages + `next.config.js` + `middleware.ts`)
- [x] Automation page: minimal hub linking to Sequences / Campaigns (sidebar kept)
- [x] Dashboard date picker: `left-0` on mobile, anchored wrapper for overflow

---

# LAYER 7 — FRONTEND POLISH

**Goal:** Responsive, SEO, scraping pages on real data, CI green.

**Estimated effort:** 2–3 days

## Issues

| ID | Issue | Severity |
|----|-------|----------|
| M-04 | No per-page metadata | MEDIUM |
| R-* | Responsive gaps (analytics, leads filters) | MEDIUM |
| M-03 | Scraping sub-pages mock data | MEDIUM |
| ENV | Tests need MongoDB | MEDIUM |

## Tasks

| # | Action |
|---|--------|
| 7.1 | Add `metadata` / `generateMetadata` to top-level app routes |
| 7.2 | `analytics/page.tsx`, `leads/page.tsx`: loading + error states |
| 7.3 | `app/scraping/*`: wire to `scrapingAPI` |
| 7.4 | Global pass: `p-6` → `p-4 sm:p-6` on main layouts |
| 7.5 | `validate_platform.py`: fix frontend path (`apps/frontend/app`), ASCII output on Windows |
| 7.6 | `pytest`: document Mongo requirement or add `mongomock`/test fixtures |
| 7.7 | System-owner pages: grep duplicate `getAuthHeaders` — use `@/app/lib/auth` only |

## Verification checklist

- [x] Per-route `metadata` on app, login, landing, leads, analytics, scraping (2026-05-21)
- [x] `leads` / `analytics` / `scraping` — loading + error states; scraping jobs from `scrapingAPI`
- [x] Google Maps search queues real job via API (no mock delay)
- [x] Main layout padding `p-4 sm:p-6`; overflow guards on key pages
- [x] `validate_platform.py` — correct repo root, `app/app/*` paths, ASCII on Windows
- [x] `apps/backend/TESTING.md` — MongoDB requirement documented
- [x] System-owner pages use `@/app/lib/auth` `getAuthHeaders` only (no duplicate local defs)
- [x] `npm run build` exit 0 after L7 type fixes + `login/layout.tsx` wraps `AuthProviders` for prerender

---

# LAYER 8 — API CLIENT & FETCH CONSISTENCY

**Goal:** Every frontend API call uses `NEXT_PUBLIC_API_URL` (no relative `/api/v1` on Next host, no hardcoded localhost).

**Estimated effort:** 2–4 hours

## Issues (audit #2)

| ID | Issue | Severity |
|----|-------|----------|
| H-01 | Relative `fetch('/api/v1/...')` on system-owner notifications | HIGH |
| H-02 | Hardcoded `http://localhost:8000` on AI status | HIGH |

## Tasks

| # | File | Action |
|---|------|--------|
| 8.1 | `apps/frontend/app/system-owner/notifications/page.tsx` | Replace relative fetch (read, read-all, email-log retry) with `api` / `notificationsAPI` + shared base URL |
| 8.2 | Same file | Audit all `fetch()` in file — use `getAuthHeaders()` from `@/app/lib/auth` consistently |
| 8.3 | `apps/frontend/app/app/ai/page.tsx` | Use `aiAPI` or `config.ts` / `api.ts` base URL for `/ai/status` (remove localhost literal) |
| 8.4 | `apps/frontend` | `rg "fetch\(['\`]/api/v1"` and `rg "localhost:8000"` — fix any new hits |

## Verification checklist

- [x] `rg "fetch\(['\`]/api/v1" apps/frontend` → 0 matches (2026-05-21)
- [x] `rg "localhost:8000" apps/frontend/app` → only `config.ts`, `api.ts`, `api-client.ts`, env fallbacks in setup/cms (2026-05-21)
- [x] System-owner notifications → `notificationsAPI` / `emailTemplatesAPI` (mark read, read-all, retry via API client)
- [x] `app/ai/page.tsx` → `aiAPI.getStatus()` (no hardcoded host)
- [x] `api.ts` interceptor: `access_token` || `system_owner_token` for shared CRM routes
- [x] `cd apps/frontend && npm run build` exits 0 (2026-05-21)

---

# LAYER 9 — RBAC PERMISSION PARITY

**Goal:** Backend `PERMISSIONS` matches frontend `useAuth` / `rbac_models` for `organization_admin`.

**Estimated effort:** 2–3 hours

## Issues (audit #2)

| ID | Issue | Severity |
|----|-------|----------|
| H-03 | RBAC drift: dual permission tables + JWT users without `user_roles` got `team_member` perms | HIGH |

## Tasks

| # | File | Action |
|---|------|--------|
| 9.1 | `apps/backend/app/core/role_permissions.py` | **New** canonical permission lists |
| 9.2 | `auth_service.py`, `rbac_models.py` | Import from `role_permissions.py` |
| 9.3 | `middleware/rbac.py` | Fallback: JWT role → `PermissionChecker` (fix org admin 403 on leads) |
| 9.4 | `useAuth.tsx` | Sync comment + verify DEFAULT_PERMISSIONS match canonical org/team sets |
| 9.5 | `tests/test_l9_rbac_parity.py` | Parity tests (8) including middleware fallback |

## Verification checklist

- [x] Canonical permissions in `app/core/role_permissions.py` (single source) (2026-05-21)
- [x] `auth_service.PERMISSIONS` and `rbac_models.ROLE_PERMISSIONS` import canonical sets
- [x] `organization_admin` does **not** include `smtp`/`cms`/`pricing` (platform-only on system_owner)
- [x] `get_current_user_with_role` falls back to JWT role + `PermissionChecker` (not hardcoded `team_member`)
- [x] `useAuth.tsx` DEFAULT_PERMISSIONS documented in sync with backend
- [x] `pytest tests/test_l9_rbac_parity.py` — 8 passed (2026-05-21)

---

# LAYER 10 — SCRAPING SUB-TOOLS (LIVE API)

**Goal:** LinkedIn, website crawler, and CSV import use `scrapingAPI` / hooks — no mock delays or `sampleResult`.

**Estimated effort:** 1–2 days

## Issues (audit #2)

| ID | Issue | Severity |
|----|-------|----------|
| M-01 | LinkedIn page `setTimeout` mock | MEDIUM |
| M-02 | Website page `sampleResult` | MEDIUM |
| M-03 | CSV import static preview/mapping | MEDIUM |
| L-03 | Scraping hub tool cards hardcoded stats | LOW |

## Tasks

| # | File | Action |
|---|------|--------|
| 10.1 | `app/app/scraping/linkedin/page.tsx` | Wire to `scrapingAPI.linkedinEnrich` (or equivalent); loading/error states |
| 10.2 | `app/app/scraping/website/page.tsx` | Wire to website crawl endpoint; show job id + poll results |
| 10.3 | `app/app/scraping/csv-import/page.tsx` | Wire upload → `scrapingAPI` CSV import; real column mapping from API |
| 10.4 | `app/app/scraping/page.tsx` | Replace `scrapingTools[].stats` with aggregated stats from `useScrapingStats` or per-type API |
| 10.5 | `app/hooks/use-scraping.ts` | Add mutations/hooks if missing for linkedin/website/csv |

## Verification checklist

- [x] LinkedIn → `useEnrichLinkedInSync` + `useEnrichLinkedIn` (no mock delay) (2026-05-21)
- [x] Website → `useCrawlWebsiteSync` + `useCrawlWebsite` (no `sampleResult`) (2026-05-21)
- [x] CSV → `useParseCSV` + `useImportCSV` with real preview/mapping from API (2026-05-21)
- [x] Hub tool cards → `aggregateToolStatsFromJobs` from `useScrapingJobs` (2026-05-21)
- [x] Backend sync endpoints accept `linkedin_url` / return structured fields (2026-05-21)
- [x] `pytest tests/test_l10_scraping_routes.py` — 3 passed (2026-05-21)
- [x] `npm run build` passes (2026-05-21)

---

# LAYER 11 — CRM PAGES LIVE DATA

**Goal:** Analytics charts, campaign detail, and leads list reflect API data only (no silent mock fallback in prod).

**Estimated effort:** 2–3 days

## Issues (audit #2)

| ID | Issue | Severity |
|----|-------|----------|
| M-04 | Analytics `chartData` static while overview is live | MEDIUM |
| M-05 | `campaigns/[id]/page.tsx` entirely mock | MEDIUM |
| M-06 | Leads `fallbackLeads` when API returns `[]` | MEDIUM |

## Tasks

| # | File | Action |
|---|------|--------|
| 11.1 | `app/app/analytics/page.tsx` | Map charts/alerts from `useAnalyticsOverview` + sub-hooks (`leads`, `campaigns`, `ai`) |
| 11.2 | `app/app/campaigns/[id]/page.tsx` | Fetch `campaignsAPI.get(id)` + stats; remove inline mock `campaign` / `leads` arrays |
| 11.3 | `app/app/leads/page.tsx` | Empty state when `apiLeads.length === 0`; remove or gate `fallbackLeads` behind `NODE_ENV === 'development'` |
| 11.4 | `app/hooks/use-analytics.ts` | Extend hooks if chart series need dedicated endpoints |
| 11.5 | `app/hooks/use-campaigns.ts` | **New** — `useCampaign`, `useCampaignStats` (fixes validator warning L-05) |

## Verification checklist

- [x] Analytics page: changing date range updates chart values from API (or shows empty state)
- [x] Campaign detail URL `/app/campaigns/{realId}` loads Mongo campaign name/status
- [x] Fresh org with 0 leads shows empty state, not 6 demo rows
- [x] `validate_platform.py` finds `use-campaigns.ts`
- [x] `npm run build` passes

---

# LAYER 12 — PLATFORM HYGIENE & CI

**Goal:** Remove dead code paths, optional ops UI, quieter tests; CI runs Mongo-dependent tests.

**Estimated effort:** 1–2 days

## Issues (audit #2)

| ID | Issue | Severity |
|----|-------|----------|
| L-01 | `require_super_admin` deprecated alias exported | LOW |
| L-02 | `app/app/super-admin/*` files remain | LOW |
| L-04 | No bounce webhook admin UI | LOW |
| L-05 | `use-campaigns.ts` missing (if not done in L11) | LOW |
| L-06 | Pydantic `model_id` namespace warning | LOW |

## Tasks

| # | Action |
|---|--------|
| 12.1 | Remove `require_super_admin` from public `middleware/__init__.py` exports; grep-update stragglers to `require_system_owner` |
| 12.2 | Delete `app/app/super-admin/**` page bodies — keep redirects only in `next.config.js` + `middleware.ts` |
| 12.3 | Optional: `system-owner/email/bounces` page reading webhook stats from API |
| 12.4 | `apps/backend` CI workflow: MongoDB service container; run full `pytest` (reduce 81 skips) |
| 12.5 | `AIModel`: set `model_config['protected_namespaces'] = ()` or rename `model_id` field |
| 12.6 | Re-run E2E audit checklist; update `AUDIT_REPORT.md` audit #3 |

## Verification checklist

- [x] `rg require_super_admin apps/backend` → zero (removed export + alias)
- [x] No routable duplicate `super-admin` pages (`next.config.js` + `middleware.ts` redirects only)
- [x] `pytest tests/` — Mongo service in `.github/workflows/backend-tests.yml`; skips documented
- [x] `validate_platform.py` → 0 errors, 0 warnings (RBAC check uses `role_permissions.py`)
- [x] `AUDIT_REPORT.md` audit #3 — Phase 2 open count 0

---

# EXECUTION RULES

### Phase 1 (done)

1. **Order:** L1 → L2 → L3 → L5 → L4 → L6 → L7  
2. L4 could run parallel to L3 after L2  
3. L1 was mandatory first (build + notifications)

### Phase 2 (current)

1. **Order:** L8 → L9 → (L10 ∥ L11) → L12  
2. **Do not start L10/L11** until L8–L9 pass (correct API base + permissions)  
3. **One layer per commit/PR** — no mixing layers  
4. **After each layer:** run that layer's verification checklist + `npm run build`  
5. **Audit #3:** L8–L12 complete — open findings 0 in plan scope (2026-05-21)

---

# PROGRESS TRACKER

## Phase 1

| Layer | Status | Completed |
|-------|--------|-----------|
| L1 Build + notifications | ✅ Complete | 2026-05-21 |
| L2 Auth + RBAC | ✅ Complete | 2026-05-21 |
| L3 SQL stub removal | ✅ Complete | 2026-05-21 |
| L4 Schema cleanup | ✅ Complete | 2026-05-21 |
| L5 API gaps | ✅ Complete | 2026-05-21 |
| L6 CRM hygiene | ✅ Complete | 2026-05-21 |
| L7 Polish | ✅ Complete | 2026-05-21 |

## Phase 2 (audit #2)

| Layer | Status | Completed | Audit IDs |
|-------|--------|-----------|-----------|
| L8 API fetch consistency | ✅ Complete | 2026-05-21 | H-01, H-02 |
| L9 RBAC parity | ✅ Complete | 2026-05-21 | H-03 |
| L10 Scraping sub-tools | ✅ Complete | 2026-05-21 | M-01–M-03, L-03 |
| L11 CRM live data | ✅ Complete 2026-05-21 | `test_l11_analytics_routes.py` | M-04–M-06, L-05 |
| L12 Hygiene & CI | ✅ Complete 2026-05-21 | `test_l12_hygiene.py`, `backend-tests.yml` | L-01–L-04, L-06 |

**Phase 2 progress:** 5 / 5 layers · **0** open issues in audit #2 scope

---

# FILE IMPACT SUMMARY

## Phase 1 (complete)

| Layer | Primary files | Est. count |
|-------|---------------|------------|
| L1 | `smtp/page.tsx`, `notifications.tsx` | 2 |
| L2 | `auth_service.py`, `auth.py`, `useAuth.tsx`, `auth.py` endpoints | 6 |
| L3 | `cms.py`, `admin/service.py`, email services, `db/__init__.py` | 9 |
| L4 | `models/*`, service imports | 10 |
| L5 | `leads.py`, `notifications.py`, `api.ts`, `analytics.py` | 5 |
| L6 | `super-admin/*`, `sidebar.tsx`, `dashboard/page.tsx` | 8 |
| L7 | scraping hub, layouts, `validate_platform.py` | 15+ |

## Phase 2 (planned)

| Layer | Primary files | Est. count |
|-------|---------------|------------|
| L8 | `system-owner/notifications/page.tsx`, `app/ai/page.tsx` | 2–4 |
| L9 | `auth_service.py`, `rbac_models.py`, `test_l9_rbac_parity.py` | 3–4 |
| L10 | `scraping/linkedin`, `website`, `csv-import`, `scraping/page.tsx`, `use-scraping.ts` | 5–6 |
| L11 | `analytics/page.tsx`, `campaigns/[id]/page.tsx`, `leads/page.tsx`, `use-campaigns.ts` | 5–6 |
| L12 | `middleware/*`, `super-admin/*`, CI workflow, `AIModel` | 4–8 |

---

# AUDIT TRACEABILITY (audit #2 → layers)

| Audit ID | Severity | Layer |
|----------|----------|-------|
| H-01 | HIGH | L8 |
| H-02 | HIGH | L8 |
| H-03 | HIGH | L9 ✅ |
| M-01 | MEDIUM | L10 ✅ |
| M-02 | MEDIUM | L10 ✅ |
| M-03 | MEDIUM | L10 ✅ |
| M-04 | MEDIUM | L11 ✅ |
| M-05 | MEDIUM | L11 ✅ |
| M-06 | MEDIUM | L11 ✅ |
| L-01 | LOW | L12 ✅ |
| L-02 | LOW | L12 ✅ |
| L-03 | LOW | L10 ✅ |
| L-04 | LOW | L12 ✅ |
| L-05 | LOW | L11 ✅ |
| L-06 | LOW | L12 ✅ |

---

*Source: `AUDIT_REPORT.md` audit #3 · Phase 1 + Phase 2 closed 2026-05-21*
