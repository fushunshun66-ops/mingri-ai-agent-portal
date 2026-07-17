import { MessageList } from "./components/MessageList";
import { WelcomeHome } from "./components/WelcomeHome";
import { SessionEmptyHero } from "./components/SessionEmptyHero";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Composer } from "./components/Composer";
import { useChatSession } from "./hooks/useChatSession";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { useAsrEngine } from "./hooks/useAsrEngine";
import { useKeyboardViewport } from "./hooks/useKeyboardViewport";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useState, useCallback } from "react";

export default function App() {
  const chat = useChatSession();
  const { engine, setEngine } = useAsrEngine();
  const voice = useAudioRecorder(engine);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const keyboardHeight = useKeyboardViewport(isMobile);

  const handleGoHome = () => {
    chat.goHome();
    setSidebarOpen(false);
  };
  const handleNewSession = (flowKey: string) => {
    chat.handleNewSession(flowKey);
    setSidebarOpen(false);
  };
  const handleLoadSession = (id: string) => {
    chat.loadSession(id);
    setSidebarOpen(false);
  };

  const composer = chat.showComposer && (
    <Composer
      isHome={chat.isHome}
      value={chat.input}
      onChange={chat.setInput}
      onSend={chat.handleSend}
      placeholder={chat.composerPlaceholder}
      canAttach={chat.canAttach}
      uploading={chat.uploading}
      sending={chat.sending}
      attachments={chat.attachments}
      localFiles={chat.localFiles}
      onRemoveLocal={(index) => chat.setLocalFiles((prev) => prev.filter((_, i) => i !== index))}
      onRemoveAttachment={(fileSn) => chat.setAttachments((prev) => prev.filter((x) => x.fileSn !== fileSn))}
      onPickFiles={chat.handlePickFiles}
      choiceChips={chat.choiceComposerChips}
      onRemoveChoiceChip={chat.handleRemoveChoiceChip}
      mode={chat.mode}
      quickPrompts={!chat.isHome ? chat.activeFlow?.examples : undefined}
      flowKey={chat.activeFlow?.flowKey}
      flows={chat.isHome ? chat.flows : undefined}
      homeMentionFlowKey={chat.homeMentionFlowKey}
      onHomeMentionFlow={chat.setHomeMentionFlowKey}
      voiceRecorder={voice}
      onVoiceText={(text) => {
        chat.setInput(text);
      }}
    />
  );

  return (
    <div className="app">
      <Sidebar
        sessions={chat.sessions}
        activeId={chat.activeId}
        draftFlowKey={chat.draftFlowKey}
        showFlowPicker={!chat.isHome}
        sending={chat.sending}
        uploading={chat.uploading}
        onGoHome={handleGoHome}
        onNewSession={handleNewSession}
        onLoadSession={handleLoadSession}
        flows={chat.flows}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <main className={`main ${chat.isHome ? "main-home" : ""}`} aria-hidden={sidebarOpen}>
        {!chat.isHome && (
          <TopBar
            flowName={chat.activeFlow?.name}
            flowKey={chat.activeFlow?.flowKey}
            sessionTitle={chat.activeSession?.title}
            mode={chat.mode}
            onMenuToggle={toggleSidebar}
            isSidebarOpen={sidebarOpen}
            asrEngine={engine}
            onAsrEngineChange={setEngine}
            recordingDisabled={voice.status === "recording" || voice.status === "requesting"}
          />
        )}

        {chat.error && (
          <div className="error-bar" role="alert">
            {chat.error}
          </div>
        )}
        {chat.intentNotice && (
          <div className="intent-notice" aria-live="polite">
            {chat.intentNotice}
          </div>
        )}

        <div className="chat-area" style={isMobile && keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : undefined}>
          <div className={`chat-main ${chat.isHome ? "chat-main-home" : ""}`}>
            {chat.isHome ? (
              <>
                <WelcomeHome flows={chat.flows} onPickExample={chat.setInput} onSelectFlow={chat.handleNewSession} />
                {composer}
              </>
            ) : chat.activeSession || chat.inDraft ? (
              <>
                {chat.messages.length === 0 ? (
                  <SessionEmptyHero flow={chat.activeFlow} />
                ) : (
                  <MessageList
                    messages={chat.messages}
                    sending={chat.sending}
                    streamingId={chat.streamingId}
                    liveTraces={chat.liveTraces}
                    liveSeconds={chat.liveSeconds}
                    tracesByMsg={chat.tracesByMsg}
                    durationByMsg={chat.durationByMsg}
                    flowKey={chat.activeFlow?.flowKey}
                    onFormAction={chat.handleFormAction}
                    onChoiceSelect={chat.handleChoiceSelect}
                    selectedChoiceBySlot={chat.selectedChoiceBySlot}
                  />
                )}
                {composer}
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
