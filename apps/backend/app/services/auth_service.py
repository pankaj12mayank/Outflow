"""
Outflo - Authentication & Authorization System (MongoDB)
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import secrets
import hashlib
import re
from bson import ObjectId
from pydantic import EmailStr

from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, verify_token
)
from app.db.mongodb import MongoDB, serialize_doc


AUTH_CONFIG = {
    "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
    "REFRESH_TOKEN_EXPIRE_DAYS": 7,
    "MAGIC_LINK_EXPIRE_MINUTES": 15,
    "PASSWORD_RESET_EXPIRE_MINUTES": 60,
    "EMAIL_VERIFY_EXPIRE_HOURS": 24,
    "MAX_LOGIN_ATTEMPTS": 5,
    "LOCKOUT_DURATION_MINUTES": 30,
    "SESSION_EXPIRE_DAYS": 30,
    "RATE_LIMIT_WINDOW_SECONDS": 60,
    "RATE_LIMIT_MAX_REQUESTS": 100,
}

PERMISSIONS = {
    "super_admin": ["*"],
    "admin": ["org:read", "org:update", "users:read", "users:create", "users:update", "users:delete", "billing:read", "billing:manage", "leads:*", "campaigns:*", "emails:*", "ai:*", "crm:*", "analytics:*"],
    "team_member": ["leads:read", "leads:create", "leads:update", "campaigns:read", "emails:read", "crm:read", "crm:create", "crm:update"],
}


def generate_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    return True, ""


def get_client_info(request) -> dict:
    client_host = "127.0.0.1"
    user_agent = "unknown"
    
    if request is not None:
        try:
            if hasattr(request, 'client') and request.client:
                client_host = getattr(request.client, 'host', '127.0.0.1') or '127.0.0.1'
        except:
            client_host = "127.0.0.1"
        
        try:
            if hasattr(request, 'headers'):
                user_agent = request.headers.get("user-agent", "unknown") or "unknown"
        except:
            user_agent = "unknown"
    
    return {
        "ip_address": client_host,
        "user_agent": user_agent,
    }


def get_device_type(user_agent: str) -> str:
    if not user_agent:
        return "unknown"
    ua_lower = user_agent.lower()
    if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
        return "mobile"
    if "tablet" in ua_lower or "ipad" in ua_lower:
        return "tablet"
    return "desktop"


def extract_browser_os(user_agent: str) -> tuple[str, str]:
    browser, os = "unknown", "unknown"
    if not user_agent:
        return browser, os
    ua_lower = user_agent.lower()
    if "chrome" in ua_lower and "edge" not in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "edge" in ua_lower:
        browser = "Edge"
    if "windows" in ua_lower:
        os = "Windows"
    elif "mac os" in ua_lower or "macos" in ua_lower:
        os = "macOS"
    elif "linux" in ua_lower:
        os = "Linux"
    elif "android" in ua_lower:
        os = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os = "iOS"
    return browser, os


class RateLimiter:
    _requests: Dict[str, List[datetime]] = {}
    _lockout: Dict[str, datetime] = {}
    _lock = __import__('threading').Lock()
    _last_cleanup = datetime.utcnow()

    @classmethod
    def _cleanup_if_needed(cls):
        now = datetime.utcnow()
        if (now - cls._last_cleanup).total_seconds() > 300:
            cls._last_cleanup = now
            cutoff = now - timedelta(seconds=3600)
            cls._requests = {k: [ts for ts in v if ts > cutoff] for k, v in cls._requests.items() if v}
            cls._lockout = {k: v for k, v in cls._lockout.items() if v > now}

    @classmethod
    def check_rate_limit(cls, identifier: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        with cls._lock:
            cls._cleanup_if_needed()
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=window_seconds)
            if identifier in cls._lockout:
                lockout_until = cls._lockout[identifier]
                if now < lockout_until:
                    remaining = int((lockout_until - now).total_seconds())
                    return False, remaining
                else:
                    del cls._lockout[identifier]
            if identifier not in cls._requests:
                cls._requests[identifier] = []
            cls._requests[identifier] = [ts for ts in cls._requests[identifier] if ts > window_start]
            if len(cls._requests[identifier]) >= max_requests:
                cls._lockout[identifier] = now + timedelta(seconds=window_seconds)
                return False, window_seconds
            cls._requests[identifier].append(now)
            return True, max_requests - len(cls._requests[identifier])

    @classmethod
    def record_failed_attempt(cls, identifier: str, max_attempts: int, lockout_minutes: int):
        with cls._lock:
            key = f"failed:{identifier}"
            if key not in cls._requests:
                cls._requests[key] = []
            cls._requests[key].append(datetime.utcnow())
            if len(cls._requests[key]) >= max_attempts:
                cls._lockout[f"lockout:{identifier}"] = datetime.utcnow() + timedelta(minutes=lockout_minutes)

    @classmethod
    def clear_failed_attempts(cls, identifier: str):
        with cls._lock:
            key = f"failed:{identifier}"
            if key in cls._requests:
                del cls._requests[key]

    @classmethod
    def is_locked_out(cls, identifier: str) -> tuple[bool, int]:
        with cls._lock:
            key = f"lockout:{identifier}"
            if key in cls._lockout:
                lockout_until = cls._lockout[key]
                if datetime.utcnow() < lockout_until:
                    remaining = int((lockout_until - datetime.utcnow()).total_seconds())
                    return True, remaining
                else:
                    del cls._lockout[key]
            return False, 0


class EmailService:
    @staticmethod
    async def send_verification_email(email: str, token: str) -> bool:
        print(f"Sending verification email to {email}: {token}")
        return True

    @staticmethod
    async def send_magic_link(email: str, token: str) -> bool:
        print(f"Sending magic link to {email}: {token}")
        return True

    @staticmethod
    async def send_password_reset(email: str, token: str) -> bool:
        print(f"Sending password reset to {email}: {token}")
        return True

    @staticmethod
    async def send_welcome_email(email: str, name: str) -> bool:
        print(f"Sending welcome email to {email}")
        return True


class AuthService:
    def __init__(self, organization_id: str = None):
        self.organization_id = organization_id

    async def _get_user_by_email_any_org(self, email: str) -> Optional[Dict]:
        coll = MongoDB.get_collection("users")
        doc = await coll.find_one({"email": email, "deleted_at": None})
        return serialize_doc(doc) if doc else None

    async def _get_user_by_id(self, user_id: str) -> Optional[Dict]:
        coll = MongoDB.get_collection("users")
        try:
            doc_id = ObjectId(user_id)
        except:
            return None
        doc = await coll.find_one({"_id": doc_id})
        return serialize_doc(doc) if doc else None

    async def _get_org(self, org_id: str) -> Optional[Dict]:
        coll = MongoDB.get_collection("organizations")
        try:
            doc_id = ObjectId(org_id)
        except:
            return None
        doc = await coll.find_one({"_id": doc_id})
        return serialize_doc(doc) if doc else None

    async def _get_org_by_slug(self, slug: str) -> Optional[Dict]:
        coll = MongoDB.get_collection("organizations")
        doc = await coll.find_one({"slug": slug})
        return serialize_doc(doc) if doc else None

    def _generate_slug(self, name: str) -> str:
        slug = name.lower().replace(" ", "-").replace("_", "-")
        slug = re.sub(r"[^a-z0-9-]", "", slug)
        slug = re.sub(r"-+", "-", slug)
        return slug.strip("-")

    async def register(self, data: dict, request=None) -> Dict:
        client_info = get_client_info(request)
        browser, os = extract_browser_os(client_info.get("user_agent", ""))

        is_valid, error = validate_password_strength(data["password"])
        if not is_valid:
            raise ValueError(error)

        email_normalized = data["email"].lower().strip()
        org_slug = self._generate_slug(data["organization_name"])
        existing_org = await self._get_org_by_slug(org_slug)
        if existing_org:
            org_slug = f"{org_slug}-{secrets.token_hex(4)}"

        password_hash = await get_password_hash(data["password"])
        now = datetime.utcnow()

        organization = {
            "name": data["organization_name"],
            "slug": org_slug,
            "is_active": True,
            "plan": "free",
            "source": "app_register",
            "created_at": now,
            "updated_at": now,
        }

        user = {
            "email": email_normalized,
            "password_hash": password_hash,
            "full_name": data["full_name"],
            "role": "admin",
            "is_active": True,
            "is_email_verified": False,
            "created_at": now,
            "updated_at": now,
        }

        membership = {
            "role": "admin",
            "status": "active",
            "accepted_at": now,
            "created_at": now,
        }

        try:
            async with await MongoDB.get_client().start_session() as session:
                async with session.start_transaction():
                    org_coll = MongoDB.get_collection("organizations")
                    org_result = await org_coll.insert_one(organization, session=session)
                    organization["id"] = str(org_result.inserted_id)

                    user["organization_id"] = organization["id"]
                    user_coll = MongoDB.get_collection("users")
                    try:
                        user_result = await user_coll.insert_one(user, session=session)
                    except Exception as e:
                        if "duplicate key" in str(e).lower() or "E11000" in str(e):
                            raise ValueError("Email already registered")
                        raise
                    user["id"] = str(user_result.inserted_id)

                    membership["user_id"] = user["id"]
                    membership["organization_id"] = organization["id"]
                    mem_coll = MongoDB.get_collection("memberships")
                    await mem_coll.insert_one(membership, session=session)

                    session_id = await self._create_session_txn(user, organization["id"], browser, os, client_info, session)
        except ValueError:
            raise
        except Exception as e:
            print(f"Registration transaction failed: {e}")
            raise ValueError("Registration failed. Please try again.")

        await self._log_login(user["id"], organization["id"], "success", client_info)
        try:
            from app.services.billing_lifecycle_service import BillingLifecycleService
            await BillingLifecycleService.seed_billing_templates()
            await BillingLifecycleService.emit_event(
                "onboarding",
                organization["id"],
                user_email=data["email"],
                user_name=data["full_name"],
                org_name=data["organization_name"],
                plan_name="Free",
                status="succeeded",
            )
        except Exception:
            await EmailService.send_welcome_email(data["email"], data["full_name"])

        tokens = self._create_tokens(user, organization["id"])
        return {
            "user": self._user_to_dict(user, organization),
            "tokens": tokens
        }

    async def _create_session_txn(self, user: Dict, organization_id: str, browser: str, os: str, client_info: dict, session) -> str:
        access_token = generate_token()
        session_coll = MongoDB.get_collection("sessions")
        session_doc = {
            "user_id": user["id"],
            "organization_id": organization_id,
            "access_token": access_token,
            "refresh_token": generate_token(),
            "token_hash": hash_token(access_token),
            "ip_address": client_info.get("ip_address"),
            "user_agent": client_info.get("user_agent"),
            "device_type": get_device_type(client_info.get("user_agent", "")),
            "browser": browser,
            "os": os,
            "expires_at": (datetime.utcnow() + timedelta(days=AUTH_CONFIG["SESSION_EXPIRE_DAYS"])).isoformat(),
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await session_coll.insert_one(session_doc, session=session)
        return access_token

    async def login(self, data: dict, request=None) -> Dict:
        client_info = get_client_info(request)
        email_normalized = data["email"].lower().strip()
        identifier = f"login:{email_normalized}"
        browser, os = extract_browser_os(client_info.get("user_agent", ""))

        is_allowed, remaining = RateLimiter.check_rate_limit(identifier, AUTH_CONFIG["RATE_LIMIT_MAX_REQUESTS"], AUTH_CONFIG["RATE_LIMIT_WINDOW_SECONDS"])
        if not is_allowed:
            raise ValueError(f"Rate limit exceeded. Try again in {remaining} seconds.")

        is_locked, lockout_remaining = RateLimiter.is_locked_out(email_normalized)
        if is_locked:
            raise ValueError(f"Account locked. Try again in {lockout_remaining} seconds.")

        user = await self._get_user_by_email_any_org(email_normalized)

        if not user:
            await self._log_login(None, None, "failed", client_info, "user_not_found")
            raise ValueError("Invalid email or password")

        if not user.get("is_active"):
            raise ValueError("Account is inactive")

        if not await verify_password(data["password"], user["password_hash"]):
            RateLimiter.record_failed_attempt(email_normalized, AUTH_CONFIG["MAX_LOGIN_ATTEMPTS"], AUTH_CONFIG["LOCKOUT_DURATION_MINUTES"])
            await self._log_login(user["id"], user.get("organization_id"), "failed", client_info, "invalid_password")
            raise ValueError("Invalid email or password")

        if user.get("locked_until") and datetime.fromisoformat(user["locked_until"]) > datetime.utcnow():
            raise ValueError("Account is locked")

        user_coll = MongoDB.get_collection("users")
        await user_coll.update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {"failed_login_attempts": 0, "last_login_at": datetime.utcnow().isoformat(), "last_login_ip": client_info.get("ip_address"), "updated_at": datetime.utcnow().isoformat()}}
        )

        organization = await self._get_org(user["organization_id"])
        if not organization or not organization.get("is_active"):
            raise ValueError("Organization is inactive")

        RateLimiter.clear_failed_attempts(data["email"])
        await self._create_session(user, organization["id"], browser, os, client_info)
        await self._log_login(user["id"], organization["id"], "success", client_info)

        tokens = self._create_tokens(user, organization["id"])
        return {
            "user": self._user_to_dict(user, organization),
            "tokens": tokens
        }

    async def logout(self, user_id: str, token: str, request=None) -> bool:
        token_hash = hash_token(token)
        sess_coll = MongoDB.get_collection("sessions")
        await sess_coll.update_many(
            {"token_hash": token_hash, "is_active": True},
            {"$set": {"is_active": False, "revoked_at": datetime.utcnow().isoformat()}}
        )
        user = await self._get_user_by_id(user_id)
        if user:
            await self._create_audit_log(user_id, user.get("organization_id"), "logout", {}, {})
        return True

    async def refresh_tokens(self, refresh_token: str) -> Dict:
        payload = verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")

        user_id = payload.get("sub")
        user = await self._get_user_by_id(user_id)
        if not user or not user.get("is_active"):
            raise ValueError("User not found or inactive")

        organization = await self._get_org(user.get("organization_id"))
        if not organization or not organization.get("is_active"):
            raise ValueError("Organization inactive")

        return self._create_tokens(user, organization["id"])

    async def get_current_user(self, token: str) -> Dict:
        payload = verify_token(token)
        if not payload or payload.get("type") != "access":
            raise ValueError("Invalid token")

        user_id = payload.get("sub")
        user = await self._get_user_by_id(user_id)
        if not user or not user.get("is_active"):
            raise ValueError("User not found")

        organization = await self._get_org(user.get("organization_id"))
        return self._user_to_dict(user, organization)

    def _create_tokens(self, user: Dict, organization_id: str) -> Dict:
        token_data = {
            "sub": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role"),
            "organization_id": organization_id,
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": AUTH_CONFIG["ACCESS_TOKEN_EXPIRE_MINUTES"] * 60
        }

    async def _create_session(self, user: Dict, organization_id: str, browser: str, os: str, client_info: dict):
        access_token = generate_token()
        session_coll = MongoDB.get_collection("sessions")
        session = {
            "user_id": user["id"],
            "organization_id": organization_id,
            "access_token": access_token,
            "refresh_token": generate_token(),
            "token_hash": hash_token(access_token),
            "ip_address": client_info.get("ip_address"),
            "user_agent": client_info.get("user_agent"),
            "device_type": get_device_type(client_info.get("user_agent", "")),
            "browser": browser,
            "os": os,
            "expires_at": (datetime.utcnow() + timedelta(days=AUTH_CONFIG["SESSION_EXPIRE_DAYS"])).isoformat(),
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await session_coll.insert_one(session)

    async def request_password_reset(self, email: str) -> Dict:
        user = await self._get_user_by_email_any_org(email)
        if not user:
            return {"message": "If email exists, reset link has been sent"}

        reset_token = generate_token(48)
        token_hash = hash_token(reset_token)

        reset_coll = MongoDB.get_collection("password_resets")
        await reset_coll.delete_many({"email": email})

        reset_doc = {
            "email": email,
            "token_hash": token_hash,
            "user_id": user["id"],
            "expires_at": datetime.utcnow() + timedelta(minutes=AUTH_CONFIG["PASSWORD_RESET_EXPIRE_MINUTES"]),
            "created_at": datetime.utcnow(),
            "used": False,
        }
        await reset_coll.insert_one(reset_doc)

        from app.core.config import settings
        app_url = getattr(settings, "app_url", None) or "http://localhost:3000"
        reset_url = f"{app_url.rstrip('/')}/reset-password?token={reset_token}"

        try:
            await EmailService.send_password_reset(email, reset_url)
        except Exception as e:
            print(f"Failed to send reset email: {e}")

        return {
            "message": "If the account exists, a password reset link has been sent",
            "reset_url": reset_url,
        }

    async def reset_password(self, token: str, new_password: str) -> Dict:
        token_hash = hash_token(token)

        reset_coll = MongoDB.get_collection("password_resets")
        reset_doc = await reset_coll.find_one({
            "token_hash": token_hash,
            "used": False,
        })

        if not reset_doc:
            raise ValueError("Invalid or expired reset token")

        if reset_doc.get("expires_at") < datetime.utcnow():
            raise ValueError("Reset token has expired")

        is_valid, error = validate_password_strength(new_password)
        if not is_valid:
            raise ValueError(error)

        user_id = reset_doc.get("user_id")
        password_hash = await get_password_hash(new_password)

        user_coll = MongoDB.get_collection("users")
        await user_coll.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": password_hash, "updated_at": datetime.utcnow().isoformat()}}
        )

        await reset_coll.update_one(
            {"_id": reset_doc["_id"]},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )

        return {"message": "Password reset successfully"}

    async def get_user_sessions(self, user_id: str) -> List[Dict]:
        session_coll = MongoDB.get_collection("sessions")
        sessions = await session_coll.find({
            "user_id": user_id,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow().isoformat()}
        }).sort("created_at", -1).to_list(length=50)

        return [{
            "id": str(s.get("_id")),
            "device_type": s.get("device_type"),
            "browser": s.get("browser"),
            "os": s.get("os"),
            "ip_address": s.get("ip_address"),
            "created_at": s.get("created_at"),
            "expires_at": s.get("expires_at"),
        } for s in sessions]

    async def revoke_session(self, user_id: str, session_id: str) -> bool:
        session_coll = MongoDB.get_collection("sessions")
        result = await session_coll.update_one(
            {"_id": ObjectId(session_id), "user_id": user_id},
            {"$set": {"is_active": False, "revoked_at": datetime.utcnow().isoformat()}}
        )
        return result.modified_count > 0

    async def _log_login(self, user_id: Optional[str], organization_id: Optional[str], status: str, client_info: dict, failure_reason: Optional[str] = None):
        log_coll = MongoDB.get_collection("login_logs")
        log = {
            "user_id": user_id,
            "organization_id": organization_id,
            "ip_address": client_info.get("ip_address"),
            "user_agent": client_info.get("user_agent"),
            "status": status,
            "failure_reason": failure_reason,
            "device_type": get_device_type(client_info.get("user_agent", "")),
            "created_at": datetime.utcnow(),
        }
        await log_coll.insert_one(log)

    async def _create_audit_log(self, user_id: str, organization_id: str, action: str, changes: dict, client_info: dict):
        log_coll = MongoDB.get_collection("audit_logs")
        log = {
            "user_id": user_id,
            "organization_id": organization_id,
            "action": action,
            "details": changes,
            "ip_address": client_info.get("ip_address"),
            "user_agent": client_info.get("user_agent"),
            "created_at": datetime.utcnow(),
        }
        await log_coll.insert_one(log)

    def _user_to_dict(self, user: Dict, org: Dict) -> dict:
        from datetime import datetime
        created = user.get("created_at")
        if isinstance(created, datetime):
            created = created.isoformat()
        role = user.get("role", "team_member")
        return {
            "id": user.get("id"),
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "role": role,
            "is_email_verified": user.get("is_email_verified", False),
            "is_super_admin": role in ("super_admin", "admin"),
            "permissions": PermissionChecker.get_user_permissions(role),
            "organization": {
                "id": org.get("id") if org else None,
                "name": org.get("name") if org else None,
                "slug": org.get("slug") if org else None,
            } if org else None,
            "created_at": created,
        }


class PermissionChecker:
    @staticmethod
    def has_permission(user_role: str, resource: str, action: str) -> bool:
        permissions = PERMISSIONS.get(user_role, [])
        if "*" in permissions:
            return True
        specific = f"{resource}:{action}"
        wildcard = f"{resource}:*"
        return specific in permissions or wildcard in permissions

    @staticmethod
    def get_user_permissions(user_role: str) -> List[str]:
        return PERMISSIONS.get(user_role, [])