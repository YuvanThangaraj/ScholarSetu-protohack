import logging
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from app.core.config import settings
from app.core.database import engine, init_db_connection
from app.api.v1.router import api_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("scholarsetu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SCHOLARSETU AI backend")
    try:
        await init_db_connection()
    except Exception:
        logger.exception("Configured database could not be validated")
        raise
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server error on %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "Internal server error"})


app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
async def root():
    return {"app": settings.PROJECT_NAME, "version": settings.VERSION, "api_v1": settings.API_V1_STR}


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT, "version": settings.VERSION}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=settings.PROJECT_NAME, version=settings.VERSION, description=settings.PROJECT_DESCRIPTION, routes=app.routes)
    schema.setdefault("components", {})["securitySchemes"] = {"BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}}
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi
