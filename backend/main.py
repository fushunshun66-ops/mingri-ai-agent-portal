"""FastAPI 应用入口"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from common.config import settings
from common.exceptions import (
    AppException,
    app_exception_handler,
    general_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from common.middleware import AuthMiddleware
from users.router import router as users_router
from agents.router import router as agents_router
from adapters.router import router as adapters_router
from chat.router import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动/关闭事件"""
    yield


app = FastAPI(
    title="企业智能体统一门户",
    description="Enterprise Agent Portal API",
    version="0.1.0",
    lifespan=lifespan,
)

# ── 中间件 ──
app.add_middleware(AuthMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 全局异常处理器 ──
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ── 挂载路由 ──
app.include_router(users_router)
app.include_router(agents_router)
app.include_router(adapters_router)
app.include_router(chat_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
