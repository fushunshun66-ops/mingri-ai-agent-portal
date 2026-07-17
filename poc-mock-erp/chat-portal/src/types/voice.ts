export type RecorderStatus = "idle" | "requesting" | "recording" | "error";

export type AsrEngine = "funasr" | "qwen";

export interface AudioRecorderHandle {
  status: RecorderStatus;
  isSupported: boolean;
  partialText: string;
  error: string | null;
  durationSec: number;
  /** 录音中的归一化音量 [0,1]；idle / 非 recording 为 0 */
  level: number;
  start: () => Promise<void>;
  stop: () => Promise<string>;
  cancel: () => void;
  dismissError: () => void;
}
