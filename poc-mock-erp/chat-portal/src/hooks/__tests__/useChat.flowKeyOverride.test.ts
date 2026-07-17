import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useChat, type ChatCrossDeps } from "../useChat";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    sendMessageStream: vi.fn(),
    listMessages: vi.fn(),
    listTraces: vi.fn(),
    listSessions: vi.fn(),
  },
}));

vi.mock("../../api/client", () => ({ api: mockApi }));

function makeDeps(overrides: Partial<ChatCrossDeps> = {}): ChatCrossDeps {
  return {
    activeId: null,
    flows: [],
    draftFlowKey: null,
    homeMentionFlowKey: null,
    input: "",
    choiceComposerChips: {},
    localFiles: [],
    attachments: [],
    resolveSessionForSend: vi.fn().mockResolvedValue({
      sessionId: "sess-new",
      sentFiles: [],
      notice: null,
    }),
    updateSessionTitle: vi.fn(),
    clearChoiceFill: vi.fn(),
    setSessions: vi.fn(),
    clearComposer: vi.fn(),
    ...overrides,
  };
}

describe("useChat handleSend preferredFlowKeyOverride", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.sendMessageStream.mockResolvedValue(undefined);
    mockApi.listMessages.mockResolvedValue([]);
    mockApi.listTraces.mockResolvedValue([]);
    mockApi.listSessions.mockResolvedValue([]);
  });

  it("传入 flowKeyOverride 时 resolveSessionForSend 收到该 flowKey（draftFlowKey 为 null）", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => {
      const depsRef = useRef(deps);
      depsRef.current = deps;
      return useChat(depsRef);
    });

    await act(async () => {
      await result.current.handleSend("帮我创建订单", "sales_order");
    });

    expect(deps.resolveSessionForSend).toHaveBeenCalledTimes(1);
    expect(deps.resolveSessionForSend).toHaveBeenCalledWith(
      "帮我创建订单",
      expect.any(Array),
      "sales_order",
    );
  });

  it("flowKeyOverride 为 null 时回退到 draftFlowKey", async () => {
    const deps = makeDeps({ draftFlowKey: "shipment" });
    const { result } = renderHook(() => {
      const depsRef = useRef(deps);
      depsRef.current = deps;
      return useChat(depsRef);
    });

    await act(async () => {
      await result.current.handleSend("发货申请", null);
    });

    expect(deps.resolveSessionForSend).toHaveBeenCalledWith(
      "发货申请",
      expect.any(Array),
      "shipment",
    );
  });

  it("不传 flowKeyOverride 时保持原有行为（读 draftFlowKey）", async () => {
    const deps = makeDeps({ draftFlowKey: "contract_review" });
    const { result } = renderHook(() => {
      const depsRef = useRef(deps);
      depsRef.current = deps;
      return useChat(depsRef);
    });

    await act(async () => {
      await result.current.handleSend("合同评审");
    });

    expect(deps.resolveSessionForSend).toHaveBeenCalledWith(
      "合同评审",
      expect.any(Array),
      "contract_review",
    );
  });
});
