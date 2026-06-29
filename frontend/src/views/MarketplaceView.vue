<template>
  <AppLayout>
  <div class="marketplace-page">
    <div class="page-header">
      <h1>Agent 市场</h1>
      <p>浏览和发现企业内的 AI Agent</p>
    </div>

    <div class="marketplace-body">
      <div class="marketplace-toolbar">
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

      <!-- 分类筛选 -->
      <div class="category-filter">
        <button
          type="button"
          class="category-pill"
          :class="{ 'category-pill--active': selectedCategory === '' }"
          @click="selectCategory('')"
        >
          全部
        </button>
        <button
          v-for="cat in agentsStore.categories"
          :key="cat.id"
          type="button"
          class="category-pill"
          :class="{ 'category-pill--active': selectedCategory === cat.id }"
          @click="selectCategory(cat.id)"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Agent 卡片列表 -->
      <div v-if="agentsStore.loading" class="agent-grid-skeleton">
        <div v-for="n in 6" :key="n" class="skeleton-card">
          <div class="skeleton-card__header">
            <div class="skeleton-card__avatar" />
            <div style="flex: 1">
              <div class="skeleton-card__line skeleton-card__line--short" />
              <div class="skeleton-card__line skeleton-card__line--medium" style="margin-top: 8px" />
            </div>
          </div>
          <div class="skeleton-card__line" />
          <div class="skeleton-card__line skeleton-card__line--medium" style="margin-top: 8px" />
        </div>
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
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useAgentsStore } from '@/stores/agents'
import AppLayout from '@/components/AppLayout.vue'
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

.page-header h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin: 0 0 var(--space-2);
}

.page-header p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0;
}

.marketplace-body {
  margin-top: var(--space-6);
}

.marketplace-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-100);
}

.marketplace-toolbar .search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.marketplace-toolbar .search-input :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  background: var(--color-gray-50);
  box-shadow: none;
  border: 1px solid var(--color-gray-200);
  transition: all var(--duration-fast) var(--ease-out);
}

.marketplace-toolbar .search-input :deep(.el-input.is-focus .el-input__wrapper) {
  background: var(--bg-surface);
  border-color: var(--color-primary-300);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

.category-filter {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
}

.category-pill {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-gray-600);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  white-space: nowrap;
}

.category-pill:hover {
  background: var(--color-gray-100);
  border-color: var(--color-gray-300);
}

.category-pill--active {
  background: var(--color-primary-500);
  color: #fff;
  border-color: var(--color-primary-500);
}

.category-pill--active:hover {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
}

.agent-grid-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-5);
}

.skeleton-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  animation: fade-in-up var(--duration-slow) var(--ease-out) both;
}

.skeleton-card__header {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.skeleton-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: linear-gradient(
    90deg,
    var(--color-gray-100) 0%,
    var(--color-gray-50) 50%,
    var(--color-gray-100) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-card__line {
  height: 12px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-gray-100) 0%,
    var(--color-gray-50) 50%,
    var(--color-gray-100) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-card__line--short {
  width: 60%;
}

.skeleton-card__line--medium {
  width: 80%;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-5);
}

.pagination-area {
  display: flex;
  justify-content: center;
  padding: var(--space-8) 0;
}
</style>
