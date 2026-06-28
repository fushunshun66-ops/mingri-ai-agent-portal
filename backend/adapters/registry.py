"""适配器注册表 — 启动时注册，运行时按 platform_type 查找"""

from adapters.base import BaseAdapter


class AdapterRegistry:
    """适配器注册表。

    使用方式：
        AdapterRegistry.register(DifyAdapter())
        adapter = AdapterRegistry.get("dify")
    """

    _adapters: dict[str, BaseAdapter] = {}

    @classmethod
    def register(cls, adapter: BaseAdapter) -> None:
        """注册适配器。若同名 platform_type 已存在则覆盖。

        Args:
            adapter: BaseAdapter 子类实例
        """
        cls._adapters[adapter.platform_type] = adapter

    @classmethod
    def get(cls, platform_type: str) -> BaseAdapter | None:
        """按 platform_type 查找适配器。

        Args:
            platform_type: 平台类型标识（如 "dify", "n8n"）

        Returns:
            适配器实例，未找到返回 None
        """
        return cls._adapters.get(platform_type)

    @classmethod
    def all(cls) -> dict[str, BaseAdapter]:
        """获取所有已注册的适配器。

        Returns:
            {platform_type: adapter} 字典
        """
        return dict(cls._adapters)
