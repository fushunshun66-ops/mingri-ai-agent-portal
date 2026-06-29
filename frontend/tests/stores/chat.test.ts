import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockGetSessions = vi.fn()
const mockCreateSession = vi.fn()
const mockGetSession = vi.fn()
const mockGetMessages = vi.fn()
const mockSendMessage = vi.fn()
const mockUpdateSession = vi.fn()
const mockDeleteSession = vi.fn()

vi.mock('@/api/chat', () => ({
  chatApi: {
    getSessions: (...args: unknown[]) => mockGetSessions(...args),
    createSession: (...args: unknown[]) => mockCreateSession(...args),
    getSession: (...args: unknown[]) => mockGetSession(...args),
    getMessages: (...args: unknown[]) => mockGetMessages(...args),
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    updateSession: (...args: unknown[]) => mockUpdateSession(...args),
    deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
  },
}))

import { useChatStore } from '@/stores/chat'

const mockSession = {
  id: 's1', tenant_id: 't1', user_id: 'u1', agent_id: 'a1', title: '会话',
  message_count: 0, is_archived: false, created_at: '2026-01-01', updated_at: '2026-01-01',
}

const mockAssistantMsg = {
  id: 'm2', session_id: 's1', role: 'assistant' as const,
  content: '回复', metadata: null, created_at: '2026-01-01',
}

describe('useChatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('fetchSessions 更新 sessions 列表', async () => {
    mockGetSessions.mockResolvedValue({ data: { success: true, data: [mockSession] } })
    const store = useChatStore()
    await store.fetchSessions()
    expect(store.sessions).toHaveLength(1)
    expect(store.hasSessions).toBe(true)
    expect(store.sessionsLoading).toBe(false)
  })

  it('createSession 创建并选中会话', async () => {
    mockCreateSession.mockResolvedValue({ data: { success: true, data: mockSession } })
    mockGetMessages.mockResolvedValue({ data: { success: true, data: [] } })
    const store = useChatStore()
    const result = await store.createSession('a1', '新会话')
    expect(result?.id).toBe('s1')
    expect(store.currentSessionId).toBe('s1')
  })

  it('selectSession 从列表选中并加载消息', async () => {
    mockGetMessages.mockResolvedValue({ data: { success: true, data: [mockAssistantMsg] } })
    const store = useChatStore()
    store.sessions = [mockSession]
    await store.selectSession('s1')
    expect(store.currentSession?.id).toBe('s1')
    expect(store.messages).toHaveLength(1)
    expect(store.hasMessages).toBe(true)
  })

  it('selectSession 不在列表时从 API 获取', async () => {
    mockGetSession.mockResolvedValue({ data: { success: true, data: mockSession } })
    mockGetMessages.mockResolvedValue({ data: { success: true, data: [] } })
    const store = useChatStore()
    await store.selectSession('s1')
    expect(mockGetSession).toHaveBeenCalledWith('s1')
  })

  it('sendMessage 添加用户和助手消息', async () => {
    mockSendMessage.mockResolvedValue({ data: { success: true, data: mockAssistantMsg } })
    const store = useChatStore()
    store.currentSession = { ...mockSession, message_count: 0 }
    await store.sendMessage('你好')
    expect(store.messages.length).toBeGreaterThanOrEqual(2)
    expect(store.sending).toBe(false)
  })

  it('sendMessage 首条消息更新会话标题', async () => {
    mockSendMessage.mockResolvedValue({ data: { success: true, data: mockAssistantMsg } })
    const store = useChatStore()
    store.currentSession = { ...mockSession, message_count: 0, title: '新对话' }
    await store.sendMessage('第一条消息内容')
    expect(store.currentSession?.title).toBe('第一条消息内容')
  })

  it('sendMessage 无当前会话时不发送', async () => {
    const store = useChatStore()
    await store.sendMessage('你好')
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('updateSession 更新会话信息', async () => {
    const updated = { ...mockSession, title: '新标题' }
    mockUpdateSession.mockResolvedValue({ data: { success: true, data: updated } })
    const store = useChatStore()
    store.sessions = [mockSession]
    store.currentSession = mockSession
    await store.updateSession('s1', { title: '新标题' })
    expect(store.currentSession?.title).toBe('新标题')
  })

  it('deleteSession 移除会话并清空当前', async () => {
    mockDeleteSession.mockResolvedValue({ data: { success: true } })
    const store = useChatStore()
    store.sessions = [mockSession]
    store.currentSession = mockSession
    store.messages = [mockAssistantMsg]
    await store.deleteSession('s1')
    expect(store.sessions).toHaveLength(0)
    expect(store.currentSession).toBeNull()
    expect(store.messages).toHaveLength(0)
  })

  it('clearCurrent 清空当前会话和消息', () => {
    const store = useChatStore()
    store.currentSession = mockSession
    store.messages = [mockAssistantMsg]
    store.clearCurrent()
    expect(store.currentSession).toBeNull()
    expect(store.messages).toHaveLength(0)
  })

  it('stopStreaming 中止流式输出', () => {
    const store = useChatStore()
    store.streaming = true
    store.sending = true
    store.stopStreaming()
    expect(store.streaming).toBe(false)
    expect(store.sending).toBe(false)
  })

  it('sendStreamMessage 无 token 时抛出未登录错误', async () => {
    localStorage.clear()
    const store = useChatStore()
    store.currentSession = { ...mockSession, message_count: 0 }
    await expect(store.sendStreamMessage('hello')).rejects.toThrow('未登录')
    expect(store.streaming).toBe(false)
  })

  it('sendStreamMessage 401 时跳转登录', async () => {
    localStorage.setItem('access_token', 'token')
    vi.stubGlobal('location', { href: 'http://localhost/' })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false }))

    const store = useChatStore()
    store.currentSession = { ...mockSession, message_count: 0 }
    await store.sendStreamMessage('hello')
    expect(location.href).toBe('/login')
  })

  it('sendStreamMessage 成功接收 SSE 流', async () => {
    localStorage.setItem('access_token', 'token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"content":"Hello"}\n\n') })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    }))

    const store = useChatStore()
    store.currentSession = { ...mockSession, message_count: 1 }
    await store.sendStreamMessage('hi')
    expect(store.streamingContent).toContain('Hello')
    expect(store.streaming).toBe(false)
  })
})
