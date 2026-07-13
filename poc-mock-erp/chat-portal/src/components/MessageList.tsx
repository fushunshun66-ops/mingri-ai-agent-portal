import { useEffect, useRef, type ReactNode } from "react";
import type { ChatMessage, MessageBlock, TraceStep } from "../types/message";
import { BlockRenderer, isDocGroupFollow, isDocGroupLead, renderDocGroup } from "./renderers/BlockRenderer";
import type { ChoiceSelectHandler } from "./renderers/ChoiceConfirmCard";
import { MessageAvatar } from "./MessageAvatar";
import { ProcessPanel } from "./ProcessPanel";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import {
  mergeMarkdownIntroIntoChoice,
  shouldAbsorbMarkdownIntoChoiceHint,
} from "../utils/choiceIntroMerge";

const STICK_THRESHOLD_PX = 80;
const VIRTUAL_THRESHOLD = 50; // 超过50条启用虚拟滚动

type MessageListProps = {
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
};

type MessageItemProps = {
  msg: ChatMessage;
  isStreaming: boolean;
  traces: TraceStep[];
  seconds: number;
  sending: boolean;
  flowKey?: string | null;
  onFormAction?: ChoiceSelectHandler;
  onChoiceSelect?: ChoiceSelectHandler;
  selectedChoiceBySlot?: Record<string, string>;
};

function MessageItem({ msg, isStreaming, traces, seconds, sending, flowKey, onFormAction, onChoiceSelect, selectedChoiceBySlot }: MessageItemProps) {
  const isAssistant = msg.role === "assistant";
  const avatar = <MessageAvatar role={msg.role} />;
  const hasStructuredChoiceBlocks = msg.blocks.some((b) => b.type === "choice");

  return (
    <div className={`message message-${msg.role}`}>
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
                if (
                  block.type === "markdown" &&
                  i + 1 < msg.blocks.length &&
                  msg.blocks[i + 1].type === "choice" &&
                  shouldAbsorbMarkdownIntoChoiceHint(block.content)
                ) {
                  const choiceBlock = mergeMarkdownIntroIntoChoice(
                    block,
                    msg.blocks[i + 1] as MessageBlock & { type: "choice" },
                  );
                  rendered.push(
                    <BlockRenderer
                      key={`${msg.id}-${i + 1}-${choiceBlock.type}`}
                      messageId={msg.id}
                      blockIndex={i + 1}
                      block={choiceBlock}
                      flowKey={flowKey}
                      onFormAction={onFormAction}
                      onChoiceSelect={onChoiceSelect}
                      selectedBySlot={selectedChoiceBySlot}
                      formActionDisabled={sending}
                      skipMarkdownChoiceParse={hasStructuredChoiceBlocks}
                    />
                  );
                  i += 2;
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
                    skipMarkdownChoiceParse={hasStructuredChoiceBlocks}
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
}

/** 非虚拟渲染（消息 ≤ 阈值） */
function LegacyMessageList({
  messages, sending, streamingId, liveTraces, liveSeconds,
  tracesByMsg, durationByMsg, flowKey, onFormAction, onChoiceSelect, selectedChoiceBySlot,
}: MessageListProps) {
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
          return (
            <MessageItem
              key={msg.id}
              msg={msg}
              isStreaming={isStreaming}
              traces={traces}
              seconds={seconds}
              sending={sending}
              flowKey={flowKey}
              onFormAction={onFormAction}
              onChoiceSelect={onChoiceSelect}
              selectedChoiceBySlot={selectedChoiceBySlot}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/** 虚拟滚动渲染（消息 > 阈值） */
function VMessageList({
  messages, sending, streamingId, liveTraces, liveSeconds,
  tracesByMsg, durationByMsg, flowKey, onFormAction, onChoiceSelect, selectedChoiceBySlot,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const itemContent = (_index: number, msg: ChatMessage) => {
    const isStreaming = msg.id === streamingId;
    const traces = isStreaming ? liveTraces : tracesByMsg[msg.id] || [];
    const seconds = isStreaming ? liveSeconds : durationByMsg[msg.id];
    return (
      <MessageItem
        key={msg.id}
        msg={msg}
        isStreaming={isStreaming}
        traces={traces}
        seconds={seconds}
        sending={sending}
        flowKey={flowKey}
        onFormAction={onFormAction}
        onChoiceSelect={onChoiceSelect}
        selectedChoiceBySlot={selectedChoiceBySlot}
      />
    );
  };

  return (
    <Virtuoso
      ref={virtuosoRef}
      className="message-list message-list--virtual"
      data={messages}
      itemContent={itemContent}
      followOutput="auto"
      atBottomThreshold={STICK_THRESHOLD_PX}
    />
  );
}

export function MessageList(props: MessageListProps) {
  if (props.messages.length > VIRTUAL_THRESHOLD) {
    return <VMessageList {...props} />;
  }
  return <LegacyMessageList {...props} />;
}
