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
    activeId: "sess-1",
    flows: [],
    draftFlowKey: null,
    homeMentionFlowKey: null,
    input: "",
    choiceComposerChips: {},
    localFiles: [],
    attachments: [],
    resolveSessionForSend: vi.fn(),
    updateSessionTitle: vi.fn(),
    clearChoiceFill: vi.fn(),
    setSessions: vi.fn(),
    clearComposer: vi.fn(),
    ...overrides,
  };
}

describe("useChat handleSend sending gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.sendMessageStream.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 30)),
    );
    mockApi.listMessages.mockResolvedValue([]);
    mockApi.listTraces.mockResolvedValue([]);
    mockApi.listSessions.mockResolvedValue([]);
  });

  it("并发两次 handleSend 时 sendMessageStream 只调用一次（sendingRef）", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => {
      const depsRef = useRef(deps);
      depsRef.current = deps;
      return useChat(depsRef);
    });

    await act(async () => {
      const p1 = result.current.handleSend("确认无误");
      const p2 = result.current.handleSend("确认无误");
      await Promise.all([p1, p2]);
    });

    expect(mockApi.sendMessageStream).toHaveBeenCalledTimes(1);
  });
});
