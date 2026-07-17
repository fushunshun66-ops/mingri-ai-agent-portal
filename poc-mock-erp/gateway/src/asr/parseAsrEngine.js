/**
 * 从 WebSocket 握手请求的 URL 中解析 engine 查询参数。
 * @param {string | null | undefined} url
 * @returns {string | null}  engine 值，未提供或为空则返回 null
 */
export function parseAsrEngine(url) {
  if (!url) return null;
  try {
    // URL 构造器需要完整 URL，用虚拟 base 处理相对路径
    const u = new URL(url, "ws://localhost");
    const engine = u.searchParams.get("engine");
    return engine && engine.length > 0 ? engine : null;
  } catch {
    return null;
  }
}
