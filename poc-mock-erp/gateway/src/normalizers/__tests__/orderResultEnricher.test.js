import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractOrderPayload,
  enrichOrderResultBlock,
  setResultFieldProfiles,
} from "../orderResultEnricher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const samplePayload = {
  success: true,
  message: "订单创建成功",
  orderCode: "SO260713000019",
  raw: {
    data: {
      code: "SO260713000019",
      orderDate: "2026-07-08 00:00:00",
      pk_org_name: "明日绿链（惠州）包装有限公司",
      pk_customer_name: "上海华悦塑料制品有限公司",
      taxAmount: 3425000,
      signFailRemark: "E签宝报错：签章企业账户授权状态【进行中】",
      so_saleorder_bList: [
        {
          pk_material_name: "万华聚氯乙烯七型",
          num: 500,
          pk_measdoc_name: "吨",
          taxPrice: 6850,
          taxAmount: 3425000,
          pk_stock_name: "明日绿链原料库_惠州项目",
        },
      ],
    },
  },
};

describe("extractOrderPayload", () => {
  it("merges raw.data when present", () => {
    const payload = extractOrderPayload(samplePayload);
    expect(payload.code).toBe("SO260713000019");
    expect(payload.pk_customer_name).toBe("上海华悦塑料制品有限公司");
  });

  it("returns empty object for invalid input", () => {
    expect(extractOrderPayload(null)).toEqual({});
    expect(extractOrderPayload([])).toEqual({});
  });
});

describe("enrichOrderResultBlock", () => {
  beforeAll(() => {
    const profiles = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../../config/resultFieldProfiles.json"), "utf8"),
    );
    setResultFieldProfiles(profiles);
  });

  it("builds grouped fields, line sections, warnings from sample payload", () => {
    const base = {
      type: "result",
      schemaKey: "sales_order",
      orderNo: "SO260713000019",
      status: "completed",
      title: "销售订单已生成",
      message: "订单创建成功",
    };
    const enriched = enrichOrderResultBlock(base, samplePayload);

    expect(enriched.orderNo).toBe("SO260713000019");
    expect(enriched.fieldGroups?.length).toBeGreaterThan(0);

    const customerField = enriched.fieldGroups?.flatMap((g) => g.fields).find((f) => f.key === "pk_customer_name");
    expect(customerField?.value).toBe("上海华悦塑料制品有限公司");

    // 金额汇总与明细均按「元」展示，禁止 ÷100
    const amountField = enriched.fieldGroups?.flatMap((g) => g.fields).find((f) => f.key === "taxAmount");
    expect(amountField?.value).toBe("3,425,000.00");

    expect(enriched.sections?.[0]?.title).toBe("商品明细");
    expect(enriched.sections?.[0]?.rows?.[0]?.["商品名称"]).toBe("万华聚氯乙烯七型");
    expect(enriched.sections?.[0]?.rows?.[0]?.["含税单价"]).toBe("6,850.00");
    expect(enriched.sections?.[0]?.rows?.[0]?.["含税金额"]).toBe("3,425,000.00");
    expect(amountField?.value).toBe(enriched.sections?.[0]?.rows?.[0]?.["含税金额"]);

    expect(enriched.warnings?.[0]?.message).toContain("E签宝报错");
    expect(enriched.warnings?.[0]?.tone).toBe("error");
  });

  it("formats summary and line-item currency as yuan (no /100)", () => {
    const base = {
      type: "result",
      schemaKey: "sales_order",
      orderNo: "SO260713000021",
      status: "completed",
      title: "销售订单已生成",
      message: "订单创建成功",
    };
    const enriched = enrichOrderResultBlock(base, {
      code: "SO260713000021",
      taxAmount: 50000,
      so_saleorder_bList: [
        {
          pk_material_name: "商品B",
          num: 500,
          pk_measdoc_name: "吨",
          taxPrice: 100,
          taxAmount: 50000,
          pk_stock_name: "仓",
        },
      ],
    });

    const summaryTax = enriched.fieldGroups?.flatMap((g) => g.fields).find((f) => f.key === "taxAmount");
    expect(summaryTax?.value).toBe("50,000.00");

    const row = enriched.sections?.[0]?.rows?.[0];
    expect(row?.["含税单价"]).toBe("100.00");
    expect(row?.["含税金额"]).toBe("50,000.00");
    expect(summaryTax?.value).toBe(row?.["含税金额"]);
  });

  it("maps verifystate 0 to 待审核", () => {
    const base = {
      type: "result",
      schemaKey: "sales_order",
      orderNo: "SO260713000020",
      status: "completed",
      title: "销售订单已生成",
      message: "ok",
    };
    const enriched = enrichOrderResultBlock(base, { verifystate: 0, code: "SO260713000020" });
    const stateField = enriched.fieldGroups?.flatMap((g) => g.fields).find((f) => f.key === "verifystate");
    expect(stateField?.value).toBe("待审核");
  });

  it("returns base result when payload empty", () => {
    const base = {
      type: "result",
      schemaKey: "sales_order",
      orderNo: "SO1",
      status: "completed",
      title: "t",
      message: "m",
    };
    expect(enrichOrderResultBlock(base, { orderCode: "SO1" })).toEqual(base);
  });
});
