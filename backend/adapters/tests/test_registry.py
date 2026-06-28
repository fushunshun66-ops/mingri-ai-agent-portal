"""适配器注册表框架测试"""

import pytest


class TestAdapterRegistry:
    """AdapaterRegistry 注册表测试"""

    def test_register_and_get_adapter(self):
        """注册适配器后可通过 platform_type 查找"""
        from adapters.base import BaseAdapter
        from adapters.registry import AdapterRegistry

        class MockAdapter(BaseAdapter):
            platform_type = "dify"

            async def chat_stream(self, agent, message, context):
                yield "mock chunk"

            async def chat(self, agent, message):
                return {"reply": "mock reply"}

            async def health_check(self, connection):
                return True

        # 注册
        adapter = MockAdapter()
        AdapterRegistry.register(adapter)

        # 查找
        found = AdapterRegistry.get("dify")
        assert found is adapter
        assert found.platform_type == "dify"

        # 查找不存在的类型
        assert AdapterRegistry.get("nonexistent") is None

    def test_multiple_adapters(self):
        """注册多个适配器，各自通过 platform_type 区分"""
        from adapters.base import BaseAdapter
        from adapters.registry import AdapterRegistry

        class DifyAdapter(BaseAdapter):
            platform_type = "dify"

            async def chat_stream(self, agent, message, context):
                yield "dify"
                return

            async def chat(self, agent, message):
                return {"reply": "dify"}

            async def health_check(self, connection):
                return True

        class N8nAdapter(BaseAdapter):
            platform_type = "n8n"

            async def chat_stream(self, agent, message, context):
                yield "n8n"
                return

            async def chat(self, agent, message):
                return {"reply": "n8n"}

            async def health_check(self, connection):
                return True

        dify = DifyAdapter()
        n8n = N8nAdapter()
        AdapterRegistry.register(dify)
        AdapterRegistry.register(n8n)

        assert AdapterRegistry.get("dify") is dify
        assert AdapterRegistry.get("n8n") is n8n

    def test_all_adapters(self):
        """获取所有已注册的适配器"""
        from adapters.base import BaseAdapter
        from adapters.registry import AdapterRegistry

        # 清空注册表（测试隔离）
        original = dict(AdapterRegistry._adapters)
        AdapterRegistry._adapters.clear()

        try:
            class TestAdapter(BaseAdapter):
                platform_type = "test"

                async def chat_stream(self, agent, message, context):
                    yield "test"
                    return

                async def chat(self, agent, message):
                    return {"reply": "test"}

                async def health_check(self, connection):
                    return True

            AdapterRegistry.register(TestAdapter())
            all_adapters = AdapterRegistry.all()
            assert len(all_adapters) == 1
            assert all_adapters["test"].platform_type == "test"
        finally:
            AdapterRegistry._adapters = original

    def test_override_existing_adapter(self):
        """覆盖已注册的适配器"""
        from adapters.base import BaseAdapter
        from adapters.registry import AdapterRegistry

        original = dict(AdapterRegistry._adapters)
        AdapterRegistry._adapters.clear()

        try:
            class FirstAdapter(BaseAdapter):
                platform_type = "test2"

                async def chat_stream(self, agent, message, context):
                    yield "first"
                    return

                async def chat(self, agent, message):
                    return {"reply": "first"}

                async def health_check(self, connection):
                    return True

            class SecondAdapter(BaseAdapter):
                platform_type = "test2"

                async def chat_stream(self, agent, message, context):
                    yield "second"
                    return

                async def chat(self, agent, message):
                    return {"reply": "second"}

                async def health_check(self, connection):
                    return True

            AdapterRegistry.register(FirstAdapter())
            AdapterRegistry.register(SecondAdapter())
            # 第二个应覆盖第一个
            found = AdapterRegistry.get("test2")
            assert isinstance(found, SecondAdapter)
        finally:
            AdapterRegistry._adapters = original


class TestBaseAdapter:
    """BaseAdapter 抽象基类测试"""

    def test_cannot_instantiate_abstract(self):
        """不能直接实例化未实现抽象方法的子类"""
        from adapters.base import BaseAdapter

        class IncompleteAdapter(BaseAdapter):
            platform_type = "incomplete"
            # 未实现 chat，应不能实例化

        with pytest.raises(TypeError):
            IncompleteAdapter()  # 缺少 chat 方法实现

    def test_platform_type_must_be_set(self):
        """子类必须设置 platform_type"""
        from adapters.base import BaseAdapter

        class NoPlatformAdapter(BaseAdapter):
            async def chat_stream(self, agent, message, context):
                yield "x"
                return

            async def chat(self, agent, message):
                return {"reply": "x"}

            async def health_check(self, connection):
                return True

        # platform_type 使用基类默认值 'unknown'
        adapter = NoPlatformAdapter()
        assert adapter.platform_type == "unknown"


class TestMockAdapterChat:
    """Mock 适配器对话测试（验证接口约定）"""

    @pytest.mark.asyncio
    async def test_mock_chat_stream_yields_strings(self):
        """chat_stream 应为异步生成器，yield 字符串"""
        from adapters.base import BaseAdapter

        class EchoAdapter(BaseAdapter):
            platform_type = "echo"

            async def chat_stream(self, agent, message, context):
                for word in message.split():
                    yield word

            async def chat(self, agent, message):
                return {"reply": message}

            async def health_check(self, connection):
                return connection.get("status") == "active"

        adapter = EchoAdapter()
        chunks = []
        async for chunk in adapter.chat_stream(
            agent={"id": "1", "name": "test"},
            message="hello world",
            context=[],
        ):
            chunks.append(chunk)

        assert chunks == ["hello", "world"]

    @pytest.mark.asyncio
    async def test_mock_chat_returns_dict(self):
        """chat 返回包含 reply 键的字典"""
        from adapters.base import BaseAdapter

        class SimpleAdapter(BaseAdapter):
            platform_type = "simple"

            async def chat_stream(self, agent, message, context):
                yield message[0]
                return

            async def chat(self, agent, message):
                return {"reply": f"Echo: {message}"}

            async def health_check(self, connection):
                return True

        adapter = SimpleAdapter()
        result = await adapter.chat(agent={}, message="hello")
        assert result["reply"] == "Echo: hello"

    @pytest.mark.asyncio
    async def test_health_check(self):
        """健康检测接口"""
        from adapters.base import BaseAdapter

        class HealthyAdapter(BaseAdapter):
            platform_type = "healthy"

            async def chat_stream(self, agent, message, context):
                yield "ok"
                return

            async def chat(self, agent, message):
                return {"reply": "ok"}

            async def health_check(self, connection):
                return connection.get("status") == "active"

        adapter = HealthyAdapter()
        assert await adapter.health_check({"status": "active"})
        assert not await adapter.health_check({"status": "disabled"})
