import logging
import json
import traceback
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Any
from functools import wraps
import asyncio

LOG_DIR = Path("./logs")
LOG_DIR.mkdir(exist_ok=True)

class LogLevel:
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class StructuredLogger:
    _instances: dict[str, "StructuredLogger"] = {}

    def __init__(self, name: str, log_file: Optional[str] = None):
        self.name = name
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)

        if not self.logger.handlers:
            console = logging.StreamHandler(sys.stdout)
            console.setLevel(logging.DEBUG)
            console.setFormatter(logging.Formatter(
                "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            ))
            self.logger.addHandler(console)

            if log_file:
                file_handler = logging.FileHandler(LOG_DIR / log_file)
                file_handler.setLevel(logging.DEBUG)
                file_handler.setFormatter(logging.Formatter(
                    "%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S"
                ))
                self.logger.addHandler(file_handler)

    @classmethod
    def get(cls, name: str, log_file: Optional[str] = None) -> "StructuredLogger":
        key = f"{name}:{log_file or 'default'}"
        if key not in cls._instances:
            cls._instances[key] = cls(name, log_file)
        return cls._instances[key]

    def _format(self, level: str, message: str, **kwargs) -> str:
        ctx = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "service": self.name,
            "message": message,
        }
        if kwargs:
            ctx["data"] = kwargs
        return json.dumps(ctx)

    def debug(self, message: str, **kwargs):
        self.logger.debug(self._format(LogLevel.DEBUG, message, **kwargs))

    def info(self, message: str, **kwargs):
        self.logger.info(self._format(LogLevel.INFO, message, **kwargs))

    def warning(self, message: str, **kwargs):
        self.logger.warning(self._format(LogLevel.WARNING, message, **kwargs))

    def error(self, message: str, exc: Optional[Exception] = None, **kwargs):
        if exc:
            kwargs["exception_type"] = type(exc).__name__
            kwargs["exception_message"] = str(exc)
            kwargs["traceback"] = traceback.format_exc()
        self.logger.error(self._format(LogLevel.ERROR, message, **kwargs))

    def critical(self, message: str, exc: Optional[Exception] = None, **kwargs):
        if exc:
            kwargs["exception_type"] = type(exc).__name__
            kwargs["exception_message"] = str(exc)
            kwargs["traceback"] = traceback.format_exc()
        self.logger.critical(self._format(LogLevel.CRITICAL, message, **kwargs))

    def log_api(self, method: str, path: str, status_code: int, duration_ms: float, user_id: Optional[int] = None, **kwargs):
        self.info(f"{method} {path}", status_code=status_code, duration_ms=duration_ms, user_id=user_id, **kwargs)

    def log_service(self, service: str, action: str, success: bool, duration_ms: float = 0, **kwargs):
        self.info(f"{service}.{action}", success=success, duration_ms=duration_ms, **kwargs)

    def log_scraping(self, url: str, success: bool, items_extracted: int = 0, error: Optional[str] = None, **kwargs):
        data = {"url": url, "success": success, "items_extracted": items_extracted}
        if error:
            self.error(f"Scraping failed: {url}", error=Exception(error), **data)
        else:
            self.info(f"Scraping completed: {url}", **data)

    def log_email(self, to_email: str, success: bool, error: Optional[str] = None, **kwargs):
        data = {"to_email": to_email, "success": success}
        if error:
            self.error(f"Email failed to {to_email}", error=Exception(error), **data)
        else:
            self.info(f"Email sent to {to_email}", **data)

    def log_ai(self, feature: str, model: str, success: bool, tokens_used: int = 0, latency_ms: float = 0, error: Optional[str] = None, **kwargs):
        data = {"feature": feature, "model": model, "success": success, "tokens_used": tokens_used, "latency_ms": latency_ms}
        if error:
            self.error(f"AI {feature} failed", error=Exception(error), **data)
        else:
            self.info(f"AI {feature} completed", **data)


app_logger = StructuredLogger.get("outflo", "app.log")
api_logger = StructuredLogger.get("api", "api.log")
auth_logger = StructuredLogger.get("auth", "auth.log")
scraping_logger = StructuredLogger.get("scraping", "scraping.log")
email_logger = StructuredLogger.get("email", "email.log")
ai_logger = StructuredLogger.get("ai", "ai.log")
db_logger = StructuredLogger.get("database", "db.log")
admin_logger = StructuredLogger.get("admin", "admin.log")


def async_retry(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0, logger: Optional[StructuredLogger] = None):
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_attempts):
                try:
                    return await fn(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_attempts - 1:
                        wait_time = delay * (backoff ** attempt)
                        if logger:
                            logger.warning(f"Retry {attempt + 1}/{max_attempts} for {fn.__name__}", error=str(e), wait_time=wait_time)
                        await asyncio.sleep(wait_time)
            raise last_error
        return wrapper
    return decorator


def sync_retry(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0, logger: Optional[StructuredLogger] = None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_attempts - 1:
                        wait_time = delay * (backoff ** attempt)
                        if logger:
                            logger.warning(f"Retry {attempt + 1}/{max_attempts} for {fn.__name__}", error=str(e), wait_time=wait_time)
                        import time
                        time.sleep(wait_time)
            raise last_error
        return wrapper
    return decorator