#!/usr/bin/env python3
"""
Outflo Platform Validation Script
Comprehensive check for architecture, APIs, permissions, and data flows
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

    if sys.platform == "win32":
        GREEN = RED = YELLOW = BLUE = MAGENTA = CYAN = BOLD = END = ""


def _sym(kind: str) -> str:
    if sys.platform == "win32":
        return {"ok": "[OK]", "warn": "[!]", "err": "[X]"}.get(kind, "[OK]")
    return {"ok": "\u2713", "warn": "\u26a0", "err": "\u2717"}.get(kind, "\u2713")

class PlatformValidator:
    def __init__(self, root_path: str):
        self.root = Path(root_path)
        self.issues = []
        self.warnings = []
        self.successes = []
        self.stats = {
            "files_checked": 0,
            "api_endpoints": 0,
            "permissions": 0,
            "collections": 0,
        }

    def print_header(self, text: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}")
        print(f"  {text}")
        print(f"{'='*60}{Colors.END}")

    def print_section(self, text: str):
        print(f"\n{Colors.BLUE}{Colors.BOLD}{text}{Colors.END}")

    def print_success(self, text: str):
        print(f"{Colors.GREEN}{_sym('ok')}{Colors.END} {text}")
        self.successes.append(text)

    def print_warning(self, text: str):
        print(f"{Colors.YELLOW}{_sym('warn')}{Colors.END} {text}")
        self.warnings.append(text)

    def print_error(self, text: str):
        print(f"{Colors.RED}{_sym('err')}{Colors.END} {text}")
        self.issues.append(text)

    def check_frontend_structure(self):
        self.print_header("FRONTEND STRUCTURE VALIDATION")
        
        frontend = self.root / "apps" / "frontend" / "app"
        if not frontend.exists():
            self.print_error("Frontend app directory not found")
            return

        required_dirs = ["app", "components", "hooks", "lib", "providers"]
        for dir_name in required_dirs:
            path = frontend / dir_name
            if path.exists():
                self.print_success(f"Found: /{dir_name}")
            else:
                self.print_error(f"Missing: /{dir_name}")

        app_pages = frontend / "app"
        pages = [
            ("dashboard", app_pages / "dashboard"),
            ("leads", app_pages / "leads"),
            ("campaigns", app_pages / "campaigns"),
            ("scraping", app_pages / "scraping"),
            ("analytics", app_pages / "analytics"),
            ("login", frontend / "login"),
            ("register", frontend / "register"),
            ("landing", frontend / "landing"),
        ]
        for name, page_path in pages:
            if page_path.exists():
                self.print_success(f"Found page: /{name}")
            else:
                self.print_warning(f"Page not found: /{name}")

        component_dirs = ["ui", "premium", "cms", "landing"]
        for comp_dir in component_dirs:
            path = frontend / "components" / comp_dir
            if path.exists():
                count = len(list(path.glob("*.tsx"))) if path.is_dir() else 0
                self.print_success(f"Found components/{comp_dir} ({count} files)")
            else:
                self.print_error(f"Missing components/{comp_dir}")

    def check_backend_structure(self):
        self.print_header("BACKEND STRUCTURE VALIDATION")
        
        backend = self.root / "apps" / "backend" / "app"
        if not backend.exists():
            self.print_error("Backend app directory not found")
            return

        required_dirs = ["api", "core", "db", "models", "services", "middleware", "schemas"]
        for dir_name in required_dirs:
            path = backend / dir_name
            if path.exists():
                self.print_success(f"Found: /{dir_name}")
            else:
                self.print_error(f"Missing: /{dir_name}")

        api_dirs = backend / "api"
        if api_dirs.exists():
            for subdir in ["v1", "admin", "cms", "ai", "analytics"]:
                path = api_dirs / subdir
                if path.exists():
                    self.print_success(f"Found API: /{subdir}")

        services = backend / "services"
        if services.exists():
            service_count = len([f for f in services.glob("*.py") if f.name != "__init__.py"])
            self.print_success(f"Found {service_count} service modules")

    def extract_api_endpoints(self, file_path: Path) -> List[Dict]:
        endpoints = []
        try:
            content = file_path.read_text()
            router_match = re.search(r'router\s*=\s*APIRouter\(\s*prefix\s*=\s*["\']([^"\']+)["\']', content)
            prefix = router_match.group(1) if router_match else ""

            route_pattern = r'@(router|api_router)\.(get|post|put|patch|delete|options)\s*\(\s*["\']([^"\']*)["\']'
            for match in re.finditer(route_pattern, content):
                method = match.group(2).upper()
                path = match.group(3)
                endpoints.append({
                    "file": file_path.name,
                    "prefix": prefix,
                    "path": path,
                    "method": method,
                    "full_path": f"{prefix}{path}"
                })
        except Exception as e:
            self.print_warning(f"Could not parse {file_path.name}: {e}")
        return endpoints

    def check_api_endpoints(self):
        self.print_header("API ENDPOINTS VALIDATION")
        
        backend = self.root / "apps" / "backend" / "app"
        all_endpoints = []

        for endpoint_file in backend.rglob("endpoints/*.py"):
            if endpoint_file.name == "__init__.py":
                continue
            self.stats["files_checked"] += 1
            endpoints = self.extract_api_endpoints(endpoint_file)
            all_endpoints.extend(endpoints)

        for api_file in [backend / "api" / "admin.py", backend / "api" / "cms.py", 
                         backend / "api" / "ai.py", backend / "api" / "analytics.py"]:
            if api_file.exists():
                endpoints = self.extract_api_endpoints(api_file)
                all_endpoints.extend(endpoints)

        self.stats["api_endpoints"] = len(all_endpoints)
        print(f"\n{Colors.GREEN}Found {len(all_endpoints)} API endpoints{Colors.END}")

        auth_endpoints = [e for e in all_endpoints if "auth" in e["full_path"].lower()]
        print(f"  - Auth endpoints: {len(auth_endpoints)}")
        
        dashboard_endpoints = [e for e in all_endpoints if "dashboard" in e["full_path"].lower()]
        print(f"  - Dashboard endpoints: {len(dashboard_endpoints)}")

        return all_endpoints

    def check_mongodb_collections(self):
        self.print_header("MONGODB COLLECTIONS VALIDATION")
        
        mongodb_file = self.root / "apps" / "backend" / "app" / "db" / "mongodb.py"
        if not mongodb_file.exists():
            self.print_error("MongoDB configuration not found")
            return

        content = mongodb_file.read_text()
        
        collection_pattern = r'"(\w+)":\s*\[(.*?)\]'
        matches = re.findall(collection_pattern, content, re.DOTALL)
        
        collections = []
        for name, indexes in matches:
            collections.append(name)

        self.stats["collections"] = len(collections)
        print(f"\n{Colors.GREEN}Found {len(collections)} MongoDB collections{Colors.END}")

        critical_collections = ["users", "organizations", "campaigns", "leads", 
                                 "email_messages", "sequences", "notifications"]
        for coll in critical_collections:
            if coll in collections:
                self.print_success(f"Collection: {coll}")
            else:
                self.print_error(f"Missing critical collection: {coll}")

        return collections

    def check_permissions_rbac(self):
        self.print_header("PERMISSIONS & RBAC VALIDATION")
        
        rbac_model = self.root / "apps" / "backend" / "app" / "core" / "role_permissions.py"
        if not rbac_model.exists():
            rbac_model = self.root / "apps" / "backend" / "app" / "models" / "rbac_models.py"
        if rbac_model.exists():
            content = rbac_model.read_text()
            
            role_pattern = r'Role\.(SYSTEM_OWNER|ORGANIZATION_ADMIN|TEAM_MEMBER)'
            roles = re.findall(role_pattern, content)
            
            self.print_success(f"Found {len(set(roles))} roles defined")
            
            permission_pattern = r'["\'](\w+:\w+)["\']'
            permissions = re.findall(permission_pattern, content)
            unique_perms = set(permissions)
            self.stats["permissions"] = len(unique_perms)
            
            print(f"  Total unique permissions: {len(unique_perms)}")
            
            critical_perms = [
                "leads:read", "campaigns:read", "analytics:read", 
                "smtp:read", "teams:read", "settings:read"
            ]
            for perm in critical_perms:
                if perm in unique_perms:
                    self.print_success(f"Permission: {perm}")
                else:
                    self.print_warning(f"Missing permission: {perm}")

        frontend_perms = self.root / "apps" / "frontend" / "app" / "hooks" / "usePermission.ts"
        if frontend_perms.exists():
            self.print_success("Frontend permissions hook found")
        else:
            self.print_warning("Frontend permissions hook missing")

    def check_frontend_hooks(self):
        self.print_header("FRONTEND HOOKS VALIDATION")
        
        hooks_dir = self.root / "apps" / "frontend" / "app" / "hooks"
        if not hooks_dir.exists():
            self.print_error("Hooks directory not found")
            return

        critical_hooks = [
            "useAuth.tsx",
            "usePermission.ts",
            "use-leads.ts",
            "use-campaigns.ts",
            "use-analytics.ts",
            "use-scraping.ts",
        ]

        for hook in critical_hooks:
            hook_path = hooks_dir / hook
            if hook_path.exists():
                self.print_success(f"Hook: {hook}")
            else:
                self.print_warning(f"Hook not found: {hook}")

    def check_api_client(self):
        self.print_header("API CLIENT VALIDATION")
        
        api_file = self.root / "apps" / "frontend" / "app" / "lib" / "api.ts"
        if not api_file.exists():
            self.print_error("API client not found")
            return

        content = api_file.read_text()
        
        api_objects = ["authAPI", "leadsAPI", "campaignsAPI", "sequencesAPI", 
                       "emailsAPI", "teamAPI", "analyticsAPI", "notificationsAPI",
                       "aiAPI", "scrapingAPI"]
        
        for api_obj in api_objects:
            if f"export const {api_obj}" in content:
                self.print_success(f"API client: {api_obj}")
            else:
                self.print_warning(f"Missing API client: {api_obj}")

    def check_middleware_auth(self):
        self.print_header("MIDDLEWARE & AUTH VALIDATION")
        
        backend = self.root / "apps" / "backend" / "app"
        middleware_dir = backend / "middleware"
        
        if middleware_dir.exists():
            auth_middleware = middleware_dir / "auth.py"
            if auth_middleware.exists():
                self.print_success("Auth middleware found")
                content = auth_middleware.read_text()
                if "get_current_user" in content:
                    self.print_success("get_current_user dependency found")
                if "verify_token" in content:
                    self.print_success("Token verification found")
            else:
                self.print_error("Auth middleware missing")

        system_owner_auth = backend / "middleware" / "system_owner_auth.py"
        if system_owner_auth.exists():
            self.print_success("System owner auth middleware found")

    def check_system_owner_dashboard(self):
        self.print_header("SYSTEM OWNER DASHBOARD VALIDATION")
        
        frontend_so = self.root / "apps" / "frontend" / "app" / "system-owner"
        if frontend_so.exists():
            self.print_success("System Owner frontend module found")
            
            dashboard = frontend_so / "dashboard" / "page.tsx"
            if dashboard.exists():
                self.print_success("System Owner dashboard page found")
                content = dashboard.read_text()
                if "MetricCard" in content:
                    self.print_success("Premium components integrated")
                if "ChartContainer" in content:
                    self.print_success("Charts integrated")
        
        backend = self.root / "apps" / "backend" / "app"
        backend_so_service = backend / "services" / "analytics" / "system_owner_dashboard.py"
        if backend_so_service.exists():
            self.print_success("System Owner dashboard service found")
            content = backend_so_service.read_text()
            if "get_comprehensive_dashboard" in content:
                self.print_success("Comprehensive dashboard method found")

    def check_components_premium(self):
        self.print_header("PREMIUM COMPONENTS VALIDATION")
        
        components = self.root / "apps" / "frontend" / "app" / "components" / "premium"
        if not components.exists():
            self.print_error("Premium components directory not found")
            return

        required_components = [
            "button.tsx", "card.tsx", "input.tsx", "table.tsx",
            "modal.tsx", "drawer.tsx", "tabs.tsx", "skeleton.tsx",
            "chart.tsx", "badge.tsx", "alert.tsx", "animations.tsx",
            "index.ts", "pagination.tsx", "navigation.tsx"
        ]

        found_count = 0
        for comp in required_components:
            comp_path = components / comp
            if comp_path.exists():
                found_count += 1
            else:
                self.print_warning(f"Missing component: {comp}")

        self.print_success(f"Premium components: {found_count}/{len(required_components)}")

    def check_duplicate_logic(self):
        self.print_header("DUPLICATE LOGIC DETECTION")
        
        use_auth_files = list((self.root / "apps" / "frontend" / "app" / "hooks").glob("useAuth*"))
        if len(use_auth_files) > 1:
            self.print_warning(f"Multiple useAuth files found: {[f.name for f in use_auth_files]}")
        else:
            self.print_success("Single useAuth implementation")

        permission_hooks = list((self.root / "apps" / "frontend" / "app" / "hooks").glob("use-permission*"))
        if len(permission_hooks) > 1:
            self.print_warning(f"Multiple permission hooks found: {[f.name for f in permission_hooks]}")
        else:
            self.print_success("Single permission hook")

    def generate_report(self):
        self.print_header("VALIDATION SUMMARY")
        
        print(f"\n{Colors.BOLD}Statistics:{Colors.END}")
        print(f"  Files checked: {self.stats['files_checked']}")
        print(f"  API endpoints: {self.stats['api_endpoints']}")
        print(f"  Permissions: {self.stats['permissions']}")
        print(f"  Collections: {self.stats['collections']}")
        
        print(f"\n{Colors.GREEN}Successes: {len(self.successes)}{Colors.END}")
        print(f"{Colors.YELLOW}Warnings: {len(self.warnings)}{Colors.END}")
        print(f"{Colors.RED}Errors: {len(self.issues)}{Colors.END}")
        
        if self.issues:
            print(f"\n{Colors.RED}{Colors.BOLD}ISSUES REQUIRING FIX:{Colors.END}")
            for issue in self.issues[:10]:
                print(f"  - {issue}")
        
        if self.warnings:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}WARNINGS:{Colors.END}")
            for warning in self.warnings[:10]:
                print(f"  - {warning}")
        
        return len(self.issues) == 0

def main():
    root = Path(__file__).resolve().parent
    validator = PlatformValidator(str(root))
    
    print(f"{Colors.CYAN}{Colors.BOLD}")
    print("="*60)
    print("  OUTFLO PLATFORM VALIDATION")
    print("="*60)
    print(f"{Colors.END}")
    
    validator.check_frontend_structure()
    validator.check_backend_structure()
    validator.check_api_endpoints()
    validator.check_mongodb_collections()
    validator.check_permissions_rbac()
    validator.check_frontend_hooks()
    validator.check_api_client()
    validator.check_middleware_auth()
    validator.check_system_owner_dashboard()
    validator.check_components_premium()
    validator.check_duplicate_logic()
    
    success = validator.generate_report()
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}Validation complete!{Colors.END}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())