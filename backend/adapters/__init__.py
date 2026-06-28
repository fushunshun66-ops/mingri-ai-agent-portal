"""适配器框架：BaseAdapter 抽象基类 + AdapterRegistry 注册表"""

from adapters.base import BaseAdapter
from adapters.registry import AdapterRegistry

__all__ = ["BaseAdapter", "AdapterRegistry"]
