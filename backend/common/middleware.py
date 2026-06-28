"""中间件：JWT 认证、多租户上下文注入"""

import logging

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from jose import JWTError

from common.security import decode_token

logger = logging.getLogger(__name__)

# 无需认证的路径前缀
PUBLIC_PATHS = [
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
]


class AuthMiddleware(BaseHTTPMiddleware):
    """JWT 认证中间件：从 Authorization Header 解析 JWT，注入 request.state"""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 公开路径跳过认证
        if any(path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)

        # 从 Header 获取 Token
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = decode_token(token, expected_type="access")
                request.state.user_id = payload.get("sub")
                request.state.tenant_id = payload.get("tenant_id")
                request.state.roles = payload.get("roles", [])
            except (JWTError, ValueError, KeyError):
                logger.debug("JWT 解析失败", exc_info=True)

        return await call_next(request)
