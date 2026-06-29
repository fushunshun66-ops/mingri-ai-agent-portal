import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockGetAgentStats = vi.fn()

vi.mock('@/api/admin', () => ({
  adminApi: {
    getAgentStats: (...args: unknown[]) => mockGetAgentStats(...args),
  },
}))

import AgentStatsView from '@/views/admin/AgentStatsView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(AgentStatsView, {
    global: {
      plugins: [pinia, ElementPlus],
      stubs: { AppLayout: { template: '<div><slot /></div>' } },
    },
  })
}

describe('AgentStatsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAgentStats.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [{ id: '1', name: 'Agent A', platform: 'dify', sessions: 10, messages: 50, tokens: 1000, install_count: 5, rating: 4.5 }],
          total: 1, page: 1, page_size: 20, total_pages: 1,
        },
      },
    })
  })

  it('renders page title', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Agent')
  })

  it('fetches stats on mount', async () => {
    createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetAgentStats).toHaveBeenCalled()
  })

  it('click search triggers refetch', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    mockGetAgentStats.mockClear()
    const btn = wrapper.findAll('button').find(b => b.text().includes('查询'))
    await btn!.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetAgentStats).toHaveBeenCalled()
  })

  it('click reset triggers refetch', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    mockGetAgentStats.mockClear()
    const btn = wrapper.findAll('button').find(b => b.text().includes('重置'))
    await btn!.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetAgentStats).toHaveBeenCalled()
  })
})
