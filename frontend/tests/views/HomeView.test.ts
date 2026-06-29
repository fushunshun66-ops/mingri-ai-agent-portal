// HomeView 测试 — 首页 Hero、搜索、分类 Tab、引导卡片
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockRecommended = [
  {
    id: '1', tenant_id: 't1', name: '智能客服助手', description: '自动回答客户问题',
    icon_url: null, category_id: 'cat1',
    category: { id: 'cat1', name: '客服', slug: 'customer-service', icon: null, sort_order: 1 },
    tags: [{ name: '客服' }], platform_type: 'dify', platform_config: null,
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
]

const mockFetchRecommended = vi.fn()
const mockFetchCategories = vi.fn()
const mockFetchAgents = vi.fn()

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isLoggedIn: true,
    displayName: '测试用户',
    user: { id: '1', username: 'testuser' },
  })),
}))

vi.mock('@/stores/agents', () => ({
  useAgentsStore: vi.fn(() => ({
    recommended: mockRecommended,
    recommendedLoading: false,
    categories: [
      { id: 'cat1', name: '客服', slug: 'customer-service', icon: null, sort_order: 1 },
      { id: 'cat2', name: '数据分析', slug: 'data-analysis', icon: null, sort_order: 2 },
    ],
    total: 42,
    fetchRecommended: mockFetchRecommended,
    fetchCategories: mockFetchCategories,
    fetchAgents: mockFetchAgents,
  })),
}))

import HomeView from '@/views/HomeView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/home', component: HomeView },
      { path: '/marketplace', component: { template: '<div>Marketplace</div>' } },
      { path: '/my-agents', component: { template: '<div>My Agents</div>' } },
      { path: '/agents/:id', component: { template: '<div>Agent Detail</div>' } },
    ],
  })

  return {
    wrapper: mount(HomeView, {
      global: {
        plugins: [pinia, router, ElementPlus],
        stubs: {
          'router-link': { template: '<a :href="to"><slot /></a>', props: ['to'] },
          'el-skeleton': { template: '<div class="el-skeleton"><slot /></div>' },
          AppLayout: { template: '<div class="app-layout"><slot /></div>' },
          AgentCard: {
            template: '<div class="agent-card">{{ agent.name }}</div>',
            props: ['agent'],
          },
        },
      },
    }),
    router,
  }
}

describe('HomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染欢迎标题和用户名', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('欢迎回来')
    expect(wrapper.text()).toContain('测试用户')
  })

  it('包含 Hero 搜索框 welcome-search', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.welcome-search').exists()).toBe(true)
    const input = wrapper.find('.welcome-search input')
    expect(input.exists()).toBe(true)
  })

  it('包含统计行 welcome-stats', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.welcome-stats').exists()).toBe(true)
  })

  it('显示推荐 Agent 卡片', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('智能客服助手')
    expect(wrapper.text()).toContain('数据分析机器人')
  })

  it('包含分类 Tab 区域', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.category-tabs').exists()).toBe(true)
    expect(wrapper.text()).toContain('全部')
    expect(wrapper.text()).toContain('客服')
  })

  it('包含三步引导 guide-card', () => {
    const { wrapper } = createWrapper()
    const guideCards = wrapper.findAll('.guide-card')
    expect(guideCards.length).toBe(3)
    expect(wrapper.findAll('.guide-card__step').length).toBe(3)
  })

  it('保留快捷操作按钮', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('浏览 Agent 市场')
    expect(wrapper.text()).toContain('我的 Agent')
  })

  it('挂载时调用 fetchRecommended', () => {
    createWrapper()
    expect(mockFetchRecommended).toHaveBeenCalled()
  })

  it('welcome-banner 不使用旧紫色渐变', () => {
    const { wrapper } = createWrapper()
    const banner = wrapper.find('.welcome-banner')
    expect(banner.exists()).toBe(true)
    const html = wrapper.html()
    expect(html).not.toContain('#764ba2')
    expect(html).not.toContain('--primary-color')
  })

  it('统计行 Agent 数量显示推荐列表长度而非 agentsStore.total', () => {
    const { wrapper } = createWrapper()
    const statValues = wrapper.findAll('.welcome-stat-item__value')
    expect(statValues[0]?.text()).toBe('2')
  })

  it('搜索时本地过滤推荐列表且不调用 fetchAgents', async () => {
    const { wrapper } = createWrapper()
    mockFetchAgents.mockClear()

    const input = wrapper.find('.welcome-search input')
    await input.setValue('智能客服')
    await wrapper.vm.$nextTick()

    const cards = wrapper.findAll('.agent-card')
    expect(cards.length).toBe(1)
    expect(cards[0]?.text()).toContain('智能客服助手')
    expect(mockFetchAgents).not.toHaveBeenCalled()
  })

  it('点击分类 tab 过滤推荐 Agent', async () => {
    const { wrapper } = createWrapper()
    const tabs = wrapper.findAll('.category-tab')
    const catTab = tabs.find(t => t.text().includes('客服'))
    await catTab!.trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.agent-card')
    expect(cards.length).toBe(1)
    expect(cards[0]?.text()).toContain('智能客服助手')
  })

  it('total 为 0 时挂载调用 fetchAgents', async () => {
    const { useAgentsStore } = await import('@/stores/agents')
    vi.mocked(useAgentsStore).mockReturnValueOnce({
      recommended: mockRecommended,
      recommendedLoading: false,
      categories: [{ id: 'cat1', name: '客服', slug: 'customer-service', icon: null, sort_order: 1 }],
      total: 0,
      fetchRecommended: mockFetchRecommended,
      fetchCategories: mockFetchCategories,
      fetchAgents: mockFetchAgents,
    } as unknown as ReturnType<typeof useAgentsStore>)

    createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(mockFetchAgents).toHaveBeenCalled()
  })
})
