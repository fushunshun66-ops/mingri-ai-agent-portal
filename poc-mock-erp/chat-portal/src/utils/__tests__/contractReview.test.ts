import { describe, it, expect } from "vitest";
import {
  splitContractFormFields,
  orderContractReviewColumns,
  formatAuditResult,
  parseContractReviewCardFields,
  normalizeContractSummary,
  resolveContractDisplayTitle,
  isAuditResultColumn,
  isRawComparisonColumn,
  parseRawComparisonData,
  pickContractBasicFields,
  collectContractSummaryFromFields,
  isContractReviewCardShape,
  type ContractField,
} from "../contractReview";

// ============================================================
// normalizeContractSummary
// ============================================================
describe("normalizeContractSummary", () => {
  it("标准对象格式直接提取", () => {
    const result = normalizeContractSummary({
      总审核项数: "4",
      通过项数: "3",
      不通过项数: "1",
    });
    expect(result).toEqual({
      总审核项数: "4",
      通过项数: "3",
      不通过项数: "1",
    });
  });

  it("兼容旧键名 total/passed/failed", () => {
    const result = normalizeContractSummary({
      total: "5",
      passed: "4",
      failed: "1",
    });
    expect(result).toEqual({
      总审核项数: "5",
      通过项数: "4",
      不通过项数: "1",
    });
  });

  it("纯文本格式解析", () => {
    const result = normalizeContractSummary(
      "总审核项数：4项，通过：3项，不通过：1项",
    );
    expect(result).toEqual({
      总审核项数: "4",
      通过项数: "3",
      不通过项数: "1",
    });
  });

  it("JSON 字符串自动解析", () => {
    const json = JSON.stringify({ 总审核项数: "6", 通过项数: "6", 不通过项数: "0" });
    const result = normalizeContractSummary(json);
    expect(result).toEqual({
      总审核项数: "6",
      通过项数: "6",
      不通过项数: "0",
    });
  });

  it("null/undefined 返回 null", () => {
    expect(normalizeContractSummary(null)).toBeNull();
    expect(normalizeContractSummary(undefined)).toBeNull();
  });

  it("空字符串返回 null", () => {
    expect(normalizeContractSummary("")).toBeNull();
  });
});

// ============================================================
// pickContractBasicFields
// ============================================================
describe("pickContractBasicFields", () => {
  it("过滤出合同名称、客户名称、合同编号", () => {
    const fields: ContractField[] = [
      { label: "合同名称", value: "购销合同" },
      { label: "客户名称", value: "测试公司" },
      { label: "总审核项数", value: "3" },
    ];
    const result = pickContractBasicFields(fields);
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.label)).toEqual(["合同名称", "客户名称"]);
  });

  it("无基本字段时排除审核总结字段", () => {
    const fields: ContractField[] = [
      { label: "总审核项数", value: "3" },
      { label: "其他信息", value: "备注" },
      { label: "不通过", value: "1" },
    ];
    const result = pickContractBasicFields(fields);
    expect(result).toEqual([{ label: "其他信息", value: "备注" }]);
  });
});

// ============================================================
// collectContractSummaryFromFields
// ============================================================
describe("collectContractSummaryFromFields", () => {
  it("从字段列表中收集审核总结", () => {
    const fields: ContractField[] = [
      { label: "总审核项数", value: "5" },
      { label: "通过项数", value: "4" },
      { label: "不通过项数", value: "1" },
    ];
    const result = collectContractSummaryFromFields(fields);
    expect(result).toEqual({
      总审核项数: "5",
      通过项数: "4",
      不通过项数: "1",
    });
  });

  it("含审核总结嵌套字段时解析内部值", () => {
    const summaryJson = JSON.stringify({ 总审核项数: "3", 通过项数: "3", 不通过项数: "0" });
    const fields: ContractField[] = [
      { label: "审核总结", value: summaryJson },
    ];
    const result = collectContractSummaryFromFields(fields);
    expect(result).toEqual({
      总审核项数: "3",
      通过项数: "3",
      不通过项数: "0",
    });
  });

  it("无审核相关字段返回 null", () => {
    const fields: ContractField[] = [
      { label: "合同名称", value: "购销合同" },
    ];
    expect(collectContractSummaryFromFields(fields)).toBeNull();
  });
});

// ============================================================
// splitContractFormFields
// ============================================================
describe("splitContractFormFields", () => {
  it("混合字段正确分离为基本信息和审核总结", () => {
    const fields: ContractField[] = [
      { label: "合同名称", value: "化工产品购销合同" },
      { label: "客户名称", value: "江苏优合新材料有限公司" },
      { label: "合同编号", value: "S0260519000383" },
      { label: "总审核项数", value: "4" },
      { label: "通过项数", value: "3" },
      { label: "不通过项数", value: "1" },
    ];
    const { basicFields, summary } = splitContractFormFields(fields);
    expect(basicFields).toHaveLength(3);
    expect(basicFields[0].label).toBe("合同名称");
    expect(summary).toEqual({
      总审核项数: "4",
      通过项数: "3",
      不通过项数: "1",
    });
  });
});

// ============================================================
// parseContractReviewCardFields
// ============================================================
describe("parseContractReviewCardFields", () => {
  const basicJson = JSON.stringify({
    合同名称: "化工产品购销合同",
    客户名称: "江苏优合新材料有限公司",
    合同编号: "S0260519000383",
  });

  const auditJson = JSON.stringify([
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
  ]);

  const summaryJson = JSON.stringify({
    总审核项数: "4",
    通过项数: "3",
    不通过项数: "1",
  });

  it("三块字符串正确解析为基本字段、表格区块和总结", () => {
    const fields: ContractField[] = [
      { label: "基本信息", value: basicJson },
      { label: "审核内容", value: auditJson },
      { label: "审核总结", value: summaryJson },
    ];
    const result = parseContractReviewCardFields(fields);

    expect(result.basicFields).toHaveLength(3);
    expect(result.basicFields.map((f) => f.label)).toEqual([
      "合同名称",
      "客户名称",
      "合同编号",
    ]);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe("审核内容");
    expect(result.sections[0].rows).toHaveLength(2);

    expect(result.summary).toEqual({
      总审核项数: "4",
      通过项数: "3",
      不通过项数: "1",
    });
  });

  it("空 fields 返回空结构", () => {
    const result = parseContractReviewCardFields([]);
    expect(result.basicFields).toHaveLength(0);
    expect(result.sections).toHaveLength(0);
    expect(result.summary).toBeNull();
  });
});

// ============================================================
// orderContractReviewColumns
// ============================================================
describe("orderContractReviewColumns", () => {
  it("审核结果列排到末尾", () => {
    const columns = ["审核规则名称", "审核结果", "规则描述"];
    const result = orderContractReviewColumns(columns);
    // 审核结果应在最后
    expect(result[result.length - 1]).toBe("审核结果");
  });

  it("结论列排到末尾", () => {
    const columns = ["字段", "结论", "合同值"];
    const result = orderContractReviewColumns(columns);
    expect(result[result.length - 1]).toBe("结论");
  });

  it("风险等级排到末尾", () => {
    const columns = ["审核规则名称", "风险等级", "规则描述"];
    const result = orderContractReviewColumns(columns);
    expect(result[result.length - 1]).toBe("风险等级");
  });

  it("无审核结果列时保持原顺序", () => {
    const columns = ["审核规则名称", "规则描述", "合同值"];
    const result = orderContractReviewColumns(columns);
    expect(result).toEqual(["审核规则名称", "规则描述", "合同值"]);
  });

  it("去重", () => {
    const columns = ["审核规则名称", "审核规则名称", "审核结果"];
    const result = orderContractReviewColumns(columns);
    expect(result).toHaveLength(2);
  });

  it("空数组返回空数组", () => {
    expect(orderContractReviewColumns([])).toEqual([]);
  });
});

// ============================================================
// formatAuditResult
// ============================================================
describe("formatAuditResult", () => {
  it("通过 返回 pass 语气", () => {
    const result = formatAuditResult("通过");
    expect(result.tone).toBe("pass");
    expect(result.text).toBe("通过");
  });

  it("不通过 返回 fail 语气", () => {
    const result = formatAuditResult("不通过");
    expect(result.tone).toBe("fail");
    expect(result.text).toBe("不通过");
  });

  it("高风险 返回 fail 语气", () => {
    const result = formatAuditResult("高风险");
    expect(result.tone).toBe("fail");
  });

  it("不一致 返回 fail 语气", () => {
    expect(formatAuditResult("数据不一致").tone).toBe("fail");
  });

  it("正常 返回 pass 语气", () => {
    expect(formatAuditResult("正常").tone).toBe("pass");
  });

  it("无匹配关键词返回 neutral", () => {
    const result = formatAuditResult("待确认");
    expect(result.tone).toBe("neutral");
  });

  it("空值返回 neutral 空文本", () => {
    const result = formatAuditResult(null);
    expect(result.tone).toBe("neutral");
    expect(result.text).toBe("");
  });

  it("大小写不敏感(Pass → pass)", () => {
    expect(formatAuditResult("Pass").tone).toBe("pass");
    expect(formatAuditResult("FAIL").tone).toBe("fail");
  });
});

// ============================================================
// resolveContractDisplayTitle
// ============================================================
describe("resolveContractDisplayTitle", () => {
  it("无标题或 reply 返回默认标题", () => {
    expect(resolveContractDisplayTitle()).toBe("合同评审结果");
    expect(resolveContractDisplayTitle("")).toBe("合同评审结果");
    expect(resolveContractDisplayTitle("reply")).toBe("合同评审结果");
    expect(resolveContractDisplayTitle("结果")).toBe("合同评审结果");
  });

  it("json 类标题返回默认标题", () => {
    expect(resolveContractDisplayTitle("json1")).toBe("合同评审结果");
    expect(resolveContractDisplayTitle("JSON2")).toBe("合同评审结果");
  });

  it("合同附件智能评审 返回默认标题", () => {
    expect(resolveContractDisplayTitle("合同附件智能评审")).toBe("合同评审结果");
  });

  it("其他标题原样返回", () => {
    expect(resolveContractDisplayTitle("销售合同评审")).toBe("销售合同评审");
  });
});

// ============================================================
// isAuditResultColumn
// ============================================================
describe("isAuditResultColumn", () => {
  it("审核结果为审核结果列", () => {
    expect(isAuditResultColumn("审核结果")).toBe(true);
  });

  it("结论为审核结果列", () => {
    expect(isAuditResultColumn("结论")).toBe(true);
  });

  it("风险等级为审核结果列", () => {
    expect(isAuditResultColumn("风险等级")).toBe(true);
  });

  it("规则描述不是审核结果列", () => {
    expect(isAuditResultColumn("规则描述")).toBe(false);
  });
});

// ============================================================
// isRawComparisonColumn
// ============================================================
describe("isRawComparisonColumn", () => {
  it("原始数据为比对列", () => {
    expect(isRawComparisonColumn("原始数据")).toBe(true);
  });

  it("原始数据比对为比对列", () => {
    expect(isRawComparisonColumn("原始数据比对")).toBe(true);
  });

  it("其他列不是比对列", () => {
    expect(isRawComparisonColumn("审核结果")).toBe(false);
  });
});

// ============================================================
// parseRawComparisonData
// ============================================================
describe("parseRawComparisonData", () => {
  it("对象格式解析为带 label 的键值对", () => {
    const result = parseRawComparisonData({ 合同值: "100", ERP值: "100" });
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ label: "合同", value: "100" });
    expect(result![1]).toEqual({ label: "系统", value: "100" });
  });

  it("JSON 字符串解析", () => {
    const json = JSON.stringify({ 合同数据: "合同A", 系统数据: "系统B" });
    const result = parseRawComparisonData(json);
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ label: "合同", value: "合同A" });
  });

  it("分号分隔的纯文本", () => {
    const result = parseRawComparisonData("合同：100；系统：100");
    expect(result).toHaveLength(2);
  });

  it("null 返回 null", () => {
    expect(parseRawComparisonData(null)).toBeNull();
  });

  it("空字符串返回 null", () => {
    expect(parseRawComparisonData("")).toBeNull();
  });
});

// ============================================================
// isContractReviewCardShape
// ============================================================
describe("isContractReviewCardShape", () => {
  it("含基本信息、审核内容、审核总结 返回 true", () => {
    const fields: ContractField[] = [
      { label: "基本信息", value: "{}" },
      { label: "审核内容", value: "[]" },
      { label: "审核总结", value: "{}" },
    ];
    expect(isContractReviewCardShape(fields)).toBe(true);
  });

  it("只有基本信息也返回 true", () => {
    const fields: ContractField[] = [
      { label: "基本信息", value: "{}" },
    ];
    expect(isContractReviewCardShape(fields)).toBe(true);
  });

  it("不匹配返回 false", () => {
    const fields: ContractField[] = [
      { label: "订单号", value: "SO123" },
    ];
    expect(isContractReviewCardShape(fields)).toBe(false);
  });
});
