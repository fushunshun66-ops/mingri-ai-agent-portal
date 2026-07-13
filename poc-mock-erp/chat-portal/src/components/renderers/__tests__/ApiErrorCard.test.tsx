import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiErrorCard } from "../ApiErrorCard";

const SAMPLE_FACTS = [
  { key: "field", label: "问题字段", value: "计量单位" },
  { key: "cause", label: "错误原因", value: "录入「ton」不合法，请检查是否与系统档案一致" },
];
const SAMPLE_SUGGESTION = "请确认商品计量单位与系统档案一致，修正后重新提交。";

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
});
