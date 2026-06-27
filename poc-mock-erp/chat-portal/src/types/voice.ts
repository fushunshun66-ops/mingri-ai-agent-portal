export type RecorderStatus = "idle" | "requesting" | "recording" | "error";

export interface AudioRecorderHandle {
  status: RecorderStatus;
  isSupported: boolean;
  partialText: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<string>;
  cancel: () => void;
}
