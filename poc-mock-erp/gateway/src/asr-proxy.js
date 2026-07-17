import { WebSocket } from "ws";
import { loadHotwords, buildHandshakePayload } from "./asrHotwords.js";
import { shouldFinishAfterStop } from "./asrStopPolicy.js";

const SILENCE_FRAMES = 40;
const SILENCE_BYTES = Buffer.alloc(3200, 0);
const TIMEOUT_MS = 60000;
const STOP_WAIT_MS = 4000;
const SENSEVOICE_TAG_RE = /<\|[^|]+\|>/g;

export function createAsrProxy(clientWs, asrConfig) {
  let asrWs = null;
  let timeout = null;
  let stopTimeout = null;
  let stopping = false;
  let closed = false;

  const handshakeMsg = JSON.stringify(buildHandshakePayload(loadHotwords()));

  function cleanup() {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    clearTimeout(stopTimeout);
    if (asrWs && asrWs.readyState === WebSocket.OPEN) {
      try { asrWs.close(); } catch (_) { /* ignore */ }
    }
  }

  function finishStop() {
    if (closed) return;
    sendToClient({ type: "done" });
    cleanup();
  }

  function resetTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      sendToClient({ type: "error", message: "语音识别超时，请重试" });
      cleanup();
    }, TIMEOUT_MS);
  }

  function sendToClient(data) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(data));
    }
  }

  function sendSilenceFrames() {
    for (let i = 0; i < SILENCE_FRAMES; i++) {
      if (asrWs && asrWs.readyState === WebSocket.OPEN) {
        asrWs.send(SILENCE_BYTES);
      }
    }
  }

  function connectAsr() {
    asrWs = new WebSocket(asrConfig.wsUrl);

    asrWs.on("open", () => {
      asrWs.send(handshakeMsg);
      sendToClient({ type: "ready" });
    });

    asrWs.on("message", (data) => {
      resetTimeout();
      try {
        const msg = JSON.parse(data.toString());
        if (msg.text) {
          msg.text = msg.text.replace(SENSEVOICE_TAG_RE, "").trim();
        }
        console.log("[asr-proxy] fwd to client:", JSON.stringify({ text: msg.text?.slice(0, 50), is_final: msg.is_final, mode: msg.mode }));
        sendToClient(msg);
        if (stopping && shouldFinishAfterStop(msg)) {
          clearTimeout(stopTimeout);
          finishStop();
        }
      } catch (_) {
        console.debug("[asr-proxy] 非 JSON 帧:", data.toString().slice(0, 100));
      }
    });

    asrWs.on("error", () => {
      sendToClient({ type: "error", message: "语音识别服务暂未就绪，请稍后重试" });
      cleanup();
    });

    asrWs.on("close", () => {
      if (!closed) {
        if (stopping) {
          finishStop();
        } else {
          sendToClient({ type: "error", message: "语音识别服务暂未就绪，请稍后重试" });
        }
      }
      cleanup();
    });
  }

  resetTimeout();
  connectAsr();

  clientWs.on("message", (data, isBinary) => {
    if (isBinary) {
      if (asrWs && asrWs.readyState === WebSocket.OPEN) {
        asrWs.send(data);
        resetTimeout();
      } else {
        console.log("[asr-proxy] binary dropped, asrWs state:", asrWs?.readyState);
      }
      return;
    }

    let msg;
    try { msg = JSON.parse(data.toString()); } catch (_) { return; }

    if (msg.type === "stop") {
      stopping = true;
      if (asrWs && asrWs.readyState === WebSocket.OPEN) {
        asrWs.send(JSON.stringify({ is_speaking: false }));
        sendSilenceFrames();
      }
      clearTimeout(stopTimeout);
      stopTimeout = setTimeout(finishStop, STOP_WAIT_MS);
    }
  });

  clientWs.on("close", cleanup);
  clientWs.on("error", cleanup);
}
