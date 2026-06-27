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

export const config = {
  port: Number(process.env.PORT || 3001),
  dbPath: process.env.DB_PATH || path.join(ROOT, "data", "chat.db"),
  agent: loadAgentConfig(),
  flowContent: loadFlowContentConfig(),
  formSchemas: loadFormSchemasConfig(),
};

export const ROOT_DIR = ROOT;
