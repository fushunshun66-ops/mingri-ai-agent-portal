import { describe, it, expect, beforeAll } from "vitest";
import { matchSchemaKeyDeep, partitionStructuredTree } from "../partitioner.js";
import { setFormSchemas } from "../index.js";

const formSchemas = {
  sales_order: {
    matchKeys: ["客户名称", "商品名称", "商品列表", "数量", "customer_name", "product_details", "quantity", "unit_price"],
    deepMatch: true,
    fieldOrder: ["客户名称", "商品名称", "数量", "单价", "总金额", "交付日期"],
    labels: { "客户名称": "客户", "交付日期": "交期", "customer_name": "客户" },
    widgets: { "交付日期": "date", "数量": "number", "单价": "currency", "总金额": "currency" },
    unwrapPaths: ["订单信息", "金额信息", "基本信息"],
    listSections: [
      {
        keys: ["商品列表", "产品列表", "订单明细", "items", "product_details"],
        title: "商品明细",
        columnOrder: ["商品名称", "数量", "单位", "单价", "小计金额"],
        fieldMap: { "name": "商品名称", "quantity": "数量", "unit_price": "单价", "pk_measdoc_name": "单位" },
      },
    ],
    actions: [{ id: "confirm", label: "确认无误", message: "确认无误，请提交订单" }],
  },
  generic: {
    title: "结构化表单",
    matchKeys: [],
    deepMatch: true,
    fieldOrder: [],
    labels: {},
    widgets: {},
    unwrapPaths: [],
    listSections: [],
    actions: [{ id: "confirm", label: "确认", message: "确认无误" }],
  },
};

describe("partitionStructuredTree with English keys", () => {
  beforeAll(() => {
    setFormSchemas(formSchemas);
  });

  it("场景②：英文键正确表单匹配为 sales_order", () => {
    const { schemaKey, headerScalars, listSections } = partitionStructuredTree({
      customer_name: "浙江日出精细化工有限公司",
      product_details: [
        { name: "中沙嵌段共聚31T副牌", quantity: "500", unit_price: 800, pk_measdoc_name: "吨" },
      ],
    });
    expect(schemaKey).toBe("sales_order");
    expect(headerScalars.customer_name).toBe("浙江日出精细化工有限公司");
    expect(listSections).toHaveLength(1);
    expect(listSections[0].title).toBe("商品明细");
  });

  it("场景②：product_details 表头映射正确（name→商品名称）", () => {
    const { listSections } = partitionStructuredTree({
      customer_name: "测试客户",
      product_details: [
        { name: "产品A", quantity: "100", unit_price: 50, pk_measdoc_name: "吨" },
      ],
    });
    const row = listSections[0].rows[0];
    expect(row["商品名称"]).toBe("产品A");
    expect(row["数量"]).toBe("100");
    expect(row["单价"]).toBe(50);
    expect(row["单位"]).toBe("吨");
  });

  it("回归：中文键仍正确匹配 sales_order", () => {
    const { schemaKey } = partitionStructuredTree({
      客户名称: "浙江日出",
      商品列表: [{ 商品名称: "产品A", 数量: 100 }],
    });
    expect(schemaKey).toBe("sales_order");
  });

  it("单键 customer_name 不误匹配（阈值≥2）", () => {
    const { schemaKey } = partitionStructuredTree({
      customer_name: "仅此一项",
    });
    // 仅 1 个 matchKey → 得分 <2 → generic
    expect(schemaKey).toBe("generic");
  });

  it("columnOrder 不追加 id/pk_measdoc 等未列出列", () => {
    const { listSections } = partitionStructuredTree({
      customer_name: "测试客户",
      product_details: [
        {
          name: "产品A",
          quantity: "100",
          unit_price: 50,
          id: 1,
          pk_measdoc: "meas-001",
          pk_measdoc_name: "吨",
        },
      ],
    });
    const columns = listSections[0].columnOrder;
    expect(columns).not.toContain("id");
    expect(columns).not.toContain("pk_measdoc");
    expect(columns).toContain("单位");
    expect(columns).toEqual(["商品名称", "数量", "单位", "单价"]);
  });
});
