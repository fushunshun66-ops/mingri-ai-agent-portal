"""Redis 客户端封装 — 异步操作，连接复用"""

import asyncio
import json
from typing import Any

import redis.asyncio as aioredis
from common.config import settings

_client: aioredis.Redis | None = None
_lock = asyncio.Lock()


async def get_redis() -> aioredis.Redis:
    """获取 Redis 客户端（懒加载单例，double-check locking 防竞态）"""
    global _client
    if _client is None:
        async with _lock:
            if _client is None:
                _client = aioredis.from_url(
                    settings.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
    return _client


def set_redis_client(client: aioredis.Redis | None) -> None:
    """注入 Redis 客户端（用于测试 mock）"""
    global _client
    _client = client


# ── 缓存操作 ──


async def cache_get(key: str) -> Any | None:
    """从 Redis 读取缓存值，自动 JSON 反序列化"""
    r = await get_redis()
    val = await r.get(key)
    if val is None:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return val


async def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    """写入 Redis 缓存，自动 JSON 序列化"""
    r = await get_redis()
    val = json.dumps(value, ensure_ascii=False, default=str)
    if ttl:
        await r.setex(key, ttl, val)
    else:
        await r.set(key, val)


async def cache_delete(key: str) -> None:
    """删除缓存"""
    r = await get_redis()
    await r.delete(key)


# ── 列表操作（用于消息热缓存） ──


async def cache_list_push(key: str, value: Any, max_len: int = 50, ttl: int | None = None) -> None:
    """向列表右侧推入元素，保持列表长度不超过 max_len。可选 TTL"""
    r = await get_redis()
    val = json.dumps(value, ensure_ascii=False, default=str)
    pipe = r.pipeline()
    pipe.rpush(key, val)
    pipe.ltrim(key, -max_len, -1)  # 保留最后 max_len 条
    if ttl:
        pipe.expire(key, ttl)
    await pipe.execute()


async def cache_list_get(key: str, start: int = 0, end: int = -1) -> list[Any]:
    """获取列表元素，自动 JSON 反序列化"""
    r = await get_redis()
    vals = await r.lrange(key, start, end)
    result = []
    for v in vals:
        try:
            result.append(json.loads(v))
        except (json.JSONDecodeError, TypeError):
            result.append(v)
    return result
