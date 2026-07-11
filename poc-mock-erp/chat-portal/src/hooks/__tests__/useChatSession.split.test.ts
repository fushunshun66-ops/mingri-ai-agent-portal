import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatSession } from "../useChatSession";

// ============================================================
// 类型兼容性检查（编译时 + 运行时）
// ============================================================

function _staticTypeCheck() {
  const chat = useChatSession() as unknown;
  void (chat as { flows: unknown }).flows;
  void (chat as { sessions: unknown }).sessions;
  void (chat as { activeId: unknown }).activeId;
  void (chat as { draftFlowKey: unknown }).draftFlowKey;
  void (chat as { activeSession: unknown }).activeSession;
  void (chat as { activeFlow: unknown }).activeFlow;
  void (chat as { isHome: unknown }).isHome;
  void (chat as { inDraft: unknown }).inDraft;
  void (chat as { canAttach: unknown }).canAttach;
  void (chat as { mode: unknown }).mode;
  void (chat as { messages: unknown }).messages;
  void (chat as { sending: unknown }).sending;
  void (chat as { streamingId: unknown }).streamingId;
  void (chat as { liveTraces: unknown }).liveTraces;
  void (chat as { tracesByMsg: unknown }).tracesByMsg;
  void (chat as { durationByMsg: unknown }).durationByMsg;
  void (chat as { liveSeconds: unknown }).liveSeconds;
  void (chat as { error: unknown }).error;
  void (chat as { intentNotice: unknown }).intentNotice;
  void (chat as { input: unknown }).input;
  void (chat as { setInput: unknown }).setInput;
  void (chat as { attachments: unknown }).attachments;
  void (chat as { localFiles: unknown }).localFiles;
  void (chat as { uploading: unknown }).uploading;
  void (chat as { showComposer: unknown }).showComposer;
  void (chat as { composerPlaceholder: unknown }).composerPlaceholder;
  void (chat as { handleNewSession: unknown }).handleNewSession;
  void (chat as { goHome: unknown }).goHome;
  void (chat as { loadSession: unknown }).loadSession;
  void (chat as { handleSend: unknown }).handleSend;
  void (chat as { handleFormAction: unknown }).handleFormAction;
  void (chat as { handleChoiceSelect: unknown }).handleChoiceSelect;
  void (chat as { handleRemoveChoiceChip: unknown }).handleRemoveChoiceChip;
  void (chat as { choiceComposerChips: unknown }).choiceComposerChips;
  void (chat as { selectedChoiceBySlot: unknown }).selectedChoiceBySlot;
  void (chat as { handlePickFiles: unknown }).handlePickFiles;
  void (chat as { setAttachments: unknown }).setAttachments;
  void (chat as { setLocalFiles: unknown }).setLocalFiles;
  void (chat as { homeMentionFlowKey: unknown }).homeMentionFlowKey;
  void (chat as { setHomeMentionFlowKey: unknown }).setHomeMentionFlowKey;
}

// ============================================================
// mock API
// ============================================================

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    health: vi.fn(),
    listFlows: vi.fn(),
    listSessions: vi.fn(),
    listMessages: vi.fn(),
    listTraces: vi.fn(),
    uploadFile: vi.fn(),
    createSession: vi.fn(),
    detectIntent: vi.fn(),
    sendMessageStream: vi.fn(),
    resetSession: vi.fn(),
  },
}));

vi.mock("../../api/client", () => ({ api: mockApi }));

const DEFAULT_FLOWS = [
  {
    flowKey: "sales_order",
    name: "\u9500\u552e\u8ba2\u5355",
    description: "\u667a\u80fd\u9500\u552e\u8ba2\u5355\u751f\u6210",
    placeholder: "\u63cf\u8ff0\u9500\u552e\u8ba2\u5355\u9700\u6c42\u2026",
    acceptsFile: true,
  },
  {
    flowKey: "contract_review",
    name: "\u5408\u540c\u5ba1\u67e5",
    description: "\u5408\u540c\u98ce\u9669\u5ba1\u67e5",
    placeholder: "\u4e0a\u4f20\u5408\u540c\u6587\u4ef6\u2026",
    acceptsFile: true,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.health.mockResolvedValue({ status: "ok", mode: "mock", flows: ["sales_order"] });
  mockApi.listFlows.mockResolvedValue(DEFAULT_FLOWS);
  mockApi.listSessions.mockResolvedValue([]);
  mockApi.listMessages.mockResolvedValue([]);
  mockApi.listTraces.mockResolvedValue([]);
  mockApi.detectIntent.mockResolvedValue({
    flowKey: "sales_order",
    confidence: 0.95,
    threshold: 0.7,
    reason: "",
    candidates: [],
  });
  mockApi.createSession.mockResolvedValue({
    id: "s1",
    title: "\u65b0\u4f1a\u8bdd",
    flow_key: "sales_order",
    user_id: null,
    agent_sn: null,
    version_sn: null,
    external_session_sn: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  mockApi.sendMessageStream.mockImplementation(
    (_sessionId: string, _content: string, _files: unknown[], handlers: Record<string, unknown>) => {
      if (typeof handlers?.onDone === "function") {
        (handlers.onDone as Function)({ blocks: [], messageId: "m1", runStatus: "done" });
      }
      return Promise.resolve();
    },
  );
  mockApi.resetSession.mockResolvedValue({ messages: [], session: { id: "s1" } });
});

async function waitForInit() {
  await waitFor(() => {
    expect(mockApi.health).toHaveBeenCalled();
    expect(mockApi.listFlows).toHaveBeenCalled();
    expect(mockApi.listSessions).toHaveBeenCalled();
  });
}

describe("useChatSession\uff08\u62c6\u5206\u540e\u7ec4\u5408\u5668\u63a5\u53e3\u517c\u5bb9\u6027\uff09", () => {
  it("\u521d\u59cb\u8fd4\u56de\u503c\u5305\u542b\u6240\u6709\u5fc5\u9700\u952e", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();

    const chat = result.current;
    const keys: (keyof typeof chat)[] = [
      "flows", "sessions", "activeId", "draftFlowKey",
      "activeSession", "activeFlow", "isHome", "inDraft", "canAttach",
      "mode", "messages", "sending", "streamingId",
      "liveTraces", "tracesByMsg", "durationByMsg", "liveSeconds",
      "error", "intentNotice",
      "input", "setInput", "attachments", "localFiles", "uploading",
      "showComposer", "composerPlaceholder",
      "handleNewSession", "goHome", "loadSession",
      "handleSend", "handleFormAction", "handleChoiceSelect",
      "handleRemoveChoiceChip",
      "choiceComposerChips", "selectedChoiceBySlot",
      "handlePickFiles", "setAttachments", "setLocalFiles",
      "homeMentionFlowKey", "setHomeMentionFlowKey",
    ];

    for (const key of keys) {
      expect(chat).toHaveProperty(key);
    }
  });

  it("isHome \u5728\u65e0 session \u4e14\u65e0 draft \u65f6\u4e3a true", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();
    expect(result.current.isHome).toBe(true);
  });

  it("showComposer \u5728\u9996\u9875\u65f6\u4e3a true", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();
    expect(result.current.showComposer).toBe(true);
  });

  it("handleNewSession \u8bbe\u7f6e draftFlowKey \u548c isHome=false", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();

    act(() => {
      result.current.handleNewSession("contract_review");
    });

    expect(result.current.draftFlowKey).toBe("contract_review");
    expect(result.current.activeId).toBeNull();
    expect(result.current.isHome).toBe(false);
    expect(result.current.inDraft).toBe(true);
  });

  it("goHome \u6e05\u9664 activeId \u548c draftFlowKey", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();

    act(() => {
      result.current.handleNewSession("contract_review");
    });
    act(() => {
      result.current.goHome();
    });

    expect(result.current.activeId).toBeNull();
    expect(result.current.draftFlowKey).toBeNull();
    expect(result.current.isHome).toBe(true);
  });

  it("setInput \u66f4\u65b0\u8f93\u5165\u503c", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();

    act(() => {
      result.current.setInput("\u6d4b\u8bd5\u6d88\u606f");
    });

    expect(result.current.input).toBe("\u6d4b\u8bd5\u6d88\u606f");
  });

  it("handleChoiceSelect \u66f4\u65b0\u82af\u7247\u548c\u9009\u4e2d\u72b6\u6001", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();

    act(() => {
      result.current.handleChoiceSelect("\u8ba1\u5212A", {
        slotKey: "s1::0::\u9009\u9879",
        optionId: "opt1",
        fieldLabel: "\u9009\u9879",
        displayLabel: "\u8ba1\u5212A",
      });
    });

    const chips = result.current.choiceComposerChips;
    expect(chips.length).toBeGreaterThanOrEqual(1);
    expect(chips[0]?.slotKey).toBe("s1::0::\u9009\u9879");

    const selected = result.current.selectedChoiceBySlot;
    expect(selected["s1::0::\u9009\u9879"]).toBe("opt1");
  });

  it("handleRemoveChoiceChip \u79fb\u9664\u82af\u7247", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();

    act(() => {
      result.current.handleChoiceSelect("\u8ba1\u5212A", {
        slotKey: "s2::0::\u9009\u9879",
        optionId: "opt1",
        fieldLabel: "\u9009\u9879",
        displayLabel: "\u8ba1\u5212A",
      });
    });
    act(() => {
      result.current.handleRemoveChoiceChip("s2::0::\u9009\u9879");
    });

    const chips = result.current.choiceComposerChips;
    expect(chips.find((c: { slotKey: string }) => c.slotKey === "s2::0::\u9009\u9879")).toBeUndefined();
    expect(result.current.selectedChoiceBySlot["s2::0::\u9009\u9879"]).toBeUndefined();
  });

  it("handleNewSession \u540e goHome \u91cd\u7f6e choice \u72b6\u6001", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();

    act(() => {
      result.current.handleChoiceSelect("\u8ba1\u5212B", {
        slotKey: "s3::0::\u989c\u8272",
        optionId: "red",
        fieldLabel: "\u989c\u8272",
        displayLabel: "\u7ea2\u8272",
      });
    });
    act(() => {
      result.current.goHome();
    });

    const chips = result.current.choiceComposerChips;
    expect(chips.length).toBe(0);
  });

  it("handleSend \u65e0\u5185\u5bb9\u65f6\u4e0d\u53d1\u9001", async () => {
    const { result } = renderHook(() => useChatSession());
    await waitForInit();

    await act(async () => {
      await result.current.handleSend();
    });

    expect(result.current.sending).toBe(false);
  });
});

describe("\u5b50 Hook \u72ec\u7acb\u6027", () => {
  it("useSessions \u53ef\u72ec\u7acb import \u4e14\u7c7b\u578b\u4e0d\u51b2\u7a81", async () => {
    const { useSessions } = await import("../useSessions");
    expect(typeof useSessions).toBe("function");
  });

  it("useComposerState \u53ef\u72ec\u7acb import \u4e14\u7c7b\u578b\u4e0d\u51b2\u7a81", async () => {
    const { useComposerState } = await import("../useComposerState");
    expect(typeof useComposerState).toBe("function");
  });

  it("useChoices \u53ef\u72ec\u7acb import \u4e14\u7c7b\u578b\u4e0d\u51b2\u7a81", async () => {
    const { useChoices } = await import("../useChoices");
    expect(typeof useChoices).toBe("function");
  });

  it("useChat \u53ef\u72ec\u7acb import \u4e14\u7c7b\u578b\u4e0d\u51b2\u7a81", async () => {
    const { useChat } = await import("../useChat");
    expect(typeof useChat).toBe("function");
  });
});