import { useCallback, useEffect, useState, useRef } from "react";
import type { MutableRefObject } from "react";
import { api } from "../api/client";
import type { Flow, Session, UploadedFile } from "../types/message";

const DEFAULT_FLOW_KEY = "sales_order";

export function useSessions(onFullResetRef: MutableRefObject<() => void>) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftFlowKey, setDraftFlowKey] = useState<string | null>(null);
  const [mode, setMode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const activeFlowKey = activeSession?.flow_key || draftFlowKey;
  const activeFlow = flows.find((f) => f.flowKey === activeFlowKey) || null;
  const isHome = !activeSession && !draftFlowKey;
  const inDraft = Boolean(draftFlowKey && !activeSession);
  const canAttach = isHome || inDraft || Boolean(activeFlow?.acceptsFile);

  const goHome = useCallback(() => {
    setActiveId(null);
    setDraftFlowKey(null);
    onFullResetRef.current();
  }, []);

  const handleNewSession = useCallback((flowKey: string) => {
    setError(null);
    setDraftFlowKey(flowKey);
    setActiveId(null);
    onFullResetRef.current();
  }, []);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title } : s)));
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setDraftFlowKey(null);
    setActiveId(id);
    const [msgs, traces] = await Promise.all([
      api.listMessages(id),
      api.listTraces(id).catch(() => []),
    ]);
    return { msgs, traces };
  }, []);

  const resolveSessionForSend = useCallback(
    async (
      content: string,
      filesForIntent: { fileName?: string; name?: string }[],
      preferredFlowKey: string | null,
      localFiles: File[],
      attachments: UploadedFile[],
      onUploadingChange: (v: boolean) => void,
      onLocalFilesClear: () => void,
    ) => {
      if (activeId) return { sessionId: activeId, sentFiles: attachments, notice: null as string | null };

      let flowKey = preferredFlowKey || DEFAULT_FLOW_KEY;
      let notice: string | null = null;

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
        onUploadingChange(true);
        try {
          for (const file of localFiles) {
            sentFiles.push(await api.uploadFile(session.id, file));
          }
          onLocalFilesClear();
        } finally {
          onUploadingChange(false);
        }
      }

      return { sessionId: session.id, sentFiles, notice };
    },
    [activeId, flows],
  );

  useEffect(() => {
    api.health().then((h) => setMode(h.mode)).catch(() => setMode("offline"));
    api.listFlows().then(setFlows).catch((e) => setError(e.message));
    api.listSessions().then(setSessions).catch((e) => setError(e.message));
  }, []);

  return {
    flows, sessions, activeId, draftFlowKey,
    setActiveId, setDraftFlowKey, setSessions,
    activeSession, activeFlow, isHome, inDraft, canAttach,
    mode, error, setError,
    goHome, handleNewSession, loadSession,
    updateSessionTitle, resolveSessionForSend,
  };
}