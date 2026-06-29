<template>
  <div class="chat-sidebar">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="$emit('create')">
        + 新建对话
      </button>
    </div>

    <div class="search-box">
      <input
        v-model="searchText"
        class="search-input"
        type="text"
        placeholder="搜索会话..."
        @input="onSearchInput"
      />
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton-item" v-for="n in 3" :key="n" />
    </div>

    <div v-else-if="sessions.length === 0" class="empty-state">
      <p>暂无对话</p>
      <p class="empty-hint">点击上方按钮开始新对话</p>
    </div>

    <div v-else class="session-list">
      <template v-for="group in groupedSessions" :key="group.label">
        <div class="session-group-title">{{ group.label }}</div>
        <div
          v-for="session in group.sessions"
          :key="session.id"
          class="session-item"
          :class="{ 'session-item--active': session.id === currentSessionId }"
          @click="$emit('select', session.id)"
        >
          <div class="session-info">
            <div class="session-title">{{ session.title || '新对话' }}</div>
            <div class="session-meta">
              <span class="session-count">{{ session.message_count }} 条消息</span>
            </div>
          </div>
          <button
            class="delete-btn"
            title="删除会话"
            aria-label="删除会话"
            @click.stop="$emit('delete', session.id)"
          >
            ×
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ChatSession } from '@/types/chat'

const props = defineProps<{
  sessions: ChatSession[]
  loading: boolean
  currentSessionId: string | null
}>()

const emit = defineEmits<{
  create: []
  select: [sessionId: string]
  delete: [sessionId: string]
  search: [query: string]
}>()

const searchText = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const GROUP_ORDER = ['今天', '昨天', '本周', '更早'] as const

function getSessionGroupLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((todayStart.getTime() - sessionDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return '本周'
  return '更早'
}

const groupedSessions = computed(() => {
  const groups: Record<string, ChatSession[]> = {}

  for (const session of props.sessions) {
    const label = getSessionGroupLabel(session.updated_at)
    if (!groups[label]) groups[label] = []
    groups[label].push(session)
  }

  return GROUP_ORDER
    .filter((label) => groups[label]?.length)
    .map((label) => ({ label, sessions: groups[label]! }))
})

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    emit('search', searchText.value)
  }, 300)
}
</script>

<style scoped>
.chat-sidebar {
  width: 300px;
  min-width: 300px;
  height: 100%;
  background: var(--color-gray-50);
  border-right: 1px solid var(--color-gray-200);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-100);
}

.new-chat-btn {
  width: 100%;
  padding: 10px 0;
  background: var(--color-primary-500);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition:
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.new-chat-btn:hover {
  background: var(--color-primary-600);
  box-shadow: 0 2px 8px rgba(26, 86, 219, 0.25);
}

.new-chat-btn:active {
  transform: scale(0.98);
}

.search-box {
  padding: var(--space-3) var(--space-4);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--color-gray-100);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  outline: none;
  box-sizing: border-box;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.search-input::placeholder {
  color: var(--color-gray-400);
}

.search-input:focus {
  background: var(--bg-surface);
  border-color: var(--color-primary-200);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

.loading-state {
  padding: var(--space-4);
}

.skeleton-item {
  height: 48px;
  background: linear-gradient(90deg, var(--color-gray-100) 25%, var(--color-gray-200) 50%, var(--color-gray-100) 75%);
  background-size: 400px 100%;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  animation: shimmer 1.5s infinite;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--color-gray-400);
  font-size: var(--text-sm);
  text-align: center;
}

.empty-hint {
  font-size: var(--text-xs);
  margin-top: var(--space-1);
}

.session-group-title {
  padding: var(--space-3) var(--space-4) var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-gray-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-3);
}

.session-item {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-1);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
  position: relative;
}

.session-item:hover {
  background: var(--color-gray-100);
}

.session-item--active {
  background: var(--color-primary-50);
  box-shadow: inset 3px 0 0 var(--color-primary-500);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.session-item--active .session-title {
  color: var(--color-primary-700);
  font-weight: 600;
}

.session-meta {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.delete-btn {
  background: none;
  border: none;
  min-width: 40px;
  min-height: 40px;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--color-gray-300);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  flex-shrink: 0;
  transition:
    opacity var(--duration-fast) var(--ease-out),
    visibility var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.session-item:hover .delete-btn,
.session-item:focus-within .delete-btn {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.delete-btn:hover {
  color: var(--color-accent-red);
  background: var(--color-accent-red-bg);
}

@media (hover: none) {
  .delete-btn {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .new-chat-btn:active {
    transform: none;
  }

  .skeleton-item {
    animation: none;
  }
}
</style>
