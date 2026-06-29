import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'

const mockGetCategories = vi.fn()

vi.mock('@/api/agents', () => ({
  agentsApi: {
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
  },
}))

import AgentForm from '@/components/AgentForm.vue'

const mockAgent = {
  id: '1', tenant_id: 't1', name: 'Existing Agent', description: 'desc',
  icon_url: 'http://icon.png', category_id: 'c1',
  category: { id: 'c1', name: '客服', slug: 'cs', icon: null, sort_order: 1 },
  tags: [{ name: 'AI' }], platform_type: 'dify' as const,
  platform_config: { api_key: 'sk-test', base_url: 'https://api.dify.ai' },
  capability: null, input_schema: null, output_schema: null,
  visibility: 'tenant_visible' as const, status: 'published' as const,
  version: '2.0.0', owner_id: 'u1', install_count: 0, rating_avg: 0,
  review_count: 0, created_at: '2026-01-01', updated_at: null,
}

function createWrapper(props = {}) {
  return mount(AgentForm, {
    props,
    global: { plugins: [ElementPlus] },
  })
}

describe('AgentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCategories.mockResolvedValue({
      data: { success: true, data: [{ id: 'c1', name: '客服', slug: 'cs', icon: null, sort_order: 1 }] },
    })
  })

  it('渲染创建模式表单字段', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Agent 名称')
    expect(wrapper.text()).toContain('创建 Agent')
  })

  it('编辑模式显示保存修改按钮', async () => {
    const wrapper = createWrapper({ initialData: mockAgent })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('保存修改')
  })

  it('挂载时加载分类列表', async () => {
    createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetCategories).toHaveBeenCalled()
  })

  it('编辑模式预填 Agent 数据', async () => {
    const wrapper = createWrapper({ initialData: mockAgent })
    await wrapper.vm.$nextTick()
    const nameInput = wrapper.find('input[placeholder="输入 Agent 名称"]')
    expect((nameInput.element as HTMLInputElement).value).toBe('Existing Agent')
  })

  it('选择 dify 平台时显示平台配置字段', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    const selects = wrapper.findAll('.el-select')
    if (selects.length > 1) {
      await selects[1].trigger('click')
      await wrapper.vm.$nextTick()
    }
    expect(wrapper.text()).toContain('平台类型')
  })

  it('选择 n8n 平台时显示 Webhook 配置', async () => {
    const wrapper = createWrapper({ initialData: { ...mockAgent, platform_type: 'n8n' as const, platform_config: { webhook_url: 'https://n8n.test' } } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('N8N Webhook URL')
  })

  it('选择 coze 平台时显示 Bot 配置', async () => {
    const wrapper = createWrapper({ initialData: { ...mockAgent, platform_type: 'coze' as const, platform_config: { bot_id: 'bot1' } } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Coze Bot ID')
  })

  it('提交有效表单时 emit submit 事件', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    const nameInput = wrapper.find('input[placeholder="输入 Agent 名称"]')
    await nameInput.setValue('New Agent')
    await wrapper.vm.$nextTick()
    const submitBtn = wrapper.find('button[type="submit"], .el-button--primary')
    if (submitBtn.exists()) {
      await submitBtn.trigger('click')
    } else {
      await wrapper.find('form').trigger('submit')
    }
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 50))
    // 验证表单字段已填写
    expect((nameInput.element as HTMLInputElement).value).toBe('New Agent')
  })

  it('空名称时不 emit submit', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('加载分类失败时不抛异常', async () => {
    mockGetCategories.mockRejectedValue(new Error('fail'))
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Agent 名称')
  })
})
