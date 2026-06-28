// Chat 会话状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatSession, ChatMessage, StreamChunk } from '@/types/chat'
import { chatApi } from '@/api/chat'

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([])
  const currentSession = ref<ChatSession | null>(null)
  const messages = ref<ChatMessage[]>([])
  const sessionsLoading = ref(false)
  const messagesLoading = ref(false)
  const sending = ref(false)
  const streaming = ref(false)
  const streamingContent = ref('')
  let abortController: AbortController | null = null

  const hasSessions = computed(() => sessions.value.length > 0)
  const hasMessages = computed(() => messages.value.length > 0)
  const currentSessionId = computed(() => currentSession.value?.id ?? null)

  /** 获取会话列表 */
  async function fetchSessions(agentId?: string) {
    sessionsLoading.value = true
    try {
      const { data: resp } = await chatApi.getSessions(agentId ? { agent_id: agentId } : undefined)
      if (resp.success && resp.data) {
        sessions.value = resp.data
      }
    } finally {
      sessionsLoading.value = false
    }
  }

  /** 创建新会话 */
  async function createSession(agentId?: string, title?: string) {
    const { data: resp } = await chatApi.createSession({ agent_id: agentId, title })
    if (resp.success && resp.data) {
      sessions.value.unshift(resp.data)
      await selectSession(resp.data.id)
    }
    return resp.data ?? null
  }

  /** 选中一个会话并加载其消息 */
  async function selectSession(sessionId: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      currentSession.value = session
    } else {
      const { data: resp } = await chatApi.getSession(sessionId)
      if (resp.success && resp.data) {
        currentSession.value = resp.data
      }
    }
    await fetchMessages(sessionId)
  }

  /** 获取消息历史 */
  async function fetchMessages(sessionId: string) {
    messagesLoading.value = true
    try {
      const { data: resp } = await chatApi.getMessages(sessionId)
      if (resp.success && resp.data) {
        messages.value = resp.data
      }
    } finally {
      messagesLoading.value = false
    }
  }

  /** 发送消息（非流式） */
  async function sendMessage(content: string) {
    if (!currentSession.value) return
    sending.value = true
    try {
      // 先添加用户消息到本地
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        session_id: currentSession.value.id,
        role: 'user',
        content,
        metadata: null,
        created_at: new Date().toISOString(),
      }
      messages.value.push(userMsg)

      const { data: resp } = await chatApi.sendMessage(currentSession.value.id, content)
      if (resp.success && resp.data) {
        // 追加 assistant 回复
        messages.value.push(resp.data)
        // 更新会话标题（如果是新会话）
        if (currentSession.value.message_count === 0) {
          currentSession.value.title = content.slice(0, 30)
        }
      }
    } finally {
      sending.value = false
    }
  }

  /** 流式发送消息 */
  async function sendStreamMessage(content: string) {
    if (!currentSession.value) return
    sending.value = true
    streaming.value = true
    streamingContent.value = ''

    abortController = new AbortController()

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSession.value.id,
      role: 'user',
      content,
      metadata: null,
      created_at: new Date().toISOString(),
    }
    messages.value.push(userMsg)

    // 占位助手消息
    const assistantMsg: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      session_id: currentSession.value.id,
      role: 'assistant',
      content: '',
      metadata: null,
      created_at: new Date().toISOString(),
    }
    messages.value.push(assistantMsg)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('未登录')
      }

      const url = `/api/v1/chat/sessions/${currentSession.value.id}/stream?message=${encodeURIComponent(content)}`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal,
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) {
        throw new Error(`SSE 请求失败: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('SSE 响应体为空')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        if (abortController.signal.aborted) break
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const chunk: StreamChunk = JSON.parse(data)
              if (chunk.error) {
                throw new Error(chunk.error)
              }
              if (chunk.content) {
                streamingContent.value += chunk.content
                assistantMsg.content = streamingContent.value
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue
              throw e
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      // 流式失败时移除占位消息
      messages.value = messages.value.filter(m => m.id !== assistantMsg.id)
      throw err
    } finally {
      sending.value = false
      streaming.value = false
      abortController = null
    }
  }

  /** 停止流式输出 */
  function stopStreaming() {
    abortController?.abort()
    streaming.value = false
    sending.value = false
  }

  /** 更新会话 */
  async function updateSession(id: string, data: { title?: string; is_archived?: boolean }) {
    const { data: resp } = await chatApi.updateSession(id, data)
    if (resp.success && resp.data) {
      const idx = sessions.value.findIndex(s => s.id === id)
      if (idx >= 0) sessions.value[idx] = resp.data
      if (currentSession.value?.id === id) currentSession.value = resp.data
    }
  }

  /** 删除会话 */
  async function deleteSession(id: string) {
    await chatApi.deleteSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (currentSession.value?.id === id) {
      currentSession.value = null
      messages.value = []
    }
  }

  /** 清空当前状态 */
  function clearCurrent() {
    currentSession.value = null
    messages.value = []
  }

  return {
    sessions,
    currentSession,
    messages,
    sessionsLoading,
    messagesLoading,
    sending,
    streaming,
    streamingContent,
    hasSessions,
    hasMessages,
    currentSessionId,
    fetchSessions,
    createSession,
    selectSession,
    fetchMessages,
    sendMessage,
    sendStreamMessage,
    stopStreaming,
    updateSession,
    deleteSession,
    clearCurrent,
  }
})
