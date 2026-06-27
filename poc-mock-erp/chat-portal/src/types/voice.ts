export type RecorderStatus = "idle" | "requesting" | "recording" | "error";

export interface AudioRecorderHandle {
  status: RecorderStatus;
  isSupported: boolean;
  partialText: string;
  error: string | null;
  durationSec: number;
  start: () => Promise<void>;
  stop: () => Promise<string>;
  cancel: () => void;
  dismissError: () => void;
}
