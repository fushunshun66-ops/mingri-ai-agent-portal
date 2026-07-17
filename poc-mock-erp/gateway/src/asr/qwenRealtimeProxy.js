import { WebSocket } from "ws";
import {
  buildSessionUpdate,
  buildAppend,
  buildCommit,
  buildFinish,
  translateServerEvent,
} from "./qwenEvents.js";

const TIMEOUT_MS = 60_000;
const STOP_WAIT_MS = 4_000;

/**
 * 创建 Qwen3-ASR-Flash-Realtime 代理。
 * 前端仍发二进制 PCM16 + {type:"stop"}，仍收 ready/text/done/error。
 *
 * @param {import("ws").WebSocket} clientWs     前端连接
 * @param {{
 *   apiKey: string,
 *   model: string,
 *   endpoint: string,
 *   language: string,
 *   corpusText: string,
 * }} opts
 */
export function createQwenRealtimeProxy(clientWs, { apiKey, model, endpoint, language, corpusText }) {
  let qwenWs = null;
  let timeout = null;
  let stopTimeout = null;
  let stopping = false;
  let closed = false;
  let sessionReady = false; // session.updated 后才视为就绪

  function cleanup() {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    clearTimeout(stopTimeout);
    if (qwenWs && qwenWs.readyState === WebSocket.OPEN) {
      try { qwenWs.close(); } catch (_) { /* 忽略 */ }
    }
  }

  function sendToClient(data) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(data));
    }
  }

  function sendToQwen(obj) {
    if (qwenWs && qwenWs.readyState === WebSocket.OPEN) {
      qwenWs.send(JSON.stringify(obj));
    }
  }

  function resetTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      sendToClient({ type: "error", message: "语音识别超时，请重试" });
      cleanup();
    }, TIMEOUT_MS);
  }

  function finishStop() {
    if (closed) return;
    sendToClient({ type: "done" });
    cleanup();
  }

  // 建立到 Qwen3 的 WebSocket 连接
  const wsUrl = `${endpoint}?model=${encodeURIComponent(model)}`;
  qwenWs = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  resetTimeout();

  qwenWs.on("open", () => {
    sendToQwen(buildSessionUpdate({ language, corpusText }));
  });

  qwenWs.on("message", (data) => {
    resetTimeout();
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (_) {
      return;
    }

    // 收到 session.updated 后通知前端就绪
    if (msg.type === "session.updated") {
      sessionReady = true;
      sendToClient({ type: "ready" });
      return;
    }

    const unified = translateServerEvent(msg);
    if (!unified) return;

    if (unified.type === "done") {
      clearTimeout(stopTimeout);
      finishStop();
      return;
    }

    sendToClient(unified);

    // final 结果收到后若已在 stopping 状态，触发结束
    if (stopping && unified.is_final) {
      clearTimeout(stopTimeout);
      finishStop();
    }
  });

  qwenWs.on("error", () => {
    sendToClient({ type: "error", message: "语音识别服务暂未就绪，请稍后重试" });
    cleanup();
  });

  qwenWs.on("close", () => {
    if (!closed) {
      if (stopping) {
        finishStop();
      } else {
        sendToClient({ type: "error", message: "语音识别连接已断开，请刷新重试" });
      }
    }
    cleanup();
  });

  // 处理前端消息
  clientWs.on("message", (data, isBinary) => {
    if (isBinary) {
      // 二进制 PCM 帧 → base64 append
      if (qwenWs && qwenWs.readyState === WebSocket.OPEN) {
        sendToQwen(buildAppend(data));
        resetTimeout();
      }
      return;
    }

    let msg;
    try { msg = JSON.parse(data.toString()); } catch (_) { return; }

    if (msg.type === "stop") {
      stopping = true;
      if (qwenWs && qwenWs.readyState === WebSocket.OPEN) {
        // 先 commit 再 finish，触发最终转写
        sendToQwen(buildCommit());
        sendToQwen(buildFinish());
      }
      clearTimeout(stopTimeout);
      stopTimeout = setTimeout(finishStop, STOP_WAIT_MS);
    }
  });

  clientWs.on("close", cleanup);
  clientWs.on("error", cleanup);
}
