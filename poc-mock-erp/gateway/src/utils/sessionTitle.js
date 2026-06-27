const MAX_LEN = 28;

/** 将首条用户输入总结为会话标题（截断首句/首行，控制长度） */
export function summarizeSessionTitle(content, files = []) {
  const text = String(content || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
  const names = (files || []).map((f) => f.fileName || f.name).filter(Boolean);

  let base = "";
  if (text) {
    const firstLine = text.split("\n")[0].trim();
    const firstSentence = firstLine.split(/[。！？!?；;]/)[0].trim();
    base = firstSentence || firstLine || text;
  } else if (names.length === 1) {
    base = names[0];
  } else if (names.length > 1) {
    base = `${names[0]} 等${names.length}个附件`;
  } else {
    base = "新对话";
  }

  return truncate(base, MAX_LEN);
}

function truncate(str, max) {
  const s = String(str || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
