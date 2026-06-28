"""MinIO / S3 文件存储封装"""

import asyncio
import uuid
from datetime import timedelta
from io import BytesIO

from minio import Minio

from common.config import settings

# 允许的图片扩展名
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
# 允许的 MIME 类型
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"}
# 最大上传大小 2MB
MAX_UPLOAD_SIZE = 2 * 1024 * 1024


class StorageService:
    """MinIO 对象存储服务"""

    def __init__(
        self,
        endpoint: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str | None = None,
        secure: bool | None = None,
    ):
        self.endpoint = endpoint or settings.minio_endpoint
        self.access_key = access_key or settings.minio_access_key
        self.secret_key = secret_key or settings.minio_secret_key
        self.bucket = bucket or settings.minio_bucket
        self.secure = secure if secure is not None else settings.minio_secure
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure,
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        """确保 bucket 存在，不存在则创建"""
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def _upload_sync(self, file_data: bytes, object_name: str, content_type: str) -> str:
        """同步上传文件到 MinIO"""
        data_stream = BytesIO(file_data)
        length = len(file_data)
        self.client.put_object(
            bucket_name=self.bucket,
            object_name=object_name,
            data=data_stream,
            length=length,
            content_type=content_type,
        )
        return object_name

    async def upload(self, file_data: bytes, object_name: str, content_type: str = "application/octet-stream") -> str:
        """上传文件到 MinIO，返回对象存储路径。

        Args:
            file_data: 文件二进制数据
            object_name: 对象名称（含路径，如 icons/uuid.png）
            content_type: MIME 类型

        Returns:
            对象路径（可用于 get_url）
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self._upload_sync, file_data, object_name, content_type
        )

    def _get_url_sync(self, object_name: str, expires: int) -> str:
        """同步生成预签名访问 URL"""
        return self.client.presigned_get_object(
            bucket_name=self.bucket,
            object_name=object_name,
            expires=timedelta(seconds=expires),
        )

    async def get_url(self, object_name: str, expires: int = 3600) -> str:
        """生成预签名访问 URL。

        Args:
            object_name: 对象名称
            expires: 过期时间（秒），默认 1 小时

        Returns:
            预签名 URL
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self._get_url_sync, object_name, expires
        )


# 全局单例
_storage: StorageService | None = None


def get_storage() -> StorageService:
    """获取全局存储服务实例"""
    global _storage
    if _storage is None:
        _storage = StorageService()
    return _storage
