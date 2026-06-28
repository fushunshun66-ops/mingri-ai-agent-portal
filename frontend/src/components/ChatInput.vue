<template>
  <div class="chat-input">
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
        @click="handleSend"
      >
        发送
      </button>
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

const inputRef = ref<HTMLTextAreaElement | null>(null)
const inputText = ref('')

const isDisabled = computed(() => props.disabled || !props.hasSession)
const placeholder = computed(() =>
  props.hasSession ? '输入消息...' : '请先选择或创建会话'
)

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
  border-top: 1px solid var(--border-color);
  padding: 12px 16px;
  background: #fff;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.input-textarea {
  flex: 1;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
  max-height: 150px;
}

.input-textarea:focus {
  border-color: var(--primary-color);
}

.input-textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.send-btn {
  padding: 8px 20px;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.stop-btn {
  padding: 8px 20px;
  background: #f56c6c;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.stop-btn:hover {
  background: #e04e4e;
}
</style>
