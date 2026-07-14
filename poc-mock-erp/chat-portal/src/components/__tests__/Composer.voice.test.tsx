import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Composer } from "../Composer";
import type { AudioRecorderHandle } from "../../types/voice";

function baseProps(overrides: Partial<Parameters<typeof Composer>[0]> = {}) {
  return {
    isHome: false,
    value: "",
    onChange: vi.fn(),
    onSend: vi.fn(),
    canAttach: false,
    uploading: false,
    sending: false,
    attachments: [],
    localFiles: [],
    onRemoveLocal: vi.fn(),
    onRemoveAttachment: vi.fn(),
    onPickFiles: vi.fn(),
    mode: "live",
    ...overrides,
  };
}

function mockRecorder(overrides: Partial<AudioRecorderHandle> = {}): AudioRecorderHandle {
  return {
    status: "idle",
    isSupported: true,
    partialText: "",
    error: null,
    durationSec: 0,
    level: 0,
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue("识别结果"),
    cancel: vi.fn(),
    dismissError: vi.fn(),
    ...overrides,
  };
}

function waveBarHeights(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll("[data-wave-bar]")).map((el) =>
    Number((el as HTMLElement).dataset.height),
  );
}

describe("Composer voice button UI", () => {
  it("idle：不显示「结束」，不显示「取消」", () => {
    render(<Composer {...baseProps({ voiceRecorder: mockRecorder({ status: "idle" }) })} />);

    expect(screen.queryByText("结束")).not.toBeInTheDocument();
    expect(screen.queryByText("取消")).not.toBeInTheDocument();
  });

  it("recording：显示「结束」，不显示「取消」", () => {
    render(
      <Composer
        {...baseProps({
          voiceRecorder: mockRecorder({ status: "recording", durationSec: 12 }),
        })}
      />,
    );

    expect(screen.getByText("结束")).toBeInTheDocument();
    expect(screen.queryByText("取消")).not.toBeInTheDocument();
    expect(screen.queryByText(/●/)).not.toBeInTheDocument();
  });

  it("recording：点击主按钮调用 stop，并将识别结果交给 onVoiceText", async () => {
    const stop = vi.fn().mockResolvedValue("你好世界");
    const onVoiceText = vi.fn();
    const voiceRecorder = mockRecorder({ status: "recording", durationSec: 5, stop });

    render(<Composer {...baseProps({ voiceRecorder, onVoiceText })} />);

    fireEvent.click(screen.getByText("结束").closest("button")!);

    await waitFor(() => {
      expect(stop).toHaveBeenCalledTimes(1);
      expect(onVoiceText).toHaveBeenCalledWith("你好世界");
    });
    expect(voiceRecorder.cancel).not.toHaveBeenCalled();
  });

  it("recording：textarea 只读，展示 partialText，不额外蓝化弹层感", () => {
    render(
      <Composer
        {...baseProps({
          value: "已有草稿",
          voiceRecorder: mockRecorder({
            status: "recording",
            durationSec: 3,
            partialText: "正在说的内容",
          }),
        })}
      />,
    );

    const ta = screen.getByLabelText("消息输入");
    expect(ta).toHaveAttribute("readonly");
    expect(ta).toHaveValue("正在说的内容");
    expect(ta.closest(".composer")).toHaveClass("composer-recording");
  });

  it("recording：尚无识别结果时显示聆听提示，不显示草稿", () => {
    render(
      <Composer
        {...baseProps({
          value: "已有草稿",
          voiceRecorder: mockRecorder({ status: "recording", durationSec: 1, partialText: "" }),
        })}
      />,
    );

    const ta = screen.getByLabelText("消息输入");
    expect(ta).toHaveValue("");
    expect(ta).toHaveAttribute("placeholder", "正在聆听，说完后点「结束」…");
  });

  it("idle：点击语音按钮 await start；start 失败不抛未处理 rejection", async () => {
    const start = vi.fn().mockRejectedValue(new Error("mic denied"));
    const voiceRecorder = mockRecorder({ status: "idle", start });

    render(<Composer {...baseProps({ voiceRecorder })} />);

    fireEvent.click(screen.getByLabelText("语音输入"));

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
  });

  it("recording：stop 失败不抛未处理 rejection，且不调用 onVoiceText", async () => {
    const stop = vi.fn().mockRejectedValue(new Error("asr fail"));
    const onVoiceText = vi.fn();
    const voiceRecorder = mockRecorder({ status: "recording", durationSec: 2, stop });

    render(<Composer {...baseProps({ voiceRecorder, onVoiceText })} />);

    fireEvent.click(screen.getByText("结束").closest("button")!);

    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
    expect(onVoiceText).not.toHaveBeenCalled();
  });

  it("idle：声波条为静态高度，不跟 level", () => {
    const { rerender } = render(
      <Composer {...baseProps({ voiceRecorder: mockRecorder({ status: "idle", level: 0 }) })} />,
    );
    const btn = screen.getByLabelText("语音输入");
    const idleHeights = waveBarHeights(btn);
    expect(idleHeights).toHaveLength(4);
    expect(idleHeights.every((h) => Number.isFinite(h) && h > 0)).toBe(true);

    rerender(
      <Composer {...baseProps({ voiceRecorder: mockRecorder({ status: "idle", level: 1 }) })} />,
    );
    expect(waveBarHeights(screen.getByLabelText("语音输入"))).toEqual(idleHeights);
  });

  it("recording：声波条高度随 voiceRecorder.level 增大", () => {
    const { rerender } = render(
      <Composer
        {...baseProps({
          voiceRecorder: mockRecorder({ status: "recording", durationSec: 1, level: 0 }),
        })}
      />,
    );
    const btn = screen.getByLabelText(/结束录音/);
    const low = waveBarHeights(btn);
    expect(low).toHaveLength(4);

    rerender(
      <Composer
        {...baseProps({
          voiceRecorder: mockRecorder({ status: "recording", durationSec: 1, level: 1 }),
        })}
      />,
    );
    const high = waveBarHeights(screen.getByLabelText(/结束录音/));
    expect(high).toHaveLength(4);
    expect(high.every((h, i) => h > low[i]!)).toBe(true);
    // 权重不同 → 假频谱：各 bar 高度不完全相等
    expect(new Set(high).size).toBeGreaterThan(1);
  });
});
