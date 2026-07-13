import type { MessageBlock } from "../types/message";

/** 叙述性引导语：应合并到紧随其后的 choice 卡片 hint，而非单独 markdown 展示 */
const MARKDOWN_INTRO_FOR_CHOICE_RE = /相似|请检查|请选择|请确认|目前库中有|主数据列表/;

export function shouldAbsorbMarkdownIntoChoiceHint(content: string) {
  const text = content.trim();
  return text.length > 0 && MARKDOWN_INTRO_FOR_CHOICE_RE.test(text);
}

export function mergeMarkdownIntroIntoChoice(
  introBlock: MessageBlock & { type: "markdown" },
  choiceBlock: MessageBlock & { type: "choice" },
): MessageBlock & { type: "choice" } {
  return {
    ...choiceBlock,
    hint: introBlock.content.trim(),
  };
}
