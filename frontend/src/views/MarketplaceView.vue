<template>
  <div class="marketplace-page">
    <div class="page-header">
      <h1>Agent 市场</h1>
      <p>浏览和发现企业内的 AI Agent</p>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索 Agent..."
          class="search-input"
          clearable
          @input="onSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="$router.push('/agents/create')">
          创建 Agent
        </el-button>
      </div>
    </div>

    <div class="marketplace-body">
      <!-- 分类筛选 -->
      <div class="category-filter">
        <el-button
          :type="selectedCategory === '' ? 'primary' : 'default'"
          size="small"
          @click="selectCategory('')"
        >
          全部
        </el-button>
        <el-button
          v-for="cat in agentsStore.categories"
          :key="cat.id"
          :type="selectedCategory === cat.id ? 'primary' : 'default'"
          size="small"
          @click="selectCategory(cat.id)"
        >
          {{ cat.name }}
        </el-button>
      </div>

      <!-- Agent 卡片列表 -->
      <div v-if="agentsStore.loading" class="loading-area">
        <el-skeleton :rows="3" animated />
      </div>

      <el-empty v-else-if="agentsStore.agents.length === 0" description="暂无 Agent" />

      <div v-else class="agent-grid">
        <AgentCard
          v-for="agent in agentsStore.agents"
          :key="agent.id"
          :agent="agent"
          @click="$router.push(`/agents/${agent.id}`)"
        />
      </div>

      <!-- 分页 -->
      <div v-if="agentsStore.total > 0" class="pagination-area">
        <el-pagination
          :current-page="agentsStore.currentQuery.page"
          :page-size="agentsStore.currentQuery.page_size"
          :total="agentsStore.total"
          layout="prev, pager, next"
          @current-change="onPageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useAgentsStore } from '@/stores/agents'
import AgentCard from '@/components/AgentCard.vue'

const agentsStore = useAgentsStore()

const searchKeyword = ref('')
const selectedCategory = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchData()
  }, 300)
}

function selectCategory(catId: string) {
  selectedCategory.value = catId
  fetchData()
}

function onPageChange(page: number) {
  agentsStore.currentQuery.page = page
  fetchData()
}

async function fetchData() {
  await agentsStore.fetchAgents({
    page: agentsStore.currentQuery.page,
    page_size: agentsStore.currentQuery.page_size,
    search: searchKeyword.value || undefined,
    category_id: selectedCategory.value || undefined,
  })
}

onMounted(async () => {
  if (agentsStore.categories.length === 0) {
    await agentsStore.fetchCategories()
  }
  if (agentsStore.agents.length === 0) {
    await fetchData()
  }
})
</script>

<style scoped>
.marketplace-page {
  max-width: 1400px;
}

.header-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  align-items: center;
}

.search-input {
  max-width: 360px;
}

.marketplace-body {
  margin-top: 8px;
}

.category-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.pagination-area {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-bottom: 24px;
}
</style>
