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
