import type { AsrEngine } from "../types/voice";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AsrSettingsSheet({
  engine,
  onEngineChange,
  recordingDisabled = false,
}: {
  engine: AsrEngine;
  onEngineChange: (engine: AsrEngine) => void;
  recordingDisabled?: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="topbar-settings-btn"
            aria-label="设置"
          />
        }
      >
        设置
      </SheetTrigger>
      <SheetContent side="right" className="asr-settings-sheet">
        <SheetHeader>
          <SheetTitle>语音识别</SheetTitle>
          <SheetDescription>
            选择语音识别引擎。录音进行中不可切换。
          </SheetDescription>
        </SheetHeader>
        <div
          className="asr-settings-options px-4 pb-4 flex flex-col gap-3"
          role="radiogroup"
          aria-label="语音识别引擎"
        >
          <label
            className={
              "asr-settings-option" + (engine === "funasr" ? " is-active" : "")
            }
          >
            <input
              type="radio"
              name="asr-engine"
              value="funasr"
              checked={engine === "funasr"}
              disabled={recordingDisabled}
              onChange={() => onEngineChange("funasr")}
            />
            <span className="asr-settings-option-body">
              <span className="asr-settings-option-title">FunASR（本地）</span>
              <span className="asr-settings-option-desc">
                私有部署，数据不出网
              </span>
            </span>
          </label>
          <label
            className={
              "asr-settings-option" + (engine === "qwen" ? " is-active" : "")
            }
          >
            <input
              type="radio"
              name="asr-engine"
              value="qwen"
              checked={engine === "qwen"}
              disabled={recordingDisabled}
              onChange={() => onEngineChange("qwen")}
            />
            <span className="asr-settings-option-body">
              <span className="asr-settings-option-title">Qwen（云端）</span>
              <span className="asr-settings-option-desc">
                需网关配置 Key
              </span>
            </span>
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
