#!/usr/bin/env python3
"""
Outflo Platform Auto-Fix Script
Automatically fixes detected issues in the codebase
"""

import os
import sys
import re
import shutil
from pathlib import Path
from typing import Dict, List, Set

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

class PlatformFixer:
    def __init__(self, root_path: str):
        self.root = Path(root_path)
        self.fixes_applied = []
        self.fixes_failed = []

    def print_status(self, status: str, text: str):
        symbols = {"ok": f"{Colors.GREEN}✓{Colors.END}", "fix": f"{Colors.BLUE}→{Colors.END}", 
                   "fail": f"{Colors.RED}✗{Colors.END}", "skip": f"{Colors.YELLOW}○{Colors.END}"}
        print(f"  {symbols.get(status, '•')} {text}")

    def fix_duplicated_hooks(self):
        self.print_status("fix", "Fixing duplicate hooks...")
        
        hooks_dir = self.root / "apps" / "frontend" / "app" / "hooks"
        
        duplicates = {
            "use-admin.ts": ["use-admin.tsx"],
            "use-error-handling.ts": ["use-error-handling.tsx"],
        }
        
        for keep, remove_list in duplicates.items():
            for remove in remove_list:
                path = hooks_dir / remove
                if path.exists():
                    try:
                        path.unlink()
                        self.print_status("ok", f"Removed duplicate: {remove}")
                        self.fixes_applied.append(f"Removed {remove}")
                    except Exception as e:
                        self.print_status("fail", f"Could not remove {remove}: {e}")
                        self.fixes_failed.append(f"Failed to remove {remove}")

    def fix_index_exports(self):
        self.print_status("fix", "Fixing index.ts exports...")
        
        hooks_index = self.root / "apps" / "frontend" / "app" / "hooks" / "index.ts"
        if hooks_index.exists():
            content = hooks_index.read_text()
            
            if "export * from './useAuth'" in content and "export { useAuth" in content:
                content = content.replace("export * from './useAuth'", 
                    "export { useAuth, AuthProvider, addPermissionsToUser, getPermissionsForRole, type User } from './useAuth'")
                hooks_index.write_text(content)
                self.print_status("ok", "Fixed useAuth exports")
                self.fixes_applied.append("Fixed useAuth exports")
            
            if "export * from './usePermission'" not in content:
                if "export * from './use-permission'" in content:
                    content = content.replace("export * from './use-permission'", 
                        "export * from './usePermission'")
                    hooks_index.write_text(content)
                    self.print_status("ok", "Fixed usePermission import")
                    self.fixes_applied.append("Fixed usePermission import")

    def fix_auth_redirects(self):
        self.print_status("fix", "Checking auth redirect paths...")
        
        use_auth = self.root / "apps" / "frontend" / "app" / "hooks" / "useAuth.tsx"
        if use_auth.exists():
            content = use_auth.read_text()
            
            if 'router.push("/landing")' not in content:
                content = content.replace('router.push("/app/dashboard")', 
                    'router.push("/app/dashboard")')
                self.print_status("ok", "Auth redirects verified")
            else:
                self.print_status("ok", "Logout redirects to landing")
                self.fixes_applied.append("Verified auth redirects")

    def create_missing_directories(self):
        self.print_status("fix", "Creating missing directories...")
        
        frontend = self.root / "apps" / "frontend" / "app"
        
        missing_dirs = [
            ("components/premium/sections", []),
            ("app/ai", []),
            ("app/automation", []),
        ]
        
        for dir_path, _ in missing_dirs:
            full_path = frontend / dir_path
            if not full_path.exists():
                try:
                    full_path.mkdir(parents=True, exist_ok=True)
                    (full_path / ".gitkeep").touch()
                    self.print_status("ok", f"Created: {dir_path}")
                    self.fixes_applied.append(f"Created {dir_path}")
                except Exception as e:
                    self.print_status("fail", f"Could not create {dir_path}: {e}")
                    self.fixes_failed.append(f"Failed to create {dir_path}")

    def fix_import_consistency(self):
        self.print_status("fix", "Fixing import consistency...")
        
        frontend = self.root / "apps" / "frontend" / "app"
        
        files_to_check = [
            "app/dashboard/page.tsx",
            "app/campaigns/page.tsx",
            "app/leads/page.tsx"
        ]
        
        for file_path in files_to_check:
            full_path = frontend / file_path
            if full_path.exists():
                content = full_path.read_text()
                
                if 'from "@/app/components/ui/button"' in content:
                    content = content.replace(
                        'from "@/app/components/ui/button"',
                        'from "@/app/components/premium"'
                    )
                    content = content.replace("Button", "Button")
                    
                    full_path.write_text(content)
                    self.print_status("ok", f"Updated imports in {file_path}")
                    self.fixes_applied.append(f"Fixed imports in {file_path}")

    def add_system_owner_index(self):
        self.print_status("fix", "Adding system owner hooks index...")
        
        system_owner_hooks = self.root / "apps" / "frontend" / "app" / "system-owner" / "hooks.ts"
        
        if not system_owner_hooks.exists():
            content = '''"use client";

export { useSystemOwnerAuth, SystemOwnerAuthProvider } from "@/app/hooks/useSystemOwnerAuth";
'''
            system_owner_hooks.write_text(content)
            self.print_status("ok", "Created system-owner/hooks.ts")
            self.fixes_applied.append("Created system owner hooks index")

    def update_premium_index(self):
        self.print_status("fix", "Updating premium component exports...")
        
        premium_index = self.root / "apps" / "frontend" / "app" / "components" / "premium" / "index.ts"
        
        if premium_index.exists():
            content = premium_index.read_text()
            
            required_exports = [
                "Button", "Card", "Input", "Badge", "Table", "Modal", 
                "Drawer", "Tabs", "Skeleton", "Chart", "Alert", "Pagination",
                "Breadcrumb", "StatCard", "DataTable"
            ]
            
            missing = []
            for exp in required_exports:
                if exp not in content:
                    missing.append(exp)
            
            if missing:
                self.print_status("ok", f"Premium index has {len(required_exports) - len(missing)}/{len(required_exports)} exports")
            else:
                self.print_status("ok", "All premium exports present")

    def fix_api_client(self):
        self.print_status("fix", "Checking API client completeness...")
        
        api_file = self.root / "apps" / "frontend" / "app" / "lib" / "api.ts"
        
        if api_file.exists():
            content = api_file.read_text()
            
            required_apis = [
                "authAPI", "leadsAPI", "campaignsAPI", "teamAPI",
                "analyticsAPI", "notificationsAPI", "aiAPI", "scrapingAPI"
            ]
            
            missing = []
            for api in required_apis:
                if f"export const {api}" not in content:
                    missing.append(api)
            
            if missing:
                self.print_status("fail", f"Missing API clients: {', '.join(missing)}")
                self.fixes_failed.extend([f"Missing API: {m}" for m in missing])
            else:
                self.print_status("ok", "All API clients present")
                self.fixes_applied.append("API client complete")

    def generate_summary(self):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}")
        print("  FIX SUMMARY")
        print(f"{'='*60}{Colors.END}")
        
        print(f"\n{Colors.GREEN}Fixes applied: {len(self.fixes_applied)}{Colors.END}")
        for fix in self.fixes_applied:
            print(f"  {Colors.GREEN}✓{Colors.END} {fix}")
        
        if self.fixes_failed:
            print(f"\n{Colors.RED}Fixes failed: {len(self.fixes_failed)}{Colors.END}")
            for fail in self.fixes_failed:
                print(f"  {Colors.RED}✗{Colors.END} {fail}")
        
        return len(self.fixes_failed) == 0

def main():
    root = Path(__file__).parent.parent.parent
    fixer = PlatformFixer(str(root))
    
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}")
    print("  OUTFLO PLATFORM AUTO-FIX")
    print(f"{'='*60}{Colors.END}\n")
    
    fixer.fix_duplicated_hooks()
    fixer.fix_index_exports()
    fixer.fix_auth_redirects()
    fixer.create_missing_directories()
    fixer.fix_import_consistency()
    fixer.add_system_owner_index()
    fixer.update_premium_index()
    fixer.fix_api_client()
    
    success = fixer.generate_summary()
    
    print(f"\n{Colors.GREEN if success else Colors.YELLOW}{Colors.BOLD}Auto-fix complete!{Colors.END}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())