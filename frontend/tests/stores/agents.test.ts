import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockList = vi.fn()
const mockGetCategories = vi.fn()
const mockGetRecommended = vi.fn()
const mockGetFavorites = vi.fn()
const mockGetRecent = vi.fn()
const mockFavorite = vi.fn()
const mockUnfavorite = vi.fn()

vi.mock('@/api/agents', () => ({
  agentsApi: {
    list: (...args: unknown[]) => mockList(...args),
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
    getRecommended: (...args: unknown[]) => mockGetRecommended(...args),
    getFavorites: (...args: unknown[]) => mockGetFavorites(...args),
    getRecent: (...args: unknown[]) => mockGetRecent(...args),
    favorite: (...args: unknown[]) => mockFavorite(...args),
    unfavorite: (...args: unknown[]) => mockUnfavorite(...args),
  },
}))

import { useAgentsStore } from '@/stores/agents'

const mockAgent = {
  id: '1', tenant_id: 't1', name: 'Agent', description: 'desc',
  icon_url: null, category_id: null, category: null, tags: [],
  platform_type: 'dify' as const, platform_config: null, capability: null,
  input_schema: null, output_schema: null, visibility: 'tenant_visible' as const,
  status: 'published' as const, version: '1.0', owner_id: 'u1',
  install_count: 0, rating_avg: 0, review_count: 0,
  created_at: '2026-01-01', updated_at: null,
}

describe('useAgentsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('fetchAgents 更新 agents 和 total', async () => {
    mockList.mockResolvedValue({
      data: { success: true, data: [mockAgent], pagination: { total: 1, page: 1, page_size: 20, total_pages: 1 } },
    })
    const store = useAgentsStore()
    await store.fetchAgents({ page: 1, page_size: 20 })
    expect(store.agents).toHaveLength(1)
    expect(store.total).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('fetchAgents 失败响应时不更新 agents', async () => {
    mockList.mockResolvedValue({ data: { success: false } })
    const store = useAgentsStore()
    await store.fetchAgents({ page: 1, page_size: 20 })
    expect(store.agents).toHaveLength(0)
  })

  it('fetchCategories 更新 categories', async () => {
    mockGetCategories.mockResolvedValue({
      data: { success: true, data: [{ id: 'c1', name: '客服', slug: 'cs', icon: null, sort_order: 1 }] },
    })
    const store = useAgentsStore()
    await store.fetchCategories()
    expect(store.categories).toHaveLength(1)
  })

  it('fetchCategories 失败响应时不更新', async () => {
    mockGetCategories.mockResolvedValue({ data: { success: false } })
    const store = useAgentsStore()
    await store.fetchCategories()
    expect(store.categories).toHaveLength(0)
  })

  it('fetchRecommended 更新 recommended', async () => {
    mockGetRecommended.mockResolvedValue({ data: { success: true, data: [mockAgent] } })
    const store = useAgentsStore()
    await store.fetchRecommended()
    expect(store.recommended).toHaveLength(1)
    expect(store.recommendedLoading).toBe(false)
  })

  it('fetchFavorites 更新 favorites', async () => {
    mockGetFavorites.mockResolvedValue({ data: { success: true, data: [mockAgent] } })
    const store = useAgentsStore()
    await store.fetchFavorites()
    expect(store.favorites).toHaveLength(1)
    expect(store.favoritesLoading).toBe(false)
  })

  it('fetchRecent 更新 recent', async () => {
    mockGetRecent.mockResolvedValue({ data: { success: true, data: [mockAgent] } })
    const store = useAgentsStore()
    await store.fetchRecent()
    expect(store.recent).toHaveLength(1)
    expect(store.recentLoading).toBe(false)
  })

  it('toggleFavorite 未收藏时调用 favorite', async () => {
    mockFavorite.mockResolvedValue({ data: { success: true } })
    mockGetFavorites.mockResolvedValue({ data: { success: true, data: [] } })
    const store = useAgentsStore()
    await store.toggleFavorite('1', false)
    expect(mockFavorite).toHaveBeenCalledWith('1')
  })

  it('toggleFavorite 已收藏时调用 unfavorite', async () => {
    mockUnfavorite.mockResolvedValue({ data: { success: true } })
    mockGetFavorites.mockResolvedValue({ data: { success: true, data: [] } })
    const store = useAgentsStore()
    await store.toggleFavorite('1', true)
    expect(mockUnfavorite).toHaveBeenCalledWith('1')
  })
})
