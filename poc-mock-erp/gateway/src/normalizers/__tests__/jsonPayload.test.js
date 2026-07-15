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

describe("parsePythonLiteral — Python dict 字符串安全解析", () => {
  it("基本单引号 dict → 对象", () => {
    const raw = "{'customer_name': '浙江日出精细化工有限公司', 'delivery_date': '2026-07-15'}";
    const result = parseLooseJson(raw);
    expect(result).toEqual({ customer_name: '浙江日出精细化工有限公司', delivery_date: '2026-07-15' });
  });

  it("包含嵌套 list → 嵌套对象", () => {
    const raw = "{'customer_name': '测试客户', 'product_details': [{'name': '产品A', 'quantity': 2, 'unit_price': 100.0}]}";
    const result = parseLooseJson(raw);
    expect(result).toEqual({
      customer_name: '测试客户',
      product_details: [{ name: '产品A', quantity: 2, unit_price: 100.0 }],
    });
  });

  it("Python None/True/False 关键字 → null/true/false", () => {
    const raw = "{'success': True, 'error': None, 'flag': False}";
    const result = parseLooseJson(raw);
    expect(result).toEqual({ success: true, error: null, flag: false });
  });

  it("100.0 浮点数", () => {
    const raw = "{'price': 100.0, 'qty': 500}";
    const result = parseLooseJson(raw);
    expect(result).toEqual({ price: 100.0, qty: 500 });
  });

  it("下划线键名 + 中文值", () => {
    const raw = "{'customer_name': '中文测试公司', 'order_no': 'SO-001'}";
    const result = parseLooseJson(raw);
    expect(result).toEqual({ customer_name: '中文测试公司', order_no: 'SO-001' });
  });

  it("完整销售订单 Python dict 字符串", () => {
    const raw = "{'customer_name': '浙江日出精细化工有限公司', 'delivery_date': '2026-07-15', 'remarks': '', 'product_details': [{'name': '中沙嵌段共聚31T副牌', 'quantity': '500', 'unit_price': 800, 'pk_measdoc_name': '吨'}]}";
    const result = parseLooseJson(raw);
    expect(result).toBeTruthy();
    expect(result.customer_name).toBe('浙江日出精细化工有限公司');
    expect(Array.isArray(result.product_details)).toBe(true);
    expect(result.product_details[0].unit_price).toBe(800);
  });

  it("值中含双引号时不破坏结构", () => {
    const raw = `{'key': 'value with "quotes" inside'}`;
    const result = parseLooseJson(raw);
    expect(result).toEqual({ key: 'value with "quotes" inside' });
  });

  it("普通 JSON 双引号字符串不受影响（回归）", () => {
    const raw = '{"success": true, "orderCode": "SO001"}';
    const result = parseLooseJson(raw);
    expect(result).toEqual({ success: true, orderCode: 'SO001' });
  });

  it("远航验收样本：嵌套 list、100.0、中文、下划线键", () => {
    const raw =
      "{'customer_name': '杭州首明科技有限公司', 'customer_id': '0axMEMdwdG7L7hZQG17K', 'product_details': [{'name': '陶氏高压310E', 'id': '1001A6100000002HUXU7', 'quantity': 500, 'unit_price': 100.0, 'pk_measdoc_name': '吨', 'pk_measdoc': '2382029309236992'}]}";
    const result = parseLooseJson(raw);
    expect(result).toEqual({
      customer_name: "杭州首明科技有限公司",
      customer_id: "0axMEMdwdG7L7hZQG17K",
      product_details: [
        {
          name: "陶氏高压310E",
          id: "1001A6100000002HUXU7",
          quantity: 500,
          unit_price: 100.0,
          pk_measdoc_name: "吨",
          pk_measdoc: "2382029309236992",
        },
      ],
    });
  });

  it("非法/非结构字符串 → undefined（不抛异常）", () => {
    expect(parseLooseJson("普通消息")).toBeUndefined();
    expect(parseLooseJson("{'broken': ")).toBeUndefined();
  });
});
