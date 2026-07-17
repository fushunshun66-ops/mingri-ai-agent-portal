/**
 * Stop 之后是否可以 finish（发 done + 关连接）。
 * 只认 FunASR offline / 2pass-offline 精修结果，避免 2pass 下 online 中间结果提前掐断。
 * 空 text 不 finish（超时由 STOP_WAIT_MS 兜底）。
 */
export function shouldFinishAfterStop(msg) {
  if (!msg?.text || !String(msg.text).trim()) return false;
  const mode = msg.mode;
  return mode === "offline" || mode === "2pass-offline";
}
