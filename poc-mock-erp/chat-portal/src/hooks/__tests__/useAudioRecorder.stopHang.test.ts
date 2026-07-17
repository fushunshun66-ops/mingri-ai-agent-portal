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

function mockAudioGraph(sampleRate = 16000) {
  const stream = {
    getTracks: () => [{ stop: vi.fn() }],
  } as unknown as MediaStream;

  let audioProcess: ((e: AudioProcessingEvent) => void) | null = null;
  const node = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    set onaudioprocess(fn: ((e: AudioProcessingEvent) => void) | null) { audioProcess = fn; },
    get onaudioprocess() { return audioProcess; },
  };
  const silentGain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
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
  return { stream, node, source, silentGain, ctx, destination };
}

let lastWs: MockWebSocket;

function stubEnv(sampleRate = 16000) {
  const audio = mockAudioGraph(sampleRate);
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(audio.stream) },
  });
  vi.stubGlobal("AudioContext", vi.fn(function AudioContext() { return audio.ctx; }));
  const WsCtor = Object.assign(
    vi.fn(function WebSocket() {
      lastWs = new MockWebSocket();
      return lastWs;
    }),
    { OPEN: MockWebSocket.OPEN, CLOSED: MockWebSocket.CLOSED },
  );
  vi.stubGlobal("WebSocket", WsCtor);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
}

describe("useAudioRecorder — stop 重入保护与 stopping 状态", () => {
  beforeEach(() => stubEnv());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function startRecording(result: { current: ReturnType<typeof useAudioRecorder> }) {
    await act(async () => { await result.current.start(); });
    await act(async () => { lastWs.onopen?.(new Event("open")); });
    await waitFor(() => expect(result.current.status).toBe("recording"));
  }

  // ─── RED 测试 1：stop() 后 status 立即变为 "stopping" ───
  it("recording 时调用 stop() → status 立即变为 stopping", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    // 触发 stop 但不 await（让它悬在 Promise 等待 done）
    let stopPromise: Promise<string>;
    act(() => {
      stopPromise = result.current.stop();
    });

    // status 应该立即变成 stopping，不再是 recording
    await waitFor(() => expect(result.current.status).toBe("stopping"));

    // 最终 resolve：发送 done 让 stop 完成，否则 hook 会超时泄漏
    await act(async () => {
      lastWs.onmessage?.({
        data: JSON.stringify({ type: "done" }),
      } as MessageEvent);
    });
    await act(async () => { await stopPromise!; });
  });

  // ─── RED 测试 2：stopping 期间第二次 stop() 不覆盖 resolve，不挂死 ───
  it("stopping 期间再次 stop() 应立即返回当前文字，不创建新 Promise", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    // 注入一段 partial 文字（用于验证第二次 stop 返回内容）
    await act(async () => {
      lastWs.onmessage?.({
        data: JSON.stringify({ type: "partial", text: "正在说话" }),
      } as MessageEvent);
    });

    // 第一次 stop —— 开始等待 done
    let firstStopPromise: Promise<string>;
    act(() => {
      firstStopPromise = result.current.stop();
    });
    await waitFor(() => expect(result.current.status).toBe("stopping"));

    // 第二次 stop —— 应立即 resolve（不能挂住）
    let secondResult: string | undefined;
    await act(async () => {
      secondResult = await result.current.stop();
    });

    // 第二次调用应该立即返回，且不应该覆盖第一次的 resolve
    expect(secondResult).toBeDefined();

    // 第一次 stop 仍然可以被正常 resolve（by done 事件）
    await act(async () => {
      lastWs.onmessage?.({ data: JSON.stringify({ type: "done" }) } as MessageEvent);
    });
    const firstResult = await act(async () => firstStopPromise!);
    expect(firstResult).toBeDefined();
  });

  // ─── RED 测试 3：done 事件后 status → idle ───
  it("done 事件后 stop() 的 Promise resolve，status 回到 idle", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    // 注入 final 文字
    await act(async () => {
      lastWs.onmessage?.({
        data: JSON.stringify({ type: "asr", text: "最终文字", is_final: true }),
      } as MessageEvent);
    });

    let spoken = "";
    const stopPromise = act(async () => {
      spoken = await result.current.stop();
    });

    await act(async () => {
      lastWs.onmessage?.({ data: JSON.stringify({ type: "done" }) } as MessageEvent);
    });
    await stopPromise;

    expect(spoken).toBe("最终文字");
    await waitFor(() => expect(result.current.status).toBe("idle"));
  });

  // ─── 测试 4：cancel() 在 stopping 期间可清除状态到 idle ───
  it("stopping 期间 cancel() 能立即把状态清回 idle", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await startRecording(result);

    // 发起 stop，但不发 done（模拟等待）
    act(() => { result.current.stop(); });
    await waitFor(() => expect(result.current.status).toBe("stopping"));

    // cancel 应能强制回到 idle
    act(() => { result.current.cancel(); });
    await waitFor(() => expect(result.current.status).toBe("idle"));
  });

  // ─── 测试 5：快速双击 start 不二次 getUserMedia（statusRef 守卫）───
  it("idle 外再调 start 不二次 getUserMedia", async () => {
    const getUserMedia = navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>;
    const { result } = renderHook(() => useAudioRecorder());

    // 同一 tick 内连续两次 start：模拟快速双击（闭包仍见 idle）
    await act(async () => {
      const p1 = result.current.start();
      const p2 = result.current.start();
      await Promise.all([p1, p2]);
    });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
});
