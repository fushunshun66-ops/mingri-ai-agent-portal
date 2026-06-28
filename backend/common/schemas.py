"""统一响应格式 Pydantic Schema"""

import uuid
from datetime import datetime, timezone
from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: Optional[Any] = None


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    code: int = 200
    message: str = "操作成功"
    data: Optional[T] = None
    pagination: Optional[PaginationMeta] = None
    error: Optional[ErrorDetail] = None
    request_id: str = ""


def ok(
    data: Any = None,
    message: str = "操作成功",
    code: int = 200,
    pagination: Optional[PaginationMeta] = None,
) -> dict:
    return {
        "success": True,
        "code": code,
        "message": message,
        "data": data,
        "pagination": pagination.model_dump() if pagination else None,
        "error": None,
        "request_id": str(uuid.uuid4()),
    }


def fail(
    code: int = 400,
    message: str = "操作失败",
    error_code: str = "BAD_REQUEST",
    error_detail: Any = None,
) -> dict:
    return {
        "success": False,
        "code": code,
        "message": message,
        "data": None,
        "pagination": None,
        "error": {
            "code": error_code,
            "message": message,
            "detail": error_detail,
        },
        "request_id": str(uuid.uuid4()),
    }


def paginated_ok(
    data: list,
    total: int,
    page: int,
    page_size: int,
    message: str = "查询成功",
) -> dict:
    return ok(
        data=data,
        message=message,
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
        ),
    )
