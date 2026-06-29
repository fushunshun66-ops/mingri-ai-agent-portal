// ChatSidebar 组件测试 — 会话列表、新建对话、搜索、删除
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatSidebar from '@/components/ChatSidebar.vue'

const mockSessions = [
  { id: 's1', title: '数据分析讨论', message_count: 5, agent_id: null, tenant_id: 't1', user_id: 'u1', is_archived: false, created_at: '2026-06-28T10:00:00Z', updated_at: '2026-06-28T10:00:00Z' },
  { id: 's2', title: '代码审查', message_count: 12, agent_id: null, tenant_id: 't1', user_id: 'u1', is_archived: false, created_at: '2026-06-28T11:00:00Z', updated_at: '2026-06-28T11:00:00Z' },
  { id: 's3', title: 'Bug 分析', message_count: 3, agent_id: null, tenant_id: 't1', user_id: 'u1', is_archived: false, created_at: '2026-06-28T12:00:00Z', updated_at: '2026-06-28T12:00:00Z' },
]

describe('ChatSidebar', () => {
  // ---- 基础渲染 ----
  describe('基础渲染', () => {
    it('显示"新建对话"按钮', () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: [], loading: false, currentSessionId: null },
      })
      expect(wrapper.text()).toContain('新建对话')
    })

    it('渲染会话列表', () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: mockSessions, loading: false, currentSessionId: null },
      })
      expect(wrapper.text()).toContain('数据分析讨论')
      expect(wrapper.text()).toContain('代码审查')
      expect(wrapper.text()).toContain('Bug 分析')
    })

    it('空列表时显示空提示', () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: [], loading: false, currentSessionId: null },
      })
      // 应该显示空状态提示
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('loading 为 true 时显示加载状态', () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: [], loading: true, currentSessionId: null },
      })
      expect(wrapper.find('.loading-state').exists()).toBe(true)
    })
  })

  // ---- 事件 ----
  describe('事件', () => {
    it('点击"新建对话"触发 create 事件', async () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: [], loading: false, currentSessionId: null },
      })
      await wrapper.find('.new-chat-btn').trigger('click')
      expect(wrapper.emitted('create')).toBeTruthy()
    })

    it('点击会话项触发 select 事件', async () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: mockSessions, loading: false, currentSessionId: null },
      })
      await wrapper.find('.session-item').trigger('click')
      expect(wrapper.emitted('select')?.[0]).toEqual(['s1'])
    })

    it('搜索输入触发 search 事件', async () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: mockSessions, loading: false, currentSessionId: null },
      })
      const input = wrapper.find('input')
      await input.setValue('数据')
      // 防抖延迟后应该触发
      await new Promise(r => setTimeout(r, 350))
      expect(wrapper.emitted('search')?.[0]).toEqual(['数据'])
    })
  })

  // ---- 当前会话高亮 ----
  describe('当前会话高亮', () => {
    it('选中的会话添加高亮样式', () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: mockSessions, loading: false, currentSessionId: 's1' },
      })
      const activeItem = wrapper.find('.session-item--active')
      expect(activeItem.exists()).toBe(true)
      expect(activeItem.text()).toContain('数据分析讨论')
    })
  })

  // ---- 删除会话 ----
  describe('删除会话', () => {
    it('点击删除按钮触发 delete 事件', async () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: mockSessions, loading: false, currentSessionId: null },
      })
      const deleteBtn = wrapper.find('.delete-btn')
      await deleteBtn.trigger('click')
      expect(wrapper.emitted('delete')?.[0]).toEqual(['s1'])
    })

    it('删除按钮具有 aria-label 无障碍标签', () => {
      const wrapper = mount(ChatSidebar, {
        props: { sessions: mockSessions, loading: false, currentSessionId: null },
      })
      const deleteBtn = wrapper.find('.delete-btn')
      expect(deleteBtn.attributes('aria-label')).toBe('删除会话')
    })
  })
})
