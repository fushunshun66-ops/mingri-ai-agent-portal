import { useEffect, useMemo, useRef, useState } from "react";
import type { ChoiceComposerChip } from "../types/choice";
import type { Flow, UploadedFile } from "../types/message";
import { filterFlowsForMention, findFlowByKey, getMentionRange } from "../utils/agentMention";
import { hasComposerPayload } from "../utils/choiceComposer";
import { ComposerAgentPicker } from "./ComposerAgentPicker";
import { ComposerQuickPrompts, type QuickPrompt } from "./ComposerQuickPrompts";
import { IconAttach, IconClose, IconMic, IconSend } from "./icons";
import type { AudioRecorderHandle } from "../types/voice";

export function Composer({
  isHome,
  value,
  onChange,
  onSend,
  placeholder,
  canAttach,
  uploading,
  sending,
  attachments,
  localFiles,
  choiceChips,
  onRemoveChoiceChip,
  onRemoveLocal,
  onRemoveAttachment,
  onPickFiles,
  mode,
  quickPrompts,
  flowKey,
  flows,
  homeMentionFlowKey,
  onHomeMentionFlow,
  voiceRecorder,
  onVoiceText,
}: {
  isHome: boolean;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  canAttach: boolean;
  uploading: boolean;
  sending: boolean;
  attachments: UploadedFile[];
  localFiles: File[];
  choiceChips?: ChoiceComposerChip[];
  onRemoveChoiceChip?: (slotKey: string) => void;
  onRemoveLocal: (index: number) => void;
  onRemoveAttachment: (fileSn: string) => void;
  onPickFiles: (files: FileList | null) => void;
  mode: string;
  quickPrompts?: QuickPrompt[];
  flowKey?: string;
  flows?: Flow[];
  homeMentionFlowKey?: string | null;
  onHomeMentionFlow?: (flowKey: string | null) => void;
  voiceRecorder?: AudioRecorderHandle;
  onVoiceText?: (text: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [mentionRange, setMentionRange] = useState<{ start: number; query: string } | null>(null);
  const [pickerIndex, setPickerIndex] = useState(0);
  const chips = choiceChips ?? [];
  const homeMentionFlow = findFlowByKey(flows ?? [], homeMentionFlowKey);
  const mentionCandidates = useMemo(
    () => (mentionRange && flows?.length ? filterFlowsForMention(flows, mentionRange.query) : []),
    [mentionRange, flows],
  );
  const showAgentPicker = Boolean(isHome && mentionRange && mentionCandidates.length > 0);

  const syncMentionRange = (text: string, cursor: number) => {
    if (!isHome || !flows?.length || homeMentionFlowKey) {
      setMentionRange(null);
      return;
    }
    setMentionRange(getMentionRange(text, cursor));
    setPickerIndex(0);
  };

  const applyAgentMention = (flow: Flow) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const start = mentionRange?.start ?? cursor;
    const next = `${value.slice(0, start)}${value.slice(cursor)}`.replace(/\s{2,}/g, " ");
    onChange(next.trimStart());
    onHomeMentionFlow?.(flow.flowKey);
    setMentionRange(null);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start;
      el?.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    if (voiceRecorder?.partialText) {
      onChange(voiceRecorder.partialText);
    }
  }, [voiceRecorder?.partialText]);

  const onTextareaKey = (e: React.KeyboardEvent) => {
    if (showAgentPicker) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPickerIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPickerIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        applyAgentMention(mentionCandidates[pickerIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionRange(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!canAttach) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!canAttach) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canAttach) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragOver(false);
    onPickFiles(e.dataTransfer.files);
  };

  const canSend = hasComposerPayload(value, chips, attachments.length > 0 || localFiles.length > 0);

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const pickQuickPrompt = (text: string) => {
    onChange(text);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.focus();
      const len = text.length;
      el?.setSelectionRange(len, len);
    });
  };

  return (
    <div className={`composer-wrap ${isHome ? "composer-wrap-home" : ""}`}>
      {!isHome && quickPrompts && quickPrompts.length > 0 && (
        <ComposerQuickPrompts
          prompts={quickPrompts}
          flowKey={flowKey}
          disabled={sending || uploading}
          onPick={pickQuickPrompt}
        />
      )}
      <div
        className={`composer ${isHome ? "composer-home" : ""} ${dragOver ? "drag-over" : ""} ${voiceRecorder?.status === "recording" ? "composer-recording" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => canAttach && e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragOver && <div className="drag-hint">松开以上传文件</div>}
        {showAgentPicker && (
          <ComposerAgentPicker
            flows={mentionCandidates}
            activeIndex={pickerIndex}
            onPick={applyAgentMention}
            onHover={setPickerIndex}
          />
        )}
        {(chips.length > 0 ||
          attachments.length > 0 ||
          localFiles.length > 0 ||
          (isHome && homeMentionFlow)) && (
          <div className="attach-bar">
            {isHome && homeMentionFlow && (
              <span className={`composer-agent-chip tag-${homeMentionFlow.flowKey}`}>
                <span className="composer-agent-chip-label">@{homeMentionFlow.name}</span>
                <button
                  type="button"
                  className="composer-agent-chip-remove"
                  onClick={() => onHomeMentionFlow?.(null)}
                  aria-label={`取消指定 ${homeMentionFlow.name}`}
                >
                  <IconClose />
                </button>
              </span>
            )}
            {chips.map((chip) => (
              <span className="composer-choice-chip" key={chip.slotKey}>
                <span className="composer-choice-chip-value">{chip.displayLabel}</span>
                <span className="composer-choice-chip-label">{chip.fieldLabel}</span>
                <button
                  type="button"
                  className="composer-choice-chip-remove"
                  onClick={() => onRemoveChoiceChip?.(chip.slotKey)}
                  aria-label={`移除 ${chip.fieldLabel}：${chip.displayLabel}`}
                >
                  <IconClose />
                </button>
              </span>
            ))}
            {localFiles.map((f, i) => (
              <span className="attach-chip" key={`local-${f.name}-${f.size}-${f.lastModified}`}>
                <IconAttach />
                <span className="attach-chip-name">{f.name}</span>
                <button
                  type="button"
                  className="attach-chip-remove"
                  onClick={() => onRemoveLocal(i)}
                  aria-label={`移除附件 ${f.name}`}
                >
                  <IconClose />
                </button>
              </span>
            ))}
            {attachments.map((f) => (
              <span className="attach-chip" key={f.fileSn}>
                <IconAttach />
                <span className="attach-chip-name">{f.fileName}</span>
                <button
                  type="button"
                  className="attach-chip-remove"
                  onClick={() => onRemoveAttachment(f.fileSn)}
                  aria-label={`移除附件 ${f.fileName}`}
                >
                  <IconClose />
                </button>
              </span>
            ))}
          </div>
        )}
        {voiceRecorder?.error && (
          <div className="voice-error" role="alert">
            <span>{voiceRecorder.error}</span>
            <button className="voice-error-close" onClick={() => voiceRecorder.dismissError()} aria-label="关闭">✕</button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          readOnly={voiceRecorder?.status === "recording"}
          aria-label="消息输入"
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            syncMentionRange(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onKeyDown={onTextareaKey}
          onClick={(e) => syncMentionRange(value, (e.target as HTMLTextAreaElement).selectionStart ?? value.length)}
          rows={1}
        />
        <div className="composer-toolbar">
          <div className="composer-tools-left">
            {voiceRecorder?.isSupported && (
              <button
                type="button"
                className={`tool-btn ${voiceRecorder.status === "recording" ? "tool-btn-recording" : ""}`}
                title={voiceRecorder.status === "recording" ? `停止录音 · ${voiceRecorder.durationSec}s` : "语音输入"}
                disabled={voiceRecorder.status === "requesting" || voiceRecorder.status === "error" || sending || uploading}
                onClick={async () => {
                  if (voiceRecorder.status === "recording") {
                    const spoken = await voiceRecorder.stop();
                    if (spoken && onVoiceText) onVoiceText(spoken);
                    requestAnimationFrame(() => {
                      const el = document.querySelector(".composer textarea") as HTMLTextAreaElement | null;
                      el?.focus();
                      const len = el?.value.length ?? 0;
                      el?.setSelectionRange(len, len);
                    });
                  } else {
                    voiceRecorder.start();
                  }
                }}
              >
                {voiceRecorder.status === "recording" ? `● ${formatDuration(voiceRecorder.durationSec)}` : <IconMic />}
              </button>
            )}
            {voiceRecorder?.isSupported && voiceRecorder.status === "recording" && (
              <button
                type="button"
                className="tool-btn tool-btn-cancel"
                title="取消录音"
                onClick={() => voiceRecorder.cancel()}
              >
                取消
              </button>
            )}
            {canAttach && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => onPickFiles(e.target.files)}
                />
                <button
                  type="button"
                  className="tool-btn"
                  title="上传文件（提货函 / 合同附件）"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconAttach />
                  <span>{uploading ? "上传中…" : "附件"}</span>
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            className="send-btn"
            disabled={sending || uploading || !canSend}
            onClick={() => onSend()}
            aria-label="发送"
          >
            <IconSend />
          </button>
        </div>
      </div>
      <div className="composer-hint">
        内容由智能体中台生成，请注意甄别 · {mode === "live" ? "中台已连接" : mode === "offline" ? "中台离线" : mode}
      </div>
    </div>
  );
}
