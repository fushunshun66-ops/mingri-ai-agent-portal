import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioRecorderHandle, RecorderStatus } from "../types/voice";
import { computeRmsLevel } from "../utils/audioLevel";

const STOP_WAIT_MS = 4500;

export function useAudioRecorder(): AudioRecorderHandle {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [partialText, setPartialText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [level, setLevel] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalRef = useRef("");
  const partialRef = useRef("");
  const rafRef = useRef(0);
  const levelRef = useRef(0);
  const levelRafRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<RecorderStatus>("idle");
  const stopResolveRef = useRef<((text: string) => void) | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported = !!(navigator.mediaDevices && window.AudioContext);

  function flushPartial() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setPartialText(partialRef.current);
    });
  }

  function flushLevel() {
    cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = requestAnimationFrame(() => {
      setLevel(statusRef.current === "recording" ? levelRef.current : 0);
    });
  }

  function resetLevel() {
    cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = 0;
    levelRef.current = 0;
    setLevel(0);
  }

  function resolveStop() {
    if (!stopResolveRef.current) return;
    const text = finalRef.current || partialRef.current;
    stopResolveRef.current(text);
    stopResolveRef.current = null;
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
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
    cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = 0;
    levelRef.current = 0;
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (status !== "idle") return;
    setError(null);
    setStatus("requesting");
    statusRef.current = "requesting";
    setDurationSec(0);
    resetLevel();
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
          if (msg.type === "done") {
            resolveStop();
            return;
          }
          if (msg.type === "error") {
            setError(msg.message);
            setStatus("error");
            statusRef.current = "error";
            resolveStop();
            cleanup();
            return;
          }
          if (msg.text) {
            partialRef.current = msg.text;
            if (msg.is_final) finalRef.current = msg.text;
            flushPartial();
          }
        } catch {
          /* ignore non-JSON */
        }
      };

      ws.onclose = () => {
        resolveStop();
        if (statusRef.current === "recording") {
          setStatus("error");
          statusRef.current = "error";
          cleanup();
        }
      };

      node.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, input[i]! * 32767));
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(pcm.buffer);
        }
        // 同一段 PCM 循环内顺便算能量，不改变推流逻辑
        if (statusRef.current === "recording") {
          levelRef.current = computeRmsLevel(input);
          flushLevel();
        } else {
          levelRef.current = 0;
          flushLevel();
        }
      };
    } catch (err) {
      const msg =
        (err as DOMException)?.name === "NotAllowedError"
          ? "请允许麦克风权限后重试"
          : `录音启动失败：${(err as Error).message}`;
      cleanup();
      setError(msg);
      setStatus("error");
      statusRef.current = "error";
    }
  }, [status, cleanup]);

  const stop = useCallback(async () => {
    if (status !== "recording") return finalRef.current || partialRef.current;

    const spoken = await new Promise<string>((resolve) => {
      stopResolveRef.current = resolve;
      stopTimerRef.current = setTimeout(() => {
        resolve(finalRef.current || partialRef.current);
        stopResolveRef.current = null;
        stopTimerRef.current = null;
      }, STOP_WAIT_MS);

      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "stop" }));
      } else {
        resolveStop();
      }
    });

    statusRef.current = "idle";
    cleanup();
    setStatus("idle");
    setPartialText("");
    partialRef.current = "";
    return spoken;
  }, [status, cleanup]);

  const cancel = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    stopResolveRef.current = null;
    statusRef.current = "idle";
    cleanup();
    setStatus("idle");
    setPartialText("");
    setError(null);
    setDurationSec(0);
    partialRef.current = "";
    finalRef.current = "";
  }, [cleanup]);

  const dismissError = useCallback(() => {
    cleanup();
    setError(null);
    setStatus("idle");
    statusRef.current = "idle";
  }, [cleanup]);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  return { status, isSupported, partialText, error, durationSec, level, start, stop, cancel, dismissError };
}
