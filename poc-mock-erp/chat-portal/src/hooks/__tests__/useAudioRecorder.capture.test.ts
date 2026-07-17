import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAudioRecorder } from "../useAudioRecorder";

type WsHandler = ((evt?: MessageEvent | Event) => void) | null;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  binaryType = "";
  onopen: WsHandler = null;
  onmessage: WsHandler = null;
  onclose: WsHandler = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new Event("close"));
  });
}

function mockAudioGraph(sampleRate: number) {
  const trackStop = vi.fn();
  const stream = {
    getTracks: () => [{ stop: trackStop }],
  } as unknown as MediaStream;

  let audioProcess: ((e: AudioProcessingEvent) => void) | null = null;
  const node = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    set onaudioprocess(fn: ((e: AudioProcessingEvent) => void) | null) {
      audioProcess = fn;
    },
    get onaudioprocess() {
      return audioProcess;
    },
  };
  const silentGain = {
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const source = { connect: vi.fn() };
  const destination = { id: "destination" };
  const ctx = {
    sampleRate,
    destination,
    createMediaStreamSource: vi.fn(() => source),
    createScriptProcessor: vi.fn(() => node),
    createGain: vi.fn(() => silentGain),
    close: vi.fn(),
  };

  return {
    stream,
    trackStop,
    node,
    source,
    silentGain,
    ctx,
    destination,
    getAudioProcess: () => audioProcess,
  };
}

describe("useAudioRecorder 采集链路（静音路由 + 采样率）", () => {
  let audio: ReturnType<typeof mockAudioGraph>;
  let lastWs: MockWebSocket;

  function stubEnv(sampleRate: number) {
    audio = mockAudioGraph(sampleRate);
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(audio.stream),
      },
    });
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function AudioContext() {
        return audio.ctx;
      }),
    );
    const WsCtor = Object.assign(
      vi.fn(function WebSocket() {
        lastWs = new MockWebSocket();
        return lastWs;
      }),
      { OPEN: MockWebSocket.OPEN, CLOSED: MockWebSocket.CLOSED },
    );
    vi.stubGlobal("WebSocket", WsCtor);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  }

  beforeEach(() => {
    stubEnv(16000);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function startRecording(
    result: { current: ReturnType<typeof useAudioRecorder> },
  ) {
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      lastWs.onopen?.(new Event("open"));
    });
    await waitFor(() => expect(result.current.status).toBe("recording"));
  }

  it("ScriptProcessor 不直连 destination，经 gain=0 保持图活跃", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    expect(audio.ctx.createGain).toHaveBeenCalled();
    expect(audio.silentGain.gain.value).toBe(0);
    expect(audio.source.connect).toHaveBeenCalledWith(audio.node);
    expect(audio.node.connect).toHaveBeenCalledWith(audio.silentGain);
    expect(audio.silentGain.connect).toHaveBeenCalledWith(audio.destination);
    // 禁止直连扬声器回放
    expect(audio.node.connect).not.toHaveBeenCalledWith(audio.destination);
  });

  it("实际 ~16k 时按块长推 Int16，不做 1/3 压缩", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    const input = new Float32Array(4096).fill(0.25);
    act(() => {
      audio.getAudioProcess()?.({
        inputBuffer: { getChannelData: () => input },
      } as unknown as AudioProcessingEvent);
    });

    expect(lastWs.send).toHaveBeenCalled();
    const buf = lastWs.send.mock.calls[0]![0] as ArrayBuffer;
    expect(buf.byteLength).toBe(4096 * 2);
  });

  it("实际 48k 时重采样为 16k Int16 再推流（长度约 1/3）", async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    stubEnv(48000);

    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    const input = new Float32Array(300);
    for (let i = 0; i < input.length; i++) input[i] = Math.sin(i / 10);
    act(() => {
      audio.getAudioProcess()?.({
        inputBuffer: { getChannelData: () => input },
      } as unknown as AudioProcessingEvent);
    });

    expect(lastWs.send).toHaveBeenCalled();
    const buf = lastWs.send.mock.calls[0]![0] as ArrayBuffer;
    // 300 @48k → 100 @16k，Int16 → 200 bytes
    expect(buf.byteLength).toBe(200);
  });

  it("推流后仍更新 level（采集改动不破坏音量逻辑）", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    const loud = new Float32Array(8).fill(0.5);
    act(() => {
      audio.getAudioProcess()?.({
        inputBuffer: { getChannelData: () => loud },
      } as unknown as AudioProcessingEvent);
    });
    expect(result.current.level).toBeGreaterThan(0);
  });
});
