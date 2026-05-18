from datetime import datetime, timedelta
from typing import Optional, Any, Dict, Callable, Awaitable
from functools import wraps
import asyncio
import logging
import time

logger = logging.getLogger(__name__)


class SimpleCache:
    _cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        entry = cls._cache.get(key)
        if entry is None:
            return None
        if entry["expires_at"] < datetime.utcnow():
            del cls._cache[key]
            return None
        return entry["value"]

    @classmethod
    def set(cls, key: str, value: Any, ttl: int = 300) -> None:
        cls._cache[key] = {
            "value": value,
            "expires_at": datetime.utcnow() + timedelta(seconds=ttl),
            "created_at": datetime.utcnow(),
        }

    @classmethod
    def delete(cls, key: str) -> None:
        cls._cache.pop(key, None)

    @classmethod
    def clear(cls) -> None:
        cls._cache.clear()

    @classmethod
    def cleanup(cls) -> int:
        now = datetime.utcnow()
        expired = [k for k, v in cls._cache.items() if v["expires_at"] < now]
        for k in expired:
            del cls._cache[k]
        return len(expired)

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        now = datetime.utcnow()
        total = len(cls._cache)
        expired = sum(1 for v in cls._cache.values() if v["expires_at"] < now)
        return {"total": total, "expired": expired, "active": total - expired}


cache = SimpleCache()


def cached(ttl: int = 300, key_prefix: str = ""):
    def decorator(func: Callable[..., Awaitable[Any]]):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl=ttl)
            return result
        return wrapper
    return decorator


async def cached_property(getter: Callable[..., Awaitable[Any]], ttl: int = 300):
    cache_key = f"property:{getter.__name__}"
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return cached_value
    value = await getter()
    cache.set(cache_key, value, ttl=ttl)
    return value


class StartupCache:
    _data: Dict[str, Any] = {}
    _loaded: bool = False
    _loading: bool = False

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        return cls._data.get(key)

    @classmethod
    def set(cls, key: str, value: Any) -> None:
        cls._data[key] = value

    @classmethod
    async def load(cls, loader_fn: Callable[[], Awaitable[Dict[str, Any]]]) -> Dict[str, Any]:
        if cls._loaded:
            return cls._data
        if cls._loading:
            while cls._loading:
                await asyncio.sleep(0.1)
            return cls._data
        cls._loading = True
        try:
            start = time.perf_counter()
            cls._data = await loader_fn()
            cls._loaded = True
            elapsed = (time.perf_counter() - start) * 1000
            logger.info(f"Startup cache loaded in {elapsed:.1f}ms")
        finally:
            cls._loading = False
        return cls._data

    @classmethod
    def invalidate(cls, key: Optional[str] = None) -> None:
        if key:
            cls._data.pop(key, None)
        else:
            cls._data.clear()
            cls._loaded = False


startup_cache = StartupCache()


class SessionCache:
    _sessions: Dict[str, Dict[str, Any]] = {}
    _daily_keys: Dict[str, str] = {}
    CACHE_TTL = 86400

    @classmethod
    def set_session(cls, session_id: str, user_id: str, org_id: str, data: Dict[str, Any] = None) -> None:
        now = datetime.utcnow()
        today = now.strftime("%Y-%m-%d")

        cls._sessions[session_id] = {
            "user_id": user_id,
            "organization_id": org_id,
            "data": data or {},
            "expires_at": now + timedelta(days=7),
            "last_active": now,
            "created_at": now,
        }

        daily_key = f"{user_id}:{today}"
        if daily_key not in cls._daily_keys:
            cls._daily_keys[daily_key] = session_id

    @classmethod
    def get_session(cls, session_id: str) -> Optional[Dict[str, Any]]:
        session = cls._sessions.get(session_id)
        if not session:
            return None
        if session["expires_at"] < datetime.utcnow():
            cls.delete_session(session_id)
            return None
        session["last_active"] = datetime.utcnow()
        return session

    @classmethod
    def delete_session(cls, session_id: str) -> bool:
        return cls._sessions.pop(session_id, None) is not None

    @classmethod
    def delete_user_sessions(cls, user_id: str) -> int:
        to_delete = [sid for sid, s in cls._sessions.items() if s["user_id"] == user_id]
        for sid in to_delete:
            cls._sessions.pop(sid, None)
        return len(to_delete)

    @classmethod
    def get_user_active_sessions(cls, user_id: str) -> List[Dict[str, Any]]:
        return [
            {
                "session_id": sid,
                "created_at": s["created_at"],
                "last_active": s["last_active"],
                "expires_at": s["expires_at"],
                "data": s.get("data", {}),
            }
            for sid, s in cls._sessions.items()
            if s["user_id"] == user_id and s["expires_at"] > datetime.utcnow()
        ]

    @classmethod
    def get_daily_sessions(cls, user_id: str, date: str = None) -> int:
        if date is None:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        daily_key = f"{user_id}:{date}"
        return 1 if daily_key in cls._daily_keys else 0

    @classmethod
    def cleanup_expired(cls) -> int:
        now = datetime.utcnow()
        expired = [sid for sid, s in cls._sessions.items() if s["expires_at"] < now]
        for sid in expired:
            cls._sessions.pop(sid, None)
        return len(expired)

    @classmethod
    def clear_all(cls) -> None:
        cls._sessions.clear()
        cls._daily_keys.clear()

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        now = datetime.utcnow()
        active = sum(1 for s in cls._sessions.values() if s["expires_at"] > now)
        return {
            "total": len(cls._sessions),
            "active": active,
            "expired": len(cls._sessions) - active,
            "daily_users": len(set(k.split(":")[0] for k in cls._daily_keys.keys())),
        }


session_cache = SessionCache()