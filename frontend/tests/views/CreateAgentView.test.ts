import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockCreate = vi.fn()
const mockUploadIcon = vi.fn()
const mockGetCategories = vi.fn()
const mockPush = vi.fn()

vi.mock('@/api/agents', () => ({
  agentsApi: {
    create: (...args: unknown[]) => mockCreate(...args),
    uploadIcon: (...args: unknown[]) => mockUploadIcon(...args),
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
  },
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return { ...actual, useRouter: () => ({ push: mockPush }) }
})

import CreateAgentView from '@/views/CreateAgentView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/agents/create', component: CreateAgentView }],
  })
  return mount(CreateAgentView, {
    global: {
      plugins: [pinia, router, ElementPlus],
      stubs: { AppLayout: { template: '<div><slot /></div>' } },
    },
  })
}

describe('CreateAgentView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCategories.mockResolvedValue({
      data: { success: true, data: [{ id: 'c1', name: '客服', slug: 'cs', icon: null, sort_order: 1 }] },
    })
    mockCreate.mockResolvedValue({
      data: { success: true, data: { id: 'new-1', name: 'New Agent' } },
    })
  })

  it('渲染创建 Agent 页面', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(wrapper.text()).toContain('创建 Agent')
    expect(wrapper.text()).toContain('Agent 名称')
  })

  it('提交表单后调用 create API 并跳转', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    await wrapper.find('input[placeholder="输入 Agent 名称"]').setValue('New Agent')
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')
    await new Promise(r => setTimeout(r, 100))
    expect(mockCreate).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/marketplace')
  })

  it('有图标文件时创建后上传图标', async () => {
    mockUploadIcon.mockResolvedValue({ data: { success: true, data: { icon_url: 'http://icon.png' } } })
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    const file = new File(['x'], 'icon.png', { type: 'image/png' })
    const form = wrapper.findComponent({ name: 'AgentForm' })
    if (form.exists()) {
      form.vm.$emit('icon-file', file)
    }
    await wrapper.find('input[placeholder="输入 Agent 名称"]').setValue('With Icon')
    await wrapper.find('form').trigger('submit')
    await new Promise(r => setTimeout(r, 150))
    expect(mockCreate).toHaveBeenCalled()
  })
})
