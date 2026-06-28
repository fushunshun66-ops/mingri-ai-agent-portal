// ChatMessage 组件测试 — 消息气泡渲染、Markdown、反馈按钮
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatMessage from '@/components/ChatMessage.vue'

describe('ChatMessage', () => {
  // ---- 用户消息 ----
  describe('用户消息', () => {
    it('渲染用户消息内容', () => {
      const wrapper = mount(ChatMessage, {
        props: {
          role: 'user',
          content: '你好，请帮我分析数据',
          timestamp: '2026-06-28T10:00:00Z',
        },
      })
      expect(wrapper.text()).toContain('你好，请帮我分析数据')
    })

    it('用户消息使用右侧对齐样式', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'user', content: '测试', timestamp: '2026-06-28T10:00:00Z' },
      })
      const bubble = wrapper.find('.chat-message')
      expect(bubble.classes()).toContain('chat-message--user')
    })

    it('用户消息不显示反馈按钮', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'user', content: '测试', timestamp: '2026-06-28T10:00:00Z' },
      })
      expect(wrapper.find('.feedback-btn').exists()).toBe(false)
    })
  })

  // ---- 助手消息 ----
  describe('助手消息', () => {
    it('渲染助手消息内容', () => {
      const wrapper = mount(ChatMessage, {
        props: {
          role: 'assistant',
          content: '根据数据分析，发现以下问题：\n1. 销售数据下降\n2. 客户流失增加',
          timestamp: '2026-06-28T10:01:00Z',
        },
      })
      expect(wrapper.text()).toContain('根据数据分析')
    })

    it('助手消息使用左侧对齐样式', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '测试', timestamp: '2026-06-28T10:00:00Z' },
      })
      const bubble = wrapper.find('.chat-message')
      expect(bubble.classes()).toContain('chat-message--assistant')
    })

    it('助手消息显示反馈按钮', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '测试', timestamp: '2026-06-28T10:00:00Z' },
      })
      expect(wrapper.find('.feedback-btn--like').exists()).toBe(true)
      expect(wrapper.find('.feedback-btn--dislike').exists()).toBe(true)
    })

    it('点击喜欢按钮触发 feedback 事件', async () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '测试', timestamp: '2026-06-28T10:00:00Z' },
      })
      await wrapper.find('.feedback-btn--like').trigger('click')
      expect(wrapper.emitted('feedback')?.[0]).toEqual(['like'])
    })

    it('点击不喜欢按钮触发 feedback 事件', async () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '测试', timestamp: '2026-06-28T10:00:00Z' },
      })
      await wrapper.find('.feedback-btn--dislike').trigger('click')
      expect(wrapper.emitted('feedback')?.[0]).toEqual(['dislike'])
    })
  })

  // ---- Markdown 渲染 ----
  describe('Markdown 渲染', () => {
    it('渲染粗体文本', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '这是**重要**信息', timestamp: '2026-06-28T10:00:00Z' },
      })
      expect(wrapper.find('strong').exists()).toBe(true)
      expect(wrapper.find('strong').text()).toBe('重要')
    })

    it('渲染斜体文本', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '这是*强调*文字', timestamp: '2026-06-28T10:00:00Z' },
      })
      expect(wrapper.find('em').exists()).toBe(true)
      expect(wrapper.find('em').text()).toBe('强调')
    })

    it('渲染行内代码', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '请使用`print()`函数', timestamp: '2026-06-28T10:00:00Z' },
      })
      const code = wrapper.find('code')
      expect(code.exists()).toBe(true)
      expect(code.text()).toBe('print()')
    })

    it('将换行符渲染为 br', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '第一行\n第二行', timestamp: '2026-06-28T10:00:00Z' },
      })
      const html = wrapper.html()
      expect(html).toContain('<br')
    })

    it('渲染空内容时不崩溃', () => {
      const wrapper = mount(ChatMessage, {
        props: { role: 'assistant', content: '', timestamp: '2026-06-28T10:00:00Z' },
      })
      expect(wrapper.find('.message-content').exists()).toBe(true)
    })
  })

  // ---- 时间显示 ----
  describe('时间显示', () => {
    it('显示格式化的时间', () => {
      const wrapper = mount(ChatMessage, {
        props: {
          role: 'assistant',
          content: '测试',
          timestamp: '2026-06-28T14:30:00Z',
        },
      })
      expect(wrapper.find('.message-time').exists()).toBe(true)
    })
  })
})
