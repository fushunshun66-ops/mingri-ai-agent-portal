import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockGetById = vi.fn()
const mockUpdate = vi.fn()
const mockGetCategories = vi.fn()

vi.mock('@/api/agents', () => ({
  agentsApi: {
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    uploadIcon: vi.fn(),
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
  },
}))

import EditAgentView from '@/views/EditAgentView.vue'

const mockAgent = {
  id: '1', tenant_id: 't1', name: 'Edit Agent', description: 'desc',
  icon_url: null, category_id: null, category: null, tags: [],
  platform_type: 'dify' as const, platform_config: null, capability: null,
  input_schema: null, output_schema: null, visibility: 'tenant_visible' as const,
  status: 'published' as const, version: '1.0', owner_id: 'u1',
  install_count: 0, rating_avg: 0, review_count: 0,
  created_at: '2026-01-01', updated_at: null,
}

async function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/agents/:id/edit', component: EditAgentView }],
  })
  await router.push('/agents/1/edit')
  await router.isReady()
  const wrapper = mount(EditAgentView, {
    global: {
      plugins: [pinia, router, ElementPlus],
      stubs: { AppLayout: { template: '<div><slot /></div>' } },
    },
  })
  return { wrapper, router }
}

describe('EditAgentView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetById.mockResolvedValue({ data: { success: true, data: mockAgent } })
    mockUpdate.mockResolvedValue({ data: { success: true, data: mockAgent } })
    mockGetCategories.mockResolvedValue({ data: { success: true, data: [] } })
  })

  it('渲染编辑 Agent 页面标题', async () => {
    const { wrapper } = await createWrapper()
    expect(wrapper.text()).toContain('编辑 Agent')
  })

  it('挂载时加载 Agent 数据', async () => {
    await createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(mockGetById).toHaveBeenCalledWith('1')
  })

  it('加载成功后显示 AgentForm', async () => {
    const { wrapper } = await createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.find('.agent-form').exists()).toBe(true)
  })

  it('提交表单调用 update API', async () => {
    const { wrapper } = await createWrapper()
    await new Promise(r => setTimeout(r, 100))
    await wrapper.find('input[placeholder="输入 Agent 名称"]').setValue('Updated Name')
    await wrapper.find('form').trigger('submit')
    await new Promise(r => setTimeout(r, 100))
    expect(mockUpdate).toHaveBeenCalled()
  })
})
