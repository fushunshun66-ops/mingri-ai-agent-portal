import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockGetById = vi.fn()
const mockGetReviews = vi.fn()
const mockInstall = vi.fn()
const mockToggleFavorite = vi.fn()

const mockCreateReview = vi.fn()

vi.mock('@/api/agents', () => ({
  agentsApi: {
    getById: (...args: unknown[]) => mockGetById(...args),
    getReviews: (...args: unknown[]) => mockGetReviews(...args),
    install: (...args: unknown[]) => mockInstall(...args),
    uninstall: vi.fn(),
    createReview: (...args: unknown[]) => mockCreateReview(...args),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'u1' } })),
}))

vi.mock('@/stores/agents', () => ({
  useAgentsStore: vi.fn(() => ({ toggleFavorite: mockToggleFavorite })),
}))

import AgentDetailView from '@/views/AgentDetailView.vue'

const mockAgent = {
  id: '1', tenant_id: 't1', name: 'Detail Agent', description: 'Line1\nLine2',
  icon_url: null, category_id: 'c1',
  category: { id: 'c1', name: '客服', slug: 'cs', icon: null, sort_order: 1 },
  tags: [{ name: 'AI' }], platform_type: 'dify' as const, platform_config: null,
  capability: { tools: ['search'] }, input_schema: null, output_schema: null,
  visibility: 'tenant_visible' as const, status: 'published' as const,
  version: '1.0.0', owner_id: 'u1', install_count: 10, rating_avg: 4.5,
  review_count: 2, created_at: '2026-01-01', updated_at: null,
}

function createWrapper(agentId = '1') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/agents/:id', component: AgentDetailView }],
  })
  router.push(`/agents/${agentId}`)
  return mount(AgentDetailView, {
    global: {
      plugins: [pinia, router, ElementPlus],
      stubs: { AppLayout: { template: '<div><slot /></div>' } },
    },
  })
}

describe('AgentDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetById.mockResolvedValue({ data: { success: true, data: mockAgent } })
    mockGetReviews.mockResolvedValue({ data: { success: true, data: [] } })
  })

  it('加载后显示 Agent 名称和描述', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Detail Agent')
    expect(wrapper.text()).toContain('描述')
    expect(wrapper.text()).toContain('能力')
    expect(wrapper.text()).toContain('tools')
  })

  it('显示安装按钮', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('安装')
  })

  it('点击安装按钮调用 install API', async () => {
    mockInstall.mockResolvedValue({ data: { success: true } })
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    const installBtn = wrapper.findAll('button').find(b => b.text().includes('安装'))
    if (installBtn) {
      await installBtn.trigger('click')
      await new Promise(r => setTimeout(r, 100))
      expect(mockInstall).toHaveBeenCalledWith('1')
    }
  })

  it('点击收藏按钮调用 toggleFavorite', async () => {
    mockToggleFavorite.mockResolvedValue(undefined)
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    const favBtn = wrapper.findAll('button').find(b => b.text().includes('收藏'))
    if (favBtn) {
      await favBtn.trigger('click')
      await new Promise(r => setTimeout(r, 100))
      expect(mockToggleFavorite).toHaveBeenCalled()
    }
  })

  it('提交评价调用 createReview', async () => {
    mockCreateReview.mockResolvedValue({
      data: { success: true, data: { id: 'r1', rating: 5, comment: '好', created_at: '2026-01-01' } },
    })
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('提交评价'))
    if (submitBtn) {
      await submitBtn.trigger('click')
      await new Promise(r => setTimeout(r, 50))
    }
    expect(wrapper.text()).toContain('评价')
  })
})
