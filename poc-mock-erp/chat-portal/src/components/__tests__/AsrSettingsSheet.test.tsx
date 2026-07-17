import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AsrSettingsSheet } from "../AsrSettingsSheet";
import type { AsrEngine } from "../../types/voice";

describe("AsrSettingsSheet", () => {
  function renderSheet(props?: {
    engine?: AsrEngine;
    onEngineChange?: (e: AsrEngine) => void;
    recordingDisabled?: boolean;
  }) {
    const onEngineChange = props?.onEngineChange ?? vi.fn();
    render(
      <AsrSettingsSheet
        engine={props?.engine ?? "funasr"}
        onEngineChange={onEngineChange}
        recordingDisabled={props?.recordingDisabled ?? false}
      />,
    );
    return { onEngineChange };
  }

  it("渲染「设置」触发按钮", () => {
    renderSheet();
    expect(screen.getByRole("button", { name: /设置/i })).toBeInTheDocument();
  });

  it("点击触发按钮打开面板，显示标题「语音识别」", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    expect(await screen.findByText("语音识别")).toBeInTheDocument();
  });

  it("面板内显示 FunASR 和 Qwen 两个选项", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    expect(await screen.findByText(/FunASR/)).toBeInTheDocument();
    expect(await screen.findByText(/Qwen/)).toBeInTheDocument();
  });

  it("当前引擎 funasr：FunASR 选项处于选中状态", async () => {
    renderSheet({ engine: "funasr" });
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    const funasrBtn = await screen.findByRole("radio", { name: /FunASR/ });
    expect(funasrBtn).toBeChecked();
  });

  it("当前引擎 qwen：Qwen 选项处于选中状态", async () => {
    renderSheet({ engine: "qwen" });
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    const qwenBtn = await screen.findByRole("radio", { name: /Qwen/ });
    expect(qwenBtn).toBeChecked();
  });

  it("点击 Qwen 调用 onEngineChange('qwen')", async () => {
    const { onEngineChange } = renderSheet({ engine: "funasr" });
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    const qwenBtn = await screen.findByRole("radio", { name: /Qwen/ });
    fireEvent.click(qwenBtn);
    expect(onEngineChange).toHaveBeenCalledWith("qwen");
  });

  it("点击 FunASR 调用 onEngineChange('funasr')", async () => {
    const { onEngineChange } = renderSheet({ engine: "qwen" });
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    const funasrBtn = await screen.findByRole("radio", { name: /FunASR/ });
    fireEvent.click(funasrBtn);
    expect(onEngineChange).toHaveBeenCalledWith("funasr");
  });

  it("录音中两个选项均 disabled", async () => {
    renderSheet({ recordingDisabled: true });
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    const funasrBtn = await screen.findByRole("radio", { name: /FunASR/ });
    const qwenBtn = screen.getByRole("radio", { name: /Qwen/ });
    expect(funasrBtn).toBeDisabled();
    expect(qwenBtn).toBeDisabled();
  });

  it("非录音中两个选项均可点击", async () => {
    renderSheet({ recordingDisabled: false });
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    const funasrBtn = await screen.findByRole("radio", { name: /FunASR/ });
    const qwenBtn = screen.getByRole("radio", { name: /Qwen/ });
    expect(funasrBtn).not.toBeDisabled();
    expect(qwenBtn).not.toBeDisabled();
  });

  it("面板内有 FunASR 描述文案（本地私有）", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    expect(await screen.findByText(/本地/)).toBeInTheDocument();
  });

  it("面板内有 Qwen 描述文案（百炼/云端）", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /设置/i }));
    await screen.findByText(/FunASR/);
    expect(screen.getByText(/百炼|云端/)).toBeInTheDocument();
  });
});
