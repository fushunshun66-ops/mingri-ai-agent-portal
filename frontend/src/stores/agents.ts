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

  return {
    agents,
    total,
    loading,
    categories,
    currentQuery,
    fetchAgents,
    fetchCategories,
  }
})
