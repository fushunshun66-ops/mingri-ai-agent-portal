// ChatView 测试 — 使用真实 store + mock API，覆盖页面交互逻辑
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockGetSessions = vi.fn()
const mockCreateSession = vi.fn()
const mockGetMessages = vi.fn()
const mockDeleteSession = vi.fn()
const mockSendFeedback = vi.fn()
const mockFetchAgents = vi.fn()

vi.mock('@/api/chat', () => ({
  chatApi: {
    getSessions: (...args: unknown[]) => mockGetSessions(...args),
    createSession: (...args: unknown[]) => mockCreateSession(...args),
    getSession: vi.fn(),
    getMessages: (...args: unknown[]) => mockGetMessages(...args),
    sendMessage: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
    sendFeedback: (...args: unknown[]) => mockSendFeedback(...args),
  },
}))

vi.mock('@/api/agents', () => ({
  agentsApi: {
    list: (...args: unknown[]) => mockFetchAgents(...args),
  },
}))

import ChatView from '@/views/ChatView.vue'
import { useChatStore } from '@/stores/chat'

const mockSession = {
  id: 's1', title: '测试会话', message_count: 2, agent_id: 'a1',
  tenant_id: 't1', user_id: 'u1', is_archived: false,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

function createWrapper(route = '/chat') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/chat', component: ChatView }],
  })
  router.push(route)
  const wrapper = mount(ChatView, {
    global: {
      plugins: [pinia, router, ElementPlus],
      stubs: {
        AppLayout: { template: '<div><slot /></div>' },
        ChatSidebar: {
          template: `
            <div class="chat-sidebar-stub">
              <button class="create-session-btn" @click="$emit('create')">新建</button>
              <button class="delete-session-btn" @click="$emit('delete', 's1')">删除</button>
              <button class="select-session-btn" @click="$emit('select', 's1')">选择</button>
            </div>`,
          props: ['sessions', 'loading', 'currentSessionId'],
        },
        ChatMessage: {
          template: '<div class="chat-message-stub" @click="$emit(\'feedback\', \'like\')">{{ content }}</div>',
          props: ['role', 'content', 'timestamp'],
        },
        ChatInput: {
          template: `
            <div class="chat-input-stub">
              <button class="send-btn" @click="$emit('send', '测试消息')">发送</button>
              <button class="stop-btn" @click="$emit('stop')">停止</button>
            </div>`,
          props: ['streaming', 'hasSession'],
        },
      },
    },
  })
  return { wrapper, pinia, router }
}

describe('ChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('access_token', 'test-token')
    mockGetSessions.mockResolvedValue({ data: { success: true, data: [mockSession] } })
    mockGetMessages.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 'm1', session_id: 's1', role: 'user', content: '你好', metadata: null, created_at: '2026-01-01T00:00:00Z' },
          { id: 'm2', session_id: 's1', role: 'assistant', content: '你好！', metadata: null, created_at: '2026-01-01T00:00:01Z' },
        ],
      },
    })
    mockCreateSession.mockResolvedValue({ data: { success: true, data: mockSession } })
    mockDeleteSession.mockResolvedValue({ data: { success: true } })
    mockSendFeedback.mockResolvedValue({ data: { success: true } })
    mockFetchAgents.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 'a1', name: 'Agent' }],
        pagination: { total: 1, page: 1, page_size: 1, total_pages: 1 },
      },
    })
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"content":"Hi"}\n\n') })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    })
  })

  it('渲染对话页面', async () => {
    const { wrapper } = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(wrapper.find('.chat-page').exists()).toBe(true)
  })

  it('挂载时加载会话列表', async () => {
    createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetSessions).toHaveBeenCalled()
  })

  it('无当前会话时显示空状态', async () => {
    mockGetSessions.mockResolvedValue({ data: { success: true, data: [] } })
    const { wrapper } = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(wrapper.find('.empty-chat').exists()).toBe(true)
  })

  it('点击新建会话按钮创建会话', async () => {
    mockGetSessions.mockResolvedValue({ data: { success: true, data: [] } })
    const { wrapper } = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    await wrapper.find('.create-session-btn').trigger('click')
    await new Promise(r => setTimeout(r, 100))
    expect(mockCreateSession).toHaveBeenCalled()
  })

  it('点击发送按钮触发流式发送', async () => {
    const { wrapper, pinia } = createWrapper()
    const store = useChatStore(pinia)
    store.sessions = [mockSession]
    store.currentSession = mockSession
    await new Promise(r => setTimeout(r, 50))
    await wrapper.find('.send-btn').trigger('click')
    await new Promise(r => setTimeout(r, 100))
    expect(globalThis.fetch).toHaveBeenCalled()
  })

  it('删除会话调用 store.deleteSession', async () => {
    const { wrapper, pinia } = createWrapper()
    const store = useChatStore(pinia)
    store.sessions = [mockSession]
    store.currentSession = mockSession
    await wrapper.find('.delete-session-btn').trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockDeleteSession).toHaveBeenCalledWith('s1')
    expect(store.sessions).toHaveLength(0)
  })

  it('选择会话加载消息', async () => {
    const { wrapper, pinia } = createWrapper()
    const store = useChatStore(pinia)
    store.sessions = [mockSession]
    await wrapper.find('.select-session-btn').trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetMessages).toHaveBeenCalledWith('s1')
    expect(store.currentSession?.id).toBe('s1')
  })
})
