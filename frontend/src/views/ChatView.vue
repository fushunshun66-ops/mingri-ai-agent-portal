<template>
  <AppLayout>
    <div class="chat-page">
      <!-- 会话侧边栏 -->
      <ChatSidebar
        :sessions="chatStore.sessions"
        :loading="chatStore.sessionsLoading"
        :current-session-id="chatStore.currentSessionId"
        @create="handleCreateSession"
        @select="handleSelectSession"
        @delete="handleDeleteSession"
      />

      <!-- 对话主区域 -->
      <div class="chat-main">
        <!-- 无会话时的空状态 -->
        <div v-if="!chatStore.currentSession" class="empty-chat">
          <div class="empty-icon">💬</div>
          <h2>开始对话</h2>
          <p>选择已有会话或创建新对话</p>
          <el-button type="primary" @click="handleCreateSession">
            新建对话
          </el-button>
        </div>

        <!-- 有会话时 -->
        <template v-else>
          <!-- 顶部标题栏 -->
          <div class="chat-header">
            <div class="chat-title">
              <span>{{ chatStore.currentSession.title || '新对话' }}</span>
            </div>
          </div>

          <!-- 消息列表 -->
          <div ref="messageListRef" class="message-list">
            <div v-if="chatStore.messagesLoading" class="loading-messages">
              <el-skeleton :rows="3" animated />
            </div>

            <template v-else>
              <ChatMessage
                v-for="msg in chatStore.messages"
                :key="msg.id"
                :role="msg.role"
                :content="msg.content"
                :timestamp="msg.created_at"
                @feedback="(rating) => handleFeedback(msg.id, rating)"
              />

              <div v-if="chatStore.messages.length === 0" class="no-messages">
                发送消息开始对话
              </div>
            </template>
          </div>

          <!-- 输入框 -->
          <ChatInput
            :streaming="chatStore.streaming"
            :has-session="!!chatStore.currentSession"
            @send="handleSend"
            @stop="handleStop"
          />
        </template>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import ChatSidebar from '@/components/ChatSidebar.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatInput from '@/components/ChatInput.vue'
import { useChatStore } from '@/stores/chat'
import { useAgentsStore } from '@/stores/agents'
import { chatApi } from '@/api/chat'

const route = useRoute()
const chatStore = useChatStore()
const agentsStore = useAgentsStore()
const messageListRef = ref<HTMLElement | null>(null)

// 自动滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 监听消息变化自动滚动
watch(() => chatStore.messages.length, scrollToBottom)
watch(() => chatStore.streamingContent, scrollToBottom)

// 新建会话
async function handleCreateSession() {
  try {
    let agentId = route.query.agent_id as string | undefined
    if (!agentId) {
      if (agentsStore.agents.length === 0) {
        await agentsStore.fetchAgents({ page: 1, page_size: 1, status: 'published' })
      }
      agentId = agentsStore.agents[0]?.id
    }
    if (!agentId) {
      ElMessage.warning('暂无可用 Agent，请先到市场创建 Agent')
      return
    }
    await chatStore.createSession(agentId)
    ElMessage.success('会话已创建')
  } catch {
    ElMessage.error('创建会话失败')
  }
}

// 选择会话
async function handleSelectSession(sessionId: string) {
  try {
    await chatStore.selectSession(sessionId)
  } catch {
    ElMessage.error('加载会话失败')
  }
}

// 删除会话
async function handleDeleteSession(sessionId: string) {
  try {
    await chatStore.deleteSession(sessionId)
    ElMessage.success('会话已删除')
  } catch {
    ElMessage.error('删除会话失败')
  }
}

// 发送消息
async function handleSend(content: string) {
  try {
    await chatStore.sendStreamMessage(content)
    scrollToBottom()
  } catch {
    ElMessage.error('发送失败')
  }
}

// 停止生成
function handleStop() {
  chatStore.stopStreaming()
}

// 消息反馈
async function handleFeedback(messageId: string, rating: 'like' | 'dislike') {
  try {
    await chatApi.sendFeedback(messageId, rating)
  } catch {
    // 静默失败
  }
}

// 初始化：加载会话列表
onMounted(async () => {
  const agentId = route.query.agent_id as string | undefined
  await chatStore.fetchSessions(agentId)

  // 如果有 agent_id 参数且无现有会话，自动创建
  if (agentId && chatStore.sessions.length === 0) {
    await handleCreateSession()
  }
})
</script>

<style scoped>
.chat-page {
  display: flex;
  height: calc(100vh - 56px);
  margin: calc(-1 * var(--space-5)) calc(-1 * var(--space-5)) 0;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-gray-50);
}

.chat-header {
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-gray-100);
  background: var(--bg-surface);
}

.chat-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
  text-wrap: balance;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) 0;
  background: linear-gradient(to bottom, var(--color-gray-50), var(--bg-surface) 10%);
}

.loading-messages {
  padding: 24px;
}

.no-messages {
  text-align: center;
  color: var(--color-gray-500);
  padding: var(--space-12) 0;
  font-size: var(--text-base);
  text-wrap: pretty;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-500);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-chat h2 {
  font-size: var(--text-xl);
  color: var(--color-gray-800);
  margin: 0 0 var(--space-2);
  text-wrap: balance;
}

.empty-chat p {
  font-size: var(--text-base);
  margin-bottom: var(--space-5);
  text-wrap: pretty;
}
</style>
