import { describe, it, expect } from "vitest";
import {
  localizeOrderResultExtras,
  resolveExtraFieldLabel,
} from "../extraFieldLabel";

describe("resolveExtraFieldLabel", () => {
  it("uses profile override when provided", () => {
    expect(resolveExtraFieldLabel("isExitTax", { isExitTax: "出口税标识" })).toBe("出口税标识");
  });

  it("translates known keys from built-in map", () => {
    expect(resolveExtraFieldLabel("isExitTax", {})).toBe("是否出口退税");
    expect(resolveExtraFieldLabel("pk_salesman_name", {})).toBe("业务员");
    expect(resolveExtraFieldLabel("isCreditWarehouseReceipt", {})).toBe("是否信用仓单");
  });

  it("humanizes is/has prefixes", () => {
    expect(resolveExtraFieldLabel("isSecond", {})).toBe("是否二次业务");
    expect(resolveExtraFieldLabel("hasibmto", {})).toBe("IBMTO 标识");
  });
});

describe("localizeOrderResultExtras", () => {
  it("relabels stored English extras but keeps values unchanged", () => {
    const localized = localizeOrderResultExtras([
      { key: "isExitTax", label: "isExitTax", value: "N" },
      { key: "pk_salesman_name", label: "pk_salesman_name", value: "兰岚" },
      { key: "pk_sign_ver", label: "pk_sign_ver", value: "2274258251927808" },
      { key: "pk_contract_type_name", label: "pk_contract_type_name", value: "我方合同" },
    ]);
    expect(localized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "isExitTax", label: "是否出口退税", value: "N" }),
        expect.objectContaining({ key: "pk_salesman_name", label: "业务员", value: "兰岚" }),
        expect.objectContaining({ key: "pk_contract_type_name", label: "合同类型", value: "我方合同" }),
      ]),
    );
    expect(localized.some((f) => f.key === "pk_sign_ver")).toBe(false);
  });
});
