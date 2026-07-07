import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioRecorderHandle, RecorderStatus } from "../types/voice";

export function useAudioRecorder(): AudioRecorderHandle {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [partialText, setPartialText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalRef = useRef("");
  const partialRef = useRef("");
  const rafRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<RecorderStatus>("idle");

  const isSupported = !!(navigator.mediaDevices && window.AudioContext);

  function flushPartial() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setPartialText(partialRef.current);
    });
  }


  const cleanup = useCallback(() => {
    if (nodeRef.current) {
      nodeRef.current.disconnect();
      nodeRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (status !== "idle") return;
    setError(null);
    setStatus("requesting");
    statusRef.current = "requesting";
    setDurationSec(0);
    timerRef.current = setInterval(() => {
      setDurationSec((s) => s + 1);
    }, 1000);
    setPartialText("");
    partialRef.current = "";
    finalRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      source.connect(node);
      node.connect(ctx.destination);

      const ws = new WebSocket("ws://127.0.0.1:3001/api/asr/stream");
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setStatus("recording");
        statusRef.current = "recording";
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "ready") return;
          if (msg.type === "done") return;
          if (msg.type === "error") {
            setError(msg.message);
            setStatus("error");
            statusRef.current = "error";
            return;
          }
          if (msg.text) {
            partialRef.current = msg.text;
            flushPartial();
          }
        } catch {
          /* ignore non-JSON */
        }
      };

      ws.onclose = () => {
        if (statusRef.current === "recording") setStatus("error");
      };

      node.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32767));
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(pcm.buffer);
        }
      };
    } catch (err) {
      const msg =
        (err as DOMException)?.name === "NotAllowedError"
          ? "请允许麦克风权限后重试"
          : `录音启动失败：${(err as Error).message}`;
      setError(msg);
      setStatus("error");
      statusRef.current = "error";
    }
  }, [status, cleanup]);

  const stop = useCallback(async () => {
    if (status !== "recording") return finalRef.current;
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
    }
    cleanup();
    setStatus("idle");
    statusRef.current = "idle";
    const result = finalRef.current || partialRef.current;
    setPartialText("");
    partialRef.current = "";
    return result;
  }, [status, cleanup]);

  const cancel = useCallback(() => {
    cleanup();
    setStatus("idle");
    statusRef.current = "idle";
    setPartialText("");
    setError(null);
    setDurationSec(0);
    partialRef.current = "";
    finalRef.current = "";
  }, [cleanup]);

  const dismissError = useCallback(() => {
    setError(null);
    setStatus("idle");
    statusRef.current = "idle";
  }, []);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  return { status, isSupported, partialText, error, durationSec, start, stop, cancel, dismissError };
}
