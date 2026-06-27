/** 与 chat-portal sessionReset 规则一致 */

const RESET_ACK_RE =
  /^(好的|好哒|好啊|好呀|好|完成|完成了|完结|结束|知道了|明白|收到|可以|嗯嗯|嗯|行|ok|okay|thanks|thankyou|谢谢|多谢|没问题|继续)[。.!！？?~,\s]*$/i;

export function isSessionResetAck(text) {
  const normalized = String(text || "")
    .trim()
    .replace(/\s+/g, "");
  if (!normalized || normalized.length > 16) return false;
  return RESET_ACK_RE.test(normalized);
}

export const SESSION_RESET_ASSISTANT_TEXT =
  "好的，已清空当前办理上下文。请直接描述下一单需求，或点击上方快捷输入。";
