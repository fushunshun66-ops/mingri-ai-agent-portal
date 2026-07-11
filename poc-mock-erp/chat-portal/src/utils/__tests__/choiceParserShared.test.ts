import { describe, it, expect } from "vitest";
import {
  normalizePlatformQuotes,
  parseBracketSections,
  parseLegacySections,
  hasLineStartBracketFieldSections,
  extractSingleNearMatchName,
  buildYesNoMatchOptions,
  isSingleNearMatchHint,
  applyShipmentYesNoMatchOptions,
  type ParsedChoiceBlocks,
} from "../choiceParserShared";

// ============================================================
// normalizePlatformQuotes
// ============================================================
describe("normalizePlatformQuotes", () => {
  it("将中文双弯引号“”转换为直双引号", () => {
    expect(normalizePlatformQuotes("请确认\u201c客户名称\u201d是否正确")).toBe(
      '请确认"客户名称"是否正确',
    );
  });

  it("将中文单弯引号''转换为直单引号", () => {
    expect(normalizePlatformQuotes("\u2018合同\u2019信息不完整")).toBe(
      "'合同'信息不完整",
    );
  });

  it("保留已存在的直引号不变", () => {
    expect(normalizePlatformQuotes('选择"供应商A"或"供应商B"')).toBe(
      '选择"供应商A"或"供应商B"',
    );
  });

  it("空字符串返回空字符串", () => {
    expect(normalizePlatformQuotes("")).toBe("");
  });

  it("null/undefined 输入返回空字符串", () => {
    expect(normalizePlatformQuotes(null as unknown as string)).toBe("");
    expect(normalizePlatformQuotes(undefined as unknown as string)).toBe("");
  });

  it("不含引号文本原样返回", () => {
    expect(normalizePlatformQuotes("这是一段普通文本")).toBe("这是一段普通文本");
  });
});

// ============================================================
// parseBracketSections
// ============================================================
describe("parseBracketSections", () => {
  it("解析标准【字段名】+ 选项结构", () => {
    const text = "【客户名称】请选择：\n① 江苏优合新材料有限公司\n② 浙江明日控股集团";
    const result = parseBracketSections(text);
    expect(result).not.toBeNull();
    expect(result!.blocks).toHaveLength(1);
    expect(result!.blocks[0].label).toBe("客户名称");
    expect(result!.blocks[0].options).toHaveLength(2);
    expect(result!.blocks[0].options[0].label).toContain("江苏优合");
  });

  it("多个 bracket section 各自解析为独立 block", () => {
    const text =
      "【客户名称】请选择：\n① A公司\n② B公司\n【产品名称】请选择：\n① 产品X\n② 产品Y";
    const result = parseBracketSections(text);
    expect(result).not.toBeNull();
    expect(result!.blocks).toHaveLength(2);
    expect(result!.blocks[0].label).toBe("客户名称");
    expect(result!.blocks[1].label).toBe("产品名称");
  });

  it("bracket 前有引导文本时提取为 intro", () => {
    const text = "请确认以下信息：【客户名称】① 测试公司";
    const result = parseBracketSections(text);
    expect(result).not.toBeNull();
    expect(result!.intro).toBe("请确认以下信息");
  });

  it("intro 末尾冒号被去除", () => {
    const text = "请确认：【客户名称】① 测试公司";
    const result = parseBracketSections(text);
    expect(result).not.toBeNull();
    expect(result!.intro).toBe("请确认");
  });

  it("无【】格式的文本返回 null", () => {
    expect(parseBracketSections("这是一段普通文本")).toBeNull();
  });

  it("空字符串返回 null", () => {
    expect(parseBracketSections("")).toBeNull();
  });
});

// ============================================================
// parseLegacySections
// ============================================================
describe("parseLegacySections", () => {
  it("解析①②③格式的选项行", () => {
    const text = "请选择客户：\n① 江苏优合新材料有限公司\n② 浙江明日控股集团";
    const result = parseLegacySections(text);
    expect(result).not.toBeNull();
    expect(result!.blocks).toHaveLength(1);
    // 无字段名:前缀时默认为"请选择"
    expect(result!.blocks[0].label).toBe("请选择");
    expect(result!.blocks[0].options).toHaveLength(2);
    // 引导文本放入 intro
    expect(result!.intro).toContain("请选择客户");
  });

  it("选项前的引导文本作为 intro", () => {
    const text = "以下为查询结果：\n① 选项A\n② 选项B";
    const result = parseLegacySections(text);
    expect(result).not.toBeNull();
    expect(result!.intro).toContain("以下为查询结果");
  });

  it("无选项标记时返回 null", () => {
    expect(parseLegacySections("这是一段没有选项的文本")).toBeNull();
  });

  it("空文本返回 null", () => {
    expect(parseLegacySections("")).toBeNull();
  });

  it("数字序号(1. 2.)也正确解析", () => {
    const text = "客户名称：请确认以下信息\n1. 江苏优合\n2. 明日控股";
    const result = parseLegacySections(text);
    expect(result).not.toBeNull();
    expect(result!.blocks).toHaveLength(1);
    expect(result!.blocks[0].options).toHaveLength(2);
  });
});

// ============================================================
// hasLineStartBracketFieldSections
// ============================================================
describe("hasLineStartBracketFieldSections", () => {
  it("检测行首【客户…】格式", () => {
    expect(hasLineStartBracketFieldSections("【客户名称】请确认")).toBe(true);
  });

  it("检测行首【商品…】格式", () => {
    expect(hasLineStartBracketFieldSections("【商品名称】请选择")).toBe(true);
  });

  it("检测行首【供应商…】格式", () => {
    expect(hasLineStartBracketFieldSections("【供应商】请确认")).toBe(true);
  });

  it("换行后行首的【】也能检测到", () => {
    expect(hasLineStartBracketFieldSections("前置文本\n【客户名称】请选择")).toBe(true);
  });

  it("非目标字段名返回 false", () => {
    expect(hasLineStartBracketFieldSections("【其他信息】请确认")).toBe(false);
  });

  it("无【】格式返回 false", () => {
    expect(hasLineStartBracketFieldSections("普通文本无括号")).toBe(false);
  });
});

// ============================================================
// extractSingleNearMatchName
// ============================================================
describe("extractSingleNearMatchName", () => {
  it("提取「仅匹配到一个相近项」中的名称", () => {
    const hint = "仅匹配到一个相近项：「江苏优合新材料有限公司」，未找到完全一致的记录";
    expect(extractSingleNearMatchName(hint)).toBe("江苏优合新材料有限公司");
  });

  it("提取「仅匹配到相近项」中的名称", () => {
    const hint = '仅匹配到相近项"测试公司"，请确认';
    expect(extractSingleNearMatchName(hint)).toBe("测试公司");
  });

  it("提取「匹配到相似项」中的名称", () => {
    const hint = "匹配到相似项「A公司」，系统未查询到完全一致项";
    expect(extractSingleNearMatchName(hint)).toBe("A公司");
  });

  it("无匹配模式返回 undefined", () => {
    expect(extractSingleNearMatchName("普通提示文本")).toBeUndefined();
  });

  it("空值返回 undefined", () => {
    expect(extractSingleNearMatchName("")).toBeUndefined();
    expect(extractSingleNearMatchName(undefined)).toBeUndefined();
  });
});

// ============================================================
// buildYesNoMatchOptions
// ============================================================
describe("buildYesNoMatchOptions", () => {
  it("生成是/否选项，是选项的 message 为匹配名", () => {
    const result = buildYesNoMatchOptions("测试公司", 0);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("是");
    expect(result[0].message).toBe("测试公司");
    expect(result[1].label).toBe("否");
    expect(result[1].message).toBe("否");
  });

  it("空匹配名返回空数组", () => {
    expect(buildYesNoMatchOptions("", 0)).toHaveLength(0);
  });

  it("不同 groupIndex 生成不同 id 前缀", () => {
    const r0 = buildYesNoMatchOptions("公司", 0);
    const r1 = buildYesNoMatchOptions("公司", 3);
    expect(r0[0].id).toBe("choice-0-opt-0");
    expect(r1[0].id).toBe("choice-3-opt-0");
  });
});

// ============================================================
// isSingleNearMatchHint
// ============================================================
describe("isSingleNearMatchHint", () => {
  it("仅匹配到相近项 返回 true", () => {
    expect(isSingleNearMatchHint("仅匹配到一个相近项")).toBe(true);
  });

  it("匹配到相似项 返回 true", () => {
    expect(isSingleNearMatchHint("匹配到相似项「公司A」")).toBe(true);
  });

  it("普通文本返回 false", () => {
    expect(isSingleNearMatchHint("请选择客户名称")).toBe(false);
  });
});

// ============================================================
// applyShipmentYesNoMatchOptions
// ============================================================
describe("applyShipmentYesNoMatchOptions", () => {
  it("商品/产品 label 且含近匹配 hint 时转为是/否选项", () => {
    const parsed: ParsedChoiceBlocks = {
      blocks: [
        {
          type: "choice",
          label: "商品名称",
          hint: '仅匹配到一个相近项："测试产品"，未找到完全一致',
          options: [],
        },
      ],
    };
    const result = applyShipmentYesNoMatchOptions(parsed);
    expect(result).not.toBeNull();
    expect(result!.blocks[0].options).toHaveLength(2);
    expect(result!.blocks[0].options[0].label).toBe("是");
  });

  it("非商品/产品 label 不转换", () => {
    const parsed: ParsedChoiceBlocks = {
      blocks: [
        {
          type: "choice",
          label: "客户名称",
          hint: "仅匹配到一个相近项：测试客户",
          options: [],
        },
      ],
    };
    const result = applyShipmentYesNoMatchOptions(parsed);
    expect(result!.blocks[0].options).toHaveLength(0);
  });

  it("无 near-match hint 不转换", () => {
    const parsed: ParsedChoiceBlocks = {
      blocks: [
        {
          type: "choice",
          label: "商品名称",
          hint: "请选择商品",
          options: [{ id: "x", label: "商品A", message: "商品A" }],
        },
      ],
    };
    const result = applyShipmentYesNoMatchOptions(parsed);
    expect(result!.blocks[0].options).toHaveLength(1);
  });

  it("null 输入返回 null", () => {
    expect(applyShipmentYesNoMatchOptions(null)).toBeNull();
  });
});
