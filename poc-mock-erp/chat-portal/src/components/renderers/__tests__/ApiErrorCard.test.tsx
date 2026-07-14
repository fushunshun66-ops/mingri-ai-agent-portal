import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiErrorCard } from "../ApiErrorCard";
import { tryParseMasterDataMissing } from "../../../utils/masterDataMissing";

const SAMPLE_FACTS = [
  { key: "field", label: "问题字段", value: "计量单位" },
  { key: "cause", label: "错误原因", value: "录入「ton」不合法，请检查是否与系统档案一致" },
];
const SAMPLE_SUGGESTION = "请确认商品计量单位与系统档案一致，修正后重新提交。";

const MASTER_DATA_LOG =
  "【主数据缺失】物料主数据缺失，请联系管理员及时补充物料主数据！ 联系人：XXX，178XXXX0903       后续将上线物料主数据自动创建功能，请期待！";

describe("ApiErrorCard", () => {
  it("uses choice-card layout with structured fact rows", () => {
    render(
      <ApiErrorCard
        title="订单保存失败"
        suggestion={SAMPLE_SUGGESTION}
        factFields={SAMPLE_FACTS}
        detailFields={[]}
      />,
    );

    expect(document.querySelector(".choice-card-error")).toBeTruthy();
    expect(screen.getByText("订单保存失败")).toBeInTheDocument();
    expect(screen.getByText("问题字段")).toBeInTheDocument();
    expect(screen.getByText("计量单位")).toBeInTheDocument();
    expect(screen.getByText(/请确认商品计量单位/)).toBeInTheDocument();
    expect(screen.queryByText("处理建议")).not.toBeInTheDocument();
    expect(screen.queryByText(/9ea02a0b/)).not.toBeInTheDocument();
  });

  it("hides technical ids until expanded", () => {
    render(
      <ApiErrorCard
        title="订单保存失败"
        suggestion={SAMPLE_SUGGESTION}
        factFields={SAMPLE_FACTS}
        detailFields={[
          { key: "code", label: "错误码", value: "999" },
          { key: "detailId", label: "详情 ID", value: "9ea02a0b-3a48-4051-bcbe-59c7bcc7a25b" },
        ]}
      />,
    );

    expect(screen.queryByText(/9ea02a0b/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /技术详情/ }));
    expect(screen.getByText("9ea02a0b-3a48-4051-bcbe-59c7bcc7a25b")).toHaveClass(
      "choice-error-details-value--mono",
    );
  });

  it("omits technical details section when empty", () => {
    render(
      <ApiErrorCard title="处理未成功" suggestion={SAMPLE_SUGGESTION} factFields={SAMPLE_FACTS} detailFields={[]} />,
    );

    expect(screen.queryByRole("button", { name: /技术详情/ })).not.toBeInTheDocument();
  });

  it("renders master-data-missing parse result as red error card without chips", () => {
    const parsed = tryParseMasterDataMissing(MASTER_DATA_LOG);
    expect(parsed).not.toBeNull();

    render(
      <ApiErrorCard
        title={parsed!.title}
        suggestion={parsed!.hint}
        factFields={parsed!.factFields}
        detailFields={[]}
      />,
    );

    expect(document.querySelector(".choice-card-error")).toBeTruthy();
    expect(document.querySelector(".choice-card-reminder")).toBeNull();
    expect(document.querySelector(".info-missing-chip")).toBeNull();
    expect(screen.getByText("主数据缺失")).toBeInTheDocument();
    expect(screen.getByText("缺失类型")).toBeInTheDocument();
    expect(screen.getByText("物料主数据")).toBeInTheDocument();
    expect(screen.getByText("联系人")).toBeInTheDocument();
    expect(screen.getByText("XXX，178XXXX0903")).toBeInTheDocument();
    expect(screen.getByText(/请联系管理员及时补充物料主数据/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /技术详情/ })).not.toBeInTheDocument();
  });
});
