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
        aria-label="有帮助"
        @click="handleFeedback('like')"
      >
        👍
      </button>
      <button
        class="feedback-btn feedback-btn--dislike"
        :class="{ 'feedback-btn--active': feedbackState === 'dislike' }"
        title="没帮助"
        aria-label="没帮助"
        @click="handleFeedback('dislike')"
      >
        👎
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'
import type { MessageRole } from '@/types/chat'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)

const marked = new Marked({
  breaks: true,
  gfm: true,
})

marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : undefined
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value
      const langAttr = lang ? ` data-lang="${lang}"` : ''
      const langClass = language ? ` language-${language}` : ''
      return `<pre${langAttr}><code class="hljs${langClass}">${highlighted}</code></pre>`
    },
  },
})

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
  const raw = marked.parse(props.content, { async: false })
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['data-lang'],
  })
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
  margin-bottom: var(--space-5);
  padding: 0 var(--space-6);
  animation: fade-in-up var(--duration-slow) var(--ease-out) both;
}

.chat-message--user {
  align-items: flex-end;
}

.chat-message--assistant {
  align-items: flex-start;
}

.message-bubble {
  max-width: 72%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  line-height: 1.65;
  word-break: break-word;
}

.message-bubble--user {
  background: linear-gradient(
    135deg,
    var(--color-primary-500),
    var(--color-primary-600)
  );
  color: #fff;
  box-shadow: 0 2px 8px rgba(26, 86, 219, 0.15);
  border-bottom-right-radius: var(--radius-sm);
}

.message-bubble--assistant {
  background: var(--bg-surface);
  color: var(--color-gray-700);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-100);
  border-bottom-left-radius: var(--radius-sm);
}

.message-content :deep(p) {
  margin: 0 0 var(--space-2);
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  padding-left: var(--space-5);
  margin: var(--space-2) 0;
}

.message-content :deep(li) {
  margin-bottom: var(--space-1);
}

.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3) {
  font-weight: 600;
  margin: var(--space-4) 0 var(--space-2);
  color: inherit;
}

.message-content :deep(h1) { font-size: var(--text-xl); }
.message-content :deep(h2) { font-size: var(--text-lg); }
.message-content :deep(h3) { font-size: var(--text-md); }

.message-content :deep(:not(pre) > code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
}

.message-bubble--assistant .message-content :deep(:not(pre) > code) {
  background: var(--color-gray-100);
  color: var(--color-accent-red);
}

.message-bubble--user .message-content :deep(:not(pre) > code) {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.message-content :deep(pre) {
  background: #0d1117;
  color: #e6edf3;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--space-3) 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  position: relative;
}

.message-content :deep(pre::before) {
  content: attr(data-lang);
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: var(--text-xs);
  color: #8b949e;
  text-transform: uppercase;
}

.message-bubble--user .message-content :deep(pre) {
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.message-content :deep(a) {
  color: var(--color-primary-500);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--duration-fast) var(--ease-out);
}

.message-content :deep(a:hover) {
  color: var(--color-primary-700);
}

.message-bubble--user .message-content :deep(a) {
  color: #fff;
  text-decoration-color: rgba(255, 255, 255, 0.5);
}

.message-content :deep(blockquote) {
  border-left: 3px solid var(--color-primary-200);
  padding-left: var(--space-3);
  margin: var(--space-2) 0;
  color: var(--color-gray-500);
  font-style: italic;
}

.message-time {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  margin-top: var(--space-1);
  text-align: right;
}

.message-bubble--user .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.message-feedback {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-1);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity var(--duration-fast) var(--ease-out),
    visibility var(--duration-fast) var(--ease-out);
}

.chat-message:hover .message-feedback,
.chat-message:focus-within .message-feedback {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.feedback-btn {
  background: none;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  font-size: var(--text-xs);
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.feedback-btn:hover {
  border-color: var(--color-primary-200);
  background: var(--color-primary-50);
}

.feedback-btn--active {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
}

@media (prefers-reduced-motion: reduce) {
  .chat-message {
    animation: none;
  }
}
</style>

<style>
/* github-dark 代码高亮（v-html 内容需全局样式） */
.chat-message .hljs {
  color: #e6edf3;
  background: transparent;
}

.chat-message .hljs-doctag,
.chat-message .hljs-keyword,
.chat-message .hljs-meta .hljs-keyword,
.chat-message .hljs-template-tag,
.chat-message .hljs-template-variable,
.chat-message .hljs-type,
.chat-message .hljs-variable.language_ {
  color: #ff7b72;
}

.chat-message .hljs-title,
.chat-message .hljs-title.class_,
.chat-message .hljs-title.class_.inherited__,
.chat-message .hljs-title.function_ {
  color: #d2a8ff;
}

.chat-message .hljs-attr,
.chat-message .hljs-attribute,
.chat-message .hljs-literal,
.chat-message .hljs-meta,
.chat-message .hljs-number,
.chat-message .hljs-operator,
.chat-message .hljs-variable,
.chat-message .hljs-selector-attr,
.chat-message .hljs-selector-class,
.chat-message .hljs-selector-id {
  color: #79c0ff;
}

.chat-message .hljs-regexp,
.chat-message .hljs-string,
.chat-message .hljs-meta .hljs-string {
  color: #a5d6ff;
}

.chat-message .hljs-built_in,
.chat-message .hljs-symbol {
  color: #ffa657;
}

.chat-message .hljs-comment,
.chat-message .hljs-code,
.chat-message .hljs-formula {
  color: #8b949e;
}

.chat-message .hljs-name,
.chat-message .hljs-quote,
.chat-message .hljs-selector-tag,
.chat-message .hljs-selector-pseudo {
  color: #7ee787;
}

.chat-message .hljs-subst {
  color: #e6edf3;
}

.chat-message .hljs-section {
  color: #1f6feb;
  font-weight: 700;
}

.chat-message .hljs-bullet {
  color: #f2cc60;
}

.chat-message .hljs-emphasis {
  font-style: italic;
}

.chat-message .hljs-strong {
  font-weight: 700;
}
</style>
