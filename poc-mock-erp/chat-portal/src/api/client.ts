import type { ChatMessage, Flow, IntentDetectResult, MessageBlock, Session, TraceStep, UploadedFile } from "../types/message";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `请求失败 (HTTP ${res.status})`);
  }
  return json.data as T;
}

export const api = {
  health: () => request<{ status: string; mode: string; flows: string[] }>("/api/health"),
  listFlows: () => request<Flow[]>("/api/flows"),
  detectIntent: (content: string, files: { fileName?: string; name?: string }[] = []) =>
    request<IntentDetectResult>("/api/intent/detect", {
      method: "POST",
      body: JSON.stringify({ content, files }),
    }),
  listSessions: () => request<Session[]>("/api/sessions"),
  createSession: (flowKey: string, title?: string) =>
    request<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ flowKey, title }),
    }),
  listMessages: (sessionId: string) => request<ChatMessage[]>(`/api/sessions/${sessionId}/messages`),
  resetSession: (sessionId: string, ackContent?: string) =>
    request<{ session: Session; messages: ChatMessage[] }>(`/api/sessions/${sessionId}/reset`, {
      method: "POST",
      body: JSON.stringify({ ackContent: ackContent || "" }),
    }),
  listTraces: (sessionId: string) => request<TraceStep[]>(`/api/sessions/${sessionId}/traces`),
  uploadFile: async (sessionId: string, file: File): Promise<UploadedFile> => {
    const dataBase64 = await fileToBase64(file);
    const meta = await request<UploadedFile>(`/api/sessions/${sessionId}/files`, {
      method: "POST",
      body: JSON.stringify({ filename: file.name, mimeType: file.type, dataBase64 }),
    });
    return { ...meta, mime: file.type };
  },
  sendMessage: (sessionId: string, content: string, files: UploadedFile[] = []) =>
    request<{ message: ChatMessage; traceCount: number }>(`/api/sessions/${sessionId}/chat`, {
      method: "POST",
      body: JSON.stringify({ content, files }),
    }),
  sendMessageStream: async (
    sessionId: string,
    content: string,
    files: UploadedFile[],
    handlers: {
      onBlocks?: (blocks: MessageBlock[]) => void;
      onTraces?: (traces: TraceStep[]) => void;
      onSession?: (data: { id: string; title: string }) => void;
      onDone?: (data: {
        messageId: string;
        runStatus: string;
        blocks: MessageBlock[];
        traces: TraceStep[];
        sessionTitle?: string;
      }) => void;
      onError?: (err: Error) => void;
    },
  ): Promise<void> => {
    const res = await fetch(`/api/sessions/${sessionId}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, files }),
    });
    if (!res.ok || !res.body) {
      let msg = `请求失败 (HTTP ${res.status})`;
      try {
        const j = await res.json();
        msg = j.message || msg;
      } catch {
        /* ignore */
      }
      handlers.onError?.(new Error(msg));
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    const dispatch = (raw: string) => {
      let event = "message";
      const dataLines: string[] = [];
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) return;
      let data: unknown;
      try {
        data = JSON.parse(dataLines.join("\n"));
      } catch {
        return;
      }
      const payload = data as Record<string, unknown>;
      if (event === "blocks") handlers.onBlocks?.(payload.blocks as MessageBlock[]);
      else if (event === "traces") handlers.onTraces?.(payload.traces as TraceStep[]);
      else if (event === "session") handlers.onSession?.(payload as unknown as { id: string; title: string });
      else if (event === "done")
        handlers.onDone?.(
          payload as unknown as {
            messageId: string;
            runStatus: string;
            blocks: MessageBlock[];
            traces: TraceStep[];
            sessionTitle?: string;
          },
        );
      else if (event === "error") handlers.onError?.(new Error(String(payload.message || "流式调用失败")));
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        dispatch(raw);
      }
    }
    if (buf.trim()) dispatch(buf);
  },
};
