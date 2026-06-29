// MarketplaceView 测试 — 市场列表渲染和筛选
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

// Mock stores with agent data pre-populated
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isLoggedIn: true,
    user: { id: '1', username: 'testuser' },
  })),
}))

vi.mock('@/stores/agents', () => ({
  useAgentsStore: vi.fn(() => ({
    agents: [
      {
        id: '1', tenant_id: 't1', name: '智能客服助手', description: '自动回答客户问题',
        icon_url: null, category_id: 'cat1',
        category: { id: 'cat1', name: '客服', slug: 'customer-service', icon: null, sort_order: 1 },
        tags: [{ name: '客服' }, { name: 'AI' }], platform_type: 'dify', platform_config: null,
        capability: null, input_schema: null, output_schema: null,
        visibility: 'tenant_visible', status: 'published', version: '1.0.0', owner_id: 'u1',
        install_count: 128, rating_avg: 4.5, review_count: 32, created_at: '2026-01-01T00:00:00Z', updated_at: null,
      },
      {
        id: '2', tenant_id: 't1', name: '数据分析机器人', description: '智能数据分析',
        icon_url: null, category_id: 'cat2',
        category: { id: 'cat2', name: '数据分析', slug: 'data-analysis', icon: null, sort_order: 2 },
        tags: [{ name: '数据分析' }], platform_type: 'n8n', platform_config: null,
        capability: null, input_schema: null, output_schema: null,
        visibility: 'tenant_visible', status: 'published', version: '1.0.0', owner_id: 'u2',
        install_count: 56, rating_avg: 4.2, review_count: 15, created_at: '2026-01-02T00:00:00Z', updated_at: null,
      },
    ],
    total: 2,
    loading: false,
    categories: [
      { id: 'cat1', name: '客服', slug: 'customer-service', icon: null, sort_order: 1 },
      { id: 'cat2', name: '数据分析', slug: 'data-analysis', icon: null, sort_order: 2 },
    ],
    currentQuery: { page: 1, page_size: 20 },
    fetchAgents: vi.fn(),
    fetchCategories: vi.fn(),
  })),
}))

import MarketplaceView from '@/views/MarketplaceView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/marketplace', component: MarketplaceView },
      { path: '/agents/create', component: { template: '<div>Create Agent</div>' } },
      { path: '/agents/:id', component: { template: '<div>Agent Detail</div>' } },
    ],
  })

  return {
    wrapper: mount(MarketplaceView, {
      global: {
        plugins: [pinia, router, ElementPlus],
        stubs: {
          'router-link': { template: '<a :href="to"><slot /></a>', props: ['to'] },
          'el-skeleton': { template: '<div class="el-skeleton"><slot /></div>' },
          'el-empty': { template: '<div>暂无 Agent</div>' },
          'el-pagination': { template: '<div class="el-pagination"><slot /></div>' },
          'el-icon': { template: '<span class="el-icon"><slot /></span>' },
        },
      },
    }),
    router,
  }
}

describe('MarketplaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染 Agent 市场页面标题', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('Agent 市场')
  })

  it('显示 Agent 卡片列表', () => {
    const { wrapper } = createWrapper()
    const text = wrapper.text()
    expect(text).toContain('智能客服助手')
    expect(text).toContain('数据分析机器人')
  })

  it('显示 Agent 描述信息', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('自动回答客户问题')
  })

  it('显示 Agent 评分信息', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('4.5')
  })

  it('显示分类筛选区域（category-pill）', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.category-filter').exists()).toBe(true)
    const pills = wrapper.findAll('.category-pill')
    expect(pills.length).toBeGreaterThan(0)
    const text = wrapper.text()
    expect(text).toContain('客服')
    expect(text).toContain('数据分析')
  })

  it('包含 marketplace-toolbar 工具栏', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.marketplace-toolbar').exists()).toBe(true)
  })

  it('加载态使用 agent-grid-skeleton 骨架屏', async () => {
    const { useAgentsStore } = await import('@/stores/agents')
    vi.mocked(useAgentsStore).mockReturnValueOnce({
      agents: [],
      total: 0,
      loading: true,
      categories: [],
      currentQuery: { page: 1, page_size: 20 },
      fetchAgents: vi.fn(),
      fetchCategories: vi.fn(),
    } as unknown as ReturnType<typeof useAgentsStore>)

    const { wrapper } = createWrapper()
    expect(wrapper.find('.agent-grid-skeleton').exists()).toBe(true)
  })

  it('包含搜索输入框', () => {
    const { wrapper } = createWrapper()
    const inputs = wrapper.findAll('input')
    const searchInput = inputs.find(el => (el.element as HTMLInputElement).placeholder?.includes('搜索'))
    expect(searchInput).toBeTruthy()
  })

  it('包含创建 Agent 入口', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('创建 Agent')
  })
})
