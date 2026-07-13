import { describe, it, expect } from "vitest";
import { parseChoiceBlocksFromText } from "../choiceParser";

const CASES = [
  {
    name: "screenshot-03-22",
    content:
      "目前库中有上海煌塑实业发展有限公司、上海塑发塑胶有限公司、上海西塑贸易有限公司、上海华悦塑料制品有限公司，其中与“上海华塑”高度相似的客户名称可能为：上海煌塑实业发展有限公司、上海华悦塑料制品有限公司，请检查客户名称是否输入错误",
  },
  {
    name: "latest-03-41",
    content:
      "目前库中有上海华悦塑料制品有限公司，可能与您输入的“上海华塑”相似，请检查客户名称是否输入错误",
  },
];

describe("debug exact db content", () => {
  for (const c of CASES) {
    it(`parses ${c.name}`, () => {
      const parsed = parseChoiceBlocksFromText(c.content, "sales_order");
      expect(parsed?.blocks?.[0]?.options?.length ?? 0).toBeGreaterThan(0);
      for (const opt of parsed?.blocks?.[0]?.options ?? []) {
        expect(opt.label).not.toMatch(/目前库中有/);
      }
    });
  }
});
