<template>
  <div class="chat-sidebar">
    <!-- 新建对话按钮 -->
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="$emit('create')">
        + 新建对话
      </button>
    </div>

    <!-- 搜索 -->
    <div class="search-box">
      <input
        v-model="searchText"
        class="search-input"
        type="text"
        placeholder="搜索会话..."
        @input="onSearchInput"
      />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-item" v-for="n in 3" :key="n" />
    </div>

    <!-- 会话列表 -->
    <div v-else-if="sessions.length === 0" class="empty-state">
      <p>暂无对话</p>
      <p class="empty-hint">点击上方按钮开始新对话</p>
    </div>

    <div v-else class="session-list">
      <div
        v-for="session in sessions"
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
          @click.stop="$emit('delete', session.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ChatSession } from '@/types/chat'

defineProps<{
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

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    emit('search', searchText.value)
  }, 300)
}
</script>

<style scoped>
.chat-sidebar {
  width: 280px;
  min-width: 280px;
  height: 100%;
  background: #fafafa;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.new-chat-btn {
  width: 100%;
  padding: 10px 0;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.new-chat-btn:hover {
  background: var(--primary-dark);
}

.search-box {
  padding: 8px 12px;
}

.search-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--primary-color);
}

.loading-state {
  padding: 16px;
}

.skeleton-item {
  height: 48px;
  background: #eee;
  border-radius: 6px;
  margin-bottom: 8px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  margin-top: 4px;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}

.session-item:hover {
  background: #e8e8e8;
}

.session-item--active {
  background: #dde8f8;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.session-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.delete-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #ccc;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover {
  color: #f56c6c;
}
</style>
