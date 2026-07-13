import { describe, it, expect } from "vitest";
import { tryOrderResultFromObject, tryOrderResultBlock } from "../orderResultParser.js";

describe("tryOrderResultFromObject", () => {
  it("提取 orderCode 字段（场景③）", () => {
    const result = tryOrderResultFromObject({
      message: "订单创建成功",
      orderCode: "SO260713000015",
    });
    expect(result).not.toBeNull();
    expect(result.type).toBe("result");
    expect(result.orderNo).toBe("SO260713000015");
    expect(result.schemaKey).toBe("sales_order");
  });

  it("提取 orderCode + message 含成功提示 → result", () => {
    const result = tryOrderResultFromObject({
      message: "订单创建成功",
      orderCode: "SO20260713000001",
    });
    expect(result).not.toBeNull();
    expect(result.orderNo).toBe("SO20260713000001");
  });

  it("success:true + orderCode + message uses message in result", () => {
    const result = tryOrderResultFromObject({
      success: true,
      message: "订单创建成功",
      orderCode: "SO260713000019",
    });
    expect(result).not.toBeNull();
    expect(result.orderNo).toBe("SO260713000019");
    expect(result.message).toBe("订单创建成功");
  });

  it("enriches result with fieldGroups from raw.data payload", () => {
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
    expect(result.fieldGroups?.length).toBeGreaterThan(0);
    expect(result.warnings?.[0]?.message).toBe("E签宝报错");
    expect(result.sections?.[0]?.rows?.length).toBe(1);
  });

  it("提取发货单号 SD + orderCode", () => {
    const result = tryOrderResultFromObject({
      message: "发货单已创建",
      orderCode: "SD20260713000001",
    });
    expect(result).not.toBeNull();
    expect(result.orderNo).toBe("SD20260713000001");
    expect(result.schemaKey).toBe("shipment");
  });

  it("回归：原有 订单号 字段仍可识别", () => {
    const result = tryOrderResultFromObject({
      订单号: "SO20260713000002",
      消息: "成功",
    });
    expect(result).not.toBeNull();
    expect(result.orderNo).toBe("SO20260713000002");
  });

  it("回归：原有 orderNo 字段仍可识别", () => {
    const result = tryOrderResultFromObject({
      orderNo: "SO20260713000003",
      status: "完成",
    });
    expect(result).not.toBeNull();
    expect(result.orderNo).toBe("SO20260713000003");
  });

  it("无单号字段 → null", () => {
    const result = tryOrderResultFromObject({ message: "普通消息" });
    expect(result).toBeNull();
  });
});

describe("tryOrderResultBlock", () => {
  it("concatenated JSON string returns result block", () => {
    const raw =
      '{"success": true, "message": "订单创建成功", "orderCode": "SO260713000019", "raw": {"x": 1}}{"message": "订单创建成功", "orderCode": "SO260713000019"}';
    const result = tryOrderResultBlock(raw);
    expect(result).not.toBeNull();
    expect(result.type).toBe("result");
    expect(result.orderNo).toBe("SO260713000019");
    expect(result.message).toBe("订单创建成功");
  });
});
