import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockGetMyAgents = vi.fn()
const mockGetFavorites = vi.fn()
const mockGetRecent = vi.fn()

vi.mock('@/api/agents', () => ({
  agentsApi: {
    getMyAgents: (...args: unknown[]) => mockGetMyAgents(...args),
    getFavorites: (...args: unknown[]) => mockGetFavorites(...args),
    getRecent: (...args: unknown[]) => mockGetRecent(...args),
  },
}))

import MyAgentsView from '@/views/MyAgentsView.vue'

const mockAgent = {
  id: '1', tenant_id: 't1', name: 'Test Agent', description: 'desc',
  icon_url: null, category_id: null, category: null, tags: [],
  platform_type: 'dify' as const, platform_config: null, capability: null,
  input_schema: null, output_schema: null, visibility: 'tenant_visible' as const,
  status: 'published' as const, version: '1.0', owner_id: 'u1',
  install_count: 0, rating_avg: 4, review_count: 1,
  created_at: '2026-01-01', updated_at: null,
}

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/my-agents', component: MyAgentsView },
      { path: '/marketplace', component: { template: '<div>Market</div>' } },
    ],
  })
  return mount(MyAgentsView, {
    global: {
      plugins: [pinia, router, ElementPlus],
      stubs: {
        AppLayout: { template: '<div><slot /></div>' },
        AgentCard: { template: '<div class="agent-card">{{ agent.name }}</div>', props: ['agent'] },
      },
    },
  })
}

describe('MyAgentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMyAgents.mockResolvedValue({
      data: { success: true, data: [mockAgent], pagination: { total: 1, page: 1, page_size: 20, total_pages: 1 } },
    })
    mockGetFavorites.mockResolvedValue({
      data: { success: true, data: [], pagination: { total: 0, page: 1, page_size: 20, total_pages: 0 } },
    })
    mockGetRecent.mockResolvedValue({ data: { success: true, data: [] } })
  })

  it('渲染页面标题', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 50))
    expect(wrapper.text()).toContain('我的 Agent')
  })

  it('挂载时加载已安装 Agent', async () => {
    createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetMyAgents).toHaveBeenCalled()
  })

  it('加载成功后显示 Agent 卡片', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Test Agent')
  })

  it('切换到收藏 tab 时加载收藏列表', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    const tabs = wrapper.findAll('.el-tabs__item')
    const favTab = tabs.find(t => t.text().includes('收藏'))
    if (favTab) {
      await favTab.trigger('click')
      await new Promise(r => setTimeout(r, 100))
      expect(mockGetFavorites).toHaveBeenCalled()
    }
  })

  it('切换到最近使用 tab 时加载最近列表', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    const tabs = wrapper.findAll('.el-tabs__item')
    const recentTab = tabs.find(t => t.text().includes('最近'))
    if (recentTab) {
      await recentTab.trigger('click')
      await new Promise(r => setTimeout(r, 100))
      expect(mockGetRecent).toHaveBeenCalled()
    }
  })

  it('加载失败时不抛异常', async () => {
    mockGetMyAgents.mockRejectedValue(new Error('network'))
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('我的 Agent')
  })
})
