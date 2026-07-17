import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_HOTWORDS_PATH = path.join(__dirname, "../config/asrHotwords.json");

const BASE_HANDSHAKE = {
  mode: "2pass",
  chunk_size: [5, 10, 5],
  chunk_interval: 10,
  wav_name: "stream",
  wav_format: "pcm",
  is_speaking: true,
  audio_fs: 16000,
};

/**
 * 从配置文件加载 FunASR 热词表。缺文件 / 非法 JSON / 非对象时返回 {}。
 * @param {string} [filePath]
 * @returns {Record<string, number>}
 */
export function loadHotwords(filePath = DEFAULT_HOTWORDS_PATH) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

/**
 * 构建 FunASR 握手 payload；hotwords 为字符串化的 JSON 字典。
 * @param {Record<string, number> | null | undefined} hotwords
 */
export function buildHandshakePayload(hotwords) {
  const payload = { ...BASE_HANDSHAKE };
  if (hotwords && typeof hotwords === "object" && !Array.isArray(hotwords) && Object.keys(hotwords).length > 0) {
    payload.hotwords = JSON.stringify(hotwords);
  }
  return payload;
}
