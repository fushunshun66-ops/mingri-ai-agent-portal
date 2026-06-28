"""文件存储（MinIO）测试"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestStorageService:
    """StorageService 单元测试"""

    @pytest.fixture
    def mock_minio(self):
        """创建 mock Minio 客户端"""
        with patch("common.storage.Minio") as mock:
            client = MagicMock()
            mock.return_value = client
            yield client

    @pytest.fixture
    def storage(self, mock_minio):
        """创建 StorageService 实例"""
        from common.storage import StorageService

        return StorageService(
            endpoint="localhost:9000",
            access_key="minioadmin",
            secret_key="minioadmin",
            bucket="agent-portal",
            secure=False,
        )

    def test_storage_init(self, storage, mock_minio):
        """初始化时创建 Minio 客户端和 bucket"""
        mock_minio.bucket_exists.return_value = False
        mock_minio.make_bucket = MagicMock()

        # bucket 不存在时自动创建
        storage.client = mock_minio
        storage._ensure_bucket()
        mock_minio.bucket_exists.assert_called_with("agent-portal")
        mock_minio.make_bucket.assert_called_with("agent-portal")

    def test_storage_bucket_already_exists(self, storage, mock_minio):
        """bucket 已存在时不重复创建"""
        mock_minio.bucket_exists.return_value = True

        storage.client = mock_minio
        storage._ensure_bucket()
        mock_minio.bucket_exists.assert_called_with("agent-portal")
        mock_minio.make_bucket.assert_not_called()

    async def test_upload_file(self, storage, mock_minio):
        """上传文件返回对象路径"""
        mock_minio.put_object = MagicMock()
        mock_minio.bucket_exists.return_value = False

        storage.client = mock_minio
        object_name = await storage.upload(
            file_data=b"fake-image-data",
            object_name="icons/test-uuid.png",
            content_type="image/png",
        )

        assert object_name == "icons/test-uuid.png"
        mock_minio.put_object.assert_called_once()

    async def test_upload_with_prefix(self, storage, mock_minio):
        """支持自定义前缀"""
        mock_minio.put_object = MagicMock()
        mock_minio.bucket_exists.return_value = False
        storage.client = mock_minio

        url = await storage.upload(
            file_data=b"data",
            object_name="avatars/user1.png",
            content_type="image/png",
        )
        assert "avatars" in url

    async def test_get_url(self, storage, mock_minio):
        """生成文件访问 URL"""
        mock_minio.presigned_get_object.return_value = (
            "http://localhost:9000/agent-portal/icons/test.png?signature=abc"
        )
        storage.client = mock_minio

        url = await storage.get_url("icons/test.png")
        assert url.startswith("http")
        assert "icons/test.png" in url

    def test_allowed_extensions(self):
        """允许的图片扩展名"""
        from common.storage import ALLOWED_IMAGE_EXTENSIONS

        assert ".png" in ALLOWED_IMAGE_EXTENSIONS
        assert ".jpg" in ALLOWED_IMAGE_EXTENSIONS
        assert ".jpeg" in ALLOWED_IMAGE_EXTENSIONS
        assert ".gif" in ALLOWED_IMAGE_EXTENSIONS
        assert ".webp" in ALLOWED_IMAGE_EXTENSIONS
        assert ".svg" in ALLOWED_IMAGE_EXTENSIONS

    def test_max_upload_size(self):
        """文件大小限制为 2MB"""
        from common.storage import MAX_UPLOAD_SIZE

        assert MAX_UPLOAD_SIZE == 2 * 1024 * 1024  # 2MB


class TestStorageIntegration:
    """存储集成测试（mock）"""

    async def test_upload_workflow(self):
        """完整上传流程 mock 验证"""
        with patch("common.storage.Minio") as mock_minio_cls:
            from common.storage import StorageService

            client = MagicMock()
            client.bucket_exists.return_value = False
            mock_minio_cls.return_value = client

            storage = StorageService(
                endpoint="localhost:9000",
                access_key="minioadmin",
                secret_key="minioadmin",
                bucket="agent-portal",
            )
            storage.client = client

            url = await storage.upload(
                file_data=b"test content",
                object_name="uploads/file.txt",
                content_type="text/plain",
            )

            assert url == "uploads/file.txt"
            client.put_object.assert_called_once()
            call_args = client.put_object.call_args
            assert call_args.kwargs["bucket_name"] == "agent-portal"
            assert call_args.kwargs["object_name"] == "uploads/file.txt"
