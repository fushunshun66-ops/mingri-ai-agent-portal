import { describe, it, expect, beforeAll } from "vitest";
import { normalizeOutputItem, setFormSchemas } from "../index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemas = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../../config/formSchemas.json"), "utf8")
);

beforeAll(() => {
  setFormSchemas(schemas);
});

describe("normalizeOutputItem 场景① 信息缺失", () => {
  it("Content 为信息缺失文本 → markdown block", () => {
    const item = { id: "1", name: "test", currentValue: { Content: "[信息缺失] 该指令缺少关键要素「客户名称」。" } };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("markdown");
    expect(blocks[0].content).toContain("[信息缺失]");
  });
});

describe("normalizeOutputItem 场景② 英文键表单 → sales_order", () => {
  it("customer_name + product_details 识别为 sales_order", () => {
    const item = {
      id: "2",
      name: "output",
      currentValue: {
        customer_name: "浙江日出精细化工有限公司",
        product_details: [
          { name: "中沙嵌段共聚31T副牌", quantity: "500", unit_price: 800, pk_measdoc_name: "吨" },
        ],
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    expect(formBlock.schemaKey).toBe("sales_order");
    const tableBlock = blocks.find((b) => b.type === "table");
    expect(tableBlock).toBeDefined();
    expect(tableBlock.title).toBe("商品明细");
  });
});

describe("normalizeOutputItem 场景④ 多候选数据 → choice 块组", () => {
  it("Content + Data(customers, materials) → choice blocks，叙述文本在首个 choice hint", () => {
    const item = {
      id: "4",
      name: "test",
      currentValue: {
        Content: "目前库中有多条相似数据，请选择具体数据。",
        Data: {
          customers: ["浙江日出精细化工有限公司"],
          materials: ["中沙嵌段共聚64M40T", "中沙嵌段共聚31T副牌"],
        },
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");

    const markdown = blocks.find((b) => b.type === "markdown");
    expect(markdown).toBeUndefined();

    const choiceBlocks = blocks.filter((b) => b.type === "choice");
    expect(choiceBlocks.length).toBe(2);

    const customerBlock = choiceBlocks.find((b) => b.label === "客户");
    expect(customerBlock).toBeDefined();
    expect(customerBlock.hint).toContain("多条相似数据");
    expect(customerBlock.options.length).toBe(1);
    expect(customerBlock.options[0].label).toBe("浙江日出精细化工有限公司");

    const materialBlock = choiceBlocks.find((b) => b.label === "物料");
    expect(materialBlock).toBeDefined();
    expect(materialBlock.hint).toBe("请选择物料");
    expect(materialBlock.options.length).toBe(2);
  });

  it("Content + Data 但值不是 string 数组 → 不触发", () => {
    const item = {
      id: "5",
      name: "test",
      currentValue: {
        Content: "普通文本",
        Data: { key: "notArray" },
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const choiceBlocks = blocks.filter((b) => b.type === "choice");
    expect(choiceBlocks.length).toBe(0);
  });
});

describe("单字段字符串对象 → markdown", () => {
  it("场景: { output: { content: '消息文本' } } 应渲染为 markdown，不泄露 key", () => {
    const item = {
      id: "7",
      name: "output",
      currentValue: { content: "这是一条普通回复消息" },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "markdown", content: "这是一条普通回复消息" });
  });

  it("场景: 多字段对象不受影响，仍走 form/card", () => {
    const item = {
      id: "8",
      name: "output",
      currentValue: { title: "标题", body: "正文" },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const markdownBlocks = blocks.filter((b) => b.type === "markdown");
    expect(markdownBlocks).toHaveLength(0);
  });
});


describe("normalizeOutputItem 场景④ Content 叙述回退", () => {
  it("仅 Content 无 Data 时从叙述文本提取客户选项", () => {
    const item = {
      id: "9",
      name: "output",
      currentValue: {
        Content:
          "目前库中有上海煌塑实业发展有限公司、上海塑发塑胶有限公司、上海西塑贸易有限公司、上海华悦塑料制品有限公司，其中与\"上海华塑\"高度相似的客户名称可能为：上海煌塑实业发展有限公司、上海华悦塑料制品有限公司，请检查客户名称是否输入错误",
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const choiceBlocks = blocks.filter((b) => b.type === "choice");
    expect(choiceBlocks.length).toBe(1);
    expect(choiceBlocks[0].hint).toContain("目前库中有");
    expect(choiceBlocks[0].options.length).toBeGreaterThanOrEqual(4);
    expect(blocks.find((b) => b.type === "markdown")).toBeUndefined();
  });
});

describe("回归测试: 中文 sales_order", () => {
  it("原有中文 keys 仍正确识别", () => {
    const item = {
      id: "6",
      name: "output",
      currentValue: {
        客户名称: "测试公司",
        商品列表: [{ 商品名称: "产品A", 数量: 100, 单价: 50 }],
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    expect(formBlock.schemaKey).toBe("sales_order");
  });
});

describe("buildFormBlockFromScalars 内部键过滤", () => {
  it("过滤 customer_id 等内部键", () => {
    const item = {
      id: "10",
      name: "output",
      currentValue: {
        customer_name: "测试公司",
        customer_id: "12345",
        product_details: [{ name: "产品A", quantity: 100, unit_price: 50 }],
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    const keys = formBlock.fields.map((f) => f.key);
    expect(keys).not.toContain("customer_id");
    expect(keys).toContain("customer_name");
  });

  it("API 错误 success:false 标记 level=error", () => {
    const item = {
      id: "11",
      name: "output",
      currentValue: {
        success: false,
        error: "Bad Request",
        message: "客户不存在",
        code: "400",
        traceId: "trace-abc",
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    expect(formBlock.level).toBe("error");
    const keys = formBlock.fields.map((f) => f.key);
    expect(keys).not.toContain("customer_id");
  });

  it("API 错误 success:0 同样标记 level=error", () => {
    const item = {
      id: "12",
      name: "output",
      currentValue: {
        success: 0,
        message: "客户不存在",
        code: "400",
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    expect(formBlock.level).toBe("error");
  });
});

describe("方案C: Python 单引号 dict 字符串 currentValue → form+table", () => {
  it("currentValue 为 Python 单引号字符串 → form+table", () => {
    const item = {
      id: "20",
      name: "output",
      currentValue: "{'customer_name': '浙江日出精细化工有限公司', 'delivery_date': '2026-07-15', 'product_details': [{'name': '中沙嵌段共聚31T副牌', 'quantity': '500', 'unit_price': 800, 'pk_measdoc_name': '吨'}]}",
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    expect(formBlock.schemaKey).toBe("sales_order");
    const tbl = blocks.find((b) => b.type === "table");
    expect(tbl).toBeDefined();
  });

  it("{ Content: Python 单引号字符串 } → form+table（方案C 核心路径）", () => {
    const item = {
      id: "21",
      name: "output",
      currentValue: {
        Content: "{'customer_name': '浙江日出精细化工有限公司', 'delivery_date': '2026-07-15', 'product_details': [{'name': '中沙嵌段共聚31T副牌', 'quantity': '500', 'unit_price': 800, 'pk_measdoc_name': '吨'}]}",
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    expect(formBlock.schemaKey).toBe("sales_order");
    const tbl = blocks.find((b) => b.type === "table");
    expect(tbl).toBeDefined();
  });

  it("{ Content: 普通文本 } 保持 markdown（回归：单字段字符串非 JSON）", () => {
    const item = {
      id: "22",
      name: "output",
      currentValue: { Content: "这是一条普通消息" },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("markdown");
    expect(blocks[0].content).toBe("这是一条普通消息");
  });

  it("{ content: 消息文本 } 保持 markdown（小写 content 回归）", () => {
    const item = {
      id: "23",
      name: "output",
      currentValue: { content: "消息文本" },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("markdown");
    expect(blocks[0].content).toBe("消息文本");
  });

  it("{ Content: 远航验收样本 Python dict } → form+table", () => {
    const item = {
      id: "24",
      name: "output",
      currentValue: {
        Content:
          "{'customer_name': '杭州首明科技有限公司', 'customer_id': '0axMEMdwdG7L7hZQG17K', 'product_details': [{'name': '陶氏高压310E', 'id': '1001A6100000002HUXU7', 'quantity': 500, 'unit_price': 100.0, 'pk_measdoc_name': '吨', 'pk_measdoc': '2382029309236992'}]}",
      },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    expect(formBlock.schemaKey).toBe("sales_order");
    expect(JSON.stringify(formBlock)).toContain("杭州首明科技有限公司");
    const tbl = blocks.find((b) => b.type === "table");
    expect(tbl).toBeDefined();
    expect(tbl.rows?.[0]?.["商品名称"]).toBe("陶氏高压310E");
  });
});

describe("方案A: Content 包装的 shipment 缺失叙述 → choice", () => {
  const SHIPMENT_MISSING_NARRATIVE =
    "发货明细中【陶氏 高压 310E】存在以下信息缺失，请补充：\n1. 未填写【仓库属地】，请补充发货仓库的具体位置。\n2. 未填写【收货地址】，请补充详细的收货地址。";

  it("{ Content: 发货明细信息缺失叙述 } + shipment → choice（仓库属地、收货地址），非独占 markdown", () => {
    const item = {
      id: "30",
      name: "output",
      currentValue: { Content: SHIPMENT_MISSING_NARRATIVE },
    };
    const { blocks } = normalizeOutputItem(item, "shipment");
    const choiceBlocks = blocks.filter((b) => b.type === "choice");
    expect(choiceBlocks.length).toBeGreaterThanOrEqual(2);
    expect(choiceBlocks.some((b) => b.label === "仓库属地")).toBe(true);
    expect(choiceBlocks.some((b) => b.label === "收货地址")).toBe(true);
    const onlyMarkdown = blocks.length === 1 && blocks[0].type === "markdown";
    expect(onlyMarkdown).toBe(false);
  });

  it("回归: { content: 普通回复消息 } → markdown", () => {
    const item = {
      id: "31",
      name: "output",
      currentValue: { content: "这是一条普通回复消息" },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "markdown", content: "这是一条普通回复消息" });
  });

  it("回归: { Content: [信息缺失] … } → markdown", () => {
    const item = {
      id: "32",
      name: "test",
      currentValue: { Content: "[信息缺失] 该指令缺少关键要素「客户名称」。" },
    };
    const { blocks } = normalizeOutputItem(item, "sales_order");
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("markdown");
    expect(blocks[0].content).toContain("[信息缺失]");
  });

  it("回归: 裸字符串 shipment 缺失叙述 → choice", () => {
    const item = {
      id: "33",
      name: "output",
      currentValue: SHIPMENT_MISSING_NARRATIVE,
    };
    const { blocks } = normalizeOutputItem(item, "shipment");
    const choiceBlocks = blocks.filter((b) => b.type === "choice");
    expect(choiceBlocks.length).toBeGreaterThanOrEqual(2);
    expect(choiceBlocks.some((b) => b.label === "仓库属地")).toBe(true);
    expect(choiceBlocks.some((b) => b.label === "收货地址")).toBe(true);
  });
});

describe("方案A: 远航 PascalCase 发货申请 → shipment", () => {
  const YUANHANG_SHIPMENT = {
    OrderNumber: "SO260715000019",
    OrderDate: "2026-07-08",
    CustomerCode: "0axMEMdwdG7L7hZQG17K",
    Salesperson: "兰岚",
    Receiver: "谭杰",
    ReceivingUnitName: "杭州首明科技有限公司",
    ReceivingUnitAddress: "1111",
    Phone: "11111",
    ShippingMethod: "自提",
    TotalAmount: "5000000",
    Items: [
      {
        Material: "陶氏高压310E",
        WarehouseLocation: "明日绿链原料库_惠州项目",
        UnitPrice: "10000元/吨",
        RequiredDeliveryDate: "2026-07-15",
        DeliveryAddress: "1111",
        Remarks: "车牌号：沪GF7778",
        ShippingQuantity: "50 吨",
      },
    ],
  };

  it("OrderNumber… + Items(陶氏高压310E) → shipment 发货申请单 + 发货明细 + 确认提交", () => {
    const item = {
      id: "40",
      name: "output",
      currentValue: YUANHANG_SHIPMENT,
    };
    const { blocks } = normalizeOutputItem(item, "shipment");
    const form = blocks.find((b) => b.type === "form");
    expect(form).toBeDefined();
    expect(form.schemaKey).toBe("shipment");
    expect(form.title).toContain("发货申请单");
    const orderField = form.fields.find((f) => f.key === "OrderNumber");
    expect(orderField?.label).toBe("发货单号");
    expect(form.actions.some((a) => a.id === "confirm" && a.label === "确认提交")).toBe(true);

    const table = blocks.find((b) => b.type === "table");
    expect(table).toBeDefined();
    expect(table.title).toBe("发货明细");
    expect(table.rows?.[0]?.["物料"]).toBe("陶氏高压310E");
  });

  it("回归: 中文键仍为 shipment", () => {
    const item = {
      id: "41",
      name: "output",
      currentValue: {
        单号: "FH001",
        客户编号: "C001",
        收货单位名称: "测试单位",
        物料: "陶氏高压310E",
        仓库属地: "惠州",
        发货数量: "10",
      },
    };
    const { blocks } = normalizeOutputItem(item, "shipment");
    const form = blocks.find((b) => b.type === "form");
    expect(form).toBeDefined();
    expect(form.schemaKey).toBe("shipment");
    expect(form.title).toContain("发货申请单");
  });

  it("回归: order_info + items 仍为 shipment", () => {
    const item = {
      id: "42",
      name: "output",
      currentValue: {
        order_info: {
          单号: "FH002",
          客户编号: "C002",
          收货单位名称: "测试收货单位",
        },
        items: [
          { 物料: "陶氏高压310E", 仓库属地: "惠州", 发货数量: "20" },
        ],
      },
    };
    const { blocks } = normalizeOutputItem(item, "shipment");
    const form = blocks.find((b) => b.type === "form");
    expect(form).toBeDefined();
    expect(form.schemaKey).toBe("shipment");
    const table = blocks.find((b) => b.type === "table");
    expect(table).toBeDefined();
    expect(table.title).toBe("发货明细");
    expect(table.rows?.[0]?.["物料"]).toBe("陶氏高压310E");
  });
});
