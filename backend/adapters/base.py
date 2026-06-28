"""平台适配器抽象基类

新增平台只需继承 BaseAdapter，实现三个方法即可接入。
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator


class BaseAdapter(ABC):
    """平台适配器抽象基类。

    子类必须设置 platform_type 类属性，并实现所有抽象方法。
    """

    platform_type: str = "unknown"

    @abstractmethod
    async def chat_stream(
        self, agent: dict, message: str, context: list[dict]
    ) -> AsyncGenerator[str, None]:
        """流式对话，逐个 yield chunk。

        Args:
            agent: Agent 信息字典，含 id、name、platform_config 等
            message: 用户输入消息
            context: 对话历史上下文 [{role, content}, ...]

        Yields:
            每个文本 chunk
        """
        ...

    @abstractmethod
    async def chat(self, agent: dict, message: str) -> dict:
        """非流式对话，返回完整响应。

        Args:
            agent: Agent 信息字典
            message: 用户输入消息

        Returns:
            {"reply": "..."}
        """
        ...

    @abstractmethod
    async def health_check(self, connection: dict) -> bool:
        """连接健康检测。

        Args:
            connection: 连接配置字典

        Returns:
            True 表示连接正常
        """
        ...
