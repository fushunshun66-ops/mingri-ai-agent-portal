import type { AsrEngine } from "../types/voice";

const DEFAULT_BASE = "ws://127.0.0.1:3001";
const VALID_ENGINES: AsrEngine[] = ["funasr", "qwen"];

export function buildAsrWsUrl(engine: AsrEngine, baseOrigin?: string): string {
  const safeEngine = VALID_ENGINES.includes(engine) ? engine : "qwen";
  const base = (baseOrigin ?? DEFAULT_BASE).replace(/\/+$/, "");
  return `${base}/api/asr/stream?engine=${safeEngine}`;
}
