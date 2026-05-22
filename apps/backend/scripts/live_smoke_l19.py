#!/usr/bin/env python3
"""Live HTTP smoke for audit #5 gate (run with backend on :8000)."""

import json
import secrets
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000/api/v1"


def req(method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict | str]:
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            raw = resp.read().decode()
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def ok(name: str, cond: bool, detail: str = "") -> bool:
    mark = "PASS" if cond else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""))
    return cond


def main() -> int:
    print("Outflo live smoke (L19 gate)\n")
    passed = 0
    total = 0

    total += 1
    code, _ = req("GET", "/health")
    if ok("Health", code == 200, f"HTTP {code}"):
        passed += 1

    total += 1
    code, _ = req("GET", "/cms/landing/pages/slug/smoke-test-slug/public")
    if ok("Public CMS slug (no auth)", code in (200, 404) and code != 401, f"HTTP {code}"):
        passed += 1

    total += 1
    code, _ = req("GET", "/billing/invoices")
    if ok("Billing requires auth", code in (401, 403), f"HTTP {code}"):
        passed += 1

    total += 1
    code, body = req(
        "POST",
        "/system-owner-auth/login",
        {"email": "admin@outflo.com", "password": "Outflo@2024!"},
    )
    so_token = None
    if isinstance(body, dict):
        so_token = (body.get("tokens") or {}).get("access_token") or body.get("access_token")
    if ok("System owner login", code == 200 and bool(so_token), f"HTTP {code}"):
        passed += 1

    if so_token:
        total += 1
        code, _ = req("GET", "/notifications?limit=5", token=so_token)
        if ok("SO notifications (SO JWT)", code == 200, f"HTTP {code}"):
            passed += 1

        total += 1
        code, _ = req("GET", "/polls/bounces/stats", token=so_token)
        if ok("SO bounces stats (SO JWT)", code == 200, f"HTTP {code}"):
            passed += 1
    else:
        ok("SO notifications (SO JWT)", False, "skipped — no token")
        ok("SO bounces stats (SO JWT)", False, "skipped — no token")
        total += 2

    email = f"smoke-{secrets.token_hex(4)}@example.com"
    total += 1
    code, reg = req(
        "POST",
        "/auth/register",
        {
            "email": email,
            "password": "SmokeTest1",
            "full_name": "Smoke User",
            "organization_name": "Smoke Org",
        },
    )
    access = None
    if isinstance(reg, dict):
        access = (reg.get("tokens") or {}).get("access_token")
    if ok("Register new org admin", code in (200, 201) and bool(access), f"HTTP {code}"):
        passed += 1

    if access:
        total += 1
        code, _ = req(
            "PATCH",
            "/auth/onboarding",
            {
                "industry": "SaaS",
                "primary_goal": "leads",
                "timezone": "Asia/Kolkata",
            },
            token=access,
        )
        if ok("Onboarding PATCH after register", code in (200, 201), f"HTTP {code}"):
            passed += 1

        total += 1
        code, _ = req("GET", "/analytics/overview", token=access)
        if ok("Org admin analytics overview", code == 200, f"HTTP {code}"):
            passed += 1

        total += 1
        code, _ = req("GET", "/analytics/activity-feed?limit=5", token=access)
        if ok("Dashboard activity feed", code == 200, f"HTTP {code}"):
            passed += 1

        total += 1
        code, _ = req("GET", "/scraping/jobs?limit=5", token=access)
        if ok("Scraping jobs API", code == 200, f"HTTP {code}"):
            passed += 1
    else:
        for name in (
            "Onboarding PATCH after register",
            "Org admin analytics overview",
            "Dashboard activity feed",
            "Scraping jobs API",
        ):
            ok(name, False, "skipped — no token")
            total += 1

    print(f"\n{passed}/{total} live checks passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
