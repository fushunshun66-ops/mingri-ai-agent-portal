"""全局异常处理"""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from common.schemas import fail


class AppException(Exception):
    """业务异常基类"""

    def __init__(self, code: int = 400, message: str = "操作失败", error_code: str = "BAD_REQUEST"):
        self.code = code
        self.message = message
        self.error_code = error_code


class NotFoundException(AppException):
    def __init__(self, resource: str = "资源", identifier: str = ""):
        super().__init__(
            code=404,
            message=f"{resource}不存在",
            error_code="RESOURCE_NOT_FOUND",
        )


class ConflictException(AppException):
    def __init__(self, message: str = "资源冲突"):
        super().__init__(code=409, message=message, error_code="RESOURCE_CONFLICT")


class ForbiddenException(AppException):
    def __init__(self, message: str = "无权限访问"):
        super().__init__(code=403, message=message, error_code="FORBIDDEN")


class UnauthorizedException(AppException):
    def __init__(self, message: str = "未认证或 Token 已过期"):
        super().__init__(code=401, message=message, error_code="UNAUTHORIZED")


async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.code,
        content=fail(code=exc.code, message=exc.message, error_code=exc.error_code),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=fail(code=exc.status_code, message=exc.detail, error_code="HTTP_ERROR"),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
            "code": err["type"],
        })
    return JSONResponse(
        status_code=422,
        content=fail(
            code=422,
            message="请求参数校验失败",
            error_code="VALIDATION_ERROR",
            error_detail=errors,
        ),
    )


async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=fail(code=500, message="服务器内部错误", error_code="INTERNAL_ERROR"),
    )
