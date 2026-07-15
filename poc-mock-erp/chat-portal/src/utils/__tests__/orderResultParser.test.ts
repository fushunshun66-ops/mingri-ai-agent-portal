import { describe, it, expect } from "vitest";
import { tryOrderResultFromObject, tryOrderResultBlock } from "../orderResultParser";

describe("tryOrderResultFromObject (chat-portal)", () => {
  it("success:true + orderCode + message uses message in result", () => {
    const result = tryOrderResultFromObject({
      success: true,
      message: "订单创建成功",
      orderCode: "SO260713000019",
    });
    expect(result).not.toBeNull();
    expect(result!.orderNo).toBe("SO260713000019");
    expect(result!.message).toBe("订单创建成功");
  });

  it("enriches result with grouped fields and warnings", () => {
    const result = tryOrderResultFromObject({
      success: true,
      message: "订单创建成功",
      orderCode: "SO260713000019",
      raw: {
        data: {
          pk_customer_name: "上海华悦塑料制品有限公司",
          taxAmount: 3425000,
          signFailRemark: "E签宝报错",
          so_saleorder_bList: [
            {
              pk_material_name: "商品A",
              num: 1,
              pk_measdoc_name: "吨",
              taxPrice: 100,
              taxAmount: 100,
              pk_stock_name: "仓",
            },
          ],
        },
      },
    });
    expect(result).not.toBeNull();
    expect(result!.fieldGroups?.length).toBeGreaterThan(0);
    // 金额汇总含税金额按元：3425000 → "3,425,000.00"（不是 "34,250.00"）
    const summaryTax = result!.fieldGroups?.flatMap((g) => g.fields).find((f) => f.key === "taxAmount");
    expect(summaryTax?.value).toBe("3,425,000.00");
    expect(result!.warnings?.[0]?.message).toBe("E签宝报错");
    expect(result!.sections?.[0]?.rows?.length).toBe(1);
    // 明细表格按元：taxPrice:100 → "100.00"（不是 "1.00"）
    expect(result!.sections?.[0]?.rows?.[0]?.["含税单价"]).toBe("100.00");
    expect(result!.sections?.[0]?.rows?.[0]?.["含税金额"]).toBe("100.00");
  });

  it("extras use Chinese labels and formatted values", () => {
    const result = tryOrderResultFromObject({
      success: true,
      message: "订单创建成功",
      orderCode: "SO260713000019",
      raw: {
        data: {
          pk_customer_name: "上海华悦",
          taxAmount: 100,
          isExitTax: "N",
          pk_salesman_name: "兰岚",
          pk_sign_ver: "12345",
          stamp: false,
          so_saleorder_bList: [],
        },
      },
    });
    expect(result).not.toBeNull();
    const extras = result!.extras ?? [];
    expect(extras.some((f) => f.key === "isExitTax" && f.label === "是否出口退税" && f.value === "N")).toBe(true);
    expect(extras.some((f) => f.key === "pk_salesman_name" && f.label === "业务员")).toBe(true);
    expect(extras.some((f) => f.key === "pk_sign_ver")).toBe(false);
    expect(extras.some((f) => f.key === "stamp" && f.value === "false")).toBe(true);
  });
});

describe("tryOrderResultBlock (chat-portal)", () => {
  it("concatenated JSON string returns result block", () => {
    const raw =
      '{"success": true, "message": "订单创建成功", "orderCode": "SO260713000019", "raw": {"x": 1}}{"message": "订单创建成功", "orderCode": "SO260713000019"}';
    const result = tryOrderResultBlock(raw);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("result");
    expect(result!.orderNo).toBe("SO260713000019");
    expect(result!.message).toBe("订单创建成功");
  });
});
