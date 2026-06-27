// 一次性验证脚本：用真实接口跑一次流式，抓取 SSE 事件，证明文本是累积增长而非被覆盖。
// 用法: node scripts/stream-check.mjs [flowKey] "[消息]"
const BASE = "http://127.0.0.1:3001";
const flowKey = process.argv[2] || "sales_order";
const message = process.argv[3] || "给上海华塑下500吨万华聚氯乙烯七型，单价6850，下周一交货";

function textLen(blocks) {
  return (blocks || [])
    .filter((b) => b.type === "text" || b.type === "markdown")
    .reduce((n, b) => n + String(b.content || "").length, 0);
}

const sessionRes = await fetch(`${BASE}/api/sessions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ flowKey }),
});
const sessionJson = await sessionRes.json();
const sessionId = sessionJson?.data?.id;
if (!sessionId) {
  console.error("创建会话失败:", JSON.stringify(sessionJson));
  process.exit(1);
}
console.log(`[会话] ${sessionId}  流程=${flowKey}`);
console.log(`[发送] ${message}\n`);

const res = await fetch(`${BASE}/api/sessions/${sessionId}/chat/stream`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: message }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = "";
let blockEvents = 0;
let lastLen = 0;
let monotonic = true;
let lenTimeline = [];
let lastTraces = [];
let finalBlocks = [];
const t0 = Date.now();

function handle(raw) {
  let event = "message";
  const dataLines = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return;
  let data;
  try { data = JSON.parse(dataLines.join("\n")); } catch { return; }

  if (event === "blocks") {
    blockEvents++;
    const len = textLen(data.blocks);
    if (len < lastLen) monotonic = false; // 文本变短 = 被挤掉/覆盖
    lenTimeline.push(len);
    lastLen = len;
    finalBlocks = data.blocks;
  } else if (event === "traces") {
    lastTraces = data.traces || [];
  } else if (event === "done") {
    finalBlocks = data.blocks || finalBlocks;
    lastTraces = data.traces || lastTraces;
    console.log(`[done] 用时 ${((Date.now() - t0) / 1000).toFixed(1)}s  runStatus=${data.runStatus}`);
  } else if (event === "error") {
    console.log(`[error] ${data.message}`);
  }
}

for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  let idx;
  while ((idx = buf.indexOf("\n\n")) >= 0) {
    handle(buf.slice(0, idx));
    buf = buf.slice(idx + 2);
  }
}
if (buf.trim()) handle(buf);

console.log(`\n===== 结果 =====`);
console.log(`blocks 事件数: ${blockEvents}`);
console.log(`文本累计长度时间线(前30个采样): ${lenTimeline.slice(0, 30).join(" → ")}${lenTimeline.length > 30 ? " …" : ""}`);
console.log(`文本长度单调不减(无"后字挤掉前字"): ${monotonic ? "✅ 是" : "❌ 否，出现回退"}`);
console.log(`最终块类型: ${finalBlocks.map((b) => b.type).join(", ")}`);
console.log(`轨迹步数: ${lastTraces.length}`);
const steps = lastTraces.map((t) => {
  const p = t.payload || {};
  if (t.stepType === "reasoning" || t.step_type === "reasoning") return `推理(${String(p.text || "").length}字)`;
  return `${p.blockType || p.type || "node"}@${p.name || t.nodeId || t.node_id || ""}`;
});
console.log(`轨迹步骤: ${steps.join("  |  ")}`);
