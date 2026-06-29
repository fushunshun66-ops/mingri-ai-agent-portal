// MarketplaceView 测试 — 使用真实 store + mock API
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockList = vi.fn()
const mockGetCategories = vi.fn()

vi.mock('@/api/agents', () => ({
  agentsApi: {
    list: (...args: unknown[]) => mockList(...args),
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isLoggedIn: true,
    user: { id: '1', username: 'testuser' },
  })),
}))

import MarketplaceView from '@/views/MarketplaceView.vue'

const mockAgent = {
  id: '1', tenant_id: 't1', name: '智能客服助手', description: '自动回答客户问题',
  icon_url: null, category_id: 'cat1',
  category: { id: 'cat1', name: '客服', slug: 'customer-service', icon: null, sort_order: 1 },
  tags: [{ name: '客服' }], platform_type: 'dify' as const, platform_config: null,
  capability: null, input_schema: null, output_schema: null,
  visibility: 'tenant_visible' as const, status: 'published' as const, version: '1.0.0', owner_id: 'u1',
  install_count: 128, rating_avg: 4.5, review_count: 32, created_at: '2026-01-01T00:00:00Z', updated_at: null,
}

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/marketplace', component: MarketplaceView },
      { path: '/agents/create', component: { template: '<div>Create</div>' } },
    ],
  })
  return mount(MarketplaceView, {
    global: {
      plugins: [pinia, router, ElementPlus],
      stubs: {
        AppLayout: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('MarketplaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockList.mockResolvedValue({
      data: { success: true, data: [mockAgent], pagination: { total: 1, page: 1, page_size: 20, total_pages: 1 } },
    })
    mockGetCategories.mockResolvedValue({
      data: { success: true, data: [{ id: 'cat1', name: '客服', slug: 'customer-service', icon: null, sort_order: 1 }] },
    })
  })

  it('渲染 Agent 市场页面标题', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(wrapper.text()).toContain('Agent 市场')
  })

  it('挂载时加载 Agent 和分类', async () => {
    createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(mockGetCategories).toHaveBeenCalled()
    expect(mockList).toHaveBeenCalled()
  })

  it('显示 Agent 卡片', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('智能客服助手')
  })

  it('点击分类 pill 触发筛选', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    mockList.mockClear()
    const pills = wrapper.findAll('.category-pill')
    const catPill = pills.find(p => p.text().includes('客服'))
    await catPill!.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockList).toHaveBeenCalled()
  })

  it('搜索输入触发 fetchAgents', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    mockList.mockClear()
    const input = wrapper.find('input[placeholder="搜索 Agent..."]')
    await input.setValue('客服')
    await new Promise(r => setTimeout(r, 400))
    expect(mockList).toHaveBeenCalled()
  })

  it('分页变更时重新加载', async () => {
    mockList.mockResolvedValue({
      data: { success: true, data: [mockAgent], pagination: { total: 50, page: 1, page_size: 20, total_pages: 3 } },
    })
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    mockList.mockClear()
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    if (pagination.exists()) {
      pagination.vm.$emit('current-change', 2)
      await new Promise(r => setTimeout(r, 50))
      expect(mockList).toHaveBeenCalled()
    }
  })

  it('包含创建 Agent 入口', async () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('创建 Agent')
  })
})
