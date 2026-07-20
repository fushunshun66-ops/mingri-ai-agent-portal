import { describe, it, expect } from "vitest";
import { buildAsrWsUrl } from "../asrEndpoint";

describe("buildAsrWsUrl", () => {
  it("funasr 引擎 — 默认 base 拼出正确 URL", () => {
    expect(buildAsrWsUrl("funasr")).toBe(
      "ws://127.0.0.1:3001/api/asr/stream?engine=funasr",
    );
  });

  it("qwen 引擎 — 默认 base 拼出正确 URL", () => {
    expect(buildAsrWsUrl("qwen")).toBe(
      "ws://127.0.0.1:3001/api/asr/stream?engine=qwen",
    );
  });

  it("自定义 baseOrigin", () => {
    expect(buildAsrWsUrl("funasr", "ws://192.168.1.10:3001")).toBe(
      "ws://192.168.1.10:3001/api/asr/stream?engine=funasr",
    );
  });

  it("非法 engine 回退 qwen", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildAsrWsUrl("unknown" as any)).toBe(
      "ws://127.0.0.1:3001/api/asr/stream?engine=qwen",
    );
  });

  it("baseOrigin 末尾斜杠被处理", () => {
    expect(buildAsrWsUrl("qwen", "ws://localhost:3001/")).toBe(
      "ws://localhost:3001/api/asr/stream?engine=qwen",
    );
  });
});
