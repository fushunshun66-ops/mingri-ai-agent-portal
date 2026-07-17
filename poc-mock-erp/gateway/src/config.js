import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadAgentConfig() {
  const configPath = path.join(ROOT, "config", "agent.json");
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));

  return {
    baseUrl: process.env.AGENT_BASE_URL || raw.baseUrl,
    token: process.env.AGENT_API_TOKEN || raw.token,
    mode: process.env.AGENT_MODE || raw.mode || "live",
    requestTimeoutMs: Number(process.env.AGENT_TIMEOUT_MS || raw.requestTimeoutMs || 120000),
    flows: raw.flows || {},
  };
}

function loadFlowContentConfig() {
  const contentPath = path.join(ROOT, "config", "flowContent.json");
  if (!fs.existsSync(contentPath)) return {};
  return JSON.parse(fs.readFileSync(contentPath, "utf8"));
}

function loadFormSchemasConfig() {
  const schemaPath = path.join(ROOT, "config", "formSchemas.json");
  if (!fs.existsSync(schemaPath)) return {};
  return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
}

/**
 * 加载 ASR 配置：非敏感字段来自 config/asr.json，apiKey 仅来自环境变量。
 * @returns {{
 *   defaultEngine: string,
 *   apiKey: string,
 *   qwen: { model: string, endpoint: string, language: string },
 * }}
 */
export function loadAsrConfig() {
  const asrPath = path.join(ROOT, "config", "asr.json");
  let raw = {};
  if (fs.existsSync(asrPath)) {
    try {
      raw = JSON.parse(fs.readFileSync(asrPath, "utf8"));
    } catch {
      raw = {};
    }
  }
  const qwen = raw.qwen || {};
  return {
    defaultEngine: raw.defaultEngine || "funasr",
    // 密钥绝不从 json 读取，只认环境变量
    apiKey: process.env.DASHSCOPE_API_KEY || "",
    qwen: {
      model: qwen.model || "qwen3-asr-flash-realtime",
      endpoint: qwen.endpoint || "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
      language: qwen.language || "zh",
    },
  };
}

export const config = {
  port: Number(process.env.PORT || 3001),
  dbPath: process.env.DB_PATH || path.join(ROOT, "data", "chat.db"),
  agent: loadAgentConfig(),
  flowContent: loadFlowContentConfig(),
  formSchemas: loadFormSchemasConfig(),
  asr: loadAsrConfig(),
};

export const ROOT_DIR = ROOT;
