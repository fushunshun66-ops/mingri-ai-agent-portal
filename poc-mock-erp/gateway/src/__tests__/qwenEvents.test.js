import { describe, it, expect, beforeEach } from "vitest";
import {
  nextEventId,
  buildSessionUpdate,
  buildAppend,
  buildCommit,
  buildFinish,
  translateServerEvent,
} from "../asr/qwenEvents.js";

// ─── nextEventId ────────────────────────────────────────────────────────────

describe("nextEventId", () => {
  it("返回字符串，格式 evt-<number>", () => {
    const id = nextEventId();
    expect(id).toMatch(/^evt-\d+$/);
  });

  it("连续调用单调递增", () => {
    const a = nextEventId();
    const b = nextEventId();
    const numA = parseInt(a.split("-")[1], 10);
    const numB = parseInt(b.split("-")[1], 10);
    expect(numB).toBeGreaterThan(numA);
  });
});

// ─── buildSessionUpdate ──────────────────────────────────────────────────────

describe("buildSessionUpdate", () => {
  it("type 为 session.update，包含 turn_detection: null（Manual 模式）", () => {
    const msg = buildSessionUpdate({ language: "zh", corpusText: "" });
    expect(msg.type).toBe("session.update");
    expect(msg.session.turn_detection).toBeNull();
  });

  it("有 corpusText 时注入 corpus.text", () => {
    const corpusText = "陶氏高压310E 杭州首明";
    const msg = buildSessionUpdate({ language: "zh", corpusText });
    expect(msg.session.input_audio_transcription.corpus.text).toBe(corpusText);
  });

  it("corpusText 为空时不注入 corpus 字段", () => {
    const msg = buildSessionUpdate({ language: "zh", corpusText: "" });
    expect(msg.session.input_audio_transcription.corpus).toBeUndefined();
  });

  it("language 字段正确透传", () => {
    const msg = buildSessionUpdate({ language: "en", corpusText: "" });
    expect(msg.session.input_audio_transcription.language).toBe("en");
  });

  it("event_id 字段存在且为字符串", () => {
    const msg = buildSessionUpdate({ language: "zh", corpusText: "" });
    expect(typeof msg.event_id).toBe("string");
    expect(msg.event_id.length).toBeGreaterThan(0);
  });
});

// ─── buildAppend ────────────────────────────────────────────────────────────

describe("buildAppend", () => {
  it("type 为 input_audio_buffer.append", () => {
    const buf = Buffer.from([0x00, 0x01]);
    const msg = buildAppend(buf);
    expect(msg.type).toBe("input_audio_buffer.append");
  });

  it("audio 字段为 buffer 的 base64 编码", () => {
    const buf = Buffer.from("hello");
    const msg = buildAppend(buf);
    expect(msg.audio).toBe(buf.toString("base64"));
  });

  it("event_id 字段存在", () => {
    const msg = buildAppend(Buffer.alloc(4));
    expect(typeof msg.event_id).toBe("string");
  });
});

// ─── buildCommit ────────────────────────────────────────────────────────────

describe("buildCommit", () => {
  it("type 为 input_audio_buffer.commit", () => {
    expect(buildCommit().type).toBe("input_audio_buffer.commit");
  });
  it("event_id 字段存在", () => {
    expect(typeof buildCommit().event_id).toBe("string");
  });
});

// ─── buildFinish ────────────────────────────────────────────────────────────

describe("buildFinish", () => {
  it("type 为 session.finish", () => {
    expect(buildFinish().type).toBe("session.finish");
  });
  it("event_id 字段存在", () => {
    expect(typeof buildFinish().event_id).toBe("string");
  });
});

// ─── translateServerEvent ────────────────────────────────────────────────────

describe("translateServerEvent", () => {
  // partial 结果
  it("conversation.item.input_audio_transcription.text → partial {text, is_final:false}", () => {
    const raw = {
      type: "conversation.item.input_audio_transcription.text",
      transcript: "销售订",
    };
    const result = translateServerEvent(raw);
    expect(result).toEqual({ text: "销售订", is_final: false });
  });

  it("partial 结果 transcript 缺失时 text 为空字符串", () => {
    const raw = { type: "conversation.item.input_audio_transcription.text" };
    const result = translateServerEvent(raw);
    expect(result).toEqual({ text: "", is_final: false });
  });

  // final 结果
  it("conversation.item.input_audio_transcription.completed → final {text, is_final:true}", () => {
    const raw = {
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "销售订单确认",
    };
    const result = translateServerEvent(raw);
    expect(result).toEqual({ text: "销售订单确认", is_final: true });
  });

  // session.finished → done
  it("session.finished → { type: 'done' }", () => {
    const raw = { type: "session.finished" };
    expect(translateServerEvent(raw)).toEqual({ type: "done" });
  });

  // 错误事件 → 中文友好错误
  it("error 类型事件 → { type:'error', message: 中文 }，不含原始 message", () => {
    const raw = { type: "error", error: { message: "invalid_api_key", code: "401" } };
    const result = translateServerEvent(raw);
    expect(result.type).toBe("error");
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
    // 不泄露 API key 错误原文（不能直接透传 raw error.message）
    expect(result.message).not.toContain("invalid_api_key");
  });

  // 未知事件 → null
  it("未知事件类型 → null", () => {
    expect(translateServerEvent({ type: "session.created" })).toBeNull();
    expect(translateServerEvent({ type: "session.updated" })).toBeNull();
    expect(translateServerEvent({})).toBeNull();
    expect(translateServerEvent(null)).toBeNull();
  });

  // stash 字段兼容
  it("partial 时若含 stash 则拼接到 text", () => {
    const raw = {
      type: "conversation.item.input_audio_transcription.text",
      transcript: "订单",
      stash: "销售",
    };
    const result = translateServerEvent(raw);
    expect(result.text).toBe("订单销售");
    expect(result.is_final).toBe(false);
  });
});
