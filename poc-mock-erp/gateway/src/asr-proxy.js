import { WebSocket } from "ws";

const SILENCE_FRAMES = 40;
const SILENCE_BYTES = Buffer.alloc(3200, 0);
const HANDSHAKE_MSG = JSON.stringify({
  mode: "2pass",
  chunk_size: [5, 10, 5],
  chunk_interval: 10,
  wav_name: "stream",
  wav_format: "pcm",
  is_speaking: true,
  audio_fs: 16000,
});
const TIMEOUT_MS = 60000;
const SENSEVOICE_TAG_RE = /<\|[^|]+\|>/g;

export function createAsrProxy(clientWs, asrConfig) {
  let asrWs = null;
  let timeout = null;
  let closed = false;

  function cleanup() {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    if (asrWs && asrWs.readyState === WebSocket.OPEN) {
      try { asrWs.close(); } catch (_) { /* ignore */ }
    }
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
      asrWs.send(HANDSHAKE_MSG);
      sendToClient({ type: "ready" });
    });

    asrWs.on("message", (data) => {
      resetTimeout();
      try {
        const msg = JSON.parse(data.toString());
        if (msg.text) {
          msg.text = msg.text.replace(SENSEVOICE_TAG_RE, "").trim();
        }
        sendToClient(msg);
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
        sendToClient({ type: "error", message: "语音识别服务暂未就绪，请稍后重试" });
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
      }
      return;
    }

    let msg;
    try { msg = JSON.parse(data.toString()); } catch (_) { return; }

    if (msg.type === "stop") {
      if (asrWs && asrWs.readyState === WebSocket.OPEN) {
        asrWs.send(JSON.stringify({ is_speaking: false }));
        sendSilenceFrames();
      }
      sendToClient({ type: "done" });
      cleanup();
    }
  });

  clientWs.on("close", cleanup);
  clientWs.on("error", cleanup);
}
