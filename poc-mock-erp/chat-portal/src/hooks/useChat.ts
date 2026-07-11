import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { api } from "../api/client";
import type { ChatMessage, TraceStep, UploadedFile } from "../types/message";
import type { ChoiceComposerChip } from "../types/choice";
import type { Flow } from "../types/message";
import { groupTraces, normalizeLiveTrace } from "../utils/chatUtils";
import { composeChoiceComposerContent, hasComposerPayload } from "../utils/choiceComposer";
import { parseAgentMentionFromContent } from "../utils/agentMention";
import { isSessionResetAck, SESSION_RESET_NOTICE } from "../utils/sessionReset";

/** useChat 从外部 Hook 读取的跨域依赖 */
export interface ChatCrossDeps {
  activeId: string | null;
  flows: Flow[];
  draftFlowKey: string | null;
  homeMentionFlowKey: string | null;
  input: string;
  choiceComposerChips: Record<string, ChoiceComposerChip>;
  localFiles: File[];
  attachments: UploadedFile[];
  /** 创建会话 + 意图识别 + 上传本地文件 */
  resolveSessionForSend: (
    content: string,
    filesForIntent: { fileName?: string; name?: string }[],
    preferredFlowKey: string | null,
  ) => Promise<{ sessionId: string; sentFiles: UploadedFile[]; notice: string | null }>;
  updateSessionTitle: (id: string, title: string) => void;
  clearChoiceFill: () => void;
  /** 外部设置 sessions 列表（流式完成后回调） */
  setSessions: (fn: (prev: import("../types/message").Session[]) => import("../types/message").Session[]) => void;
  /** 清除 composer 状态 */
  clearComposer: () => void;
}

export function useChat(depsRef: MutableRefObject<ChatCrossDeps>) {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveTraces, setLiveTraces] = useState<TraceStep[]>([]);
  const [tracesByMsg, setTracesByMsg] = useState<Record<string, TraceStep[]>>({});
  const [durationByMsg, setDurationByMsg] = useState<Record<string, number>>({});
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [intentNotice, setIntentNotice] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
    },
    [],
  );

  const handleSend = useCallback(
    async (overrideContent?: string) => {
      const deps = depsRef.current;

      const chipList = Object.values(deps.choiceComposerChips);
      let content =
        typeof overrideContent === "string"
          ? overrideContent.trim()
          : composeChoiceComposerContent(deps.input, chipList);

      let preferredFlowKey = deps.draftFlowKey;
      if (!deps.activeId && !deps.draftFlowKey) {
        const parsedMention = parseAgentMentionFromContent(content, deps.flows);
        if (parsedMention.flowKey) {
          preferredFlowKey = parsedMention.flowKey;
          content = parsedMention.cleanContent;
        } else if (deps.homeMentionFlowKey) {
          preferredFlowKey = deps.homeMentionFlowKey;
        }
      }

      const hasLocal = deps.localFiles.length > 0;
      const hasUploaded = deps.attachments.length > 0;
      if (!hasComposerPayload(content, chipList, hasLocal || hasUploaded) || sending) return;

      setError(null);
      setLiveTraces([]);

      // 已有会话时：「好的 / 完成」等收尾语 → 轮换中台 sessionSn
      if (
        deps.activeId &&
        isSessionResetAck(content) &&
        chipList.length === 0 &&
        !hasLocal &&
        !hasUploaded
      ) {
        setSending(true);
        try {
          const { messages: refreshed } = await api.resetSession(deps.activeId, content);
          setMessages(refreshed);
          deps.clearChoiceFill();
          setIntentNotice(SESSION_RESET_NOTICE);
          setTimeout(() => setIntentNotice(null), 4000);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setSending(false);
        }
        return;
      }

      let sessionId = deps.activeId;
      let sentFiles = deps.attachments;

      if (!sessionId) {
        try {
          const resolved = await deps.resolveSessionForSend(
            content,
            [
              ...deps.localFiles.map((f) => ({ fileName: f.name })),
              ...deps.attachments.map((f) => ({ fileName: f.fileName })),
            ],
            preferredFlowKey,
          );
          sessionId = resolved.sessionId;
          sentFiles = resolved.sentFiles;
          if (resolved.notice) {
            setIntentNotice(resolved.notice);
            setTimeout(() => setIntentNotice(null), 4000);
          }
          // 清空 composer（handleSend 原逻辑：setInput(""), setAttachments([]), setHomeMentionFlowKey(null)）
          deps.clearComposer();
        } catch (e) {
          setError((e as Error).message);
          return;
        }
      }

      deps.clearChoiceFill();
      if (deps.activeId) {
        // 已有会话也要清 composer（handleSend 原有行为）
        deps.clearComposer();
      }

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
          onSession: ({ id, title }) => deps.updateSessionTitle(id, title),
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
        if (latestSessions) deps.setSessions(() => latestSessions);
        setLiveTraces([]);
        setSending(false);
        setStreamingId(null);
      }
    },
    [depsRef, sending],
  );

  return {
    messages,
    setMessages,
    liveTraces,
    setLiveTraces,
    tracesByMsg,
    setTracesByMsg,
    durationByMsg,
    setDurationByMsg,
    liveSeconds,
    sending,
    streamingId,
    error,
    setError,
    intentNotice,
    setIntentNotice,
    handleSend,
    tickRef,
  };
}
