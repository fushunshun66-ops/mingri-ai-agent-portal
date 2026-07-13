import { describe, it, expect } from "vitest";
import { parseFirstJsonValue, parseLooseJson, looksLikeStructuredDocJson } from "../jsonPayload.js";

describe("parseFirstJsonValue", () => {
  it("parses first object from concatenated JSON string", () => {
    const raw =
      '{"success": true, "message": "订单创建成功", "orderCode": "SO260713000019", "raw": {"x": 1}}{"message": "订单创建成功", "orderCode": "SO260713000019"}';
    const parsed = parseFirstJsonValue(raw);
    expect(parsed).toEqual({
      success: true,
      message: "订单创建成功",
      orderCode: "SO260713000019",
      raw: { x: 1 },
    });
  });

  it("returns undefined for non-JSON text", () => {
    expect(parseFirstJsonValue("hello")).toBeUndefined();
  });
});

describe("parseLooseJson concatenated fallback", () => {
  it("parses first object via parseLooseJson", () => {
    const raw = '{"success": true, "orderCode": "SO260713000019"}{"orderCode": "SO260713000019"}';
    expect(parseLooseJson(raw)).toEqual({ success: true, orderCode: "SO260713000019" });
  });
});

describe("looksLikeStructuredDocJson", () => {
  it("returns false for order result JSON", () => {
    const raw = '{"success": true, "message": "订单创建成功", "orderCode": "SO260713000019"}';
    expect(looksLikeStructuredDocJson(raw)).toBe(false);
  });

  it("returns true for structured doc JSON", () => {
    const raw = '{"order_info": {"客户名称": "测试"}, "items": []}';
    expect(looksLikeStructuredDocJson(raw)).toBe(true);
  });
});
