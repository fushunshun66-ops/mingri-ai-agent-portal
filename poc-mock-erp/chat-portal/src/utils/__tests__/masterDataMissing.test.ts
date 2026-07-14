import { describe, it, expect } from "vitest";
import { tryParseMasterDataMissing } from "../masterDataMissing";

const REAL_LOG =
  "【主数据缺失】物料主数据缺失，请联系管理员及时补充物料主数据！ 联系人：XXX，178XXXX0903       后续将上线物料主数据自动创建功能，请期待！";

/** suggestion 文案去掉联系人事实行，避免与 fact 重复 */
const EXPECTED_HINT =
  "请联系管理员及时补充物料主数据！ 后续将上线物料主数据自动创建功能，请期待！";

const EXPECTED_FACT_FIELDS = [
  { key: "missingType", label: "缺失类型", value: "物料主数据" },
  { key: "contact", label: "联系人", value: "XXX，178XXXX0903" },
];

describe("tryParseMasterDataMissing", () => {
  it("parses real log into error-card props with factFields (no chip fields only)", () => {
    const result = tryParseMasterDataMissing(REAL_LOG);
    expect(result).toEqual({
      title: "主数据缺失",
      fields: ["物料主数据"],
      hint: EXPECTED_HINT,
      contact: "XXX，178XXXX0903",
      factFields: EXPECTED_FACT_FIELDS,
      raw: REAL_LOG.trim(),
    });
  });

  it("parses halfwidth [主数据缺失] tag the same way", () => {
    const raw =
      "[主数据缺失]物料主数据缺失，请联系管理员及时补充物料主数据！ 联系人：XXX，178XXXX0903       后续将上线物料主数据自动创建功能，请期待！";
    const result = tryParseMasterDataMissing(raw);
    expect(result).toEqual({
      title: "主数据缺失",
      fields: ["物料主数据"],
      hint: EXPECTED_HINT,
      contact: "XXX，178XXXX0903",
      factFields: EXPECTED_FACT_FIELDS,
      raw: raw.trim(),
    });
  });

  it("maps 客户主数据 to missingType fact row without contact", () => {
    const raw = "【主数据缺失】客户主数据缺失，请联系管理员及时补充！";
    const result = tryParseMasterDataMissing(raw);
    expect(result).not.toBeNull();
    expect(result).toEqual({
      title: "主数据缺失",
      fields: ["客户主数据"],
      hint: "请联系管理员及时补充！",
      factFields: [{ key: "missingType", label: "缺失类型", value: "客户主数据" }],
      raw: raw.trim(),
    });
  });

  it("returns null for ordinary markdown and 信息缺失 tag", () => {
    expect(tryParseMasterDataMissing("这是普通 markdown 说明")).toBeNull();
    expect(
      tryParseMasterDataMissing("[信息缺失] 该指令缺少关键要素「客户姓名」。")
    ).toBeNull();
  });

  it("returns null when tag is not at the start", () => {
    expect(
      tryParseMasterDataMissing("提示：【主数据缺失】物料主数据缺失，请联系管理员")
    ).toBeNull();
  });

  it("returns null for empty string or text without tag", () => {
    expect(tryParseMasterDataMissing("")).toBeNull();
    expect(tryParseMasterDataMissing("   ")).toBeNull();
    expect(tryParseMasterDataMissing("物料主数据缺失，请联系管理员")).toBeNull();
  });

  it("returns empty factFields when body has no type prefix and no contact", () => {
    const raw = "【主数据缺失】请联系管理员补充主数据";
    const result = tryParseMasterDataMissing(raw);
    expect(result).toEqual({
      title: "主数据缺失",
      fields: [],
      hint: "请联系管理员补充主数据",
      factFields: [],
      raw: raw.trim(),
    });
  });

  it("extracts contact even when missing type prefix is absent", () => {
    const raw = "【主数据缺失】请联系管理员补充。联系人：张三，13800000000";
    const result = tryParseMasterDataMissing(raw);
    expect(result).toMatchObject({
      title: "主数据缺失",
      fields: [],
      contact: "张三，13800000000",
      hint: "请联系管理员补充。",
      factFields: [{ key: "contact", label: "联系人", value: "张三，13800000000" }],
    });
  });

  it("trims leading whitespace before matching tag", () => {
    const raw = `  ${REAL_LOG}`;
    const result = tryParseMasterDataMissing(raw);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      fields: ["物料主数据"],
      contact: "XXX，178XXXX0903",
      factFields: EXPECTED_FACT_FIELDS,
      raw: REAL_LOG.trim(),
    });
  });
});
