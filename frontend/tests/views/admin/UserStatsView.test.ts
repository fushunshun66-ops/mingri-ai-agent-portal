import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockGetUserStats = vi.fn()

vi.mock('@/api/admin', () => ({
  adminApi: {
    getUserStats: (...args: unknown[]) => mockGetUserStats(...args),
  },
}))

import UserStatsView from '@/views/admin/UserStatsView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(UserStatsView, {
    global: {
      plugins: [pinia, ElementPlus],
      stubs: { AppLayout: { template: '<div><slot /></div>' } },
    },
  })
}

describe('UserStatsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserStats.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [{ id: '1', username: 'user1', sessions: 5, messages: 20, tokens: 500, last_active: '2026-01-01T00:00:00Z' }],
          total: 1, page: 1, page_size: 20, total_pages: 1,
        },
      },
    })
  })

  it('渲染用户活跃统计标题', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('用户活跃统计')
  })

  it('挂载时加载统计数据', async () => {
    createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetUserStats).toHaveBeenCalled()
  })

  it('点击查询按钮重新加载', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    mockGetUserStats.mockClear()
    const btn = wrapper.findAll('button').find(b => b.text().includes('查询'))
    await btn!.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetUserStats).toHaveBeenCalled()
  })

  it('点击重置按钮重新加载', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    mockGetUserStats.mockClear()
    const btn = wrapper.findAll('button').find(b => b.text().includes('重置'))
    await btn!.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetUserStats).toHaveBeenCalled()
  })
})
