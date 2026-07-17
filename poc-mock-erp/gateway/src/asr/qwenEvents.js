/**
 * Qwen3-ASR Realtime 协议消息构建 & 服务端事件翻译（纯函数）。
 * 统一客户端协议：ready / { text, is_final } / { type:'done' } / { type:'error', message }
 */

let _seq = 0;

/**
 * 生成单调递增事件 ID。
 * @returns {string}
 */
export function nextEventId() {
  return `evt-${++_seq}`;
}

/**
 * 构建 session.update（Manual 模式，可选注入 corpus）。
 * @param {{ language: string, corpusText: string }} opts
 */
export function buildSessionUpdate({ language, corpusText }) {
  const transcription = { language };
  if (corpusText) {
    transcription.corpus = { text: corpusText };
  }
  return {
    event_id: nextEventId(),
    type: "session.update",
    session: {
      turn_detection: null, // Manual 模式：由客户端控制停止
      input_audio_transcription: transcription,
    },
  };
}

/**
 * 构建 input_audio_buffer.append（PCM buffer → base64）。
 * @param {Buffer} pcmBuffer
 */
export function buildAppend(pcmBuffer) {
  return {
    event_id: nextEventId(),
    type: "input_audio_buffer.append",
    audio: pcmBuffer.toString("base64"),
  };
}

/**
 * 构建 input_audio_buffer.commit（通知服务端音频发送完毕）。
 */
export function buildCommit() {
  return {
    event_id: nextEventId(),
    type: "input_audio_buffer.commit",
  };
}

/**
 * 构建 session.finish（结束会话，触发最终转写）。
 */
export function buildFinish() {
  return {
    event_id: nextEventId(),
    type: "session.finish",
  };
}

/**
 * 将服务端事件翻译为统一客户端消息，不认识的事件返回 null。
 * @param {object | null} msg
 * @returns {{ text?: string, is_final?: boolean, type?: string, message?: string } | null}
 */
export function translateServerEvent(msg) {
  if (!msg || !msg.type) return null;

  switch (msg.type) {
    // 流式中间转写片段
    case "conversation.item.input_audio_transcription.text":
      return {
        text: (msg.transcript || "") + (msg.stash || ""),
        is_final: false,
      };

    // 最终转写结果
    case "conversation.item.input_audio_transcription.completed":
      return {
        text: msg.transcript || "",
        is_final: true,
      };

    // 会话结束
    case "session.finished":
      return { type: "done" };

    // 服务端错误：返回中文友好文案，不透传原始错误（避免泄露 key）
    case "error":
      return {
        type: "error",
        message: "语音识别服务出现错误，请稍后重试",
      };

    default:
      return null;
  }
}
