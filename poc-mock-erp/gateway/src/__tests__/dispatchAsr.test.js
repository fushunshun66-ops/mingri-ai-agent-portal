import { describe, it, expect, vi, beforeEach } from "vitest";
import { dispatchAsrConnection } from "../asr/dispatchAsr.js";

function mockWs() {
  return { send: vi.fn(), readyState: 1 };
}

describe("dispatchAsrConnection", () => {
  let createAsrProxy;
  let createQwenRealtimeProxy;
  let loadHotwords;
  let asrConfig;

  beforeEach(() => {
    createAsrProxy = vi.fn();
    createQwenRealtimeProxy = vi.fn();
    loadHotwords = vi.fn(() => ({ 销售订单: 25, 陶氏: 50 }));
    asrConfig = {
      defaultEngine: "funasr",
      apiKey: "sk-test",
      qwen: {
        model: "qwen3-asr-flash-realtime",
        endpoint: "wss://example.com/realtime",
        language: "zh",
      },
    };
  });

  function deps(overrides = {}) {
    return {
      asrConfig,
      funasrWsUrl: "ws://127.0.0.1:10095",
      createAsrProxy,
      createQwenRealtimeProxy,
      loadHotwords,
      ...overrides,
    };
  }

  it("无 engine 参数时默认走 FunASR", () => {
    const ws = mockWs();
    const result = dispatchAsrConnection(ws, { url: "/api/asr/stream" }, deps());
    expect(result).toBe("funasr");
    expect(createAsrProxy).toHaveBeenCalledOnce();
    expect(createAsrProxy).toHaveBeenCalledWith(ws, { wsUrl: "ws://127.0.0.1:10095" });
    expect(createQwenRealtimeProxy).not.toHaveBeenCalled();
  });

  it("engine=funasr 走 FunASR", () => {
    const ws = mockWs();
    dispatchAsrConnection(ws, { url: "/api/asr/stream?engine=funasr" }, deps());
    expect(createAsrProxy).toHaveBeenCalledOnce();
    expect(createQwenRealtimeProxy).not.toHaveBeenCalled();
  });

  it("engine=qwen 且有 apiKey 时走 Qwen 代理，并注入 corpus", () => {
    const ws = mockWs();
    const result = dispatchAsrConnection(ws, { url: "/api/asr/stream?engine=qwen" }, deps());
    expect(result).toBe("qwen");
    expect(createQwenRealtimeProxy).toHaveBeenCalledOnce();
    expect(createAsrProxy).not.toHaveBeenCalled();
    const opts = createQwenRealtimeProxy.mock.calls[0][1];
    expect(opts.apiKey).toBe("sk-test");
    expect(opts.model).toBe("qwen3-asr-flash-realtime");
    expect(opts.endpoint).toBe("wss://example.com/realtime");
    expect(opts.language).toBe("zh");
    // 权重降序：陶氏(50) 销售订单(25)
    expect(opts.corpusText).toBe("陶氏 销售订单");
    expect(loadHotwords).toHaveBeenCalledOnce();
  });

  it("engine=qwen 但无 apiKey 时立刻发中文 error，不建代理", () => {
    const ws = mockWs();
    asrConfig.apiKey = "";
    const result = dispatchAsrConnection(ws, { url: "/api/asr/stream?engine=qwen" }, deps());
    expect(result).toBe("error");
    expect(ws.send).toHaveBeenCalledOnce();
    const payload = JSON.parse(ws.send.mock.calls[0][0]);
    expect(payload).toEqual({ type: "error", message: "语音识别服务未配置" });
    expect(createQwenRealtimeProxy).not.toHaveBeenCalled();
    expect(createAsrProxy).not.toHaveBeenCalled();
  });

  it("defaultEngine 为 qwen 且无 query 时走 Qwen", () => {
    asrConfig.defaultEngine = "qwen";
    const ws = mockWs();
    dispatchAsrConnection(ws, { url: "/api/asr/stream" }, deps());
    expect(createQwenRealtimeProxy).toHaveBeenCalledOnce();
  });
});
