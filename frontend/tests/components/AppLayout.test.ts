// AppLayout 测试 — 布局和导航
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

// Mock stores
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isLoggedIn: true,
    user: { id: '1', username: 'testuser', display_name: '测试用户', avatar_url: null },
    displayName: '测试用户',
    logout: vi.fn(),
    fetchUser: vi.fn(),
  })),
}))

vi.mock('@/stores/agents', () => ({
  useAgentsStore: vi.fn(() => ({
    categories: [
      { id: '1', name: '客服', slug: 'customer-service', icon: null, sort_order: 1 },
      { id: '2', name: '数据分析', slug: 'data-analysis', icon: null, sort_order: 2 },
    ],
    fetchCategories: vi.fn(),
  })),
}))

import AppLayout from '@/components/AppLayout.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/home', component: { template: '<div>Home Page</div>' } },
      { path: '/marketplace', component: { template: '<div>Marketplace</div>' } },
      { path: '/my-agents', component: { template: '<div>MyAgents</div>' } },
      { path: '/connections', component: { template: '<div>Connections</div>' } },
      { path: '/profile', component: { template: '<div>Profile</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })

  return {
    wrapper: mount(AppLayout, {
      global: {
        plugins: [pinia, router, ElementPlus],
        stubs: {
          'router-link': {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
          'el-dropdown': {
            template: '<div class="el-dropdown"><slot />|<slot name="dropdown" /></div>',
          },
          'el-dropdown-menu': {
            template: '<div class="el-dropdown-menu"><slot /></div>',
          },
          'el-dropdown-item': {
            template: '<div class="el-dropdown-item"><slot /></div>',
          },
          // 不 stub el-menu/el-menu-item，让 Element Plus 正常渲染
          'el-empty': true,
          'el-pagination': true,
          'el-avatar': { template: '<span class="el-avatar"><slot /></span>' },
        },
      },
    }),
    router,
  }
}

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('渲染顶部导航栏', () => {
    const { wrapper } = createWrapper()
    const text = wrapper.text()
    expect(text).toContain('首页')
    expect(text).toContain('Agent 市场')
  })

  it('包含市场导航链接', () => {
    const { wrapper } = createWrapper()
    const links = wrapper.findAll('a')
    const marketLink = links.find(link => link.attributes('href') === '/marketplace')
    expect(marketLink).toBeTruthy()
  })

  it('包含"我的 Agent"导航链接', () => {
    const { wrapper } = createWrapper()
    const links = wrapper.findAll('a')
    const myAgentLink = links.find(link => link.attributes('href') === '/my-agents')
    expect(myAgentLink).toBeTruthy()
  })

  it('包含"管理连接"导航链接', () => {
    const { wrapper } = createWrapper()
    const links = wrapper.findAll('a')
    const connLink = links.find(link => link.attributes('href') === '/connections')
    expect(connLink).toBeTruthy()
  })

  it('显示用户名称', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('测试用户')
  })

  it('渲染侧边栏分类列表', () => {
    const { wrapper } = createWrapper()
    const text = wrapper.text()
    expect(text).toContain('客服')
    expect(text).toContain('数据分析')
  })

  it('显示项目 Logo 或品牌名称', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('智能体门户')
  })

  it('包含退出按钮', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('退出')
  })

  it('管理员可见 admin-nav 管理中心链接', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    vi.mocked(useAuthStore).mockReturnValue({
      isLoggedIn: true,
      isAdmin: true,
      user: { id: '1', username: 'admin', display_name: '管理员', avatar_url: null },
      displayName: '管理员',
      logout: vi.fn(),
      fetchUser: vi.fn(),
    } as unknown as ReturnType<typeof useAuthStore>)

    const { wrapper } = createWrapper()
    const adminLink = wrapper.find('.admin-nav')
    expect(adminLink.exists()).toBe(true)
    expect(adminLink.text()).toContain('管理中心')
  })
})
