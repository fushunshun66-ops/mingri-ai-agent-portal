<template>
  <div class="chat-message" :class="`chat-message--${role}`">
    <div class="message-bubble" :class="`message-bubble--${role}`">
      <div class="message-content" v-html="renderedContent" />
      <div class="message-time">{{ formattedTime }}</div>
    </div>
    <div v-if="role === 'assistant'" class="message-feedback">
      <button
        class="feedback-btn feedback-btn--like"
        :class="{ 'feedback-btn--active': feedbackState === 'like' }"
        title="有帮助"
        @click="handleFeedback('like')"
      >
        👍
      </button>
      <button
        class="feedback-btn feedback-btn--dislike"
        :class="{ 'feedback-btn--active': feedbackState === 'dislike' }"
        title="没帮助"
        @click="handleFeedback('dislike')"
      >
        👎
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MessageRole } from '@/types/chat'

const props = defineProps<{
  role: MessageRole
  content: string
  timestamp: string
}>()

const emit = defineEmits<{
  feedback: [rating: 'like' | 'dislike']
}>()

const feedbackState = ref<'like' | 'dislike' | null>(null)

const formattedTime = computed(() => {
  try {
    const d = new Date(props.timestamp)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  return props.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
})

function handleFeedback(rating: 'like' | 'dislike') {
  feedbackState.value = rating
  emit('feedback', rating)
}
</script>

<style scoped>
.chat-message {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  padding: 0 16px;
}

.chat-message--user {
  align-items: flex-end;
}

.chat-message--assistant {
  align-items: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-bubble--user {
  background: var(--primary-color);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message-bubble--assistant {
  background: #f0f2f5;
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.message-content code {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.message-bubble--user .message-content code {
  background: rgba(255, 255, 255, 0.2);
}

.message-time {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 4px;
  text-align: right;
}

.message-feedback {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  padding-left: 2px;
}

.feedback-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.2s, border-color 0.2s;
}

.feedback-btn:hover,
.feedback-btn--active {
  opacity: 1;
  border-color: var(--border-color);
}
</style>
