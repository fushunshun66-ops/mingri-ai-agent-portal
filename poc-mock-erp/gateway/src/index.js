import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { Repository } from "./db/repository.js";
import { AgentPlatformAdapter } from "./adapters/agentPlatform.js";
import { normalizeChatFlowResponse, normalizeOutputItem, errorBlocks, setFormSchemas } from "./normalizers/index.js";
import { summarizeSessionTitle } from "./utils/sessionTitle.js";
import { detectIntent, CONFIDENCE_THRESHOLD } from "./utils/intentRouter.js";
import { SESSION_RESET_ASSISTANT_TEXT } from "./utils/sessionReset.js";
import { WebSocketServer } from "ws";
import { createAsrProxy } from "./asr-proxy.js";

setFormSchemas(config.formSchemas);

const app = express();
const repo = new Repository(config.dbPath);
const adapter = new AgentPlatformAdapter(config.agent);

app.use(cors());
app.use(express.json({ limit: "8mb" }));

function ok(res, data, message = "OK") {
  res.json({ success: true, data, message });
}
function fail(res, message, status = 400) {
  res.status(status).json({ success: false, data: null, message });
}

app.get("/api/health", (_req, res) => {
  ok(res, { status: "ok", mode: adapter.isMock() ? "mock" : "live", flows: Object.keys(config.agent.flows) });
});

// 可用流程（智能体）列表，含空会话页展示内容
app.get("/api/flows", (_req, res) => {
  const flows = Object.entries(config.agent.flows).map(([key, value]) => {
    const content = config.flowContent[key] || {};
    return {
      flowKey: key,
      name: value.name,
      description: value.description,
      placeholder: value.placeholder,
      acceptsFile: Boolean(value.acceptsFile),
      highlights: content.highlights || [],
      examples: content.examples || [],
    };
  });
  ok(res, flows);
});

// 本地规则意图识别
app.post("/api/intent/detect", (req, res) => {
  const { content, files } = req.body || {};
  const result = detectIntent(content, files);
  ok(res, { ...result, threshold: CONFIDENCE_THRESHOLD });
});

// 会话列表
app.get("/api/sessions", (_req, res) => {
  ok(res, repo.listSessions());
});

// 新建会话：内部调用中台创建 sessionSn
app.post("/api/sessions", async (req, res) => {
  const { flowKey, title, userId } = req.body || {};
  if (!flowKey || !config.agent.flows[flowKey]) return fail(res, "缺少或非法的 flowKey");
  const flow = config.agent.flows[flowKey];
  try {
    const externalSessionSn = await adapter.createSession(flowKey);
    const session = repo.createSession({
      title: title || "新对话",
      userId: userId || "demo-user",
      flowKey,
      agentSn: flow.agentSn,
      versionSn: flow.versionSn,
      externalSessionSn,
    });
    ok(res, session, "会话创建成功");
  } catch (err) {
    fail(res, `创建会话失败：${err.message}`, 502);
  }
});

// 历史消息
app.get("/api/sessions/:id/messages", (req, res) => {
  const session = repo.getSession(req.params.id);
  if (!session) return fail(res, "会话不存在", 404);
  ok(res, repo.listMessages(req.params.id));
});

// 重置中台会话记忆（轮换 external_session_sn），用于「好的/完成」后连续办理下一单
app.post("/api/sessions/:id/reset", async (req, res) => {
  const session = repo.getSession(req.params.id);
  if (!session) return fail(res, "会话不存在", 404);
  const { ackContent } = req.body || {};
  try {
    const externalSessionSn = await adapter.createSession(session.flow_key);
    const updated = repo.touchSession(session.id, { external_session_sn: externalSessionSn });

    if (typeof ackContent === "string" && ackContent.trim()) {
      repo.addMessage({
        sessionId: session.id,
        role: "user",
        blocks: [{ type: "text", content: ackContent.trim() }],
      });
    }
    repo.addMessage({
      sessionId: session.id,
      role: "assistant",
      blocks: [{ type: "markdown", content: SESSION_RESET_ASSISTANT_TEXT }],
    });

    ok(res, { session: updated, messages: repo.listMessages(session.id) }, "会话记忆已重置");
  } catch (err) {
    fail(res, `重置会话失败：${err.message}`, 502);
  }
});

// Trace 列表
app.get("/api/sessions/:id/traces", (req, res) => {
  const session = repo.getSession(req.params.id);
  if (!session) return fail(res, "会话不存在", 404);
  ok(res, repo.listTraces(req.params.id));
});

// 文件上传：透传中台接口，返回 fileSn 供对话引用
// 请求体：{ filename, mimeType, dataBase64 }（base64 避免引入 multipart 依赖）
app.post("/api/sessions/:id/files", async (req, res) => {
  const session = repo.getSession(req.params.id);
  if (!session) return fail(res, "会话不存在", 404);
  const { filename, mimeType, dataBase64 } = req.body || {};
  if (!filename || !dataBase64) return fail(res, "缺少 filename 或 dataBase64");
  try {
    const buffer = Buffer.from(dataBase64, "base64");
    const meta = await adapter.uploadFile(buffer, filename, mimeType);
    ok(res, meta, "上传成功");
  } catch (err) {
    fail(res, `文件上传失败：${err.message}`, 502);
  }
});

// 把上传后的文件按类型分配到中台对话入参（DOC→fileInputKey，IMAGE→imageInputKey）
function buildFileInput(flow, files) {
  const extra = {};
  if (!Array.isArray(files) || !files.length) return extra;
  const docs = [];
  const images = [];
  for (const f of files) {
    const ref = { fileName: f.fileName || f.name, fileSn: f.fileSn };
    const isImage = (f.mime || f.fileType || "").startsWith("image") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(ref.fileName || "");
    if (isImage && flow.imageInputKey) images.push(ref);
    else docs.push(ref);
  }
  if (docs.length && flow.fileInputKey) extra[flow.fileInputKey] = docs;
  if (images.length && flow.imageInputKey) extra[flow.imageInputKey] = images;
  return extra;
}

function userFileBlocks(files) {
  return (files || []).map((f) => ({
    type: "file",
    name: f.fileName || f.name || "文件",
    fileSn: f.fileSn || null,
    url: f.url || null,
    mime: f.mime || f.fileType || null,
  }));
}

/** 首条用户消息后，按对话内容总结并重命名会话（需在用户消息入库后调用） */
function renameSessionIfFirst(session, content, files) {
  if (repo.countUserMessages(session.id) !== 1) return session;
  const title = summarizeSessionTitle(content, files);
  return repo.touchSession(session.id, { title });
}

// 发送消息：代理中台 + 入库
app.post("/api/sessions/:id/chat", async (req, res) => {
  const session = repo.getSession(req.params.id);
  if (!session) return fail(res, "会话不存在", 404);
  const { content, extraInput, files } = req.body || {};
  const hasFiles = Array.isArray(files) && files.length > 0;
  if ((!content || !String(content).trim()) && !hasFiles) return fail(res, "消息内容不能为空");

  const flow = config.agent.flows[session.flow_key] || {};

  // 用户消息入库（文本 + 附件块）
  const userBlocks = [];
  if (content && String(content).trim()) userBlocks.push({ type: "text", content });
  userBlocks.push(...userFileBlocks(files));
  repo.addMessage({
    sessionId: session.id,
    role: "user",
    blocks: userBlocks,
  });
  const sessionAfterRename = renameSessionIfFirst(session, content, files);

  try {
    const fileInput = buildFileInput(flow, files);
    const body = await adapter.runChatFlow({
      flowKey: session.flow_key,
      sessionSn: session.external_session_sn,
      query: content || "",
      extraInput: { ...fileInput, ...(extraInput || {}) },
    });
    const { blocks, traces, runId, runStatus } = normalizeChatFlowResponse(body, session.flow_key);

    const message = repo.addMessage({
      sessionId: session.id,
      role: "assistant",
      blocks,
      runId,
      runStatus,
      rawResponse: body,
    });
    repo.addTraces(session.id, message.id, traces);

    ok(res, { message, traceCount: traces.length, sessionTitle: sessionAfterRename.title });
  } catch (err) {
    const { blocks, traces, runStatus } = errorBlocks(err.message);
    const message = repo.addMessage({
      sessionId: session.id,
      role: "assistant",
      blocks,
      runStatus,
    });
    repo.addTraces(session.id, message.id, traces);
    fail(res, err.message, 502);
  }
});

// 流式发送消息（SSE）：实时转发中台逐节点输出，结束后整体入库
app.post("/api/sessions/:id/chat/stream", async (req, res) => {
  const session = repo.getSession(req.params.id);
  if (!session) return fail(res, "会话不存在", 404);
  const { content, files } = req.body || {};
  const hasFiles = Array.isArray(files) && files.length > 0;
  if ((!content || !String(content).trim()) && !hasFiles) return fail(res, "消息内容不能为空");

  const flow = config.agent.flows[session.flow_key] || {};

  const userBlocks = [];
  if (content && String(content).trim()) userBlocks.push({ type: "text", content });
  userBlocks.push(...userFileBlocks(files));
  repo.addMessage({ sessionId: session.id, role: "user", blocks: userBlocks });
  const sessionAfterRename = renameSessionIfFirst(session, content, files);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (sessionAfterRename.title !== session.title) {
    send("session", { id: sessionAfterRename.id, title: sessionAfterRename.title });
  }

  // 按节点维护累计状态
  const nodeState = new Map(); // key -> { name, type, accum, blocks, reasoning }
  const ordered = [];
  let runId = null;
  let runStatus = "SUCCESS";

  function rebuild() {
    const blocks = [];
    const traces = [];
    let idx = 0;
    for (const key of ordered) {
      const st = nodeState.get(key);
      for (const r of st.reasoning) {
        traces.push({ stepIndex: idx++, stepType: "reasoning", nodeId: key, payload: { name: st.name, text: r } });
      }
      for (const b of st.blocks) {
        blocks.push(b);
        traces.push({ stepIndex: idx++, stepType: "node_output", nodeId: key, payload: { name: st.name, type: st.type, blockType: b.type } });
      }
    }
    return { blocks, traces };
  }

  try {
    const fileInput = buildFileInput(flow, files);
    await adapter.runChatFlowStream(
      {
        flowKey: session.flow_key,
        sessionSn: session.external_session_sn,
        query: content || "",
        extraInput: fileInput,
      },
      (evt) => {
        if (!evt || evt.done) return;
        if (evt.runId != null) runId = String(evt.runId);
        const d = evt.data;
        const evtName = String(evt.event || "");
        if (/fail|error/i.test(evtName) || /fail|error/i.test(String(d?.status || ""))) runStatus = "FAIL";
        if (!d || (d.currentValue === undefined && d.id === undefined)) return;

        const key = d.id || `node-${ordered.length}`;
        if (!nodeState.has(key)) {
          nodeState.set(key, { name: d.name, type: d.type, accum: undefined, blocks: [], reasoning: [] });
          ordered.push(key);
        }
        const st = nodeState.get(key);
        if (d.name != null) st.name = d.name;
        if (d.type != null) st.type = d.type;

        let value = d.currentValue;
        if (typeof value === "string") {
          const prev = st.accum || "";
          // 兼容两种下发：累计值(startsWith prev) 直接用；增量片段则追加
          st.accum = value.startsWith(prev) ? value : prev + value;
          value = st.accum;
        }

        const { blocks, reasoning } = normalizeOutputItem(
          { id: key, name: st.name, type: st.type, currentValue: value },
          session.flow_key,
        );
        st.blocks = blocks;
        st.reasoning = reasoning;

        const snap = rebuild();
        send("blocks", { blocks: snap.blocks });
        send("traces", { traces: snap.traces });
      },
    );

    const final = rebuild();
    const finalBlocks = final.blocks.length ? final.blocks : [{ type: "text", content: "（无输出）" }];
    const message = repo.addMessage({ sessionId: session.id, role: "assistant", blocks: finalBlocks, runId, runStatus });
    repo.addTraces(session.id, message.id, final.traces);
    send("done", {
      messageId: message.id,
      runId,
      runStatus,
      blocks: finalBlocks,
      traces: final.traces,
      sessionTitle: sessionAfterRename.title,
    });
    res.end();
  } catch (err) {
    const { blocks } = errorBlocks(err.message);
    const message = repo.addMessage({ sessionId: session.id, role: "assistant", blocks, runStatus: "FAIL" });
    repo.addTraces(session.id, message.id, [{ stepIndex: 0, stepType: "error", payload: { message: err.message } }]);
    send("error", { message: err.message, messageId: message.id, blocks });
    res.end();
  }
});

const server = app.listen(config.port, () => {
  console.log(`[gateway] 对话网关已启动: http://127.0.0.1:${config.port}`);
  console.log(`[gateway] 模式: ${adapter.isMock() ? "mock" : "live"} | 中台: ${config.agent.baseUrl}`);
  console.log(`[gateway] 可用流程: ${Object.keys(config.agent.flows).join(", ")}`);
});

const wss = new WebSocketServer({ server, path: "/api/asr/stream" });
wss.on("connection", (ws) => createAsrProxy(ws, { wsUrl: "ws://127.0.0.1:10095" }));
