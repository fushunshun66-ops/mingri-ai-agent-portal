// Agent 列表缓存管理
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Agent, AgentListQuery, Category } from '@/types/agent'
import { agentsApi } from '@/api/agents'

export const useAgentsStore = defineStore('agents', () => {
  const agents = ref<Agent[]>([])
  const total = ref(0)
  const loading = ref(false)
  const categories = ref<Category[]>([])
  const currentQuery = ref<AgentListQuery>({ page: 1, page_size: 20 })

  // Phase 2 新增：推荐 / 收藏 / 最近使用
  const recommended = ref<Agent[]>([])
  const recommendedLoading = ref(false)
  const favorites = ref<Agent[]>([])
  const favoritesLoading = ref(false)
  const recent = ref<Agent[]>([])
  const recentLoading = ref(false)

  async function fetchAgents(query: AgentListQuery) {
    loading.value = true
    currentQuery.value = query
    try {
      const { data: resp } = await agentsApi.list(query)
      if (resp.success && resp.data) {
        agents.value = resp.data
        total.value = resp.pagination?.total ?? 0
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    const { data: resp } = await agentsApi.getCategories()
    if (resp.success && resp.data) {
      categories.value = resp.data
    }
  }

  // Phase 2 新增方法

  /** 获取推荐 Agent */
  async function fetchRecommended() {
    recommendedLoading.value = true
    try {
      const { data: resp } = await agentsApi.getRecommended()
      if (resp.success && resp.data) {
        recommended.value = resp.data
      }
    } finally {
      recommendedLoading.value = false
    }
  }

  /** 获取收藏列表 */
  async function fetchFavorites(page = 1, pageSize = 20) {
    favoritesLoading.value = true
    try {
      const { data: resp } = await agentsApi.getFavorites(page, pageSize)
      if (resp.success && resp.data) {
        favorites.value = resp.data
      }
    } finally {
      favoritesLoading.value = false
    }
  }

  /** 获取最近使用 */
  async function fetchRecent(limit = 20) {
    recentLoading.value = true
    try {
      const { data: resp } = await agentsApi.getRecent(limit)
      if (resp.success && resp.data) {
        recent.value = resp.data
      }
    } finally {
      recentLoading.value = false
    }
  }

  /** 收藏/取消收藏 Agent */
  async function toggleFavorite(agentId: string, isFavorited: boolean) {
    if (isFavorited) {
      await agentsApi.unfavorite(agentId)
    } else {
      await agentsApi.favorite(agentId)
    }
    // 刷新收藏列表
    await fetchFavorites()
  }

  return {
    agents,
    total,
    loading,
    categories,
    currentQuery,
    fetchAgents,
    fetchCategories,
    // Phase 2
    recommended,
    recommendedLoading,
    favorites,
    favoritesLoading,
    recent,
    recentLoading,
    fetchRecommended,
    fetchFavorites,
    fetchRecent,
    toggleFavorite,
  }
})
