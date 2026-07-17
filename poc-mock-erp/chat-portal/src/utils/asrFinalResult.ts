/** FunASR 结果是否应写入 finalRef（精修文） */
export function isAsrFinalResult(msg: {
  is_final?: boolean;
  mode?: string;
}): boolean {
  if (msg.is_final) return true;
  return msg.mode === "offline" || msg.mode === "2pass-offline";
}
