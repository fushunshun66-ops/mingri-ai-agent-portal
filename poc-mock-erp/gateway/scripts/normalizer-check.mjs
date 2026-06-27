import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeOutputItem, setFormSchemas } from "../src/normalizers/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "config", "formSchemas.json");
setFormSchemas(JSON.parse(fs.readFileSync(schemaPath, "utf8")));

const orderJson = {
  客户名称: "湖州政溪有限公司",
  交付日期: "2026-06-15",
  商品名称: "万华聚氯乙烯七型",
  数量: "500吨",
  单价: "6850",
  总金额: "1000万",
};

const nestedSingleProduct = {
  客户名称: "上海华塑物资有限公司",
  交付日期: "2026-06-22",
  总金额: "3425000元",
  商品列表: [
    {
      商品名称: "万华聚氯乙烯七型",
      数量: "500吨",
      单价: "6850元/吨",
      小计金额: "3425000元",
    },
  ],
};

const nestedMultiProduct = {
  客户名称: "上海华塑物资有限公司",
  交付日期: "2026-06-22",
  总金额: "5000000元",
  商品列表: [
    { 商品名称: "万华聚氯乙烯七型", 数量: "300吨", 单价: "6850元/吨", 小计金额: "2055000元" },
    { 商品名称: "万华聚氯乙烯五型", 数量: "200吨", 单价: "6800元/吨", 小计金额: "1360000元" },
  ],
};

const nestedHeader = {
  订单信息: {
    客户名称: "上海华塑物资有限公司",
    交付日期: "2026-06-22",
  },
  金额信息: { 总金额: "3425000元" },
  商品列表: [{ 商品名称: "万华聚氯乙烯七型", 数量: "500吨", 单价: "6850元/吨" }],
};

const siblingLists = {
  客户名称: "上海华塑物资有限公司",
  商品列表: [
    { 商品名称: "万华聚氯乙烯七型", 数量: "300吨", 单价: "6850元/吨", 小计金额: "2055000元" },
    { 商品名称: "万华聚氯乙烯五型", 数量: "200吨", 单价: "6800元/吨", 小计金额: "1360000元" },
  ],
  费用明细: [{ 费用项: "运费", 金额: "5000元" }],
};

const memoryWrapper = {
  bucketSn: "default",
  memoryContent: JSON.stringify(orderJson),
  createTime: "2026-06-13 18:14:54",
};

const memoryNested = {
  bucketSn: "default",
  memoryContent: JSON.stringify(nestedHeader),
  createTime: "2026-06-14 12:00:00",
};

const mockKvRows = [
  { 字段: "客户", 值: "上海华塑物资有限公司" },
  { 字段: "商品", 值: "万华聚氯乙烯七型" },
  { 字段: "数量", 值: "500 吨" },
  { 字段: "单价", 值: "6850 元/吨" },
];

function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    process.exit(1);
  }
  console.log("OK:", label);
}

// 直接 JSON 字符串 → form
const first = normalizeOutputItem({
  id: "var_reply",
  name: "reply",
  type: "TEXT",
  currentValue: JSON.stringify(orderJson),
});
assert("直接 JSON → form", first.blocks[0]?.type === "form");
assert("命中 sales_order schema", first.blocks[0]?.schemaKey === "sales_order");
assert("订单字段可见", first.blocks[0]?.fields?.some((f) => f.key === "客户名称"));
assert("含快捷操作", (first.blocks[0]?.actions?.length || 0) >= 2);

// 记忆节点包装体 → form
const second = normalizeOutputItem({
  id: "var_6740323507e6412ebbd8",
  name: "reply",
  type: "OBJECT",
  currentValue: memoryWrapper,
});
assert("记忆包装 → form", second.blocks[0]?.type === "form");
assert("不应出现 bucketSn", !second.blocks[0]?.fields?.some((f) => f.key === "bucketSn"));
assert("展开后含客户名称", second.blocks[0]?.fields?.some((f) => f.key === "客户名称" && f.value.includes("湖州")));

// 字符串形式的记忆包装
const third = normalizeOutputItem({
  id: "var_reply",
  name: "reply",
  type: "TEXT",
  currentValue: JSON.stringify(memoryWrapper),
});
assert("字符串记忆包装 → form", third.blocks[0]?.type === "form");
assert("字符串包装无 bucketSn", !third.blocks[0]?.fields?.some((f) => f.key === "bucketSn"));

// Mock kv 行 → form (generic)
const fourth = normalizeOutputItem({
  id: "var_order_table",
  name: "order_table",
  type: "ARRAY",
  currentValue: mockKvRows,
});
assert("kv 行 → form", fourth.blocks[0]?.type === "form");
assert("kv 通用 schema", fourth.blocks[0]?.schemaKey === "generic");

// 嵌套标量对象 → form（generic 分区上浮）
const nested = normalizeOutputItem({
  id: "var_nested",
  name: "nested",
  type: "OBJECT",
  currentValue: { a: 1, b: { c: 2 } },
});
assert("嵌套标量 → form", nested.blocks[0]?.type === "form");
assert("嵌套标量含 a", nested.blocks[0]?.fields?.some((f) => f.key === "a"));
assert("嵌套标量含 c", nested.blocks[0]?.fields?.some((f) => f.key === "c"));

// 文件对象 → file
const fileItem = normalizeOutputItem({
  id: "var_file",
  name: "file",
  type: "OBJECT",
  currentValue: { fileName: "test.pdf", fileSn: "sn-001" },
});
assert("文件 → file", fileItem.blocks[0]?.type === "file");

// 普通 markdown 字符串
const md = normalizeOutputItem({
  id: "var_text",
  name: "text",
  type: "TEXT",
  currentValue: "这是一段普通回复",
});
assert("普通文本 → markdown", md.blocks[0]?.type === "markdown");

// 发货类表格（非 kv 格式）→ table
const shipmentRows = [{ 申请单号: "SR001", 订单号: "SO001", 客户: "华塑", 数量: "500 吨" }];
const tableItem = normalizeOutputItem({
  id: "var_shipment",
  name: "shipment",
  type: "ARRAY",
  currentValue: shipmentRows,
});
assert("多列表格 → table", tableItem.blocks[0]?.type === "table");

// 顶层商品列表单行 → form 头字段 + 商品明细表
const singleList = normalizeOutputItem({
  id: "var_reply",
  name: "reply",
  type: "OBJECT",
  currentValue: nestedSingleProduct,
});
assert("单行商品列表 → form + table", singleList.blocks[0]?.type === "form" && singleList.blocks[1]?.type === "table");
assert("单行头字段含客户", singleList.blocks[0]?.fields?.some((f) => f.key === "客户名称"));
assert("单行头字段不含商品名称", !singleList.blocks[0]?.fields?.some((f) => f.key === "商品名称"));
assert("单行 table 标题", singleList.blocks[1]?.title === "商品明细");
assert("单行 table 行数", singleList.blocks[1]?.rows?.length === 1);

// 顶层商品列表多行 → form + table
const multiList = normalizeOutputItem({
  id: "var_reply",
  name: "reply",
  type: "OBJECT",
  currentValue: nestedMultiProduct,
});
assert("多行商品 → form + table", multiList.blocks[0]?.type === "form" && multiList.blocks[1]?.type === "table");
assert("多行 table 行数", multiList.blocks[1]?.rows?.length === 2);
assert("多行 table 标题", multiList.blocks[1]?.title === "商品明细");

// 嵌套订单信息 + 商品列表
const deepHeader = normalizeOutputItem({
  id: "var_reply",
  name: "reply",
  type: "OBJECT",
  currentValue: nestedHeader,
});
assert("嵌套头信息 → form", deepHeader.blocks[0]?.type === "form");
assert("嵌套头含客户", deepHeader.blocks[0]?.fields?.some((f) => f.key === "客户名称"));
assert("嵌套头含总金额", deepHeader.blocks[0]?.fields?.some((f) => f.key === "总金额"));
assert("嵌套单行商品 → table", deepHeader.blocks[1]?.type === "table" && deepHeader.blocks[1]?.title === "商品明细");

// 记忆包装 + 多层嵌套
const memNested = normalizeOutputItem({
  id: "var_reply",
  name: "reply",
  type: "OBJECT",
  currentValue: memoryNested,
});
assert("记忆嵌套 → form", memNested.blocks[0]?.type === "form");
assert("记忆嵌套含客户", memNested.blocks[0]?.fields?.some((f) => f.key === "客户名称"));

// 同级商品列表 + 费用明细
const siblings = normalizeOutputItem({
  id: "var_reply",
  name: "reply",
  type: "OBJECT",
  currentValue: siblingLists,
});
assert("同级双表 → form + 2 tables", siblings.blocks.length === 3);
assert("同级 form", siblings.blocks[0]?.type === "form");
assert("同级商品表", siblings.blocks[1]?.type === "table" && siblings.blocks[1]?.title === "商品明细");
assert("同级费用表", siblings.blocks[2]?.type === "table" && siblings.blocks[2]?.title === "费用明细");

// 未识别数组字段 generic 分区 → table 非 stringify
const genericMixed = normalizeOutputItem({
  id: "var_x",
  name: "x",
  type: "OBJECT",
  currentValue: {
    名称: "测试",
    编码: "A001",
    明细: [{ 项: "一", 值: "1" }, { 项: "二", 值: "2" }],
  },
});
assert("generic 混合 → form + table", genericMixed.blocks[0]?.type === "form" && genericMixed.blocks[1]?.type === "table");
assert("generic 无 stringify 数组", !genericMixed.blocks.some((b) => b.type === "card"));

// 销售订单完成 → result 卡
const orderResultText = "**订单号 SO260613000001** 已创建，销售订单已完成。";
const orderResultItem = normalizeOutputItem({
  id: "var_confirm",
  name: "confirm",
  type: "TEXT",
  currentValue: orderResultText,
});
assert("订单完成 → result", orderResultItem.blocks[0]?.type === "result");
assert("result schemaKey", orderResultItem.blocks[0]?.schemaKey === "sales_order");
assert("result 订单号", orderResultItem.blocks[0]?.orderNo === "SO260613000001");
assert("result 固定说明", orderResultItem.blocks[0]?.message === "销售订单已完成，可在ERP中查看详情。");
assert("result 非 markdown", !orderResultItem.blocks.some((b) => b.type === "markdown"));

const orderResultObj = normalizeOutputItem({
  id: "var_result",
  name: "result",
  type: "OBJECT",
  currentValue: { 订单号: "SO260601000099", 状态: "已完成" },
});
assert("订单 JSON → result", orderResultObj.blocks[0]?.type === "result");
assert("订单 JSON 单号", orderResultObj.blocks[0]?.orderNo === "SO260601000099");

// live 常见：纯 SD 单号
const liveOrderNo = normalizeOutputItem({
  id: "var_reply",
  name: "reply",
  type: "TEXT",
  currentValue: "SD202606151051477503",
});
assert("live 纯 SD → result", liveOrderNo.blocks[0]?.type === "result");
assert("live SD 单号", liveOrderNo.blocks[0]?.orderNo === "SD202606151051477503");

// 确认选择卡片（多问题 → 多个 choice 块）
const clarifyText = `您好！您提供的信息中存在以下需要确认的选项：
【客户名称】「上海华苏」
存在多个相似结果，请选择：① 上海华塑物资有限公司；② 上海盈实有限公司
【商品名称】
未在系统中查询到相关记录，请核对后重新输入正确的商品名称，或确认是否需要新增该商品。请回复对应的序号或正确名称，以便我们继续为您处理订单。`;

const choiceItem = normalizeOutputItem(
  {
    id: "var_clarify",
    name: "clarify",
    type: "TEXT",
    currentValue: clarifyText,
  },
  "sales_order",
);
const choiceBlocks = choiceItem.blocks.filter((b) => b.type === "choice");
assert("确认文本 → intro markdown", choiceItem.blocks[0]?.type === "markdown");
assert("确认文本 → 2 个 choice 块", choiceBlocks.length === 2);
assert("choice 含客户", choiceBlocks.some((b) => b.label.includes("客户")));
const customerBlock = choiceBlocks.find((b) => b.label.includes("客户"));
assert("choice 客户选项数", customerBlock?.options?.length === 2);
assert("choice 客户选项1", customerBlock?.options?.[0]?.label.includes("华塑"));
assert("choice 客户选项2", customerBlock?.options?.[1]?.label.includes("盈实"));
assert("choice 客户 hint 含相似", (customerBlock?.hint || "").includes("相似") || customerBlock?.options?.length === 2);
const productBlock = choiceBlocks.find((b) => b.label.includes("商品"));
assert("choice 商品无自动选项", productBlock?.options?.length === 0);
assert("choice 商品为纯提醒", (productBlock?.hint || "").includes("未在系统"));

// 中台 inline ①② 单行格式
const inlineClarify = `【客户名称】「上海华苏」存在多个相似结果，请选择：① 上海华塑物资有限公司；② 上海盈实有限公司`;
const inlineItem = normalizeOutputItem({ id: "v", name: "c", type: "TEXT", currentValue: inlineClarify });
const inlineBlock = inlineItem.blocks.find((b) => b.type === "choice");
assert("inline ①② → 2 选项", inlineBlock?.options?.length === 2);
assert("inline 选项非整句", !inlineBlock?.options?.[0]?.label.includes("请选择"));

// 旧版 **字段** 格式仍应拆成多块
const legacyClarify = `您好！您提供的信息中有多项需要确认：

**客户名称**：您提到的「上海华苏」未找到完全匹配，相似结果如下，请选择：
① 上海华塑物资有限公司
② 上海盈实有限公司

**商品名称**：您提到的「万华聚乙烯」与知识库中的「万华聚乙烯七型」不完全一致，请确认名称是否准确。

请明确回复正确的客户名称和商品名称，以便继续处理订单。`;
const legacyChoice = normalizeOutputItem({
  id: "var_legacy",
  name: "clarify",
  type: "TEXT",
  currentValue: legacyClarify,
});
const legacyChoiceBlocks = legacyChoice.blocks.filter((b) => b.type === "choice");
assert("旧格式 → 2 个 choice 块", legacyChoiceBlocks.length === 2);
assert("旧格式 footer 并入商品说明", legacyChoiceBlocks.some((b) => b.hint?.includes("请明确回复")));

// 发货申请：中台 **字段** + 1. 2. 3. 列表
const shipmentClarify = `**客户名称**：您好，您输入的信息中提供的客户名称【余姚飞草】存在多个相似结果。请确认正确客户名称：
1. 余姚市北一贸易有限公司
2. 余姚市宝明日用品有限公司
3. 余姚市飞草新材料有限公司

**商品名称**：您好，您输入的信息中提供的商品名称「聚丙烯 1100N」与知识库标准名称「宁煤均聚1100N」不完全一致，请确认名称是否准确。`;
const shipmentChoice = normalizeOutputItem(
  {
    id: "var_clarify",
    name: "clarify",
    type: "TEXT",
    currentValue: shipmentClarify,
  },
  "shipment",
);
const shipmentBlocks = shipmentChoice.blocks.filter((b) => b.type === "choice");
assert("发货确认 → 2 个 choice 块", shipmentBlocks.length === 2);
const shipCustomer = shipmentBlocks.find((b) => b.label.includes("客户"));
assert("发货客户 3 选项", shipCustomer?.options?.length === 3);
assert("发货客户选项无序号前缀", !shipCustomer?.options?.[0]?.label.startsWith("1."));
const shipProduct = shipmentBlocks.find((b) => b.label.includes("商品"));
assert("发货商品 2 引号选项", shipProduct?.options?.length === 2);

// 场景2 live 复核：intro 内联【客户名称】和【商品名称】+ 1.2.3. 列表（勿误拆为「和」）
const shipmentReviewLive = `收到。根据您提供的发货单信息，系统对【客户名称】和【商品名称】进行了复核：请您确认：商品名称是否应为「宁煤均聚1100N」？请回复确认或提供正确全称。

1. 原始单据中为「余姚市北贸易有限公司」，与客户知识库最接近的是「余姚市北一贸易有限公司（客户编码：C017）」
2. 原始单据商品名称为「宁煤 聚丙烯 1100N」，与知识库标准名称「宁煤均聚1100N（SKU003）」不完全一致
3. 客户名称是否应为「余姚市北一贸易有限公司」？`;
const shipmentReviewItem = normalizeOutputItem({
  id: "var_clarify",
  name: "clarify",
  type: "TEXT",
  currentValue: shipmentReviewLive,
}, "shipment");
const shipmentReviewBlocks = shipmentReviewItem.blocks.filter((b) => b.type === "choice");
assert("发货复核 → 2 个 choice 块", shipmentReviewBlocks.length === 2);
const reviewCustomer = shipmentReviewBlocks.find((b) => b.label.includes("客户"));
const reviewProduct = shipmentReviewBlocks.find((b) => b.label.includes("商品"));
assert("发货复核 客户 hint 非「和」", reviewCustomer?.hint !== "和" && (reviewCustomer?.hint || "").includes("余姚"));
assert("发货复核 客户选项含北一", reviewCustomer?.options?.some((o) => o.label.includes("北一")));
assert("发货复核 商品 hint 含宁煤", (reviewProduct?.hint || "").includes("宁煤均聚1100N"));
assert("发货复核 商品选项含标准名", reviewProduct?.options?.some((o) => o.label.includes("宁煤均聚1100N")));
assert("发货复核 intro 完整", shipmentReviewItem.blocks[0]?.type === "markdown" && (shipmentReviewItem.blocks[0]?.content || "").includes("进行了复核"));

// 场景2 live 分段歧义：客户名称：/商品名称： + 实体行（无编号，勿误拆「请选择」）
const shipmentSectionLive = `收到。根据您提供的发货单信息，系统对【客户名称】和【商品名称】进行了复核，发现存在匹配歧义，需您确认：

客户名称：
请确认是否为该客户？单据中蓝本为「宁波 聚火能 1100N」，系统库中匹配项为：该值与您填写内容高度一致，可直接确认。
余姚市化一贸易有限公司（客户编码：C017）

商品名称：
请确认是否为该商品？系统库标准名如下。
聚丙烯宁煤1100N（商品编码：SKU003）

请您点击确认客户名称是否应为「余姚市化一贸易有限公司」？`;
const shipmentSectionItem = normalizeOutputItem({
  id: "var_section",
  name: "clarify",
  type: "TEXT",
  currentValue: shipmentSectionLive,
}, "shipment");
const shipmentSectionBlocks = shipmentSectionItem.blocks.filter((b) => b.type === "choice");
assert("发货分段歧义 → 2 个 choice 块", shipmentSectionBlocks.length === 2);
assert("发货分段 无请选择卡", !shipmentSectionBlocks.some((b) => b.label === "请选择"));
const sectionCustomer = shipmentSectionBlocks.find((b) => b.label === "客户名称");
const sectionProduct = shipmentSectionBlocks.find((b) => b.label === "商品名称");
assert("发货分段 客户 hint 含请确认", (sectionCustomer?.hint || "").includes("请确认"));
assert("发货分段 客户选项含化一", sectionCustomer?.options?.some((o) => o.label.includes("化一")));
assert("发货分段 商品选项含聚丙烯", sectionProduct?.options?.some((o) => o.label.includes("聚丙烯")));
assert("发货分段 footer 含点击确认", shipmentSectionItem.blocks.some((b) => b.type === "markdown" && (b.content || "").includes("请您点击确认")));

// 场景2 live 复核：【字段】行首 + 请选择块（勿混卡）
const shipmentBracketReview = `收到。根据您提供的发货单信息，系统对【客户名称】和【商品名称】进行了复核，发现存在匹配歧义，需您确认以下两项：

【客户名称】原始单据中为"余姚市北贸易有限公司"，但知识库中无完全匹配项，最接近的是"余姚市北一贸易有限公司"（客户编码:C017）。

【商品名称】原始单据中为"宁煤 聚丙烯 1100N"，与知识库中的标准命名存在差异，匹配到的标准商品名为："聚丙烯宁煤均聚1100N"（商品编码:SKU003）。

请选择：
- 客户名称是否应为"余姚市北一贸易有限公司"？
- 商品名称是否应为"聚丙烯宁煤均聚1100N"？`;
const shipmentBracketItem = normalizeOutputItem(
  { id: "var_bracket_review", name: "clarify", type: "TEXT", currentValue: shipmentBracketReview },
  "shipment",
);
const shipmentBracketBlocks = shipmentBracketItem.blocks.filter((b) => b.type === "choice");
assert("发货 bracket 复核 → 2 块", shipmentBracketBlocks.length === 2);
assert("发货 bracket 无请选择卡", !shipmentBracketBlocks.some((b) => b.label === "请选择"));
assert(
  "发货 bracket 客户选项含北一",
  shipmentBracketBlocks.find((b) => b.label === "客户名称")?.options?.some((o) => o.label.includes("北一")),
);
assert(
  "发货 bracket 商品选项含均聚",
  shipmentBracketBlocks.find((b) => b.label === "商品名称")?.options?.some((o) => o.label.includes("均聚1100N")),
);

// 场景2 live 截图式：请选择块内叙述/问句勿当 options
const shipmentScreenshotLike = `收到。根据您提供的发货单信息，系统对【客户名称】和【商品名称】进行了复核，发现存在匹配歧义，需您确认以下两项

客户名称：原始单据中为"余姚市北贸易有限公司"，但知识库中无完全匹配项。

商品名称：原始单据中为"宁煤 聚丙烯 1100N"，与知识库中的标准命名存在差异，匹配到的标准商品名为："聚丙烯宁煤均聚1100N"（商品编码:SKU003）。

请选择：
商品名称是否应为"聚丙烯宁煤均聚1100N"？
余姚市北一贸易有限公司
商品名称：原始单据中为"宁煤 聚丙烯 1100N"，与知识库中的标准命名存在差异，匹配到的标准商品名为：
聚丙烯宁煤均聚1100N
客户名称是否应为"余姚市北一贸易有限公司"？`;
const shipmentScreenshotItem = normalizeOutputItem(
  { id: "var_screenshot", name: "clarify", type: "TEXT", currentValue: shipmentScreenshotLike },
  "shipment",
);
const shipmentScreenshotBlocks = shipmentScreenshotItem.blocks.filter((b) => b.type === "choice");
assert("发货截图式 → 2 块", shipmentScreenshotBlocks.length === 2);
assert("发货截图式 无请选择卡", !shipmentScreenshotBlocks.some((b) => b.label === "请选择"));
assert(
  "发货截图式 客户选项仅北一",
  shipmentScreenshotBlocks.find((b) => b.label === "客户名称")?.options?.length === 1 &&
    shipmentScreenshotBlocks.find((b) => b.label === "客户名称")?.options?.[0]?.label.includes("北一"),
);
assert(
  "发货截图式 无叙述句选项",
  !shipmentScreenshotBlocks.some((b) => b.options?.some((o) => /原始单据|是否应为/.test(o.label))),
);

// 场景2 live 编号歧义：含「商品名称:」行与 footer 问句，勿当作可选项
const shipmentNumberedAmbiguity = `收到。根据您提供的发货单信息，系统对【客户名称】和【商品名称】进行了复核，发现存在匹配歧义，需您确认：

1. 余姚市化一贸易有限公司（客户编码：C017）
2. 商品名称:
3. 聚丙烯宁煤1100N（商品编码：SKU003）
4. 请您点击确认客户名称是否应为「余姚市化一贸易有限公司」？`;
const shipmentNumberedItem = normalizeOutputItem({
  id: "var_numbered_amb",
  name: "clarify",
  type: "TEXT",
  currentValue: shipmentNumberedAmbiguity,
}, "shipment");
const shipmentNumberedBlocks = shipmentNumberedItem.blocks.filter((b) => b.type === "choice");
assert("发货编号歧义 → 2 个 choice 块", shipmentNumberedBlocks.length === 2);
assert("发货编号 无请选择卡", !shipmentNumberedBlocks.some((b) => b.label === "请选择"));
const numCustomer = shipmentNumberedBlocks.find((b) => b.label === "客户名称");
const numProduct = shipmentNumberedBlocks.find((b) => b.label === "商品名称");
assert("发货编号 客户选项 1 个", numCustomer?.options?.length === 1);
assert("发货编号 商品选项 1 个", numProduct?.options?.length === 1);
assert("发货编号 无商品名称选项", !numCustomer?.options?.some((o) => o.label === "商品名称:"));

// 场景2 单相近项商品 → 是/否 选项（【字段】格式）
const shipmentSingleNearMatch = `您好，已收到您提供的信息。

【客户名称】系统在知识库中找到以下两个相似选项：
1. 上海华塑物资有限公司
2. 上海盈实有限公司

【商品名称】系统仅匹配到一个相近项："万华聚氯乙烯七型"，未找到完全一致的"万华聚乙烯"记录。

请您确认：
- 商品名称是否应为"万华聚氯乙烯七型"，还是另有标准名称？`;
const shipmentYesNoItem = normalizeOutputItem(
  { id: "var_yesno", name: "clarify", type: "TEXT", currentValue: shipmentSingleNearMatch },
  "shipment",
);
const shipmentYesNoBlocks = shipmentYesNoItem.blocks.filter((b) => b.type === "choice");
const shipmentProductYesNo = shipmentYesNoBlocks.find((b) => b.label.includes("商品"));
assert("发货单相近项 → 商品 是/否", shipmentProductYesNo?.options?.length === 2);
assert("发货单相近项 选项为是/否", shipmentProductYesNo?.options?.map((o) => o.label).join(",") === "是,否");
assert("发货单相近项 hint 无请您确认", !(shipmentProductYesNo?.hint || "").includes("请您确认"));
assert("发货单相近项 footer", shipmentYesNoItem.blocks.some((b) => b.type === "markdown" && (b.content || "").includes("请您确认")));

// 场景2 发货缺失提醒（列表式，含【第N条明细】标记）
const shipmentMissingList = `发货单缺少
【客户名称】，请补充完整的客户公司名称或个人姓名。发货明细中
【第1条明细】未填写
【物料】，请补充具体的商品名称或物料编号。发货明细中
【第1条明细】未填写
【仓库属地】，请补充发货仓库的具体位置。发货明细中
【第1条明细】未填写
【收货地址】，请补充详细的收货地址。`;
const shipmentMissingItem = normalizeOutputItem({
  id: "var_missing",
  name: "clarify",
  type: "TEXT",
  currentValue: shipmentMissingList,
});
const shipmentMissingBlocks = shipmentMissingItem.blocks.filter((b) => b.type === "choice");
assert("发货缺失 → 4 张提醒卡", shipmentMissingBlocks.length === 4);
assert("发货缺失 无第N条明细卡", !shipmentMissingBlocks.some((b) => /第\d+条明细/.test(b.label)));
assert("发货缺失 客户 hint", shipmentMissingBlocks[0]?.hint?.includes("请补充完整的客户"));
assert("发货缺失 hint 无发货明细中尾缀", !shipmentMissingBlocks[0]?.hint?.includes("发货明细中"));
assert("发货缺失 intro", shipmentMissingItem.blocks[0]?.type === "markdown" && shipmentMissingItem.blocks[0]?.content === "发货单缺少");

// 场景2 发货缺失提醒（单行式）
const shipmentMissingInline =
  "发货明细中【宁煤2500HY】未填写【仓库属地】，请补充发货仓库的具体位置。";
const shipmentInlineItem = normalizeOutputItem({
  id: "var_inline",
  name: "clarify",
  type: "TEXT",
  currentValue: shipmentMissingInline,
});
const shipmentInlineBlocks = shipmentInlineItem.blocks.filter((b) => b.type === "choice");
assert("发货单行缺失 → 1 张卡", shipmentInlineBlocks.length === 1);
assert("发货单行 label", shipmentInlineBlocks[0]?.label === "仓库属地");

// 场景2 发货明细中 + 商品缺失 + 字段缺失（截图格式）
const shipmentDetailMissing = `发货明细中【万华聚氯乙烯七型】存在以下信息缺失，请补充：1. 未填写【仓库属地】请补充发货仓库的具体位置。2. 未填写【收货地址】请补充详细的收货地址。`;
const shipmentDetailItem = normalizeOutputItem({
  id: "var_detail",
  name: "clarify",
  type: "TEXT",
  currentValue: shipmentDetailMissing,
});
const shipmentDetailBlocks = shipmentDetailItem.blocks.filter((b) => b.type === "choice");
assert("发货明细格式 → 3 张卡", shipmentDetailBlocks.length === 3);
assert("发货明细 无 intro", !shipmentDetailItem.blocks.some((b) => b.type === "markdown"));
assert("发货明细 商品卡标题", shipmentDetailBlocks[0]?.label === "发货明细");
assert("发货明细 商品 hint 无序号", !shipmentDetailBlocks[0]?.hint?.includes("1. 未填写"));
assert("发货明细 仓库 hint", shipmentDetailBlocks[1]?.hint?.includes("请补充发货仓库的具体位置"));
assert("发货明细 仓库 hint 无序号", !shipmentDetailBlocks[1]?.hint?.includes("2. 未填写"));

// 合同评审：结构化 JSON → form + table + 审核总结上浮
const contractReview = {
  基本信息: {
    合同名称: "化工产品购销合同",
    客户名称: "江苏优合新材料有限公司",
    合同编号: "S0260519000383",
  },
  审核内容: [
    {
      审核规则名称: "印章合规检查",
      规则描述: "检查合同是否加盖红色公章",
      原始数据: "已检测到红色公章",
      审核结果: "通过",
    },
    {
      审核规则名称: "商品名称一致性",
      规则描述: "比对合同商品名称与系统订单商品名称",
      原始数据: "合同：宝丰7042；系统：宝丰7042",
      审核结果: "不通过",
    },
  ],
  审核总结: {
    总审核项数: "4",
    通过项数: "3",
    不通过项数: "1",
  },
};

const contractItem = normalizeOutputItem({
  id: "JSON1",
  name: "JSON1",
  type: "OBJECT",
  currentValue: contractReview,
});
assert("合同评审 → form + table", contractItem.blocks[0]?.type === "form" && contractItem.blocks[1]?.type === "table");
assert("合同评审 schema", contractItem.blocks[0]?.schemaKey === "contract_review");
assert("合同评审含合同名称", contractItem.blocks[0]?.fields?.some((f) => f.key === "合同名称"));
assert("合同评审含审核总结项", contractItem.blocks[0]?.fields?.some((f) => f.key === "不通过项数"));
assert("合同评审 table 标题", contractItem.blocks[1]?.title === "审核内容");
assert("合同评审 table 行数", contractItem.blocks[1]?.rows?.length === 2);
assert(
  "合同评审 table 列顺序",
  contractItem.blocks[1]?.columns?.slice(-1)[0] === "审核结果",
);

// 合同评审：中台 live 列名（审核规则说明 / 原始数据比对 / 审核结果置末）
const contractReviewLive = {
  基本信息: contractReview.基本信息,
  审核内容: [
    {
      审核规则名称: "印章合规性检查",
      审核结果: "通过",
      审核规则说明: "检查合同甲方是否加盖红色合同专用章或公章",
      原始数据比对:
        '{"合同数据":"浙江明日石化有限公司 合同专用章（红色圆章）","系统数据":"应使用红色合同专用章或公章"}',
    },
    {
      审核规则名称: "商品名称一致性",
      审核结果: "不通过: 合同商品名称为「聚乙烯（宝丰内蒙线性7042）」，系统登记为「宝丰7042」",
      审核规则说明: "合同中的商品名称必须与系统订单完全一致",
      原始数据比对: '{"合同数据":"聚乙烯（规格型号：宝丰内蒙线性7042）","系统数据":"宝丰7042"}',
    },
  ],
  审核总结: contractReview.审核总结,
};
const contractLiveItem = normalizeOutputItem({
  id: "JSON1",
  name: "JSON1",
  type: "OBJECT",
  currentValue: contractReviewLive,
});
const liveTable = contractLiveItem.blocks.find((b) => b.type === "table");
assert("live 列末为审核结果", liveTable?.columns?.slice(-1)[0] === "审核结果");
assert(
  "live 列顺序",
  liveTable?.columns?.join("|") === "审核规则名称|审核规则说明|原始数据比对|审核结果",
);

// 合同评审：字符串化 JSON 字段（中台卡片三块）
const contractCardStrings = {
  基本信息: JSON.stringify(contractReview.基本信息),
  审核内容: JSON.stringify(contractReview.审核内容),
  审核总结: JSON.stringify(contractReview.审核总结),
};
const contractCardItem = normalizeOutputItem({
  id: "JSON1",
  name: "JSON1",
  type: "OBJECT",
  currentValue: contractCardStrings,
});
assert("字符串化合同 → form + table", contractCardItem.blocks[0]?.type === "form" && contractCardItem.blocks[1]?.type === "table");
assert("字符串化含客户名称", contractCardItem.blocks[0]?.fields?.some((f) => f.key === "客户名称" && f.value.includes("江苏优合")));

// 合同评审：审核总结纯文本
const contractPlainSummary = normalizeOutputItem({
  id: "JSON1",
  name: "JSON1",
  type: "OBJECT",
  currentValue: {
    基本信息: contractReview.基本信息,
    审核内容: contractReview.审核内容,
    审核总结: "总审核项4\n通过3\n不通过1",
  },
});
assert("纯文本审核总结 → form", contractPlainSummary.blocks[0]?.type === "form");
assert("纯文本总结上浮", contractPlainSummary.blocks[0]?.fields?.some((f) => f.key === "不通过项数" && f.value === "1"));

// 销售订单 live 叙述式（截图格式）：已确认商品 + 但关于客户 + 1.2. 列表 + 多问题 footer
const salesOrderNarrativeLive = `您好，已为您确认商品名称为「万华聚氯乙烯七型」（系统中存在唯一匹配记录）。

但关于客户名称「上海华苏」，在系统中未找到完全匹配项，仅有以下两个相似客户：

1. 上海华塑物资有限公司
2. 上海盈实有限公司

请您确认客户全称是否为上述之一，或提供准确的客户名称以便继续处理订单。`;
const salesOrderNarrativeItem = normalizeOutputItem(
  {
    id: "var_clarify",
    name: "clarify",
    type: "TEXT",
    currentValue: salesOrderNarrativeLive,
  },
  "sales_order",
);
const salesOrderNarrativeBlocks = salesOrderNarrativeItem.blocks.filter((b) => b.type === "choice");
assert("销售 live 叙述 → intro markdown", salesOrderNarrativeItem.blocks[0]?.type === "markdown");
assert("销售 live 叙述 → 1 个 choice", salesOrderNarrativeBlocks.length === 1);
assert("销售 live 客户 2 选项", salesOrderNarrativeBlocks[0]?.options?.length === 2);
assert("销售 live intro 含已确认", (salesOrderNarrativeItem.blocks[0]?.content || "").includes("已为您确认"));
assert("销售 live footer", salesOrderNarrativeItem.blocks.some((b) => b.type === "markdown" && (b.content || "").includes("请您确认客户全称")));

// 销售订单 live 多问题并列
const salesOrderMultiIssue = `已为您确认交期。

但关于客户名称「上海华苏」，未找到完全匹配项，仅有以下相似客户：

1. 上海华塑物资有限公司
2. 上海盈实有限公司

但关于商品名称「万华聚乙烯」，未在系统中查询到相关记录，请核对后重新输入正确的商品名称。`;
const salesOrderMultiItem = normalizeOutputItem(
  {
    id: "var_clarify",
    name: "clarify",
    type: "TEXT",
    currentValue: salesOrderMultiIssue,
  },
  "sales_order",
);
const salesOrderMultiBlocks = salesOrderMultiItem.blocks.filter((b) => b.type === "choice");
assert("销售多问题 → 2 个 choice", salesOrderMultiBlocks.length === 2);
assert("销售多问题 客户有选项", salesOrderMultiBlocks[0]?.options?.length === 2);
assert("销售多问题 商品无选项", salesOrderMultiBlocks[1]?.options?.length === 0);
assert("销售多问题 商品为提醒", (salesOrderMultiBlocks[1]?.hint || "").includes("未在系统"));

// 销售 live：无「关于」前缀 + 客户列表 + 商品匹配歧义（截图常见格式）
const salesOrderLiveComposite = `您好，已收到您的销售订单需求：给上海华苏下500吨万华聚乙烯，单价6850，下周一交货。

客户名称「上海华苏」，在客户知识库中未找到完全匹配项，以下为相似客户：
1. 上海华塑物资有限公司
2. 上海盈实有限公司

商品名称「万华聚乙烯」，系统中仅匹配到「万华聚氯乙烯七型」，未查询到「聚乙烯」相关标准商品记录。

请您确认：
- 客户全称是否为上述相似客户之一？
- 商品是否使用已匹配到的「万华聚氯乙烯七型」，或请提供正确的标准商品名称。`;
const salesOrderLiveItem = normalizeOutputItem(
  {
    id: "var_clarify",
    name: "clarify",
    type: "TEXT",
    currentValue: salesOrderLiveComposite,
  },
  "sales_order",
);
const salesOrderLiveBlocks = salesOrderLiveItem.blocks.filter((b) => b.type === "choice");
assert("销售 live 双问题 → 2 个 choice", salesOrderLiveBlocks.length === 2);
assert("销售 live 客户 2 选项", salesOrderLiveBlocks[0]?.options?.length === 2);
assert("销售 live 商品 是/否", salesOrderLiveBlocks[1]?.options?.map((o) => o.label).join(",") === "是,否");
assert("销售 live footer 引导", salesOrderLiveItem.blocks.some((b) => b.type === "markdown" && (b.content || "").includes("请您确认")));

// 用户提供的 live 原文：弯引号 “ ” + 无序号公司名列表
const userLiveCurly = `您好，已收到您的订单请求。

关于客户名称“上海华苏”，系统在知识库中未找到完全匹配的记录，仅有以下两个相似客户：

上海华塑物资有限公司
上海盈实有限公司
关于商品名称“万华聚乙烯”，系统中仅匹配到“万华聚氯乙烯七型”，与您提供的名称存在差异。

请您确认：

客户全称是否为上述列表中的某一家？或是否有其他准确名称？
商品是否为“万华聚氯乙烯七型”？或“万华聚乙烯”是另有规范名称？
请明确客户和商品的标准全称，以便我们为您准确生成订单。`;
const userLiveItem = normalizeOutputItem(
  { id: "var_clarify", name: "clarify", type: "TEXT", currentValue: userLiveCurly },
  "sales_order",
);
const userLiveChoices = userLiveItem.blocks.filter((b) => b.type === "choice");
assert("用户 live 弯引号 → 2 个 choice", userLiveChoices.length === 2);
assert("用户 live 客户 2 选项", userLiveChoices[0]?.options?.length === 2);
assert("用户 live 商品 是/否", userLiveChoices[1]?.options?.map((o) => o.label).join(",") === "是,否");
assert("用户 live 商品 是→匹配名", userLiveChoices[1]?.options?.[0]?.message.includes("聚氯乙烯"));

// 场景1 live：已确认客户 + 段内「另外，关于商品名称」+ 相似项 yes/no
const salesProductInlineClarify = `您好，已为您确认客户名称为"上海华塑物资有限公司"。另外，关于商品名称"万华聚乙烯七型"，系统中仅匹配到相似项"万华聚氯乙烯七型"，未找到完全一致的记录。请问您下单的商品是否为"万华聚氯乙烯七型"？或是有其他规范名称？请确认以便我们准确生成订单。`;
const salesProductInlineItem = normalizeOutputItem(
  { id: "var_product_inline", name: "clarify", type: "TEXT", currentValue: salesProductInlineClarify },
  "sales_order",
);
const salesProductInlineBlocks = salesProductInlineItem.blocks.filter((b) => b.type === "choice");
assert("销售段内商品歧义 → 1 个 choice", salesProductInlineBlocks.length === 1);
assert("销售段内商品 label", salesProductInlineBlocks[0]?.label === "商品名称");
assert("销售段内 intro 含已确认客户", (salesProductInlineItem.blocks[0]?.content || "").includes("已为您确认"));
assert("销售段内商品 是/否", salesProductInlineBlocks[0]?.options?.map((o) => o.label).join(",") === "是,否");
assert("销售段内商品 是→匹配名", salesProductInlineBlocks[0]?.options?.[0]?.message.includes("聚氯乙烯"));

// 缺少关键要素：纯提醒，无可选项
const missingFieldsText =
  "该指令缺少关键要素「交付日期」，该指令缺少关键要素「数量」，该指令缺少关键要素「单价」。";
const missingFieldsItem = normalizeOutputItem(
  { id: "var_missing", name: "missing", type: "TEXT", currentValue: missingFieldsText },
  "sales_order",
);
assert("缺少要素 → 1 张提醒卡", missingFieldsItem.blocks.length === 1);
assert("缺少要素 variant=reminder", missingFieldsItem.blocks[0]?.variant === "reminder");
assert("缺少要素 无 options", (missingFieldsItem.blocks[0]?.options?.length ?? 0) === 0);
assert("缺少要素 3 项", missingFieldsItem.blocks[0]?.items?.length === 3);
assert("缺少要素 含交付日期", missingFieldsItem.blocks[0]?.items?.includes("交付日期"));

// live 复核 + 请确认 + 是否应为（勿误解析为缺少要素提醒）
const reviewConfirmLive = `收到。根据您提供的发货单信息，系统对【客户名称】和【商品名称】进行了复核：

客户名称：原始单据中为"余姚市北贸易有限公司"，但知识库中无完全匹配项，最接近的是"余姚市北一贸易有限公司"（客户编码:C017）。
商品名称：原始单据中为"宁煤 聚丙烯 1100N"，知识库中匹配到标准名称为"聚丙烯宁煤均聚1100N"（商品编码:SKU003）。
请确认：

客户名称是否应为 "余姚市北一贸易有限公司"？
商品名称是否应为 "聚丙烯宁煤均聚1100N"？
请回复确认或提供正确全称。`;
const reviewConfirmItem = normalizeOutputItem(
  { id: "var_review", name: "clarify", type: "TEXT", currentValue: reviewConfirmLive },
  "sales_order",
);
const reviewConfirmBlocks = reviewConfirmItem.blocks.filter((b) => b.type === "choice");
assert("复核请确认 → 2 个 choice 块", reviewConfirmBlocks.length === 2);
assert("复核请确认 非提醒卡", reviewConfirmBlocks[0]?.variant !== "reminder");
assert("复核请确认 客户可点选", reviewConfirmBlocks[0]?.options?.some((o) => o.label.includes("北一")));
assert("复核请确认 商品可点选", reviewConfirmBlocks[1]?.options?.some((o) => o.label.includes("均聚1100N")));

const reviewWithMissingPrefix = `该指令缺少关键要素「客户名称」，该指令缺少关键要素「交付日期」，该指令缺少关键要素「商品列表」。\n\n${reviewConfirmLive}`;
const reviewMixedItem = normalizeOutputItem(
  { id: "var_review_mix", name: "clarify", type: "TEXT", currentValue: reviewWithMissingPrefix },
  "sales_order",
);
const reviewMixedBlocks = reviewMixedItem.blocks.filter((b) => b.type === "choice");
assert("复核+缺少前缀 → 仍为 2 个 choice", reviewMixedBlocks.length === 2);
assert("复核+缺少前缀 非信息提醒", !reviewMixedBlocks.some((b) => b.label === "信息提醒"));
assert("复核+缺少前缀 intro 不含缺少要素", !(reviewMixedItem.blocks[0]?.content || "").includes("缺少关键要素"));

// 场景2 发货单：order_info + items 结构（live OCR 返回值）
const shipmentLiveJson = {
  order_info: {
    单号: "SD202606151104506269",
    日期: "2026-05-25",
    客户编号: "C019",
    业务员: null,
    收货人: null,
    邮编: null,
    收货单位名称: "淮安共创人造草坪制造有限公司",
    传真: null,
    收货单位详细地址: "上海市宝山区罗泾镇沪太路8419号",
    电话: null,
    到达省站: null,
    运输方式: null,
    总金额: 7425,
    物流_快递: null,
  },
  items: [
    {
      物料: "埃克森 聚乙烯 LLDPE LLD1018",
      仓库属地: "浙江杭州仓前仓库",
      单价: "300元/吨",
      要求到货时间: "2026-05-25",
      收货地址: "上海市宝山区罗泾镇沪太路8419号",
      备注: "车牌号：沪GF7778；驾驶员：刘书军；联系电话：18005405525；身份证号：372928198310304112",
      发货数量: "24.75 吨",
    },
  ],
};

const shipmentFormItem = normalizeOutputItem(
  { id: "var_reply", name: "reply", type: "TEXT", currentValue: JSON.stringify(shipmentLiveJson) },
  "shipment",
);
assert("发货单 JSON → form", shipmentFormItem.blocks[0]?.type === "form");
assert("发货单命中 shipment schema", shipmentFormItem.blocks[0]?.schemaKey === "shipment");
assert("发货单表头含单号", shipmentFormItem.blocks[0]?.fields?.some((f) => f.key === "单号"));
assert("发货单表头含收货单位", shipmentFormItem.blocks[0]?.fields?.some((f) => f.key === "收货单位名称"));
assert("发货单 → 明细表", shipmentFormItem.blocks[1]?.type === "table");
assert("发货明细标题", shipmentFormItem.blocks[1]?.title === "发货明细");
assert("发货明细含物料列", shipmentFormItem.blocks[1]?.columns?.includes("物料"));

const shipmentResultItem = normalizeOutputItem(
  { id: "var_confirm", name: "confirm", type: "TEXT", currentValue: "SD202606151104506269" },
  "shipment",
);
assert("发货单号 SD → result", shipmentResultItem.blocks[0]?.type === "result");
assert("SD 结果 schema=shipment", shipmentResultItem.blocks[0]?.schemaKey === "shipment");
assert("SD 结果标题", shipmentResultItem.blocks[0]?.title === "发货申请单已生成");

// 场景2 发货单：markdown 代码块 / 数组包装
const shipmentFence = normalizeOutputItem(
  { id: "var_reply", name: "reply", type: "TEXT", currentValue: "```json\n" + JSON.stringify(shipmentLiveJson) + "\n```" },
  "shipment",
);
assert("发货单 fence → form", shipmentFence.blocks[0]?.type === "form");
assert("发货单 fence schema", shipmentFence.blocks[0]?.schemaKey === "shipment");

const shipmentArrayWrap = normalizeOutputItem(
  { id: "var_reply", name: "reply", type: "ARRAY", currentValue: [shipmentLiveJson] },
  "shipment",
);
assert("发货单 array-wrap → form", shipmentArrayWrap.blocks[0]?.type === "form");
assert("发货单 array-wrap schema", shipmentArrayWrap.blocks[0]?.schemaKey === "shipment");

console.log("\n全部通过");
