import { describe, it, expect } from "vitest";
import {
  mergeMarkdownIntroIntoChoice,
  shouldAbsorbMarkdownIntoChoiceHint,
} from "../choiceIntroMerge";

describe("choiceIntroMerge", () => {
  const intro =
    "目前库中有上海煌塑实业发展有限公司、上海塑发塑胶有限公司、上海西塑贸易有限公司、上海华悦塑料制品有限公司，请检查客户名称是否输入错误";

  it("识别叙述性 markdown 引导语", () => {
    expect(shouldAbsorbMarkdownIntoChoiceHint(intro)).toBe(true);
    expect(shouldAbsorbMarkdownIntoChoiceHint("订单创建成功")).toBe(false);
  });

  it("合并 markdown 到 choice hint", () => {
    const merged = mergeMarkdownIntroIntoChoice(
      { type: "markdown", content: intro },
      { type: "choice", label: "客户", hint: "请选择客户", options: [] },
    );
    expect(merged.hint).toBe(intro);
    expect(merged.label).toBe("客户");
  });
});
