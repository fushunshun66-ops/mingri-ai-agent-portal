import { useCallback, useEffect, useRef, useState } from "react";
import type { ChoiceSelectContext } from "../components/renderers/ChoiceConfirmCard";
import type { ChoiceComposerChip } from "../types/choice";
import { api } from "../api/client";
import type { ChatMessage, Flow, Session, TraceStep, UploadedFile } from "../types/message";
import { groupTraces, normalizeLiveTrace } from "../utils/chatUtils";
import { composeChoiceComposerContent, hasComposerPayload } from "../utils/choiceComposer";
import { normalizeChoiceText } from "../utils/choiceText";
import { parseAgentMentionFromContent } from "../utils/agentMention";
import { isSessionResetAck, SESSION_RESET_NOTICE } from "../utils/sessionReset";

const DEFAULT_FLOW_KEY = "sales_order";

export function useChatSession() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftFlowKey, setDraftFlowKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveTraces, setLiveTraces] = useState<TraceStep[]>([]);
  const [tracesByMsg, setTracesByMsg] = useState<Record<string, TraceStep[]>>({});
  const [durationByMsg, setDurationByMsg] = useState<Record<string, number>>({});
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [intentNotice, setIntentNotice] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 每张确认卡片在输入框中对应的芯片（与卡片 slot 绑定） */
  const [choiceComposerChips, setChoiceComposerChips] = useState<Record<string, ChoiceComposerChip>>({});
  const [selectedChoiceBySlot, setSelectedChoiceBySlot] = useState<Record<string, string>>({});
  /** 主页 @ 指定的智能体（不改变 isHome，发送时直达该 flow） */
  const [homeMentionFlowKey, setHomeMentionFlowKey] = useState<string | null>(null);

  const clearChoiceFill = useCallback(() => {
    setChoiceComposerChips({});
    setSelectedChoiceBySlot({});
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const activeFlowKey = activeSession?.flow_key || draftFlowKey;
  const activeFlow = flows.find((f) => f.flowKey === activeFlowKey) || null;
  const isHome = !activeSession && !draftFlowKey;
  const inDraft = Boolean(draftFlowKey && !activeSession);
  const canAttach = isHome || inDraft || Boolean(activeFlow?.acceptsFile);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title } : s)));
  }, []);

  useEffect(() => {
    api.health().then((h) => setMode(h.mode)).catch(() => setMode("offline"));
    api.listFlows().then(setFlows).catch((e) => setError(e.message));
    api.listSessions().then(setSessions).catch((e) => setError(e.message));
  }, []);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
    },
    [],
  );

  const resetConversation = useCallback(() => {
    setMessages([]);
    setLiveTraces([]);
    setTracesByMsg({});
    setDurationByMsg({});
    setAttachments([]);
    setLocalFiles([]);
    clearChoiceFill();
  }, [clearChoiceFill]);

  const loadSession = useCallback(async (id: string) => {
    setDraftFlowKey(null);
    setActiveId(id);
    setAttachments([]);
    setLocalFiles([]);
    setLiveTraces([]);
    setDurationByMsg({});
    const [msgs, traces] = await Promise.all([api.listMessages(id), api.listTraces(id).catch(() => [])]);
    setMessages(msgs);
    setTracesByMsg(groupTraces(traces));
  }, []);

  const handleNewSession = useCallback(
    (flowKey: string) => {
      setError(null);
      setDraftFlowKey(flowKey);
      setActiveId(null);
      resetConversation();
      setInput("");
    },
    [resetConversation],
  );

  const goHome = useCallback(() => {
    setActiveId(null);
    setDraftFlowKey(null);
    setHomeMentionFlowKey(null);
    resetConversation();
  }, [resetConversation]);

  const handlePickFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setError(null);

      if (!activeId) {
        setLocalFiles((prev) => [...prev, ...Array.from(fileList)]);
        return;
      }

      setUploading(true);
      try {
        const uploaded: UploadedFile[] = [];
        for (const file of Array.from(fileList)) {
          uploaded.push(await api.uploadFile(activeId, file));
        }
        setAttachments((prev) => [...prev, ...uploaded]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [activeId],
  );

  const resolveSessionForSend = useCallback(
    async (
      content: string,
      filesForIntent: { fileName?: string; name?: string }[],
      preferredFlowKey: string | null,
    ) => {
      if (activeId) return { sessionId: activeId, sentFiles: attachments, notice: null as string | null };

      let flowKey = preferredFlowKey || DEFAULT_FLOW_KEY;
      let notice: string | null = null;

      // 首页统一入口：无 @/预选流程时才做意图识别
      if (!preferredFlowKey) {
        try {
          const intent = await api.detectIntent(content, filesForIntent);
          if (intent.flowKey && intent.confidence >= intent.threshold) {
            flowKey = intent.flowKey;
            const targetFlow = flows.find((f) => f.flowKey === flowKey);
            notice = `已识别为「${targetFlow?.name || flowKey}」，正在处理…`;
          } else {
            const fallback = flows.find((f) => f.flowKey === DEFAULT_FLOW_KEY);
            notice = `未能明确识别意图，默认使用「${fallback?.name || "智能销售订单生成"}」`;
          }
        } catch {
          notice = null;
        }
      } else {
        const targetFlow = flows.find((f) => f.flowKey === preferredFlowKey);
        notice = `已指定「${targetFlow?.name || preferredFlowKey}」，正在处理…`;
      }

      const session = await api.createSession(flowKey);
      setSessions((prev) => [session, ...prev]);
      setActiveId(session.id);
      setDraftFlowKey(null);

      const sentFiles: UploadedFile[] = [];
      if (localFiles.length) {
        setUploading(true);
        try {
          for (const file of localFiles) {
            sentFiles.push(await api.uploadFile(session.id, file));
          }
          setLocalFiles([]);
        } finally {
          setUploading(false);
        }
      }

      if (notice) {
        setIntentNotice(notice);
        setTimeout(() => setIntentNotice(null), 4000);
      }

      return { sessionId: session.id, sentFiles, notice };
    },
    [activeId, attachments, flows, localFiles],
  );

  const handleSend = useCallback(
    async (overrideContent?: string) => {
      const chipList = Object.values(choiceComposerChips);
      let content =
        typeof overrideContent === "string"
          ? overrideContent.trim()
          : composeChoiceComposerContent(input, chipList);

      let preferredFlowKey = draftFlowKey;
      if (!activeId && !draftFlowKey) {
        const parsedMention = parseAgentMentionFromContent(content, flows);
        if (parsedMention.flowKey) {
          preferredFlowKey = parsedMention.flowKey;
          content = parsedMention.cleanContent;
        } else if (homeMentionFlowKey) {
          preferredFlowKey = homeMentionFlowKey;
        }
      }

      const hasLocal = localFiles.length > 0;
      const hasUploaded = attachments.length > 0;
      if (!hasComposerPayload(content, chipList, hasLocal || hasUploaded) || sending) return;

      setError(null);
      setLiveTraces([]);

      // 已有会话时：「好的 / 完成」等收尾语 → 轮换中台 sessionSn，不继续带上文记忆
      if (
        activeId &&
        isSessionResetAck(content) &&
        chipList.length === 0 &&
        !hasLocal &&
        !hasUploaded
      ) {
        setSending(true);
        try {
          const { messages: refreshed } = await api.resetSession(activeId, content);
          setMessages(refreshed);
          setInput("");
          clearChoiceFill();
          setIntentNotice(SESSION_RESET_NOTICE);
          setTimeout(() => setIntentNotice(null), 4000);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setSending(false);
        }
        return;
      }

      let sessionId = activeId;
      let sentFiles = attachments;

      if (!sessionId) {
        try {
          const resolved = await resolveSessionForSend(
            content,
            [...localFiles.map((f) => ({ fileName: f.name })), ...attachments.map((f) => ({ fileName: f.fileName }))],
            preferredFlowKey,
          );
          sessionId = resolved.sessionId;
          sentFiles = resolved.sentFiles;
          setAttachments([]);
          setHomeMentionFlowKey(null);
        } catch (e) {
          setError((e as Error).message);
          return;
        }
      }

      setInput("");
      setAttachments([]);
      clearChoiceFill();

      const streamId = `stream-${Date.now()}`;
      setStreamingId(streamId);
      const runStart = Date.now();
      setLiveSeconds(0);
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(() => setLiveSeconds(Math.round((Date.now() - runStart) / 1000)), 1000);
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          session_id: sessionId!,
          role: "user",
          blocks: [
            ...(content ? [{ type: "text" as const, content }] : []),
            ...sentFiles.map((f) => ({ type: "file" as const, name: f.fileName, fileSn: f.fileSn, mime: f.mime })),
          ],
          created_at: new Date().toISOString(),
        },
        {
          id: streamId,
          session_id: sessionId!,
          role: "assistant",
          blocks: [],
          created_at: new Date().toISOString(),
        },
      ]);
      setSending(true);

      const updateStream = (patch: Partial<ChatMessage>) =>
        setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, ...patch } : m)));

      try {
        await api.sendMessageStream(sessionId!, content, sentFiles, {
          onBlocks: (blocks) => updateStream({ blocks }),
          onTraces: (traces) =>
            setLiveTraces(traces.map((t) => normalizeLiveTrace(t as unknown as Record<string, unknown>))),
          onSession: ({ id, title }) => updateSessionTitle(id, title),
          onError: (err) => setError(err.message),
        });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (tickRef.current) clearInterval(tickRef.current);
        const durationSec = Math.max(1, Math.round((Date.now() - runStart) / 1000));
        const [msgs, traces] = await Promise.all([
          api.listMessages(sessionId!).catch(() => [] as ChatMessage[]),
          api.listTraces(sessionId!).catch(() => [] as TraceStep[]),
        ]);
        if (msgs.length) {
          setMessages(msgs);
          setTracesByMsg(groupTraces(traces));
          const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) setDurationByMsg((prev) => ({ ...prev, [lastAssistant.id]: durationSec }));
        }
        const latestSessions = await api.listSessions().catch(() => null);
        if (latestSessions) setSessions(latestSessions);
        setLiveTraces([]);
        setSending(false);
        setStreamingId(null);
      }
    },
    [input, choiceComposerChips, localFiles, attachments, sending, activeId, draftFlowKey, homeMentionFlowKey, flows, resolveSessionForSend, updateSessionTitle, clearChoiceFill],
  );

  const handleChoiceSelect = useCallback((message: string, context: ChoiceSelectContext) => {
    const trimmed = normalizeChoiceText(message);
    const { slotKey, optionId, fieldLabel, displayLabel } = context;
    const label = normalizeChoiceText(displayLabel) || trimmed;
    if (!label) return;

    setChoiceComposerChips((prev) => ({
      ...prev,
      [slotKey]: {
        slotKey,
        fieldLabel: normalizeChoiceText(fieldLabel) || fieldLabel,
        displayLabel: label,
        message: label,
        optionId,
      },
    }));

    setSelectedChoiceBySlot((prev) => ({ ...prev, [slotKey]: optionId }));

    requestAnimationFrame(() => {
      const el = document.querySelector(".composer textarea") as HTMLTextAreaElement | null;
      el?.focus();
      const len = el?.value.length ?? 0;
      el?.setSelectionRange(len, len);
    });
  }, []);

  const handleFormAction = handleChoiceSelect;

  const handleRemoveChoiceChip = useCallback((slotKey: string) => {
    setChoiceComposerChips((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    setSelectedChoiceBySlot((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }, []);

  const composerPlaceholder = isHome
    ? "描述需求，或输入 @ 指定智能体（如 @销售订单），Enter 发送"
    : activeFlow?.placeholder || "给智能体发消息，Enter 发送，Shift+Enter 换行";

  const showComposer = isHome || activeSession || inDraft;

  return {
    flows,
    sessions,
    activeId,
    draftFlowKey,
    activeSession,
    activeFlow,
    isHome,
    inDraft,
    canAttach,
    mode,
    messages,
    sending,
    streamingId,
    liveTraces,
    tracesByMsg,
    durationByMsg,
    liveSeconds,
    error,
    intentNotice,
    input,
    setInput,
    attachments,
    localFiles,
    uploading,
    showComposer,
    composerPlaceholder,
    handleNewSession,
    goHome,
    loadSession,
    handleSend,
    handleFormAction,
    handleChoiceSelect,
    handleRemoveChoiceChip,
    choiceComposerChips: Object.values(choiceComposerChips),
    selectedChoiceBySlot,
    handlePickFiles,
    setAttachments,
    setLocalFiles,
    homeMentionFlowKey,
    setHomeMentionFlowKey,
  };
}
