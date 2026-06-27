import { useEffect, useRef, type ReactNode } from "react";
import type { ChatMessage, TraceStep } from "../types/message";
import { BlockRenderer, isDocGroupFollow, isDocGroupLead, renderDocGroup } from "./renderers/BlockRenderer";
import type { ChoiceSelectHandler } from "./renderers/ChoiceConfirmCard";
import { MessageAvatar } from "./MessageAvatar";
import { ProcessPanel } from "./ProcessPanel";

const STICK_THRESHOLD_PX = 80;

export function MessageList({
  messages,
  sending,
  streamingId,
  liveTraces,
  liveSeconds,
  tracesByMsg,
  durationByMsg,
  flowKey,
  onFormAction,
  onChoiceSelect,
  selectedChoiceBySlot,
}: {
  messages: ChatMessage[];
  sending: boolean;
  streamingId?: string | null;
  liveTraces: TraceStep[];
  liveSeconds: number;
  tracesByMsg: Record<string, TraceStep[]>;
  durationByMsg: Record<string, number>;
  flowKey?: string | null;
  onFormAction?: ChoiceSelectHandler;
  onChoiceSelect?: ChoiceSelectHandler;
  selectedChoiceBySlot?: Record<string, string>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      stickToBottomRef.current = true;
    }
    prevMessageCountRef.current = messages.length;

    if (!stickToBottomRef.current) return;

    const isStreaming = Boolean(streamingId && sending);
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
  }, [messages, sending, liveTraces, streamingId]);

  return (
    <div className="message-list" ref={listRef}>
      <div className="message-list-inner">
        {messages.map((msg) => {
          const isStreaming = msg.id === streamingId;
          const isAssistant = msg.role === "assistant";
          const traces = isStreaming ? liveTraces : tracesByMsg[msg.id] || [];
          const seconds = isStreaming ? liveSeconds : durationByMsg[msg.id];
          const avatar = <MessageAvatar role={msg.role} />;

          return (
            <div key={msg.id} className={`message message-${msg.role}`}>
              {isAssistant && avatar}
              <div className="message-body">
                {isAssistant && (traces.length > 0 || isStreaming) && (
                  <ProcessPanel
                    key={`${msg.id}-${isStreaming && sending ? "streaming" : "done"}`}
                    traces={traces}
                    streaming={isStreaming && sending}
                    seconds={seconds}
                  />
                )}
                {msg.blocks.length === 0 && isAssistant ? (
                  traces.length === 0 ? (
                    <div className="typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : null
                ) : (
                  <>
                    {(() => {
                      const rendered: ReactNode[] = [];
                      let i = 0;
                      while (i < msg.blocks.length) {
                        const block = msg.blocks[i];
                        if (isDocGroupLead(block)) {
                          const group = [block];
                          let j = i + 1;
                          while (j < msg.blocks.length && isDocGroupFollow(msg.blocks[j])) {
                            group.push(msg.blocks[j]);
                            j += 1;
                          }
                          rendered.push(
                            <div className="block-doc-group" key={`${msg.id}-doc-${i}`}>
                              {renderDocGroup(group, msg.id, i, onFormAction, sending, selectedChoiceBySlot)}
                            </div>
                          );
                          i = j;
                          continue;
                        }
                        rendered.push(
                          <BlockRenderer
                            key={`${msg.id}-${i}-${block.type}`}
                            messageId={msg.id}
                            blockIndex={i}
                            block={block}
                            flowKey={flowKey}
                            onFormAction={onFormAction}
                            onChoiceSelect={onChoiceSelect}
                            selectedBySlot={selectedChoiceBySlot}
                            formActionDisabled={sending}
                          />
                        );
                        i += 1;
                      }
                      return rendered;
                    })()}
                    {isStreaming && msg.blocks.length > 0 && <span className="stream-cursor" />}
                  </>
                )}
              </div>
              {!isAssistant && avatar}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
