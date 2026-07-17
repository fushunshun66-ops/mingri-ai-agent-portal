import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WelcomeHome } from "../WelcomeHome";
import type { Flow } from "../../types/message";

const MOCK_FLOWS: Flow[] = [
  {
    flowKey: "sales_order",
    name: "销售订单",
    description: "快速创建销售订单",
    placeholder: "请描述订单需求",
    acceptsFile: false,
    examples: [
      { text: "帮我创建一张销售订单" },
      { text: "新增销售订单，客户为ABC公司" },
    ],
  },
];

describe("WelcomeHome 常用示例点击", () => {
  it("点击示例调用 onPickExample(text, flowKey)，不再单独调 onSelectFlow", () => {
    const onPickExample = vi.fn();
    const onSelectFlow = vi.fn();

    render(
      <WelcomeHome
        flows={MOCK_FLOWS}
        onPickExample={onPickExample}
        onSelectFlow={onSelectFlow}
      />,
    );

    const exampleBtn = screen.getByText("帮我创建一张销售订单").closest("button")!;
    fireEvent.click(exampleBtn);

    expect(onPickExample).toHaveBeenCalledTimes(1);
    expect(onPickExample).toHaveBeenCalledWith("帮我创建一张销售订单", "sales_order");
    expect(onSelectFlow).not.toHaveBeenCalled();
  });

  it("点击另一条示例也传入正确的 flowKey", () => {
    const onPickExample = vi.fn();
    const onSelectFlow = vi.fn();

    render(
      <WelcomeHome
        flows={MOCK_FLOWS}
        onPickExample={onPickExample}
        onSelectFlow={onSelectFlow}
      />,
    );

    const exampleBtn = screen.getByText("新增销售订单，客户为ABC公司").closest("button")!;
    fireEvent.click(exampleBtn);

    expect(onPickExample).toHaveBeenCalledWith("新增销售订单，客户为ABC公司", "sales_order");
    expect(onSelectFlow).not.toHaveBeenCalled();
  });

  it("点击业务模块卡片仍然只调 onSelectFlow，不调 onPickExample", () => {
    const onPickExample = vi.fn();
    const onSelectFlow = vi.fn();

    render(
      <WelcomeHome
        flows={MOCK_FLOWS}
        onPickExample={onPickExample}
        onSelectFlow={onSelectFlow}
      />,
    );

    const moduleBtn = screen.getByRole("button", { name: /开始办理：销售订单/ });
    fireEvent.click(moduleBtn);

    expect(onSelectFlow).toHaveBeenCalledWith("sales_order");
    expect(onPickExample).not.toHaveBeenCalled();
  });
});
