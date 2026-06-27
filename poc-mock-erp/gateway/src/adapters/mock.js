/**
 * Mock 模式：按中台「非流式」响应结构返回 POC 三环节样例，便于无 token 时联调。
 * 结构对齐：{ code, success, data: { output: { var_x: ... }, runId, status } }
 */
export function buildMockResponse(flowKey, query, sessionSn) {
  const base = (output) => ({
    code: 0,
    success: true,
    data: {
      output,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      sessionSn,
      runId: Math.floor(Math.random() * 1_000_000),
      status: "SUCCESS",
    },
    message: "操作成功",
  });

  if (flowKey === "sales_order") {
    const needsClarify = /华苏/.test(query) && /聚乙烯/.test(query) && !/华塑物资/.test(query);
    if (needsClarify) {
      return base({
        var_clarify: `您好！您提供的信息中存在以下需要确认的选项。
【客户名称】「上海华苏」
存在多个相似结果，请选择：① 上海华塑物资有限公司；② 上海盈实有限公司
【商品名称】
未在系统中查询到相关记录，请核对后重新输入正确的商品名称，或确认是否需要新增该商品。请回复对应的序号或正确名称，以便我们继续为您处理订单。`,
      });
    }

    return base({
      var_reasoning: `<think>识别到客户「上海华塑」、商品「万华聚氯乙烯七型」、数量 500 吨。用户输入：${query}</think>已为你生成销售订单草稿，请确认信息：`,
      var_order_nested: {
        订单信息: {
          客户名称: "上海华塑物资有限公司",
          交付日期: "2026-06-22",
        },
        金额信息: { 总金额: "3,425,000 元" },
        商品列表: [
          {
            商品名称: "万华聚氯乙烯七型",
            数量: "500 吨",
            单价: "6850 元/吨",
            小计金额: "3,425,000 元",
          },
        ],
      },
      var_order_table: [
        { 字段: "客户", 值: "上海华塑物资有限公司" },
        { 字段: "商品", 值: "万华聚氯乙烯七型" },
        { 字段: "数量", 值: "500 吨" },
        { 字段: "单价", 值: "6850 元/吨" },
        { 字段: "金额", 值: "3,425,000 元" },
        { 字段: "交期", 值: "2026-06-15" },
      ],
      var_confirm: "**订单号 SO260613000001** 已创建，销售订单已完成。",
    });
  }

  if (flowKey === "shipment") {
    const needsClarify = /余姚|飞草|聚丙烯/.test(query) && !/宁煤均聚/.test(query);
    if (needsClarify) {
      return base({
        var_clarify: `**客户名称**：您好，您输入的信息中提供的客户名称【余姚飞草】存在多个相似结果。请确认正确客户名称：
1. 余姚市北一贸易有限公司
2. 余姚市宝明日用品有限公司
3. 余姚市飞草新材料有限公司

**商品名称**：您好，您输入的信息中提供的商品名称「聚丙烯 1100N」与知识库标准名称「宁煤均聚1100N」不完全一致，请确认名称是否准确。`,
      });
    }

    return base({
      var_text: `<think>从提货信息中解析车牌、数量。用户输入：${query}</think>已匹配到待发货订单，生成发货申请单：`,
      var_shipment: {
        order_info: {
          单号: "SR260613000001",
          日期: "2026-06-15",
          客户编号: "C001",
          收货单位名称: "上海华塑物资有限公司",
          收货单位详细地址: "上海市浦东新区张江路100号",
          总金额: 3425000,
        },
        items: [
          {
            物料: "万华聚氯乙烯七型",
            仓库属地: "浙江杭州仓前仓库",
            发货数量: "500 吨",
            单价: "6850元/吨",
            要求到货时间: "2026-06-22",
            收货地址: "上海市浦东新区张江路100号",
            备注: "车牌号：鲁B88888；驾驶员：张三；联系电话：13800138000",
          },
        ],
      },
    });
  }

  if (flowKey === "contract_review") {
    return base({
      JSON1: {
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
            原始数据: "合同：聚乙烯宝丰内蒙线性7042；系统：宝丰7042",
            审核结果: "不通过",
          },
          {
            审核规则名称: "数量一致性",
            规则描述: "比对合同数量与系统订单数量",
            原始数据: "合同：33.0000吨；系统：33吨",
            审核结果: "通过",
          },
          {
            审核规则名称: "订单金额一致性",
            规则描述: "比对合同金额与系统订单金额",
            原始数据: "合同：CNY 278850.00；系统：278850元",
            审核结果: "通过",
          },
        ],
        审核总结: {
          总审核项数: "4",
          通过项数: "3",
          不通过项数: "1",
        },
      },
      var_attach: { fileName: "【已维护】SO260522000232-03.pdf", fileSn: "file-demo-001", fileType: "pdf" },
    });
  }

  return base({ var_text: `（mock）收到输入：${query}` });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock 流式：把 buildMockResponse 的 output 拆成多个事件，带延迟逐条回调，
 * 模拟中台 SSE 的逐节点输出，便于离线验证流式链路。
 */
export async function streamMockResponse(flowKey, query, sessionSn, onEvent) {
  const body = buildMockResponse(flowKey, query, sessionSn);
  const runId = body.data.runId;
  const entries = Object.entries(body.data.output || {});
  for (const [id, currentValue] of entries) {
    if (typeof currentValue === "string") {
      // 模拟中台「增量片段」下发：把字符串切成若干段逐次发送（每次只发新增片段）
      const chunks = chunkString(currentValue, 4);
      for (const piece of chunks) {
        await sleep(120);
        onEvent({ event: "workflow.message", eventStatus: "success", runId, sessionSn, data: { id, name: id, type: "TEXT", currentValue: piece } });
      }
    } else {
      await sleep(420);
      onEvent({ event: "workflow.message", eventStatus: "success", runId, sessionSn, data: { id, name: id, type: "ARRAY", currentValue } });
    }
  }
  await sleep(250);
  onEvent({ event: "workflow.end", eventStatus: "success", runId, data: { status: "SUCCESS" } });
}

function chunkString(str, parts) {
  const size = Math.ceil(str.length / parts);
  const out = [];
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
  return out;
}
