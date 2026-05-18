import time
import uuid
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .core.logging import app_logger
from .core.exceptions import (
    AppException, RequestValidationError,
    app_exception_handler, http_exception_handler,
    validation_exception_handler, generic_exception_handler,
)
from .core.middleware import register_middlewares
from .api.v1 import api_router
from .db.mongodb import MongoDB

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_start = time.perf_counter()
    app_logger.info("Outflo starting up", version=settings.app_version, env=settings.app_env)

    # Connect to MongoDB
    mongo_start = time.perf_counter()
    try:
        await MongoDB.connect()
        mongo_elapsed = (time.perf_counter() - mongo_start) * 1000
        app_logger.info(f"MongoDB connected in {mongo_elapsed:.1f}ms")
    except Exception as e:
        app_logger.warning(f"MongoDB connection skipped: {e}")

    # Lazy-load polling service after startup to speed up initial response
    async def start_polling():
        try:
            from .tasks import polling_service
            await polling_service.start()
            app_logger.info("Polling service started")
        except Exception as e:
            app_logger.warning(f"Polling service not available: {e}")

    # Start polling service in background (non-blocking)
    asyncio.create_task(start_polling())

    total_elapsed = (time.perf_counter() - startup_start) * 1000
    app_logger.info(f"Outflo startup completed in {total_elapsed:.1f}ms")

    yield

    app_logger.info("Outflo shutting down")
    try:
        from .tasks import polling_service
        await polling_service.stop()
    except Exception:
        pass
    try:
        await MongoDB.disconnect()
    except Exception:
        pass


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI Outreach Automation SaaS Platform",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


register_middlewares(app)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2)) + "ms"
    return response


app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Outflo API", "version": settings.app_version, "status": "healthy"}


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.app_version,
        "timestamp": time.time(),
    }


@app.get("/api/v1/ready")
async def readiness_check():
    checks = {"api": "ok", "database": "unknown"}
    try:
        from .db.mongodb import MongoDB
        mongo_status = await MongoDB.health_check()
        if mongo_status.get("healthy"):
            checks["database"] = "ok"
        else:
            checks["database"] = f"error: {mongo_status.get('error', 'unknown')}"
    except Exception as e:
        checks["database"] = f"error: {e}"

    all_ok = all(v == "ok" for v in checks.values())
    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={
            "ready": all_ok,
            "checks": checks,
            "timestamp": time.time(),
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=1 if settings.debug else settings.workers,
    )