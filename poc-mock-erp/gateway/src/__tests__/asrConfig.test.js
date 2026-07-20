import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAsrConfig } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASR_JSON = path.join(__dirname, "../../config/asr.json");

describe("loadAsrConfig", () => {
  const prevKey = process.env.DASHSCOPE_API_KEY;

  afterEach(() => {
    if (prevKey === undefined) delete process.env.DASHSCOPE_API_KEY;
    else process.env.DASHSCOPE_API_KEY = prevKey;
  });

  it("从 asr.json 加载 defaultEngine / qwen 非敏感字段", () => {
    delete process.env.DASHSCOPE_API_KEY;
    const cfg = loadAsrConfig();
    expect(cfg.defaultEngine).toBe("qwen");
    expect(cfg.qwen.model).toBe("qwen3-asr-flash-realtime");
    expect(cfg.qwen.endpoint).toContain("dashscope.aliyuncs.com");
    expect(cfg.qwen.language).toBe("zh");
  });

  it("apiKey 只从 DASHSCOPE_API_KEY 环境变量读取", () => {
    process.env.DASHSCOPE_API_KEY = "sk-from-env";
    const cfg = loadAsrConfig();
    expect(cfg.apiKey).toBe("sk-from-env");
  });

  it("asr.json 中不含 apiKey 字段（密钥不落盘）", () => {
    const raw = JSON.parse(fs.readFileSync(ASR_JSON, "utf8"));
    expect(raw.apiKey).toBeUndefined();
    expect(raw.qwen?.apiKey).toBeUndefined();
  });

  it("未设置环境变量时 apiKey 为空字符串", () => {
    delete process.env.DASHSCOPE_API_KEY;
    const cfg = loadAsrConfig();
    expect(cfg.apiKey).toBe("");
  });
});
