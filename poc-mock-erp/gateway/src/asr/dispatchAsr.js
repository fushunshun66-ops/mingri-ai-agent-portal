import { WebSocket } from "ws";
import { parseAsrEngine } from "./parseAsrEngine.js";
import { hotwordsToCorpusText } from "./qwenCorpus.js";

/**
 * 按 ?engine= 分发 ASR WebSocket 连接。
 * @param {import("ws").WebSocket} clientWs
 * @param {{ url?: string }} req  ws 握手请求（至少含 url）
 * @param {{
 *   asrConfig: { defaultEngine: string, apiKey: string, qwen: { model: string, endpoint: string, language: string } },
 *   funasrWsUrl: string,
 *   createAsrProxy: Function,
 *   createQwenRealtimeProxy: Function,
 *   loadHotwords: Function,
 * }} deps
 * @returns {"funasr" | "qwen" | "error"}
 */
export function dispatchAsrConnection(clientWs, req, deps) {
  const {
    asrConfig,
    funasrWsUrl,
    createAsrProxy,
    createQwenRealtimeProxy,
    loadHotwords,
  } = deps;

  const engine = parseAsrEngine(req?.url) || asrConfig.defaultEngine || "qwen";

  if (engine === "qwen") {
    if (!asrConfig.apiKey) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", message: "语音识别服务未配置" }));
      }
      return "error";
    }
    const corpusText = hotwordsToCorpusText(loadHotwords());
    createQwenRealtimeProxy(clientWs, {
      apiKey: asrConfig.apiKey,
      model: asrConfig.qwen.model,
      endpoint: asrConfig.qwen.endpoint,
      language: asrConfig.qwen.language,
      corpusText,
    });
    return "qwen";
  }

  createAsrProxy(clientWs, { wsUrl: funasrWsUrl });
  return "funasr";
}
