import pytest
from app.core.logging import StructuredLogger


@pytest.mark.unit
class TestStructuredLogger:
    def test_logger_creation(self):
        logger = StructuredLogger.get("test-logger", "test.log")
        assert logger is not None
        assert logger.name == "test-logger"

    def test_logger_singleton(self):
        logger1 = StructuredLogger.get("singleton")
        logger2 = StructuredLogger.get("singleton")
        assert logger1 is logger2

    def test_format_output(self):
        logger = StructuredLogger.get("format-test")
        formatted = logger._format("INFO", "Test message", key="value")
        data = json.loads(formatted)
        assert data["level"] == "INFO"
        assert data["message"] == "Test message"
        assert data["data"]["key"] == "value"

    def test_log_levels(self):
        logger = StructuredLogger.get("level-test")
        logger.info("Info message")
        logger.warning("Warning message")
        logger.error("Error message", exc=Exception("test"))
        logger.debug("Debug message")

    def test_log_api(self):
        logger = StructuredLogger.get("api-test")
        logger.log_api("GET", "/api/v1/test", 200, 150.5, user_id=1)


import json


@pytest.mark.unit
class TestExceptionClasses:
    def test_app_exception_creation(self):
        from app.core.exceptions import AppException
        exc = AppException("TEST_ERROR", "Test message", status_code=400)
        assert exc.code == "TEST_ERROR"
        assert exc.message == "Test message"
        assert exc.status_code == 400

    def test_not_found_exception(self):
        from app.core.exceptions import NotFoundException
        exc = NotFoundException("Lead", 123)
        assert exc.code == "NOT_FOUND"
        assert exc.status_code == 404

    def test_validation_exception(self):
        from app.core.exceptions import ValidationException
        exc = ValidationException("Invalid email", field="email")
        assert exc.code == "VALIDATION_ERROR"
        assert exc.status_code == 422
        assert exc.field == "email"

    def test_rate_limit_exception(self):
        from app.core.exceptions import RateLimitException
        exc = RateLimitException("Too many requests", retry_after=120)
        assert exc.code == "RATE_LIMIT_EXCEEDED"
        assert exc.status_code == 429


@pytest.mark.unit
class TestResponseHelpers:
    def test_success_response(self):
        from app.core.exceptions import success_response
        resp = success_response({"id": 1}, {"page": 1})
        assert resp["success"] is True
        assert resp["data"]["id"] == 1
        assert resp["meta"]["page"] == 1

    def test_error_response(self):
        from app.core.exceptions import error_response
        resp = error_response("TEST_ERROR", "Something failed", field="email")
        assert resp["success"] is False
        assert resp["error"]["code"] == "TEST_ERROR"
        assert resp["error"]["field"] == "email"


@pytest.mark.unit
class TestRetryDecorators:
    def test_async_retry_success(self):
        from app.core.logging import async_retry

        call_count = 0

        @async_retry(max_attempts=3, delay=0.01)
        async def flaky_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Transient error")
            return "success"

        import asyncio
        result = asyncio.run(flaky_function())
        assert result == "success"
        assert call_count == 3

    def test_async_retry_all_fail(self):
        from app.core.logging import async_retry

        @async_retry(max_attempts=2, delay=0.01)
        async def always_fail():
            raise Exception("Always fails")

        import asyncio
        with pytest.raises(Exception) as exc_info:
            asyncio.run(always_fail())
        assert "Always fails" in str(exc_info.value)

    def test_sync_retry(self):
        from app.core.logging import sync_retry

        call_count = 0

        @sync_retry(max_attempts=3, delay=0.01)
        def flaky_sync():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("Transient")
            return "success"

        result = flaky_sync()
        assert result == "success"
        assert call_count == 2


@pytest.mark.unit
class TestDecorators:
    def test_rate_limit_resource(self):
        from app.core.decorators import rate_limit_resource

        call_count = 0

        @rate_limit_resource("test", limit=5, window=60)
        async def limited_endpoint():
            nonlocal call_count
            call_count += 1
            return {"called": call_count}

    def test_sanitize_input(self):
        from app.core.decorators import sanitize_user_input
        assert sanitize_user_input("  test  ") == "test"
        assert ">alert" in sanitize_user_input("<script>alert('xss')</script>")
        assert "javascript:" not in sanitize_user_input("javascript:alert()")
        assert len(sanitize_user_input("A" * 500 + "B" * 600)) == 1000

    def test_validate_id(self):
        from app.core.decorators import validate_id
        from fastapi import HTTPException
        assert validate_id(1) == 1
        assert validate_id("42") == 42
        with pytest.raises(HTTPException) as exc:
            validate_id(0)
        assert exc.value.status_code == 422

    def test_validate_id_negative(self):
        from fastapi import HTTPException
        from app.core.decorators import validate_id
        with pytest.raises(HTTPException):
            validate_id(-1)

    def test_validate_pagination(self):
        from fastapi import HTTPException
        from app.core.decorators import validate_pagination
        validate_pagination(1, 20)
        with pytest.raises(HTTPException):
            validate_pagination(0, 20)
        with pytest.raises(HTTPException):
            validate_pagination(1, 200)