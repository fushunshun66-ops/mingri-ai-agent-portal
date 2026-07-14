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

function mockAudioGraph() {
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
  const source = { connect: vi.fn() };
  const ctx = {
    createMediaStreamSource: vi.fn(() => source),
    createScriptProcessor: vi.fn(() => node),
    destination: {},
    close: vi.fn(),
  };

  return { stream, trackStop, node, ctx, getAudioProcess: () => audioProcess };
}

describe("useAudioRecorder level / cleanup 契约", () => {
  let audio: ReturnType<typeof mockAudioGraph>;
  let lastWs: MockWebSocket;

  beforeEach(() => {
    audio = mockAudioGraph();
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
    vi.stubGlobal(
      "WebSocket",
      vi.fn(function WebSocket() {
        lastWs = new MockWebSocket();
        return lastWs;
      }),
    );
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
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

  it("ASR error：cleanup（停轨）且 level 归零", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    const loud = new Float32Array(4).fill(0.5);
    act(() => {
      audio.getAudioProcess()?.({
        inputBuffer: { getChannelData: () => loud },
      } as unknown as AudioProcessingEvent);
    });
    expect(result.current.level).toBeGreaterThan(0);

    await act(async () => {
      lastWs.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({ type: "error", message: "识别失败" }),
        }),
      );
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("识别失败");
    expect(result.current.level).toBe(0);
    expect(audio.trackStop).toHaveBeenCalled();
    expect(audio.node.disconnect).toHaveBeenCalled();
    expect(audio.ctx.close).toHaveBeenCalled();
  });

  it("ws 异常断连：cleanup 且 level 归零", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    const closeSpy = lastWs.close;
    // 模拟对端断连：直接触发 onclose，不经本地 close()
    await act(async () => {
      lastWs.onclose?.(new Event("close"));
    });

    expect(result.current.status).toBe("error");
    expect(result.current.level).toBe(0);
    expect(audio.trackStop).toHaveBeenCalled();
    expect(audio.node.disconnect).toHaveBeenCalled();
    // cleanup 会再调 close；允许
    expect(closeSpy).toHaveBeenCalled();
  });

  it("dismissError：cleanup（清 timer）后 idle，level 为 0", async () => {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error("denied"), { name: "NotAllowedError" }),
        ),
      },
    });

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe("error");

    await act(async () => {
      result.current.dismissError();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.level).toBe(0);

    const durationAfterDismiss = result.current.durationSec;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });
    expect(result.current.durationSec).toBe(durationAfterDismiss);
  });

  it("start() catch：清理 interval 且 level 为 0", async () => {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error("denied"), { name: "NotAllowedError" }),
        ),
      },
    });

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.level).toBe(0);

    // 若未 clearInterval，1s 后 duration 仍会涨
    const durationAfterError = result.current.durationSec;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100));
    });
    expect(result.current.durationSec).toBe(durationAfterError);
  });

  it("非 recording 状态不抬升 level", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    await act(async () => {
      lastWs.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({ type: "error", message: "x" }),
        }),
      );
    });

    // cleanup 后 onaudioprocess 已断；再手工调用若残留也必须强制 0
    const process = audio.getAudioProcess();
    if (process) {
      act(() => {
        process({
          inputBuffer: {
            getChannelData: () => new Float32Array([1, -1, 1, -1]),
          },
        } as unknown as AudioProcessingEvent);
      });
    }
    expect(result.current.level).toBe(0);
  });
});
