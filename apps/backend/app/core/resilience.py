"""
Retry Logic & Graceful Failure Handling
Production-grade resilience with automatic retries
"""

import asyncio
import functools
import time
from typing import Any, Callable, Optional, Dict, List
from datetime import datetime
from enum import Enum

from app.core.logging import app_logger


class RetryStrategy(str, Enum):
    IMMEDIATE = "immediate"
    LINEAR = "linear"
    EXPONENTIAL = "exponential"
    FIBONACCI = "fibonacci"


class ServiceStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    UNKNOWN = "unknown"


class RetryConfig:
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 30.0,
        strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
        retryable_exceptions: tuple = (Exception,),
        on_retry: Optional[Callable] = None,
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.strategy = strategy
        self.retryable_exceptions = retryable_exceptions
        self.on_retry = on_retry

    def get_delay(self, attempt: int) -> float:
        if self.strategy == RetryStrategy.IMMEDIATE:
            return 0
        elif self.strategy == RetryStrategy.LINEAR:
            return self.initial_delay * attempt
        elif self.strategy == RetryStrategy.EXPONENTIAL:
            return min(self.initial_delay * (2 ** (attempt - 1)), self.max_delay)
        elif self.strategy == RetryStrategy.FIBONACCI:
            delay = self._fibonacci(attempt)
            return min(delay, self.max_delay)
        return self.initial_delay

    def _fibonacci(self, n: int) -> float:
        a, b = 0, 1
        for _ in range(n):
            a, b = b, a + b
        return self.initial_delay * a


def async_retry(config: Optional[RetryConfig] = None):
    """Decorator for async functions with retry logic"""
    if config is None:
        config = RetryConfig()

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except config.retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt == config.max_attempts:
                        app_logger.error(
                            f"Max retry attempts ({config.max_attempts}) reached for {func.__name__}",
                            attempt=attempt,
                            error=str(e),
                        )
                        raise
                    
                    delay = config.get_delay(attempt)
                    app_logger.warning(
                        f"Retry attempt {attempt}/{config.max_attempts} for {func.__name__}",
                        attempt=attempt,
                        delay=delay,
                        error=str(e),
                    )
                    
                    if config.on_retry:
                        config.on_retry(attempt, e)
                    
                    await asyncio.sleep(delay)
            
            raise last_exception
        
        return wrapper
    return decorator


def sync_retry(config: Optional[RetryConfig] = None):
    """Decorator for sync functions with retry logic"""
    if config is None:
        config = RetryConfig()

    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except config.retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt == config.max_attempts:
                        app_logger.error(
                            f"Max retry attempts ({config.max_attempts}) reached for {func.__name__}",
                            attempt=attempt,
                            error=str(e),
                        )
                        raise
                    
                    delay = config.get_delay(attempt)
                    app_logger.warning(
                        f"Retry attempt {attempt}/{config.max_attempts} for {func.__name__}",
                        attempt=attempt,
                        delay=delay,
                        error=str(e),
                    )
                    
                    if config.on_retry:
                        config.on_retry(attempt, e)
                    
                    time.sleep(delay)
            
            raise last_exception
        
        return wrapper
    return decorator


class CircuitBreaker:
    """Circuit breaker pattern for failing services"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        expected_exception: type = Exception,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = ServiceStatus.HEALTHY
    
    def call(self, func: Callable, *args, **kwargs):
        if self.state == ServiceStatus.DOWN:
            # Check if we should try again
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = ServiceStatus.DEGRADED
                app_logger.info("Circuit breaker transitioning to DEGRADED state")
            else:
                raise Exception(f"Circuit breaker is DOWN. Try again later.")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    async def call_async(self, func: Callable, *args, **kwargs):
        if self.state == ServiceStatus.DOWN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = ServiceStatus.DEGRADED
                app_logger.info("Circuit breaker transitioning to DEGRADED state")
            else:
                raise Exception(f"Circuit breaker is DOWN. Try again later.")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        self.failure_count = 0
        if self.state != ServiceStatus.HEALTHY:
            self.state = ServiceStatus.HEALTHY
            app_logger.info("Circuit breaker transitioned to HEALTHY state")
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = ServiceStatus.DOWN
            app_logger.error(
                f"Circuit breaker OPEN after {self.failure_count} failures",
                failure_count=self.failure_count,
                threshold=self.failure_threshold,
            )


class GracefulDegradation:
    """Handle service degradation gracefully"""
    
    def __init__(self):
        self.services: Dict[str, ServiceStatus] = {}
        self.fallbacks: Dict[str, Callable] = {}
    
    def register_service(self, name: str, fallback: Optional[Callable] = None):
        self.services[name] = ServiceStatus.UNKNOWN
        if fallback:
            self.fallbacks[name] = fallback
    
    def set_status(self, name: str, status: ServiceStatus):
        self.services[name] = status
        app_logger.info(f"Service {name} status: {status.value}")
    
    def is_available(self, name: str) -> bool:
        return self.services.get(name) in [ServiceStatus.HEALTHY, ServiceStatus.DEGRADED]
    
    def execute(self, service_name: str, func: Callable, *args, **kwargs):
        if not self.is_available(service_name):
            fallback = self.fallbacks.get(service_name)
            if fallback:
                app_logger.warning(f"Using fallback for {service_name}")
                return fallback(*args, **kwargs)
            raise Exception(f"Service {service_name} is not available")
        
        try:
            return func(*args, **kwargs)
        except Exception as e:
            self.set_status(service_name, ServiceStatus.DEGRADED)
            fallback = self.fallbacks.get(service_name)
            if fallback:
                return fallback(*args, **kwargs)
            raise


# Default retry configs for different services
AI_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=2.0,
    max_delay=30.0,
    strategy=RetryStrategy.EXPONENTIAL,
    retryable_exceptions=(ConnectionError, TimeoutError),
)

SCRAPING_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=10.0,
    strategy=RetryStrategy.LINEAR,
    retryable_exceptions=(ConnectionError, TimeoutError),
)

SMTP_RETRY_CONFIG = RetryConfig(
    max_attempts=2,
    initial_delay=1.0,
    max_delay=5.0,
    strategy=RetryStrategy.IMMEDIATE,
    retryable_exceptions=(ConnectionError,),
)

DB_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=0.5,
    max_delay=5.0,
    strategy=RetryStrategy.EXPONENTIAL,
    retryable_exceptions=(ConnectionError,),
)