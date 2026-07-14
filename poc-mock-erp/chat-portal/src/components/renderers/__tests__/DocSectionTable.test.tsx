import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DocSectionTable } from "../DocSectionTable";

const SIX_COLS = ["商品名称", "数量", "单位", "含税单价", "含税金额", "仓库"];

const SIX_COL_CLASSES = [
  "col-name",
  "col-qty",
  "col-unit",
  "col-price",
  "col-amount",
  "col-stock",
];

describe("DocSectionTable product colgroup", () => {
  it("renders one col per product column for 6-column lineItems", () => {
    const { container } = render(
      <DocSectionTable
        title="商品明细"
        columns={SIX_COLS}
        rows={[
          {
            商品名称: "纯苯",
            数量: 10,
            单位: "吨",
            含税单价: 7200,
            含税金额: 72000,
            仓库: "主仓",
          },
        ]}
      />,
    );

    const cols = container.querySelectorAll("colgroup col");
    expect(cols).toHaveLength(6);
    expect([...cols].map((c) => c.className)).toEqual(SIX_COL_CLASSES);
  });

  it("maps 单价/金额 aliases and unknown columns to fallback class", () => {
    const { container } = render(
      <DocSectionTable
        columns={["商品名称", "数量", "单价", "金额", "备注"]}
        rows={[{ 商品名称: "A", 数量: 1, 单价: 10, 金额: 10, 备注: "x" }]}
      />,
    );

    const classes = [...container.querySelectorAll("colgroup col")].map((c) => c.className);
    expect(classes).toEqual(["col-name", "col-qty", "col-price", "col-amount", "col-extra"]);
  });

  it("still renders 4 cols for classic product layout", () => {
    const { container } = render(
      <DocSectionTable
        columns={["商品名称", "数量", "含税单价", "含税金额"]}
        rows={[{ 商品名称: "A", 数量: 1, 含税单价: 10, 含税金额: 10 }]}
      />,
    );

    const cols = container.querySelectorAll("colgroup col");
    expect(cols).toHaveLength(4);
    expect([...cols].map((c) => c.className)).toEqual([
      "col-name",
      "col-qty",
      "col-price",
      "col-amount",
    ]);
  });

  it("omits colgroup when not a product table", () => {
    const { container } = render(
      <DocSectionTable
        columns={["字段A", "字段B"]}
        rows={[{ 字段A: "1", 字段B: "2" }]}
      />,
    );

    expect(container.querySelector("colgroup")).toBeNull();
  });
});
