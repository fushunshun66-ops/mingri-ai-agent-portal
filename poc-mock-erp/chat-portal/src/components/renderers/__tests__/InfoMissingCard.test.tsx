import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfoMissingCard } from "../InfoMissingCard";

describe("InfoMissingCard", () => {
  it("renders reminder card with title, hint and field chips", () => {
    render(
      <InfoMissingCard
        title="信息缺失"
        fields={["客户姓名", "物料名称"]}
        hint="请在下方输入框补充上述信息后发送。"
      />,
    );

    expect(document.querySelector(".choice-card-reminder")).toBeTruthy();
    expect(document.querySelector(".choice-card-error")).toBeFalsy();
    expect(screen.getByText("信息缺失")).toBeInTheDocument();
    expect(screen.getByText("请在下方输入框补充上述信息后发送。")).toBeInTheDocument();
    expect(screen.getByText("客户姓名")).toBeInTheDocument();
    expect(screen.getByText("物料名称")).toBeInTheDocument();
    expect(document.querySelectorAll(".info-missing-chip")).toHaveLength(2);
  });

  it("shows gray empty message when fields are empty", () => {
    render(
      <InfoMissingCard title="信息缺失" fields={[]} hint="请补充完整后再试。" />,
    );

    expect(screen.getByText("信息缺失")).toBeInTheDocument();
    expect(screen.getByText("请补充完整后再试。")).toBeInTheDocument();
    expect(document.querySelectorAll(".info-missing-chip")).toHaveLength(0);
    expect(screen.getByText("未识别到具体缺失字段")).toBeInTheDocument();
  });

  it("renders duplicate field labels with stable indexed keys", () => {
    const { container } = render(
      <InfoMissingCard title="信息缺失" fields={["客户姓名", "客户姓名"]} hint="补齐信息" />,
    );
    const chips = container.querySelectorAll(".info-missing-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toBe("客户姓名");
    expect(chips[1].textContent).toBe("客户姓名");
  });
});
