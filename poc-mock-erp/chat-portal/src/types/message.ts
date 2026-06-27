export type FormField = { key: string; label: string; value: string; widget?: string };
export type FormAction = { id: string; label: string; message: string };

export type MessageBlock =
  | { type: "markdown"; content: string }
  | { type: "text"; content: string }
  | { type: "table"; title?: string; columns: string[]; rows: Record<string, unknown>[] }
  | { type: "card"; title?: string; level?: "info" | "error"; fields: { label: string; value: string }[] }
  | {
      type: "form";
      schemaKey: string;
      title?: string;
      fields: FormField[];
      actions?: FormAction[];
    }
  | { type: "file"; name: string; fileSn?: string | null; url?: string | null; mime?: string | null }
  | { type: "json"; data: unknown; collapsed?: boolean }
  | {
      type: "choice";
      label: string;
      hint?: string;
      options: { id: string; label: string; message: string }[];
      variant?: "confirm" | "reminder";
      items?: string[];
    }
  | {
      type: "result";
      schemaKey: string;
      orderNo: string;
      status?: string;
      title?: string;
      message?: string;
    };

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  blocks: MessageBlock[];
  run_id?: string | null;
  run_status?: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  user_id: string | null;
  flow_key: string;
  agent_sn: string | null;
  version_sn: string | null;
  external_session_sn: string | null;
  created_at: string;
  updated_at: string;
}

export interface Flow {
  flowKey: string;
  name: string;
  description: string;
  placeholder: string;
  acceptsFile: boolean;
  highlights?: string[];
  examples?: { text: string; label?: string }[];
}

export interface IntentDetectResult {
  flowKey: string | null;
  confidence: number;
  reason: string;
  threshold: number;
  candidates: { flowKey: string; score: number; matchedKeywords: string[] }[];
}

export interface UploadedFile {
  fileSn: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  mime?: string;
}

export interface TraceStep {
  id: string;
  session_id: string;
  message_id: string | null;
  step_index: number;
  step_type: string;
  node_id: string | null;
  payload: unknown;
  created_at: string;
}
