import { useCallback, useRef } from "react";
import type { MutableRefObject } from "react";
import { useSessions } from "./useSessions";
import { useComposerState } from "./useComposerState";
import { useChoices } from "./useChoices";
import { useChat } from "./useChat";
import type { ChatCrossDeps } from "./useChat";
import { groupTraces } from "../utils/chatUtils";

export function useChatSession() {
  const choices = useChoices();
  const onFullResetRef = useRef<() => void>(() => {});

  const sessions = useSessions(onFullResetRef);
  const composer = useComposerState(sessions.activeId, sessions.setError);
  const depsRef = useRef<ChatCrossDeps>(null!) as MutableRefObject<ChatCrossDeps>;

  const resolveSessionForSend = useCallback(
    async (
      content: string,
      filesForIntent: { fileName?: string; name?: string }[],
      preferredFlowKey: string | null,
    ) => {
      return await sessions.resolveSessionForSend(
        content, filesForIntent, preferredFlowKey,
        composer.localFiles, composer.attachments,
        composer.setUploading, () => composer.setLocalFiles([]),
      );
    },
    [sessions.resolveSessionForSend, composer.localFiles, composer.attachments],
  );

  depsRef.current = {
    activeId: sessions.activeId,
    flows: sessions.flows,
    draftFlowKey: sessions.draftFlowKey,
    homeMentionFlowKey: composer.homeMentionFlowKey,
    input: composer.input,
    choiceComposerChips: choices.choiceComposerChips,
    localFiles: composer.localFiles,
    attachments: composer.attachments,
    resolveSessionForSend,
    updateSessionTitle: sessions.updateSessionTitle,
    clearChoiceFill: choices.clearChoiceFill,
    setSessions: sessions.setSessions,
    clearComposer: () => {
      composer.setInput("");
      composer.setAttachments([]);
      composer.setHomeMentionFlowKey(null);
    },
  };

  const chat = useChat(depsRef);

  // 完整重置：goHome / handleNewSession 触发
  onFullResetRef.current = () => {
    choices.clearChoiceFill();
    composer.setInput("");
    composer.setAttachments([]);
    composer.setLocalFiles([]);
    composer.setHomeMentionFlowKey(null);
    chat.setMessages([]);
    chat.setLiveTraces([]);
    chat.setTracesByMsg({});
    chat.setDurationByMsg({});
  };

  const loadSession = useCallback(
    async (id: string) => {
      composer.setAttachments([]);
      composer.setLocalFiles([]);
      chat.setLiveTraces([]);
      chat.setDurationByMsg({});
      const { msgs, traces } = await sessions.loadSession(id);
      chat.setMessages(msgs);
      chat.setTracesByMsg(groupTraces(traces));
    },
    [sessions.loadSession, composer.setAttachments, composer.setLocalFiles,
     chat.setLiveTraces, chat.setDurationByMsg, chat.setMessages, chat.setTracesByMsg],
  );

  return {
    flows: sessions.flows,
    sessions: sessions.sessions,
    activeId: sessions.activeId,
    draftFlowKey: sessions.draftFlowKey,
    activeSession: sessions.activeSession,
    activeFlow: sessions.activeFlow,
    isHome: sessions.isHome,
    inDraft: sessions.inDraft,
    canAttach: sessions.canAttach,
    mode: sessions.mode,
    input: composer.input,
    setInput: composer.setInput,
    attachments: composer.attachments,
    localFiles: composer.localFiles,
    uploading: composer.uploading,
    homeMentionFlowKey: composer.homeMentionFlowKey,
    setHomeMentionFlowKey: composer.setHomeMentionFlowKey,
    setAttachments: composer.setAttachments,
    setLocalFiles: composer.setLocalFiles,
    messages: chat.messages,
    sending: chat.sending,
    streamingId: chat.streamingId,
    liveTraces: chat.liveTraces,
    tracesByMsg: chat.tracesByMsg,
    durationByMsg: chat.durationByMsg,
    liveSeconds: chat.liveSeconds,
    error: chat.error,
    intentNotice: chat.intentNotice,
    choiceComposerChips: Object.values(choices.choiceComposerChips),
    selectedChoiceBySlot: choices.selectedChoiceBySlot,
    handleNewSession: sessions.handleNewSession,
    goHome: sessions.goHome,
    loadSession,
    handleSend: chat.handleSend,
    handleFormAction: choices.handleFormAction,
    handleChoiceSelect: choices.handleChoiceSelect,
    handleRemoveChoiceChip: choices.handleRemoveChoiceChip,
    handlePickFiles: composer.handlePickFiles,
    showComposer: sessions.isHome || sessions.activeSession || sessions.inDraft,
    composerPlaceholder: sessions.isHome
      ? "描述需求，或输入 @ 指定智能体（如 @销售订单），Enter 发送"
      : sessions.activeFlow?.placeholder || "给智能体发消息，Enter 发送，Shift+Enter 换行",
  };
}