import { useEffect, useMemo, useRef, useState } from "react";
import type { ChoiceComposerChip } from "../types/choice";
import type { Flow, UploadedFile } from "../types/message";
import { filterFlowsForMention, findFlowByKey, getMentionRange } from "../utils/agentMention";
import { hasComposerPayload } from "../utils/choiceComposer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { ComposerQuickPrompts, type QuickPrompt } from "./ComposerQuickPrompts";
import { IconAttach, IconChevronRight, IconClose, IconSend, IconWaveform } from "./icons";
import { FLOW_META } from "./flowMeta";
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

  const canSend = hasComposerPayload(value, chips, attachments.length > 0 || localFiles.length > 0);
  const isRecording = voiceRecorder?.status === "recording";

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, isRecording, voiceRecorder?.partialText]);

  // Command 组件挂载时 cmdk 会抢夺焦点，需立即还给 textarea
  useEffect(() => {
    if (showAgentPicker) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [showAgentPicker]);

  const onTextareaKey = (e: React.KeyboardEvent) => {
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
        className={`composer ${isHome ? "composer-home" : ""} ${dragOver ? "drag-over" : ""} ${isRecording ? "composer-recording" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => canAttach && e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragOver && <div className="drag-hint">松开以上传文件</div>}
        {showAgentPicker && (
          <Command
            className="composer-agent-picker"
            shouldFilter={false}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setMentionRange(null);
              }
            }}
          >
            <CommandList>
              <CommandGroup heading="指定智能体">
                {mentionCandidates.map((flow) => {
                  const meta = FLOW_META[flow.flowKey];
                  return (
                    <CommandItem
                      key={flow.flowKey}
                      value={flow.flowKey}
                      className={`composer-agent-picker-item ${meta?.accent || ""}`}
                      onSelect={() => applyAgentMention(flow)}
                    >
                      <span className="composer-agent-picker-dot" />
                      <span className="composer-agent-picker-body">
                        <span className="composer-agent-picker-name">{flow.name}</span>
                        <span className="composer-agent-picker-desc">{flow.description}</span>
                      </span>
                      <IconChevronRight />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
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
        <Textarea
          ref={textareaRef}
          className="composer-textarea"
          value={isRecording ? (voiceRecorder?.partialText || "") : value}
          readOnly={isRecording}
          aria-label="消息输入"
          placeholder={
            isRecording
              ? voiceRecorder?.partialText
                ? undefined
                : "正在聆听，说完后点「结束」…"
              : placeholder
          }
          onChange={(e) => {
            if (isRecording) return;
            onChange(e.target.value);
            syncMentionRange(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onKeyDown={onTextareaKey}
          onClick={(e) => {
            if (isRecording) return;
            syncMentionRange(value, (e.target as HTMLTextAreaElement).selectionStart ?? value.length);
          }}
          rows={1}
        />
        <div className="composer-toolbar">
          <div className="composer-tools-left">
            {voiceRecorder?.isSupported && (
              <Button
                variant="outline"
                size="sm"
                className={`tool-btn ${isRecording ? "tool-btn-recording" : ""}`}
                title={
                  isRecording
                    ? `结束录音 · ${voiceRecorder.durationSec}s`
                    : "语音输入"
                }
                aria-label={
                  isRecording
                    ? `结束录音 · ${voiceRecorder.durationSec}s`
                    : "语音输入"
                }
                disabled={voiceRecorder.status === "requesting" || voiceRecorder.status === "error" || sending || uploading}
                onClick={async () => {
                  try {
                    if (voiceRecorder.status === "recording") {
                      const spoken = await voiceRecorder.stop();
                      if (spoken && onVoiceText) onVoiceText(spoken);
                      requestAnimationFrame(() => {
                        const el = document.querySelector(".composer .composer-textarea") as HTMLTextAreaElement | null;
                        el?.focus();
                        const len = el?.value.length ?? 0;
                        el?.setSelectionRange(len, len);
                      });
                    } else {
                      await voiceRecorder.start();
                    }
                  } catch {
                    // 失败由 voiceRecorder.error UI 展示，避免未处理 rejection
                  }
                }}
              >
                <IconWaveform live={isRecording} level={voiceRecorder.level ?? 0} />
                {isRecording ? <span>结束</span> : null}
              </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="tool-btn"
                  title="上传文件（提货函 / 合同附件）"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconAttach />
                  <span>{uploading ? "上传中…" : "附件"}</span>
                </Button>
              </>
            )}
          </div>
          <button
            className="send-btn"
            disabled={sending || uploading || !canSend}
            onClick={() => onSend()}
            aria-label="发送"
            style={{ background: "var(--primary)", color: "#fff" }}
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
