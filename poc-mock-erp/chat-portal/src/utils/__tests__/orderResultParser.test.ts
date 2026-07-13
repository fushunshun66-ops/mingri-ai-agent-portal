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
    expect(result!.warnings?.[0]?.message).toBe("E签宝报错");
    expect(result!.sections?.[0]?.rows?.length).toBe(1);
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
