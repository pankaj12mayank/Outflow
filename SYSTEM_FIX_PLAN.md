# Outflo — System Fix Plan (Layer-wise)

> **Based on:** `AUDIT_REPORT.md` audit #4 (persona E2E deep dive, 2026-05-21)  
> **Phase 1 (L1–L7):** ✅ Complete  
> **Phase 2 (L8–L12):** ✅ Complete — audit #2/#3 scope closed  
> **Phase 3 (L13–L19):** ✅ **Complete** (2026-05-22) — audit #5 gate · **0 open** audit #4 IDs  
> **After every pull:** run `MANUAL_QA_CHECKLIST.md` (automated + browser)  
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

### Phase 3 — Persona E2E completion (audit #4 backlog → 100% ready)

| Layer | Focus | Audit IDs | Issues | Risk | Depends on |
|-------|--------|-----------|--------|------|------------|
| **L13** | Security & dual-auth fix | H-04, H-05, H-06 | 3 HIGH | **HIGH** | L12 |
| **L14** | RBAC guards + scraping policy | M-12, M-13, M-14, L-11 | 4 MED, 1 LOW | MEDIUM | L13 |
| **L15** | Sequences + leads mutations E2E | M-07, M-11 | 2 MEDIUM | MEDIUM | L14 |
| **L16** | Team, inbox, calendar E2E | M-08, M-09, M-16 | 3 MEDIUM | MEDIUM | L14 |
| **L17** | Settings, billing UI, AI persist | M-10, M-17, M-18 | 3 MEDIUM | MEDIUM | L13, L14 |
| **L18** | Platform polish & accuracy | M-15, L-07, L-08, L-09, L-10 | 5 LOW/MED | LOW | L15–L17 |
| **L19** | Production readiness gate | All Phase 3 | 20 → 0 | LOW | L18 |

**Phase 3 order:** **L13** (security first) → **L14** → (**L15** ∥ **L16**) → **L17** → **L18** → **L19**

**Target after L19:** Audit #5 sign-off — **0 open** H/M/L · persona E2E **100%** · see [100% readiness definition](#phase-3--100-production-readiness-definition).

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

# PHASE 3 — 100% PRODUCTION READINESS DEFINITION

When Phase 3 (L13–L19) is complete, the platform meets **all** of the following. This is the bar for “nothing remains” from audit #4.

| Persona | Required E2E | Pass criteria |
|---------|----------------|---------------|
| **Anonymous** | Landing, pricing, `/landing/[slug]` | Public CMS slug loads without auth; no 401 on published pages |
| **Register → org admin** | 5-step register (optional: persist onboarding) | `POST /auth/register` + verify email; login → dashboard |
| **Org admin** | Full CRM journey (17 steps in audit #4) | Every sidebar route uses real API or honest empty state; no mock arrays; writes persist |
| **Team member** | Restricted CRM | Sidebar + **RouteGuard** block analytics/billing; campaign/lead write buttons hidden; scraping respects `scraping:create` policy |
| **System owner** | Console + notifications + bounces | Single SO session works on **all** SO pages including notifications & bounces |
| **Security** | Billing, JWT, middleware | `/billing/*` requires auth + org scope; no IDOR; optional edge cookie check on `/app` |

| Metric | Target |
|--------|--------|
| `AUDIT_REPORT.md` open findings (audit #4 IDs) | **0** |
| `npm run build` | Exit 0 |
| `validate_platform.py` | 0 errors, 0 warnings |
| `pytest` layer smoke L3–L19 | All pass |
| Persona E2E fidelity (audit #4 matrix) | **100%** (not ~62%) |
| Integration tests in CI | Mongo job runs; skip count documented or &lt; 20 |

---

# LAYER 13 — SECURITY & DUAL-AUTH FIX

**Goal:** Close all HIGH security/auth blockers before CRM feature wiring. System owner and org users can trust tokens; billing and public CMS are safe.

**Estimated effort:** 2–3 days

## Issues (audit #4)

| ID | Issue | Severity |
|----|-------|----------|
| H-04 | `system_owner_token` rejected on notifications & bounces (`type` must be `access`) | HIGH |
| H-05 | `/api/v1/billing/*` has no authentication | HIGH |
| H-06 | `GET /cms/landing/pages/slug/{slug}` requires SO auth; public page 401 | HIGH |

## Deep-dive plan

### H-04 — Unify system-owner API authentication

**Problem:** `get_current_user` only accepts JWT `type: access`. SO login stores `system_owner_token` (`type: system_owner_access`). Pages using `notificationsAPI` and bounces call org-auth endpoints → **401**.

**Fix options (pick one, apply consistently):**

1. **Preferred:** Add `get_current_user_or_system_owner` dependency that validates either token type and returns normalized user dict with `role: system_owner`.
2. **Alternative:** Change notifications + email-templates + `polls/bounces/stats` to use `get_current_system_owner` from `system_owner_auth.py` (SO JWT only).

**Tasks**

| # | File | Action |
|---|------|--------|
| 13.1 | `app/middleware/auth.py` (or new `unified_auth.py`) | Implement `get_current_user_or_system_owner` |
| 13.2 | `app/api/v1/endpoints/notifications.py` | Swap Depends to unified auth for SO-readable routes |
| 13.3 | `app/api/v1/endpoints/email_templates.py` | Same if SO manages templates here |
| 13.4 | `app/api/webhooks.py` | `bounce_stats` → `get_current_system_owner` or unified |
| 13.5 | `app/lib/api.ts` | Extend interceptor SO path list if new URL prefixes added |
| 13.6 | `tests/test_l13_unified_auth.py` | SO token returns 200 on notifications list + bounces stats |

### H-05 — Secure billing routes

| # | File | Action |
|---|------|--------|
| 13.7 | `app/api/v1/endpoints/billing.py` | Add `Depends(get_current_user)` + `require_organization` on all routes |
| 13.8 | Same | Scope queries: `organization_id` from JWT unless `system_owner` with explicit query param |
| 13.9 | `app/middleware/rbac.py` | Add `billing:read` / `billing:update` checks on sensitive routes |
| 13.10 | `tests/test_l13_billing_auth.py` | Unauthenticated → 401; cross-org invoice id → 403 |

### H-06 — Public CMS slug pages

| # | File | Action |
|---|------|--------|
| 13.11 | `app/api/v1/endpoints/cms_landing.py` | New `GET /pages/slug/{slug}/public` OR change slug route: `Depends(get_current_system_owner)` only when `preview=true` |
| 13.12 | Same | Return only `status: published` pages for anonymous |
| 13.13 | `app/landing/[slug]/page.tsx` | Call public endpoint; handle 404 |
| 13.14 | `tests/test_l13_public_cms.py` | Anonymous client → 200 for published slug |

## Verification checklist

- [x] SO login → `/system-owner/notifications` loads templates + logs (no 401) — `get_current_user_or_system_owner`
- [x] SO login → `/system-owner/email/bounces` loads stats table — `require_platform_system_owner`
- [x] `curl` billing invoices without token → 401 — `require_billing_user` on all routes
- [x] Org scoped billing — `_billing_org_scope` + `_get_*_scoped` helpers
- [x] `/landing/{published-slug}` public endpoint — `GET .../slug/{slug}/public`
- [x] `pytest tests/test_l13_unified_auth.py` pass
- [x] `npm run build` passes

---

# LAYER 14 — RBAC GUARDS & SCRAPING POLICY

**Goal:** Frontend permission enforcement matches backend; team members cannot bypass nav via URL; scraping policy aligned with `role_permissions.py`.

**Estimated effort:** 2 days

## Issues (audit #4)

| ID | Issue | Severity |
|----|-------|----------|
| M-12 | Campaign launch/pause/create shown to `team_member` | MEDIUM |
| M-13 | `RouteGuard` / `PermissionGuard` not mounted on `/app` | MEDIUM |
| M-14 | No server-side middleware auth for `/app/*` | MEDIUM |
| L-11 | Scraping API uses `get_current_user` only, not `scraping:*` permissions | LOW |

## Deep-dive plan

| # | File | Action |
|---|------|--------|
| 14.1 | `app/app/app-layout-client.tsx` or `app/providers.tsx` | Wrap CRM layout with `RouteGuard` from `RouteGuard.tsx` |
| 14.2 | `app/components/RouteGuard.tsx` | Ensure map includes `/app/analytics` → `analytics:read`, `/app/billing` → `billing:read`, `/app/campaigns` write paths |
| 14.3 | `app/app/campaigns/page.tsx`, `campaigns/[id]/page.tsx` | Wrap Create/Launch/Pause/Delete in `PermissionGuard` (`campaigns:create`, `campaigns:start`, etc.) |
| 14.4 | `app/app/leads/page.tsx` | Hide delete/enrich/import for roles without `leads:delete` / `leads:enrich` |
| 14.5 | `app/components/sidebar.tsx` (or nav) | Hide Dashboard/AI/Inbox/Calendar/Settings items by sensible defaults OR document as intentional |
| 14.6 | `middleware.ts` | Optional: redirect `/app/*` without `access_token` cookie to `/login` (reduces flash) |
| 14.7 | `app/api/scraping.py` | Add `require_permissions(["scraping:read"])` on list; `scraping:create` on job create routes |
| 14.8 | `tests/test_l14_rbac_ui.py` | Team member JWT: analytics GET → 403; scraping create without perm → 403 |

## Verification checklist

- [x] `team_member` login: no Create Campaign button; direct `/app/analytics` → redirect or forbidden page
- [x] `organization_admin`: full campaign actions work
- [x] Scraping job create with `team_member` → 403 if policy is read-only
- [x] `npm run build` passes

---

# LAYER 15 — SEQUENCES & LEADS E2E

**Goal:** Core outbound workflow (sequences) and lead lifecycle mutations work end-to-end for org admin.

**Estimated effort:** 3–4 days

## Issues (audit #4)

| ID | Issue | Severity |
|----|-------|----------|
| M-07 | `sequences/page.tsx` 100% mock; `sequencesAPI` unused | MEDIUM |
| M-11 | Leads delete/enrich/edit — toast only, no API | MEDIUM |

## Deep-dive plan

### M-07 — Sequences

| # | File | Action |
|---|------|--------|
| 15.1 | `app/hooks/use-sequences.ts` | **New** — `useSequences`, `useSequence`, `useCreateSequence`, `useUpdateSequence`, `useDeleteSequence`, `useDuplicateSequence` |
| 15.2 | `app/app/sequences/page.tsx` | Remove `sequences` const; load list from hook; wire create/edit/delete/duplicate |
| 15.3 | Same | Step editor persists via `sequencesAPI.update` (steps in payload per backend schema) |
| 15.4 | Backend | Confirm `sequences.py` accepts steps JSON; extend if missing |
| 15.5 | `tests/test_l15_sequences_smoke.py` | Route registered; CRUD with mocked Mongo or integration |

### M-11 — Leads mutations

| # | File | Action |
|---|------|--------|
| 15.6 | `app/hooks/use-leads.ts` | Ensure `useCreateLead`, `useUpdateLead`, `useDeleteLead`, `useEnrichLead`, `useImportLeads` exported and used |
| 15.7 | `app/app/leads/page.tsx` | `handleDeleteLead` → `deleteLead.mutate`; wire add/edit modals to API |
| 15.8 | Same | Import CSV → `leadsAPI.import` or scraping import path documented |
| 15.9 | `tests/test_l15_leads_mutations.py` | Create → list → delete flow |

## Verification checklist

- [x] Create sequence → appears in list → edit steps → save → reload persists
- [x] Delete lead → removed from Mongo + UI after refetch
- [x] Enrich lead calls `/leads/{id}/enrich` (or equivalent)
- [x] No `const sequences = [` or fake delete toast in leads page
- [x] `npm run build` passes

---

# LAYER 16 — TEAM, INBOX & CALENDAR E2E

**Goal:** Collaboration and communication surfaces use real APIs or are removed from nav until ready.

**Estimated effort:** 3–5 days

## Issues (audit #4)

| ID | Issue | Severity |
|----|-------|----------|
| M-08 | Team page mock; `teamAPI` unused | MEDIUM |
| M-09 | Inbox entirely mock | MEDIUM |
| M-16 | Calendar mock | MEDIUM |

## Deep-dive plan

### M-08 — Team

| # | File | Action |
|---|------|--------|
| 16.1 | `app/hooks/use-team.ts` | **New** — `useTeamMembers`, `useInviteMember`, `useUpdateMemberRole`, `useRemoveMember` → `teamAPI` |
| 16.2 | `app/app/team/page.tsx` | Replace fixtures; load org members from API |
| 16.3 | Same | Invite → `teamAPI.invite`; role change → PATCH; remove → DELETE |
| 16.4 | Backend `team.py` | Verify invite email flow or document manual invite |

### M-09 — Inbox

| # | File | Action |
|---|------|--------|
| 16.5 | Backend | If missing: add `GET /api/v1/emails/inbox` (aggregate threads by lead) OR document use of `emailsAPI.list` + `getThread` |
| 16.6 | `app/hooks/use-inbox.ts` | **New** — list + thread fetch |
| 16.7 | `app/app/inbox/page.tsx` | Wire to hooks; empty state when no messages |

### M-16 — Calendar

| # | File | Action |
|---|------|--------|
| 16.8 | Backend | Wire to `meetings.py` if exists; else add minimal `GET/POST /api/v1/meetings` scoped to org |
| 16.9 | `app/hooks/use-meetings.ts` | CRUD hooks |
| 16.10 | `app/app/calendar/page.tsx` | Load events from API; create/delete persist |

**Fallback (if APIs not in scope):** Remove Inbox/Calendar from sidebar until L16 APIs exist — must be explicit in L19 checklist (no mock pages routable).

## Verification checklist

- [x] Team: invite user → appears in pending → accept flow or list refresh
- [x] Inbox: shows real `email_messages` for org (or route hidden)
- [x] Calendar: create event → persists (or route hidden)
- [x] No hardcoded `teamMembers` / `emails[]` arrays in source
- [x] `npm run build` passes

---

# LAYER 17 — SETTINGS, BILLING UI & AI PERSISTENCE

**Goal:** Org settings, billing upgrade path, and AI configuration survive reload and match backend.

**Estimated effort:** 3–4 days

## Issues (audit #4)

| ID | Issue | Severity |
|----|-------|----------|
| M-10 | Settings page — fake save, no API | MEDIUM |
| M-17 | AI prompts/settings local mock | MEDIUM |
| M-18 | Billing hardcoded plans + fake checkout | MEDIUM |

## Deep-dive plan

| # | File | Action |
|---|------|--------|
| 17.1 | Backend | `GET/PATCH /api/v1/organizations/me/settings` or use existing org update endpoint |
| 17.2 | `app/app/settings/page.tsx` | Load org + user profile; save → API; notifications prefs → user settings collection |
| 17.3 | `app/app/billing/page.tsx` | Plans from `GET /plans/landing` or org-available plans API; remove hardcoded `plans[]` |
| 17.4 | Same | Subscribe/upgrade → real `POST /billing/subscriptions` (after L13 auth) |
| 17.5 | `app/app/ai/page.tsx` | Load/save AI settings via `/api/v1/ai/settings` or org AI config endpoint |
| 17.6 | Same | Remove `setTimeout` mock save; persist prompts server-side if supported |
| 17.7 | `tests/test_l17_settings_billing.py` | Settings PATCH round-trip; billing list requires auth |

## Verification checklist

- [x] Change org name in settings → refresh → name persisted
- [x] Billing shows plan from API; upgrade creates subscription record
- [x] AI save → reload page → settings restored
- [x] `npm run build` passes

---

# LAYER 18 — PLATFORM POLISH & DATA ACCURACY

**Goal:** Remove dead routes, improve ops discoverability, accurate analytics, cleaner onboarding.

**Estimated effort:** 1–2 days

## Issues (audit #4)

| ID | Issue | Severity |
|----|-------|----------|
| M-15 | Mock `/app/scraping/jobs` duplicates real hub | MEDIUM |
| L-07 | Analytics overview email stats estimated | LOW |
| L-08 | SO shell nav missing setup, notifications, email sub-routes | LOW |
| L-09 | Register wizard drops steps 2–4 data | LOW |
| L-10 | Legacy `/api/v1/system-owner/*` unused | LOW |

## Deep-dive plan

| # | File | Action |
|---|------|--------|
| 18.1 | `app/app/scraping/jobs/page.tsx` | Redirect to `/app/scraping?tab=jobs` OR delete page and link hub only |
| 18.2 | `app/api/analytics.py` | Replace estimated email counts with aggregation from `email_messages` / `campaigns` collections |
| 18.3 | `app/system-owner/components/SystemOwnerShell.tsx` | Add nav: Setup, Notifications, Email → sub-menu (queue, analytics, bounces, templates, triggers) |
| 18.4 | `app/register/page.tsx` | Optional: `PATCH /auth/onboarding` after register with goals/timezone OR single-step register |
| 18.5 | `app/api/v1/router.py` | Deprecate or document legacy `system_owner.py` router; add comment pointing to canonical routes |
| 18.6 | `app/app/dashboard/page.tsx` | Replace synthetic activity feed with `useActivityFeed` if available |

## Verification checklist

- [x] `/app/scraping/jobs` does not show 6 fake jobs
- [x] Analytics overview `emails.sent` matches DB count (±0)
- [x] SO shell links reach notifications + bounces in ≤2 clicks
- [x] `npm run build` passes

---

# LAYER 19 — PRODUCTION READINESS GATE (AUDIT #5)

**Goal:** Prove **zero** audit #4 findings remain; persona matrices at **100%**; ship checklist complete.

**Estimated effort:** 1–2 days

## Tasks

| # | Action |
|---|--------|
| 19.1 | Re-run full persona E2E matrix from `AUDIT_REPORT.md` § E2E flows — every step ✅ or N/A (hidden) |
| 19.2 | Update `AUDIT_REPORT.md` → **audit #5**; set all H-04–L-11 to ✅ Closed |
| 19.3 | Add `tests/test_l19_persona_e2e.py` — smoke: public slug, SO notifications, team_member 403 on analytics |
| 19.4 | Run `validate_platform.py` → 0 errors, 0 warnings |
| 19.5 | Run `pytest tests/` with Mongo in CI; document remaining skips |
| 19.6 | Run `npm run build` — record route count |
| 19.7 | Optional: Playwright/Cypress skeleton for 3 critical paths (login, create campaign, SO dashboard) |

## Verification checklist (sign-off)

- [x] **0** open HIGH / MEDIUM / LOW from audit #4 ID list
- [x] Anonymous: `/landing` + `/landing/[slug]` public ✅
- [x] Org admin: 17/17 CRM steps wired or honestly hidden ✅
- [x] Team member: restricted UI + API 403 alignment ✅
- [x] System owner: 15/15 console steps including notifications + bounces ✅
- [x] `SYSTEM_FIX_PLAN.md` Phase 3 tracker all ✅
- [x] Stakeholder sign-off: **100% production-ready** (audit #5 gate)

---

# LAYER 20 — SYSTEM OWNER ACCESS & OPS (AUDIT #6)

**Goal:** Fix real-world SO session failures, replace Setup with System Health, show/delete organizations, reset demo CRM metrics.

**Audit reference:** `AUDIT_REPORT.md` audit #6

## Issues (user-reported)

| ID | Issue |
|----|-------|
| U1 | SO console “Access denied” (dual JWT) |
| U2 | Remove Setup → System Health checker |
| U3 | Dashboard leads/org noise — purge demo data |
| U4 | Organizations not visible |
| U5 | Delete organization (modal) |

## Plan

| # | Action |
|---|--------|
| 20.1 | `api-auth.ts` — SO token on `/organizations`, `/plans`, `/smtp`, `/cms`, … + pathname guard |
| 20.2 | Clear org tokens on SO login; clear SO tokens on org login |
| 20.3 | `system_owner: ["*"]` in `useAuth.tsx` |
| 20.4 | `/system-owner/health` + redirect `/setup` |
| 20.5 | `GET /organizations` list all; `DELETE /organizations/{id}` |
| 20.6 | `POST /system-owner/platform/purge-demo-data` |

## Verification checklist

- [x] SO login → Organizations loads (no access denied toast)
- [x] System Health runs health-check
- [x] Purge demo data clears dashboard CRM counts
- [x] Organization row → modal → delete works
- [x] `AUDIT_REPORT.md` replaced with audit #6

---

# EXECUTION RULES

### Phase 1 (done)

1. **Order:** L1 → L2 → L3 → L5 → L4 → L6 → L7  
2. L4 could run parallel to L3 after L2  
3. L1 was mandatory first (build + notifications)

### Phase 2 (done)

1. **Order:** L8 → L9 → (L10 ∥ L11) → L12  
2. **Audit #3:** L8–L12 complete (2026-05-21)

### Phase 3 (complete — audit #5 gate passed 2026-05-22)

1. **Order:** **L13** → **L14** → (**L15** ∥ **L16**) → **L17** → **L18** → **L19**  
2. **Never skip L13** — billing IDOR and dual JWT block SO ops and compliance  
3. **L14 before L15/L16** — guards prevent shipping mock pages with wrong role UX  
4. **L19 is mandatory** — no layer counts as “done” until audit #5 shows 0 open audit #4 IDs  
5. **One layer per commit/PR**; after each: layer checklist + `npm run build` + relevant `pytest test_l{N}_*`  
6. **Hide vs wire rule:** If backend API missing in L16/L17, **remove from sidebar** until API exists — mock pages are **not** acceptable at L19 sign-off

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

## Phase 3 (audit #4)

| Layer | Status | Completed | Audit IDs |
|-------|--------|-----------|-----------|
| L13 Security & dual-auth | ✅ Complete 2026-05-21 | `test_l13_unified_auth.py` | H-04, H-05, H-06 |
| L14 RBAC guards & scraping | ✅ Complete 2026-05-21 | `test_l14_rbac_ui.py` | M-12, M-13, M-14, L-11 |
| L15 Sequences & leads E2E | ✅ Complete 2026-05-21 | `test_l15_*.py` | M-07, M-11 |
| L16 Team, inbox, calendar | ✅ Complete 2026-05-21 | `test_l16_team_inbox_calendar.py` | M-08, M-09, M-16 |
| L17 Settings, billing, AI | ✅ Complete 2026-05-21 | `test_l17_settings_billing.py` | M-10, M-17, M-18 |
| L18 Platform polish | ✅ Complete | 2026-05-21 | M-15, L-07–L-10 closed |
| L19 Readiness gate | ✅ Complete 2026-05-22 | `test_l19_persona_e2e.py` | Audit #5 · 0 open audit #4 IDs |
| L20 SO access, health, orgs | ✅ Complete 2026-05-22 | Audit #6 | U1–U5, role `*` sync |

**Phase 3 progress:** 8 / 8 layers · **0** open audit #4 issues · audit #6 user pass closed

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

## Phase 2 (complete)

| Layer | Primary files | Est. count |
|-------|---------------|------------|
| L8 | `system-owner/notifications/page.tsx`, `app/ai/page.tsx` | 2–4 |
| L9 | `auth_service.py`, `rbac_models.py`, `test_l9_rbac_parity.py` | 3–4 |
| L10 | `scraping/linkedin`, `website`, `csv-import`, `scraping/page.tsx`, `use-scraping.ts` | 5–6 |
| L11 | `analytics/page.tsx`, `campaigns/[id]/page.tsx`, `leads/page.tsx`, `use-campaigns.ts` | 5–6 |
| L12 | `middleware/*`, `super-admin/*`, CI workflow, `AIModel` | 4–8 |

## Phase 3 (planned)

| Layer | Primary files | Est. count |
|-------|---------------|------------|
| L13 | `auth.py`, `billing.py`, `cms_landing.py`, `notifications.py`, `webhooks.py`, `api.ts` | 8–12 |
| L14 | `RouteGuard.tsx`, `app-layout-client.tsx`, `campaigns/*`, `leads/page.tsx`, `scraping.py`, `middleware.ts` | 8–10 |
| L15 | `sequences/page.tsx`, `use-sequences.ts`, `use-leads.ts`, `leads/page.tsx` | 6–8 |
| L16 | `team/page.tsx`, `inbox/page.tsx`, `calendar/page.tsx`, `use-team.ts`, `meetings.py` | 10–15 |
| L17 | `settings/page.tsx`, `billing/page.tsx`, `ai/page.tsx` | 6–8 |
| L18 | `analytics.py`, `SystemOwnerShell.tsx`, `register/page.tsx`, `scraping/jobs` | 5–7 |
| L19 | `AUDIT_REPORT.md`, `test_l19_persona_e2e.py` | 2–4 |

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

# AUDIT TRACEABILITY (audit #4 → Phase 3 layers)

| Audit ID | Severity | Layer | Closes when |
|----------|----------|-------|-------------|
| H-04 | HIGH | L13 ✅ | SO token works on notifications + bounces |
| H-05 | HIGH | L13 ✅ | All billing routes authenticated + org-scoped |
| H-06 | HIGH | L13 ✅ | Public slug CMS without login |
| M-07 | MEDIUM | L15 ✅ | Sequences CRUD via `sequencesAPI` |
| M-08 | MEDIUM | L16 ✅ | Team page uses `teamAPI` |
| M-09 | MEDIUM | L16 ✅ | Inbox wired or route removed |
| M-10 | MEDIUM | L17 ✅ | Settings persist to API |
| M-11 | MEDIUM | L15 ✅ | Lead delete/create/enrich API calls |
| M-12 | MEDIUM | L14 ✅ | Team member cannot see campaign writes |
| M-13 | MEDIUM | L14 ✅ | `RouteGuard` on `/app` layout |
| M-14 | MEDIUM | L14 ✅ | Edge middleware or documented client-only auth |
| M-15 | MEDIUM | L18 | No mock scraping jobs page |
| M-16 | MEDIUM | L16 ✅ | Calendar API or route hidden |
| M-17 | MEDIUM | L17 ✅ | AI settings server persistence |
| M-18 | MEDIUM | L17 ✅ | Billing plans from API + real subscribe |
| L-07 | LOW | L18 | Real email counts in analytics overview |
| L-08 | LOW | L18 | SO nav complete |
| L-09 | LOW | L18 | Register onboarding persisted or simplified |
| L-10 | LOW | L18 | Legacy SO router documented/deprecated |
| L-11 | LOW | L14 ✅ | Scraping `require_permissions` aligned |

**Coverage:** 20 / 20 audit #4 IDs mapped — **nothing unassigned**.

---

# PHASE 3 TIMELINE (estimate)

| Layer | Effort | Cumulative |
|-------|--------|------------|
| L13 | 2–3 d | Week 1 |
| L14 | 2 d | Week 1 |
| L15 | 3–4 d | Week 2 |
| L16 | 3–5 d | Week 2–3 |
| L17 | 3–4 d | Week 3 |
| L18 | 1–2 d | Week 3 |
| L19 | 1–2 d | Week 4 |

**Total:** ~15–22 working days for one developer → **100% production-ready** sign-off in audit #5.

---

*Source: `AUDIT_REPORT.md` audit #4 · Phase 1–2 closed · Phase 3 plan added 2026-05-21*
