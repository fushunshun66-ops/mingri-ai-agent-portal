import { describe, it, expect } from "vitest";
import {
  isInternalFieldKey,
  sanitizeFormFields,
  sanitizeTableColumns,
  isApiErrorForm,
  cleanApiErrorMessage,
  inferErrorSuggestion,
  parseApiErrorFacts,
  pickApiErrorDisplay,
} from "../formDisplay";
import type { FormField } from "../../types/message";

describe("isInternalFieldKey", () => {
  it("hides bare id", () => {
    expect(isInternalFieldKey("id")).toBe(true);
    expect(isInternalFieldKey("ID")).toBe(true);
  });

  it("hides *_id suffix", () => {
    expect(isInternalFieldKey("customer_id")).toBe(true);
    expect(isInternalFieldKey("pk_customer_id")).toBe(true);
  });

  it("hides pk_* prefix", () => {
    expect(isInternalFieldKey("pk_measdoc")).toBe(true);
    expect(isInternalFieldKey("pk_material")).toBe(true);
  });

  it("keeps business-facing keys", () => {
    expect(isInternalFieldKey("customer_name")).toBe(false);
    expect(isInternalFieldKey("商品名称")).toBe(false);
    expect(isInternalFieldKey("数量")).toBe(false);
  });
});

describe("sanitizeFormFields", () => {
  const fields: FormField[] = [
    { key: "customer_name", label: "客户", value: "测试公司" },
    { key: "customer_id", label: "customer_id", value: "123" },
    { key: "id", label: "id", value: "1" },
  ];

  it("filters internal keys", () => {
    const out = sanitizeFormFields(fields);
    expect(out.map((f) => f.key)).toEqual(["customer_name"]);
  });
});

describe("sanitizeTableColumns", () => {
  it("filters internal column names", () => {
    const cols = sanitizeTableColumns(["商品名称", "数量", "id", "pk_measdoc", "单价"]);
    expect(cols).toEqual(["商品名称", "数量", "单价"]);
  });

  it("preserves column order", () => {
    const cols = sanitizeTableColumns(["单价", "商品名称", "数量"]);
    expect(cols).toEqual(["单价", "商品名称", "数量"]);
  });

  it("when rows given, drops columns absent from all rows", () => {
    const cols = sanitizeTableColumns(
      ["商品名称", "数量", "小计"],
      [{ 商品名称: "A", 数量: 1 }],
    );
    expect(cols).toEqual(["商品名称", "数量"]);
  });
});

describe("isApiErrorForm", () => {
  it("detects success=false API error shape", () => {
    const fields: FormField[] = [
      { key: "success", label: "success", value: "false" },
      { key: "error", label: "error", value: "Bad Request" },
      { key: "message", label: "message", value: "客户不存在" },
      { key: "code", label: "code", value: "400" },
      { key: "traceId", label: "traceId", value: "abc-123" },
    ];
    expect(isApiErrorForm(fields)).toBe(true);
  });

  it("returns false for normal forms", () => {
    const fields: FormField[] = [
      { key: "customer_name", label: "客户", value: "测试" },
      { key: "quantity", label: "数量", value: "100" },
    ];
    expect(isApiErrorForm(fields)).toBe(false);
  });

  it("returns false when success is true", () => {
    const fields: FormField[] = [
      { key: "success", label: "success", value: "true" },
      { key: "message", label: "message", value: "ok" },
    ];
    expect(isApiErrorForm(fields)).toBe(false);
  });
});

describe("cleanApiErrorMessage", () => {
  it("strips 详细信息: uuid suffix from message", () => {
    const raw =
      "销售订单保存前填充规则异常。引用类型的属性 [计量单位] 的值 ton 不合法,请检查录入是否正确。详细信息: 9ea02a0b-3a48-4051-bcbe-59c7bcc7a25b";
    const { message, embeddedDetailId } = cleanApiErrorMessage(raw);
    expect(message).not.toContain("9ea02a0b");
    expect(message).toContain("计量单位");
    expect(embeddedDetailId).toBe("9ea02a0b-3a48-4051-bcbe-59c7bcc7a25b");
  });
});

describe("inferErrorSuggestion", () => {
  it("suggests unit fix for 计量单位 errors", () => {
    expect(inferErrorSuggestion("引用类型的属性 [计量单位] 的值 ton 不合法")).toContain("计量单位");
  });
});

describe("parseApiErrorFacts", () => {
  it("parses 计量单位 error into field/cause/suggestion rows", () => {
    const message =
      "销售订单保存前填充规则异常。引用类型的属性 [计量单位] 的值 ton 不合法,请检查录入是否正确。";
    const suggestion = inferErrorSuggestion(message);
    const facts = parseApiErrorFacts(message);

    expect(facts.map((f) => f.label)).toEqual(["问题字段", "错误原因"]);
    expect(facts[0].value).toBe("计量单位");
    expect(facts[1].value).toContain("ton");
    expect(suggestion).toContain("计量单位");
  });
});

describe("pickApiErrorDisplay", () => {
  it("prioritizes message over error for display", () => {
    const fields: FormField[] = [
      { key: "success", label: "success", value: "false" },
      { key: "error", label: "error", value: "Bad Request" },
      { key: "message", label: "message", value: "客户不存在" },
      { key: "code", label: "code", value: "400" },
      { key: "traceId", label: "traceId", value: "abc-123" },
    ];
    const display = pickApiErrorDisplay(fields);
    expect(display.message).toBe("客户不存在");
    expect(display.title).toBeTruthy();
    expect(display.suggestion).toBeTruthy();
    expect(display.detailFields.map((f) => f.key)).toEqual(expect.arrayContaining(["code", "traceId"]));
    expect(display.detailFields.map((f) => f.key)).not.toContain("message");
    expect(display.detailFields.map((f) => f.key)).not.toContain("success");
  });

  it("infers order title and strips embedded uuid from message", () => {
    const fields: FormField[] = [
      { key: "success", label: "success", value: "false" },
      {
        key: "message",
        label: "message",
        value:
          "销售订单保存前填充规则异常。计量单位 ton 不合法。详细信息: 9ea02a0b-3a48-4051-bcbe-59c7bcc7a25b",
      },
      { key: "code", label: "code", value: "999" },
    ];
    const display = pickApiErrorDisplay(fields);
    expect(display.title).toBe("订单保存失败");
    expect(display.message).not.toContain("9ea02a0b");
    expect(display.factFields.length).toBeGreaterThanOrEqual(2);
    expect(display.detailFields.some((f) => f.key === "detailId")).toBe(true);
  });

  it("falls back to error when message missing", () => {
    const fields: FormField[] = [
      { key: "success", label: "success", value: "false" },
      { key: "error", label: "error", value: "Internal Server Error" },
    ];
    const display = pickApiErrorDisplay(fields);
    expect(display.message).toBe("Internal Server Error");
  });
});
