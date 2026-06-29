// ChatView 测试 — 对话主页面渲染、消息发送、会话列表
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

// Mock chat store
const mockStore = {
  sessions: [
    { id: 's1', title: '测试会话', message_count: 2, agent_id: null, tenant_id: 't1', user_id: 'u1', is_archived: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ],
  currentSession: { id: 's1', title: '测试会话', message_count: 2, agent_id: null, tenant_id: 't1', user_id: 'u1', is_archived: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  messages: [
    { id: 'm1', session_id: 's1', role: 'user', content: '你好', metadata: null, created_at: '2026-01-01T00:00:00Z' },
    { id: 'm2', session_id: 's1', role: 'assistant', content: '你好！有什么可以帮助你的？', metadata: null, created_at: '2026-01-01T00:00:01Z' },
  ],
  sessionsLoading: false,
  messagesLoading: false,
  sending: false,
  streaming: false,
  streamingContent: '',
  hasSessions: true,
  hasMessages: true,
  currentSessionId: 's1' as string | null,
  fetchSessions: vi.fn(),
  createSession: vi.fn(),
  selectSession: vi.fn(),
  sendMessage: vi.fn(),
  sendStreamMessage: vi.fn(),
  stopStreaming: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  clearCurrent: vi.fn(),
}

vi.mock('@/stores/chat', () => ({
  useChatStore: vi.fn(() => mockStore),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isLoggedIn: true,
    user: { id: 'u1', username: 'testuser', display_name: '测试用户' },
  })),
}))

import ChatView from '@/views/ChatView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/chat', component: ChatView },
    ],
  })
  // 导航到 /chat 让 route.query 可用
  router.push('/chat')

  return mount(ChatView, {
    global: {
      plugins: [pinia, router, ElementPlus],
      stubs: {
        'router-link': { template: '<a :href="to"><slot /></a>', props: ['to'] },
        'AppLayout': { template: '<div class="app-layout"><slot /></div>' },
        'ChatSidebar': { template: '<div class="chat-sidebar-stub"><slot /></div>' },
        'ChatMessage': { template: '<div class="chat-message-stub"><slot /></div>' },
        'ChatInput': { template: '<div class="chat-input-stub"><slot /></div>' },
        'el-skeleton': { template: '<div class="el-skeleton"><slot /></div>' },
        'el-button': { template: '<button class="el-button"><slot /></button>' },
      },
    },
  })
}

describe('ChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- 基础渲染 ----
  describe('基础渲染', () => {
    it('渲染对话页面', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.chat-page').exists()).toBe(true)
    })

    it('无当前会话时显示空状态', () => {
      mockStore.currentSession = null as any
      mockStore.currentSessionId = null
      const wrapper = createWrapper()
      expect(wrapper.find('.empty-chat').exists()).toBe(true)
      // 恢复
      mockStore.currentSession = mockStore.sessions[0] as any
      mockStore.currentSessionId = 's1'
    })

    it('有会话时显示消息列表', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.message-list').exists()).toBe(true)
    })
  })

  // ---- 消息列表 ----
  describe('消息列表', () => {
    it('显示用户和助手消息', () => {
      const wrapper = createWrapper()
      const messages = wrapper.findAll('.chat-message-stub')
      expect(messages).toHaveLength(2)
    })
  })

  // ---- 输入框 ----
  describe('输入框', () => {
    it('有会话时显示输入框', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.chat-input-stub').exists()).toBe(true)
    })
  })

  // ---- 标题 ----
  describe('标题显示', () => {
    it('显示当前会话标题', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('测试会话')
    })
  })
})
