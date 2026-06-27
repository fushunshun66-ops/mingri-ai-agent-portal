import { buildMockResponse, streamMockResponse } from "./mock.js";

/** 解析一段 SSE 文本块（以空行分隔），返回 data 行的 JSON 对象，或 null */
function parseSseBlock(raw) {
  const dataLines = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.replace(/^\uFEFF/, "").trimStart();
    if (trimmed.startsWith("data:")) dataLines.push(trimmed.slice(5).trim());
  }
  if (!dataLines.length) return null;
  const payload = dataLines.join("\n");
  if (!payload || payload === "[DONE]") return { done: true };
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * 迈富时智能体中台适配层
 * 文档：/open/v1/session、/open/v1/chatFlow/run、/open/v1/file/upload
 * 鉴权：Header X-API-TOKEN
 */
export class AgentPlatformAdapter {
  constructor(agentConfig) {
    this.cfg = agentConfig;
  }

  isMock() {
    return this.cfg.mode === "mock" || !this.cfg.token;
  }

  getFlow(flowKey) {
    const flow = this.cfg.flows[flowKey];
    if (!flow) throw new Error(`未知的流程: ${flowKey}`);
    return flow;
  }

  /** versionSn 留空时不传，中台默认使用智能体最新发布版本 */
  _chatFlowPayload({ sessionSn, flow, stream, user }) {
    const payload = { sessionSn, stream, user };
    if (flow.versionSn) payload.versionSn = flow.versionSn;
    return payload;
  }

  _headers(extra = {}) {
    return {
      "X-API-TOKEN": this.cfg.token,
      "Content-Type": "application/json; charset=utf-8",
      ...extra,
    };
  }

  async _fetch(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.requestTimeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`中台返回非 JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      if (!res.ok || json.success === false) {
        throw new Error(json.message || `中台调用失败 (HTTP ${res.status})`);
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 创建中台会话，返回 sessionSn */
  async createSession(flowKey) {
    const flow = this.getFlow(flowKey);
    if (this.isMock()) return `session-mock-${Date.now()}`;
    const url = `${this.cfg.baseUrl}/open/v1/session/${flow.agentSn}`;
    const json = await this._fetch(url, { method: "GET", headers: this._headers() });
    // 文档示例为 data.sessionSn，实际返回 data 直接为 sessionSn 字符串，两者都兼容
    return typeof json?.data === "string" ? json.data : json?.data?.sessionSn;
  }

  /** 运行对话流（非流式），返回中台原始响应 body */
  async runChatFlow({ flowKey, sessionSn, query, extraInput = {} }) {
    const flow = this.getFlow(flowKey);
    if (this.isMock()) return buildMockResponse(flowKey, query, sessionSn);

    const url = `${this.cfg.baseUrl}/open/v1/chatFlow/run/${flow.agentSn}`;
    const user = { [flow.inputKey || "Query"]: query, ...extraInput };
    const payload = this._chatFlowPayload({ sessionSn, flow, stream: false, user });
    return this._fetch(url, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(payload),
    });
  }

  /**
   * 流式运行对话流（stream:true）。逐 SSE 事件回调 onEvent(parsedJson)。
   * 中台事件形如 { event, eventStatus, runId, data:{ id,type,name,currentValue }, nodeId }。
   */
  async runChatFlowStream({ flowKey, sessionSn, query, extraInput = {} }, onEvent) {
    const flow = this.getFlow(flowKey);
    if (this.isMock()) return streamMockResponse(flowKey, query, sessionSn, onEvent);

    const url = `${this.cfg.baseUrl}/open/v1/chatFlow/run/${flow.agentSn}`;
    const user = { [flow.inputKey || "Query"]: query, ...extraInput };
    const payload = this._chatFlowPayload({ sessionSn, flow, stream: true, user });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.requestTimeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this._headers({ Accept: "text/event-stream" }),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(`中台流式调用失败 (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const evt = parseSseBlock(block);
          if (evt) onEvent(evt);
        }
      }
      const tail = parseSseBlock(buf);
      if (tail) onEvent(tail);
    } finally {
      clearTimeout(timer);
    }
  }

  /** 上传文档，返回 { fileSn, fileName, fileType, fileSize } */
  async uploadFile(buffer, filename, mimeType) {
    if (this.isMock()) {
      return { fileSn: `file-mock-${Date.now()}`, fileName: filename, fileType: "mock", fileSize: buffer.length };
    }
    const url = `${this.cfg.baseUrl}/open/v1/file/upload`;
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType || "application/octet-stream" }), filename);
    const json = await this._fetch(url, {
      method: "POST",
      headers: { "X-API-TOKEN": this.cfg.token },
      body: form,
    });
    return json?.data;
  }
}
