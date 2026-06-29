// ChatInput 组件测试 — 消息输入框、发送按钮、停止生成按钮
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatInput from '@/components/ChatInput.vue'

describe('ChatInput', () => {
  // ---- 基础渲染 ----
  describe('基础渲染', () => {
    it('渲染输入框', () => {
      const wrapper = mount(ChatInput)
      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)
    })

    it('渲染发送按钮', () => {
      const wrapper = mount(ChatInput)
      const button = wrapper.find('.send-btn')
      expect(button.exists()).toBe(true)
    })

    it('输入框 placeholder 包含提示文字', () => {
      const wrapper = mount(ChatInput)
      const textarea = wrapper.find('textarea')
      expect(textarea.attributes('placeholder')).toBeTruthy()
    })

    it('渲染指令建议栏', () => {
      const wrapper = mount(ChatInput)
      expect(wrapper.find('.suggestion-bar').exists()).toBe(true)
      expect(wrapper.findAll('.suggestion-chip').length).toBeGreaterThan(0)
    })
  })

  // ---- 指令建议 ----
  describe('指令建议', () => {
    it('点击建议 chip 填入输入框', async () => {
      const wrapper = mount(ChatInput)
      const chip = wrapper.find('.suggestion-chip')
      const chipText = chip.text()
      await chip.trigger('click')
      const inputEl = wrapper.find('textarea').element as HTMLTextAreaElement
      expect(inputEl.value).toBe(chipText)
    })
  })

  // ---- 消息发送 ----
  describe('消息发送', () => {
    it('按回车键发送消息', async () => {
      const wrapper = mount(ChatInput)
      const textarea = wrapper.find('textarea')

      await textarea.setValue('你好')
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

      expect(wrapper.emitted('send')?.[0]).toEqual(['你好'])
    })

    it('Shift+Enter 不发送消息（换行）', async () => {
      const wrapper = mount(ChatInput)
      const textarea = wrapper.find('textarea')

      await textarea.setValue('测试')
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

      expect(wrapper.emitted('send')).toBeFalsy()
    })

    it('点击发送按钮发送消息', async () => {
      const wrapper = mount(ChatInput)
      const textarea = wrapper.find('textarea')

      await textarea.setValue('你好')
      await wrapper.find('.send-btn').trigger('click')

      expect(wrapper.emitted('send')?.[0]).toEqual(['你好'])
    })

    it('发送后清空输入框', async () => {
      const wrapper = mount(ChatInput)
      const textarea = wrapper.find('textarea')

      await textarea.setValue('测试消息')
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

      const inputEl = textarea.element as HTMLTextAreaElement
      expect(inputEl.value).toBe('')
    })

    it('空内容不发送', async () => {
      const wrapper = mount(ChatInput)

      await wrapper.find('textarea').setValue('   ')
      await wrapper.find('.send-btn').trigger('click')

      expect(wrapper.emitted('send')).toBeFalsy()
    })
  })

  // ---- 停止生成按钮 ----
  describe('停止生成按钮', () => {
    it('streaming 为 true 时显示停止按钮', () => {
      const wrapper = mount(ChatInput, {
        props: { streaming: true },
      })
      expect(wrapper.find('.stop-btn').exists()).toBe(true)
      expect(wrapper.find('.send-btn').exists()).toBe(false)
    })

    it('streaming 为 false 时显示发送按钮', () => {
      const wrapper = mount(ChatInput, {
        props: { streaming: false },
      })
      expect(wrapper.find('.send-btn').exists()).toBe(true)
      expect(wrapper.find('.stop-btn').exists()).toBe(false)
    })

    it('点击停止按钮触发 stop 事件', async () => {
      const wrapper = mount(ChatInput, {
        props: { streaming: true },
      })
      await wrapper.find('.stop-btn').trigger('click')
      expect(wrapper.emitted('stop')).toBeTruthy()
    })
  })

  // ---- 禁用状态 ----
  describe('禁用状态', () => {
    it('disabled 为 true 时禁用输入框和按钮', () => {
      const wrapper = mount(ChatInput, {
        props: { disabled: true },
      })
      const textarea = wrapper.find('textarea')
      expect(textarea.attributes('disabled')).toBeDefined()
      expect(wrapper.find('.send-btn').attributes('disabled')).toBeDefined()
    })

    it('无会话时禁用输入框', () => {
      const wrapper = mount(ChatInput, {
        props: { hasSession: false },
      })
      const textarea = wrapper.find('textarea')
      expect(textarea.attributes('disabled')).toBeDefined()
    })
  })

  // ---- 自动聚焦 ----
  describe('自动聚焦', () => {
    it('组件挂载时调用 focus 方法', async () => {
      const textareaProto = HTMLTextAreaElement.prototype
      const focusSpy = vi.spyOn(textareaProto, 'focus')

      mount(ChatInput, {
        props: { hasSession: true },
        attachTo: document.body,
      })

      // 等待 nextTick
      await new Promise(r => setTimeout(r, 50))
      expect(focusSpy).toHaveBeenCalled()

      focusSpy.mockRestore()
    })
  })
})
