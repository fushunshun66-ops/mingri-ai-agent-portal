/** 去掉文本开头的中文/英文冒号与空白 */
export function stripLeadingColon(text: string) {
  return String(text).replace(/^[\s：:]+/, "").trim();
}

export function normalizeChoiceText(text: string) {
  return stripLeadingColon(text);
}
