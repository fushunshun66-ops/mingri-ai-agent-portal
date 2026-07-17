import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// 用 vi.hoisted 创建跨 mock 边界可访问的引用
const wsRef = vi.hoisted(() => ({ current: null }));

vi.mock("ws", async () => {
  const { EventEmitter } = await import("events");

  class MockWebSocket extends EventEmitter {
    constructor() {
      super();
      this.readyState = MockWebSocket.OPEN;
      this.send = vi.fn();
      this.close = vi.fn();
      wsRef.current = this;
    }
  }
  MockWebSocket.OPEN = 1;

  return { WebSocket: MockWebSocket };
});

import { createQwenRealtimeProxy } from "../asr/qwenRealtimeProxy.js";

function makeClientWs() {
  const ws = new EventEmitter();
  ws.readyState = 1;
  ws.send = vi.fn();
  return ws;
}

const OPTS = {
  apiKey: "sk-test",
  model: "qwen3-asr-flash-realtime",
  endpoint: "wss://test.example.com/realtime",
  language: "zh",
  corpusText: "测试语料",
};

describe("createQwenRealtimeProxy", () => {
  let clientWs;
  let qwenWs;

  beforeEach(() => {
    vi.useFakeTimers();
    wsRef.current = null;
    clientWs = makeClientWs();
    createQwenRealtimeProxy(clientWs, OPTS);
    qwenWs = wsRef.current;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ─── 1. ready 时序 ────────────────────────────────────────────────────────

  it("open 阶段只发 session.update，session.updated 后 client 才收到 ready", () => {
    qwenWs.emit("open");

    // open 后应向 qwen 发出 session.update
    expect(qwenWs.send).toHaveBeenCalledOnce();
    const sentMsg = JSON.parse(qwenWs.send.mock.calls[0][0]);
    expect(sentMsg.type).toBe("session.update");

    // open 后 client 还不应收到 ready
    expect(clientWs.send).not.toHaveBeenCalled();

    // 触发 session.updated
    qwenWs.emit("message", JSON.stringify({ type: "session.updated" }));

    // 现在 client 收到 ready
    expect(clientWs.send).toHaveBeenCalledOnce();
    expect(JSON.parse(clientWs.send.mock.calls[0][0])).toEqual({ type: "ready" });
  });

  // ─── 2. stop → final text → done ─────────────────────────────────────────

  it("stop 后收到 is_final 文本 → client 依次收到 text 和 done", () => {
    // 完成握手
    qwenWs.emit("open");
    qwenWs.emit("message", JSON.stringify({ type: "session.updated" }));
    clientWs.send.mockClear();
    qwenWs.send.mockClear();

    // client 发 stop
    clientWs.emit("message", JSON.stringify({ type: "stop" }), false);

    // qwen 返回 final 转写
    qwenWs.emit("message", JSON.stringify({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "销售订单",
    }));

    const msgs = clientWs.send.mock.calls.map(([raw]) => JSON.parse(raw));
    const textIdx = msgs.findIndex((m) => m.is_final === true);
    const doneIdx = msgs.findIndex((m) => m.type === "done");

    expect(textIdx).toBeGreaterThanOrEqual(0);
    expect(msgs[textIdx].text).toBe("销售订单");
    expect(doneIdx).toBeGreaterThanOrEqual(0);
    // done 在 text 之后
    expect(doneIdx).toBeGreaterThan(textIdx);
  });

  // ─── 3. stop → STOP_WAIT_MS 超时 → done ──────────────────────────────────

  it("stop 后 4 s 超时仍触发 done（无需 final 回调）", () => {
    qwenWs.emit("open");
    qwenWs.emit("message", JSON.stringify({ type: "session.updated" }));
    clientWs.send.mockClear();

    clientWs.emit("message", JSON.stringify({ type: "stop" }), false);

    // 推进超过 STOP_WAIT_MS (4000 ms)
    vi.advanceTimersByTime(4_001);

    const msgs = clientWs.send.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(msgs.some((m) => m.type === "done")).toBe(true);
  });

  // ─── 4. qwenWs error → client error + cleanup ────────────────────────────

  it("qwenWs error → client 收到中文 error，qwenWs.close 被调用", () => {
    qwenWs.emit("open");

    qwenWs.emit("error", new Error("network error"));

    expect(clientWs.send).toHaveBeenCalled();
    const errMsg = JSON.parse(
      clientWs.send.mock.calls[clientWs.send.mock.calls.length - 1][0],
    );
    expect(errMsg.type).toBe("error");
    expect(typeof errMsg.message).toBe("string");
    expect(errMsg.message.length).toBeGreaterThan(0);

    // cleanup 已执行
    expect(qwenWs.close).toHaveBeenCalledOnce();
  });

  // ─── 5. open 前（session 未就绪）收到二进制帧不崩溃 ──────────────────────

  it("session.updated 前收到二进制帧不抛异常，且不向 qwen 发送", () => {
    // 模拟 qwenWs 仍在 CONNECTING 状态（未 open）
    qwenWs.readyState = 0;

    expect(() => {
      clientWs.emit("message", Buffer.from([0x01, 0x02, 0x03]), true);
    }).not.toThrow();

    // readyState !== OPEN，不应向 qwen 发 append
    expect(qwenWs.send).not.toHaveBeenCalled();
  });
});
