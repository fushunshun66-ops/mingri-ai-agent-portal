<template>
  <div class="chat-input">
    <div v-if="hasSession && !isDisabled" class="suggestion-bar">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        type="button"
        class="suggestion-chip"
        @click="applySuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
    <div class="input-wrapper">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="input-textarea"
        :placeholder="placeholder"
        :disabled="isDisabled"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        v-if="!streaming"
        class="send-btn"
        :disabled="isDisabled || !inputText.trim()"
        title="发送"
        aria-label="发送"
        @click="handleSend"
      />
      <button
        v-else
        class="stop-btn"
        @click="$emit('stop')"
      >
        停止生成
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  streaming?: boolean
  disabled?: boolean
  hasSession?: boolean
}>(), {
  streaming: false,
  disabled: false,
  hasSession: true,
})

const emit = defineEmits<{
  send: [content: string]
  stop: []
}>()

const suggestions = [
  '帮我总结一下',
  '请分析这个问题',
  '给出优化建议',
]

const inputRef = ref<HTMLTextAreaElement | null>(null)
const inputText = ref('')

const isDisabled = computed(() => props.disabled || !props.hasSession)
const placeholder = computed(() =>
  props.hasSession ? '输入消息...' : '请先选择或创建会话'
)

function applySuggestion(text: string) {
  if (isDisabled.value) return
  inputText.value = text
  nextTick(() => {
    autoResize()
    inputRef.value?.focus()
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  const content = inputText.value.trim()
  if (!content || isDisabled.value) return
  emit('send', content)
  inputText.value = ''
  nextTick(autoResize)
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 150) + 'px'
}

onMounted(() => {
  if (props.hasSession) {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style scoped>
.chat-input {
  border-top: 1px solid var(--color-gray-100);
  padding: var(--space-4) var(--space-6);
  background: var(--bg-surface);
}

.suggestion-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.suggestion-chip {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  cursor: pointer;
  transition:
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

.suggestion-chip:hover {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
}

.input-wrapper {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
}

.input-textarea {
  flex: 1;
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  max-height: 160px;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.input-textarea::placeholder {
  color: var(--color-gray-400);
}

.input-textarea:focus {
  background: var(--bg-surface);
  border-color: var(--color-primary-300);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.input-textarea:disabled {
  background: var(--color-gray-100);
  cursor: not-allowed;
  opacity: 0.6;
}

.send-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: var(--radius-md);
  background: var(--color-primary-500);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.send-btn::before {
  content: '↑';
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.send-btn:hover:not(:disabled) {
  background: var(--color-primary-600);
  box-shadow: 0 2px 8px rgba(26, 86, 219, 0.3);
  transform: scale(1.05);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  background: var(--color-gray-200);
  cursor: not-allowed;
}

.stop-btn {
  height: 40px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-md);
  background: var(--color-accent-red);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.stop-btn:hover {
  background: #b91c1c;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .send-btn:hover:not(:disabled),
  .send-btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
