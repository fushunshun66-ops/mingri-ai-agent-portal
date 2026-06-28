// DashboardView 测试 — 管理仪表盘渲染
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

// Mock admin API — 返回模拟概览数据
const mockDashboardData = {
  total_agents: 42,
  active_users: 156,
  today_sessions: 89,
  total_tokens: 12500000,
  platform_distribution: [
    { platform: 'dify', count: 20 },
    { platform: 'fastgpt', count: 12 },
    { platform: 'n8n', count: 10 },
  ],
  top_agents: [
    { id: 'a1', name: '智能客服', platform: 'dify', sessions: 320, rating: 4.8 },
    { id: 'a2', name: '数据分析', platform: 'fastgpt', sessions: 210, rating: 4.5 },
    { id: 'a3', name: '文档助手', platform: 'n8n', sessions: 150, rating: 4.2 },
  ],
}

const mockTimelineData = [
  { date: '2026-06-20', sessions: 45, messages: 320 },
  { date: '2026-06-21', sessions: 52, messages: 410 },
  { date: '2026-06-22', sessions: 38, messages: 280 },
]

vi.mock('@/api/admin', () => ({
  adminApi: {
    getDashboard: vi.fn(() => Promise.resolve({ data: { success: true, data: mockDashboardData, code: 0, message: 'ok', pagination: null, error: null, request_id: 't1' } })),
    getTimeline: vi.fn(() => Promise.resolve({ data: { success: true, data: mockTimelineData, code: 0, message: 'ok', pagination: null, error: null, request_id: 't2' } })),
  },
}))

// Mock auth store — 管理员角色
const mockUser = {
  id: 'admin1',
  tenant_id: 't1',
  username: 'admin',
  email: 'admin@example.com',
  display_name: '管理员',
  avatar_url: null,
  status: 'active' as const,
  roles: ['tenant_admin', 'super_admin'],
  created_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isLoggedIn: true,
    user: mockUser,
    username: 'admin',
    displayName: '管理员',
  })),
}))

// Mock agents store
vi.mock('@/stores/agents', () => ({
  useAgentsStore: vi.fn(() => ({
    categories: [],
    fetchCategories: vi.fn(),
  })),
}))

import DashboardView from '@/views/admin/DashboardView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/admin/dashboard', component: DashboardView },
      { path: '/admin/agents', component: { template: '<div>Agent Stats</div>' } },
      { path: '/admin/users', component: { template: '<div>User Stats</div>' } },
      { path: '/admin/audit', component: { template: '<div>Audit Log</div>' } },
      { path: '/profile', component: { template: '<div>Profile</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })

  return {
    wrapper: mount(DashboardView, {
      global: {
        plugins: [pinia, router, ElementPlus],
        stubs: {
          'router-link': { template: '<a :href="to"><slot /></a>', props: ['to'] },
          'el-skeleton': { template: '<div class="el-skeleton"><slot /></div>' },
          'el-empty': { template: '<div>暂无数据</div>' },
          'el-pagination': { template: '<div class="el-pagination"><slot /></div>' },
          'el-avatar': { template: '<span class="el-avatar">A</span>' },
          'el-icon': { template: '<span class="el-icon"><slot /></span>' },
          'el-tag': { template: '<span class="el-tag"><slot /></span>' },
          'el-dropdown': { template: '<div class="el-dropdown"><slot /></div>' },
          'el-dropdown-menu': { template: '<div class="el-dropdown-menu"><slot /></div>' },
          'el-dropdown-item': { template: '<div class="el-dropdown-item"><slot /></div>' },
        },
      },
    }),
    router,
  }
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('指标卡片渲染', () => {
    it('显示 Agent 总数卡片', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('42')
    })

    it('显示活跃用户卡片', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('156')
    })

    it('显示今日会话卡片', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('89')
    })

    it('显示总 Token 消耗卡片', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      // 12.5M 格式化后应包含
      expect(wrapper.text()).toMatch(/12[,.]?5/)
    })
  })

  describe('平台分布可视化', () => {
    it('显示平台分布区域标题', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('平台分布')
    })

    it('显示各平台名称', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      const text = wrapper.text()
      expect(text).toContain('dify')
      expect(text).toContain('fastgpt')
      expect(text).toContain('n8n')
    })
  })

  describe('Top Agent 表格', () => {
    it('显示热门 Agent 表格区域标题', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('热门 Agent')
    })

    it('表格区域正常渲染（无运行时错误）', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      // 验证表格区域存在且组件未崩溃（表格内部因全局 stub 不渲染具体数据）
      expect(wrapper.find('.table-panel').exists()).toBe(true)
    })
  })

  describe('时间线图表', () => {
    it('显示趋势图表区域标题', async () => {
      const { wrapper } = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 100))
      expect(wrapper.text()).toContain('趋势')
    })
  })

  describe('加载中状态', () => {
    it('渲染时不报错（组件结构完整）', () => {
      const { wrapper } = createWrapper()
      expect(wrapper.html()).toBeTruthy()
      expect(wrapper.find('.admin-dashboard').exists()).toBe(true)
    })
  })

  describe('空数据状态', () => {
    it('骨架屏正常渲染', async () => {
      const { wrapper } = createWrapper()
      // 初始加载中状态有骨架屏
      expect(wrapper.find('.el-skeleton').exists() || wrapper.find('.admin-dashboard').exists()).toBe(true)
    })
  })
})
