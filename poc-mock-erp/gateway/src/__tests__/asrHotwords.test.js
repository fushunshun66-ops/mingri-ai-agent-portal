import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadHotwords, buildHandshakePayload } from "../asrHotwords.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "../../config/asrHotwords.json");
const FIXTURES = path.join(__dirname, "fixtures");

describe("loadHotwords", () => {
  it("loads hotword dict from asrHotwords.json", () => {
    const dict = loadHotwords(CONFIG_PATH);
    expect(dict["杭州首明"]).toBe(40);
    expect(dict["杭州首明科技有限公司"]).toBe(45);
    expect(dict["陶氏"]).toBe(35);
    expect(dict["陶氏高压310E"]).toBe(50);
    expect(dict["高压310E"]).toBe(40);
    expect(dict["310E"]).toBe(35);
    expect(dict["上海华塑"]).toBe(40);
    expect(dict["万华"]).toBe(35);
    expect(dict["万华聚氯乙烯七型"]).toBe(45);
    expect(dict["聚氯乙烯"]).toBe(30);
    expect(dict["埃克森美公司"]).toBe(40);
    expect(dict["聚丙烯"]).toBe(30);
    expect(dict["销售订单"]).toBe(25);
  });

  it("returns empty object when file is missing", () => {
    expect(loadHotwords(path.join(FIXTURES, "no-such-hotwords.json"))).toEqual({});
  });

  it("returns empty object when JSON is invalid", () => {
    const badPath = path.join(FIXTURES, "invalid-hotwords.json");
    fs.mkdirSync(FIXTURES, { recursive: true });
    fs.writeFileSync(badPath, "{not-json", "utf8");
    expect(loadHotwords(badPath)).toEqual({});
  });

  it("returns empty object when root is not a plain object", () => {
    const arrPath = path.join(FIXTURES, "array-hotwords.json");
    fs.mkdirSync(FIXTURES, { recursive: true });
    fs.writeFileSync(arrPath, '["杭州首明"]', "utf8");
    expect(loadHotwords(arrPath)).toEqual({});
  });
});

describe("buildHandshakePayload", () => {
  it("keeps FunASR 2pass fields and sets hotwords as stringified JSON dict", () => {
    const dict = { 杭州首明: 40, 销售订单: 25 };
    const payload = buildHandshakePayload(dict);

    expect(payload.mode).toBe("2pass");
    expect(payload.chunk_size).toEqual([5, 10, 5]);
    expect(payload.chunk_interval).toBe(10);
    expect(payload.wav_name).toBe("stream");
    expect(payload.wav_format).toBe("pcm");
    expect(payload.is_speaking).toBe(true);
    expect(payload.audio_fs).toBe(16000);

    expect(typeof payload.hotwords).toBe("string");
    expect(JSON.parse(payload.hotwords)).toEqual(dict);
  });

  it("omits hotwords when dict is empty", () => {
    const payload = buildHandshakePayload({});
    expect(payload.mode).toBe("2pass");
    expect(payload.hotwords).toBeUndefined();
  });

  it("omits hotwords when dict is null/undefined", () => {
    expect(buildHandshakePayload(null).hotwords).toBeUndefined();
    expect(buildHandshakePayload(undefined).hotwords).toBeUndefined();
  });
});
