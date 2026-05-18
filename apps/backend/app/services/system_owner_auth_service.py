import os
import secrets
import hashlib
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from bson import ObjectId
from jose import jwt, JWTError
import ipaddress

_executor = ThreadPoolExecutor(max_workers=4)

from app.db.mongodb import MongoDB, serialize_doc
from app.models.system_owner_models import (
    SystemOwnerUser, SystemOwnerSession, AuthLog, Device, 
    ActivityLog, SessionStatus, DeviceType
)


SYSTEM_OWNER_EMAIL = os.getenv("SYSTEM_OWNER_EMAIL", "admin@outflo.com")
SYSTEM_OWNER_PASSWORD = os.getenv("SYSTEM_OWNER_PASSWORD", "")

JWT_SECRET = os.getenv("SYSTEM_OWNER_JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = 15 * 60
REFRESH_TOKEN_EXPIRE = 7 * 24 * 60 * 60
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = 15 * 60


def _hash_password_sync(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode(), 
        salt.encode(), 
        100000
    ).hex()

async def hash_password(password: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _hash_password_sync, password, SYSTEM_OWNER_EMAIL)

async def verify_password(password: str, password_hash: str) -> bool:
    computed = await hash_password(password)
    return computed == password_hash


def create_access_token(user_id: str, email: str) -> Dict:
    now = datetime.utcnow()
    payload = {
        "sub": user_id,
        "email": email,
        "type": "system_owner_access",
        "iat": now,
        "exp": now + timedelta(seconds=ACCESS_TOKEN_EXPIRE)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        "access_token": token,
        "refresh_token": create_refresh_token(user_id),
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE
    }


def create_refresh_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    return token


def verify_access_token(token: str) -> Optional[Dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


class SystemOwnerAuthService:
    @staticmethod
    async def get_system_owner() -> Optional[Dict]:
        coll = MongoDB.get_collection("system_owner_users")
        doc = await coll.find_one({"email": SYSTEM_OWNER_EMAIL})
        return serialize_doc(doc) if doc else None

    @staticmethod
    async def ensure_system_owner() -> Optional[Dict]:
        """Create or repair system owner account from environment credentials."""
        if not SYSTEM_OWNER_PASSWORD:
            return None

        existing = await SystemOwnerAuthService.get_system_owner()
        password_hash = await hash_password(SYSTEM_OWNER_PASSWORD)

        if not existing:
            return await SystemOwnerAuthService.initialize_system_owner()

        if not await verify_password(SYSTEM_OWNER_PASSWORD, existing.get("password_hash", "")):
            await MongoDB.get_collection("system_owner_users").update_one(
                {"_id": ObjectId(existing["id"])},
                {"$set": {
                    "password_hash": password_hash,
                    "is_active": True,
                    "failed_login_attempts": 0,
                    "locked_until": None,
                    "updated_at": datetime.utcnow(),
                }},
            )
        return await SystemOwnerAuthService.get_system_owner()

    @staticmethod
    async def initialize_system_owner() -> Dict:
        if not SYSTEM_OWNER_PASSWORD:
            raise ValueError("SYSTEM_OWNER_PASSWORD not set in environment")
        
        existing = await SystemOwnerAuthService.get_system_owner()
        if existing:
            return existing
        
        coll = MongoDB.get_collection("system_owner_users")
        password_hash = await hash_password(SYSTEM_OWNER_PASSWORD)
        user_doc = {
            "email": SYSTEM_OWNER_EMAIL,
            "password_hash": password_hash,
            "full_name": "System Owner",
            "role": "system_owner",
            "is_active": True,
            "is_superadmin": True,
            "email_verified": True,
            "mfa_enabled": False,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await coll.insert_one(user_doc)
        user_doc["_id"] = str(result.inserted_id)
        return user_doc

    @staticmethod
    async def login(email: str, password: str, ip_address: str, user_agent: str, device_info: Dict) -> Dict:
        user = await SystemOwnerAuthService.get_system_owner()
        
        if not user or email != SYSTEM_OWNER_EMAIL:
            await SystemOwnerAuthService._log_auth(
                email, "login", "failed", ip_address, user_agent, device_info,
                {"reason": "invalid_credentials"}
            )
            raise ValueError("Invalid credentials")

        if not user.get("is_active", True):
            await SystemOwnerAuthService._log_auth(
                email, "login", "failed", ip_address, user_agent, device_info,
                {"reason": "account_inactive"}
            )
            raise ValueError("Account is inactive")

        locked_until = user.get("locked_until")
        if locked_until and datetime.utcnow() < locked_until:
            await SystemOwnerAuthService._log_auth(
                email, "login", "failed", ip_address, user_agent, device_info,
                {"reason": "account_locked", "locked_until": str(locked_until)}
            )
            raise ValueError(f"Account locked until {locked_until}")

        if not await verify_password(password, user.get("password_hash", "")):
            failed_attempts = user.get("failed_login_attempts", 0) + 1
            lock_data = {}
            
            if failed_attempts >= MAX_FAILED_ATTEMPTS:
                lock_data["locked_until"] = datetime.utcnow() + timedelta(seconds=LOCKOUT_DURATION)
                lock_data["failed_login_attempts"] = 0
            else:
                lock_data["failed_login_attempts"] = failed_attempts
            
            await MongoDB.get_collection("system_owner_users").update_one(
                {"_id": ObjectId(user["id"])},
                {"$set": lock_data}
            )
            
            await SystemOwnerAuthService._log_auth(
                email, "login", "failed", ip_address, user_agent, device_info,
                {"reason": "wrong_password", "attempts": failed_attempts}
            )
            raise ValueError("Invalid credentials")

        await MongoDB.get_collection("system_owner_users").update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {
                "failed_login_attempts": 0,
                "locked_until": None,
                "last_login_at": datetime.utcnow(),
                "last_login_ip": ip_address,
                "updated_at": datetime.utcnow()
            }}
        )

        tokens = create_access_token(user["id"], email)
        
        await SystemOwnerAuthService._create_session(
            user["id"], tokens["access_token"], tokens["refresh_token"],
            ip_address, user_agent, device_info
        )

        await SystemOwnerAuthService._log_auth(
            email, "login", "success", ip_address, user_agent, device_info
        )

        await SystemOwnerAuthService._log_activity(
            user["id"], "login", None, None, ip_address, user_agent
        )

        await SystemOwnerAuthService._track_device(
            user["id"], ip_address, user_agent, device_info
        )

        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"]
            },
            "tokens": tokens
        }

    @staticmethod
    async def refresh(refresh_token: str) -> Dict:
        session = await MongoDB.get_collection("system_owner_sessions").find_one({
            "refresh_token": refresh_token,
            "status": "active"
        })
        
        if not session:
            raise ValueError("Invalid refresh token")
        
        if datetime.utcnow() > session["expires_at"]:
            await MongoDB.get_collection("system_owner_sessions").update_one(
                {"_id": ObjectId(session["_id"])},
                {"$set": {"status": "expired"}}
            )
            raise ValueError("Refresh token expired")

        user = await SystemOwnerAuthService.get_system_owner()
        if not user or not user.get("is_active"):
            raise ValueError("User not found or inactive")

        tokens = create_access_token(user["id"], user["email"])
        
        await MongoDB.get_collection("system_owner_sessions").update_one(
            {"_id": ObjectId(session["_id"])},
            {"$set": {
                "token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "last_activity": datetime.utcnow()
            }}
        )

        return tokens

    @staticmethod
    async def logout(user_id: str, session_id: str = None, all_devices: bool = False):
        sessions_coll = MongoDB.get_collection("system_owner_sessions")
        
        if all_devices:
            await sessions_coll.update_many(
                {"user_id": user_id},
                {"$set": {
                    "status": "revoked",
                    "revoked_at": datetime.utcnow(),
                    "revoked_reason": "logout_all_devices"
                }}
            )
        elif session_id:
            await sessions_coll.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {
                    "status": "revoked",
                    "revoked_at": datetime.utcnow(),
                    "revoked_reason": "logout"
                }}
            )

        user = await SystemOwnerAuthService.get_system_owner()
        if user:
            await SystemOwnerAuthService._log_activity(
                user["id"], "logout", None, None, "", ""
            )

    @staticmethod
    async def get_sessions(user_id: str) -> List[Dict]:
        sessions = MongoDB.get_collection("system_owner_sessions").find({
            "user_id": user_id,
            "status": "active"
        }).sort("last_activity", -1)
        
        return [serialize_doc(doc) for doc in await sessions.to_list(length=100)]

    @staticmethod
    async def revoke_session(user_id: str, session_id: str) -> bool:
        result = await MongoDB.get_collection("system_owner_sessions").update_one(
            {"_id": ObjectId(session_id), "user_id": user_id},
            {"$set": {
                "status": "revoked",
                "revoked_at": datetime.utcnow(),
                "revoked_reason": "manual_revoke"
            }}
        )
        return result.modified_count > 0

    @staticmethod
    async def get_auth_logs(limit: int = 50) -> List[Dict]:
        logs = MongoDB.get_collection("auth_logs").find({
            "email": SYSTEM_OWNER_EMAIL
        }).sort("timestamp", -1).limit(limit)
        
        return [serialize_doc(doc) for doc in await logs.to_list(length=limit)]

    @staticmethod
    async def get_activity_logs(user_id: str, limit: int = 50) -> List[Dict]:
        logs = MongoDB.get_collection("activity_logs").find({
            "user_id": user_id
        }).sort("timestamp", -1).limit(limit)
        
        return [serialize_doc(doc) for doc in await logs.to_list(length=limit)]

    @staticmethod
    async def get_devices(user_id: str) -> List[Dict]:
        devices = MongoDB.get_collection("devices").find({
            "user_id": user_id
        }).sort("last_seen", -1)
        
        return [serialize_doc(doc) for doc in await devices.to_list(length=100)]

    @staticmethod
    async def trust_device(user_id: str, device_id: str) -> bool:
        result = await MongoDB.get_collection("devices").update_one(
            {"_id": ObjectId(device_id), "user_id": user_id},
            {"$set": {"is_trusted": True}}
        )
        return result.modified_count > 0

    @staticmethod
    async def change_password(user_id: str, current_password: str, new_password: str) -> bool:
        user = await SystemOwnerAuthService.get_system_owner()
        if not user or user["id"] != user_id:
            raise ValueError("User not found")
        
        if not await verify_password(current_password, user.get("password_hash", "")):
            raise ValueError("Current password is incorrect")
        
        new_hash = await hash_password(new_password)
        
        await MongoDB.get_collection("system_owner_users").update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "password_hash": new_hash,
                "updated_at": datetime.utcnow()
            }}
        )

        await MongoDB.get_collection("system_owner_sessions").update_many(
            {"user_id": user_id},
            {"$set": {
                "status": "revoked",
                "revoked_at": datetime.utcnow(),
                "revoked_reason": "password_changed"
            }}
        )

        await SystemOwnerAuthService._log_activity(
            user_id, "password_changed", None, None, "", ""
        )

        return True

    @staticmethod
    async def validate_token(token: str) -> Optional[Dict]:
        payload = verify_access_token(token)
        if not payload or payload.get("type") != "system_owner_access":
            return None
        
        user = await SystemOwnerAuthService.get_system_owner()
        if not user or not user.get("is_active"):
            return None
        
        return {
            "user_id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }

    @staticmethod
    async def _create_session(user_id: str, token: str, refresh_token: str, 
                             ip_address: str, user_agent: str, device_info: Dict):
        expires_at = datetime.utcnow() + timedelta(seconds=REFRESH_TOKEN_EXPIRE)
        
        session_doc = {
            "user_id": user_id,
            "token": token,
            "refresh_token": refresh_token,
            "device_info": device_info,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "status": "active",
            "issued_at": datetime.utcnow(),
            "expires_at": expires_at,
            "last_activity": datetime.utcnow(),
            "revoked_at": None,
            "revoked_reason": None
        }
        
        await MongoDB.get_collection("system_owner_sessions").insert_one(session_doc)

    @staticmethod
    async def _log_auth(email: str, action: str, status: str, ip_address: str, 
                        user_agent: str, device_info: Dict, metadata: Dict = None):
        log_doc = {
            "user_id": None,
            "email": email,
            "action": action,
            "status": status,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "device_info": device_info,
            "location": SystemOwnerAuthService._get_location_from_ip(ip_address),
            "metadata": metadata or {},
            "timestamp": datetime.utcnow()
        }
        
        await MongoDB.get_collection("auth_logs").insert_one(log_doc)

    @staticmethod
    async def _log_activity(user_id: str, action: str, resource_type: str, 
                           resource_id: str, ip_address: str, user_agent: str):
        log_doc = {
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "metadata": {},
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow()
        }
        
        await MongoDB.get_collection("activity_logs").insert_one(log_doc)

    @staticmethod
    async def _track_device(user_id: str, ip_address: str, user_agent: str, device_info: Dict):
        device_id = device_info.get("device_id") if device_info else None
        
        if not device_id:
            return
        
        existing = await MongoDB.get_collection("devices").find_one({
            "user_id": user_id,
            "device_id": device_id
        })
        
        device_doc = {
            "user_id": user_id,
            "device_id": device_id,
            "device_type": device_info.get("device_type", "desktop"),
            "browser": device_info.get("browser", "unknown"),
            "os": device_info.get("os", "unknown"),
            "ip_address": ip_address,
            "location": SystemOwnerAuthService._get_location_from_ip(ip_address),
            "last_seen": datetime.utcnow(),
            "is_trusted": existing.get("is_trusted", False) if existing else False,
            "is_current": True
        }
        
        await MongoDB.get_collection("devices").update_many(
            {"user_id": user_id, "is_current": True},
            {"$set": {"is_current": False}}
        )
        
        if existing:
            await MongoDB.get_collection("devices").update_one(
                {"_id": existing["_id"]},
                {"$set": {**device_doc}}
            )
        else:
            await MongoDB.get_collection("devices").insert_one(device_doc)

    @staticmethod
    def _get_location_from_ip(ip_address: str) -> Optional[str]:
        return None


class RateLimitService:
    @staticmethod
    async def check_rate_limit(identifier: str, max_requests: int = 5, window_seconds: int = 60) -> bool:
        coll = MongoDB.get_collection("rate_limits")
        now = datetime.utcnow()
        
        entry = await coll.find_one({"identifier": identifier})
        
        if not entry:
            await coll.insert_one({
                "identifier": identifier,
                "count": 1,
                "window_start": now,
                "blocked_until": None
            })
            return True
        
        window_start = entry.get("window_start")
        if (now - window_start).total_seconds() > window_seconds:
            await coll.update_one(
                {"_id": entry["_id"]},
                {"$set": {"count": 1, "window_start": now, "blocked_until": None}}
            )
            return True
        
        if entry.get("blocked_until") and now < entry["blocked_until"]:
            return False
        
        new_count = entry["count"] + 1
        blocked = None
        
        if new_count > max_requests:
            blocked = now + timedelta(seconds=window_seconds)
        
        await coll.update_one(
            {"_id": entry["_id"]},
            {"$set": {"count": new_count, "blocked_until": blocked}}
        )
        
        return not blocked or now >= blocked

    @staticmethod
    async def reset_rate_limit(identifier: str):
        await MongoDB.get_collection("rate_limits").delete_one({"identifier": identifier})