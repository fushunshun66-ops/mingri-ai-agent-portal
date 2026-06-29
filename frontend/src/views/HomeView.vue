<template>
  <AppLayout>
    <div class="home-page">
      <div class="welcome-banner">
        <h1 class="welcome-title">欢迎回来，{{ authStore.displayName }}</h1>
        <p class="welcome-subtitle">探索和使用企业内部 AI Agent，提升工作效率</p>

        <div class="welcome-search">
          <el-input
            v-model="searchQuery"
            placeholder="搜索 Agent..."
            clearable
            size="large"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="welcome-stats">
          <div class="welcome-stat-item">
            <span class="welcome-stat-item__value">{{ agentsStore.recommended.length }}</span>
            <span class="welcome-stat-item__label">Agent</span>
          </div>
          <div class="welcome-stat-item">
            <span class="welcome-stat-item__value">{{ agentsStore.categories.length }}</span>
            <span class="welcome-stat-item__label">分类</span>
          </div>
          <div class="welcome-stat-item">
            <span class="welcome-stat-item__value">{{ totalInstalls }}</span>
            <span class="welcome-stat-item__label">总安装量</span>
          </div>
        </div>

        <div class="quick-actions">
          <el-button type="primary" size="large" @click="$router.push('/marketplace')">
            浏览 Agent 市场
          </el-button>
          <el-button size="large" @click="$router.push('/my-agents')">
            我的 Agent
          </el-button>
        </div>
      </div>

      <!-- 推荐 Agent -->
      <div class="section recommended-section">
        <div class="section-header">
          <h2>推荐 Agent</h2>
          <el-button text type="primary" @click="$router.push('/marketplace')">
            查看更多
          </el-button>
        </div>

        <div class="category-tabs">
          <button
            type="button"
            class="category-tab"
            :class="{ 'category-tab--active': activeCategory === '' }"
            @click="activeCategory = ''"
          >
            全部
          </button>
          <button
            v-for="cat in agentsStore.categories"
            :key="cat.id"
            type="button"
            class="category-tab"
            :class="{ 'category-tab--active': activeCategory === cat.id }"
            @click="activeCategory = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>

        <div v-if="agentsStore.recommendedLoading" class="loading-area">
          <el-skeleton :rows="2" animated />
        </div>
        <div v-else-if="filteredRecommended.length === 0" class="empty-area">
          暂无推荐
        </div>
        <div v-else class="agent-grid">
          <AgentCard
            v-for="agent in filteredRecommended"
            :key="agent.id"
            :agent="agent"
            @click="$router.push(`/agents/${agent.id}`)"
          />
        </div>
      </div>

      <div class="stats-row">
        <div class="guide-card">
          <div class="guide-card__step">1</div>
          <div class="guide-card__title">探索</div>
          <div class="guide-card__desc">前往市场发现更多 Agent</div>
        </div>
        <div class="guide-card">
          <div class="guide-card__step">2</div>
          <div class="guide-card__title">安装</div>
          <div class="guide-card__desc">一键安装到你的工作空间</div>
        </div>
        <div class="guide-card">
          <div class="guide-card__step">3</div>
          <div class="guide-card__title">使用</div>
          <div class="guide-card__desc">直接与 Agent 对话交互</div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import AppLayout from '@/components/AppLayout.vue'
import AgentCard from '@/components/AgentCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useAgentsStore } from '@/stores/agents'

const authStore = useAuthStore()
const agentsStore = useAgentsStore()

const searchQuery = ref('')
const activeCategory = ref('')

const totalInstalls = computed(() =>
  agentsStore.recommended.reduce((sum, a) => sum + (a.install_count ?? 0), 0),
)

const filteredRecommended = computed(() => {
  let list = agentsStore.recommended
  if (activeCategory.value) {
    list = list.filter((a) => a.category_id === activeCategory.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false),
    )
  }
  return list
})

onMounted(async () => {
  agentsStore.fetchRecommended()
  if (agentsStore.categories.length === 0) {
    await agentsStore.fetchCategories()
  }
  if (agentsStore.total === 0) {
    await agentsStore.fetchAgents({ page: 1, page_size: 1 })
  }
})
</script>

<style scoped>
.home-page {
  max-width: 1200px;
}

.welcome-banner {
  position: relative;
  background: linear-gradient(
    135deg,
    var(--color-dark-100) 0%,
    var(--color-dark-200) 50%,
    var(--color-dark-300) 100%
  );
  border-radius: var(--radius-xl);
  padding: var(--space-12) var(--space-12);
  color: #fff;
  margin-bottom: var(--space-8);
  overflow: hidden;
}

.welcome-banner::before {
  content: '';
  position: absolute;
  top: -60%;
  right: -20%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
}

.welcome-banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 70% 30%, rgba(184, 134, 11, 0.08) 0%, transparent 60%),
    radial-gradient(circle, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 100% 100%, 24px 24px;
  pointer-events: none;
}

.welcome-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  letter-spacing: var(--tracking-tight);
  margin: 0;
  position: relative;
  z-index: 1;
}

.welcome-subtitle {
  font-size: var(--text-lg);
  opacity: 0.85;
  margin-top: var(--space-2);
  margin-bottom: var(--space-6);
  position: relative;
  z-index: 1;
}

.welcome-search {
  max-width: 480px;
  margin-bottom: var(--space-8);
  position: relative;
  z-index: 1;
}

.welcome-stats {
  display: flex;
  gap: var(--space-8);
  margin-bottom: var(--space-6);
  position: relative;
  z-index: 1;
}

.welcome-stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(4px);
  border: var(--border-glow);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-5);
}

.welcome-stat-item__value {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-warm-400);
}

.welcome-stat-item__label {
  font-size: var(--text-sm);
  opacity: 0.75;
}

.quick-actions {
  display: flex;
  gap: var(--space-3);
  position: relative;
  z-index: 1;
}

.quick-actions .el-button--primary {
  background: var(--color-warm-500);
  color: #fff;
  border-color: var(--color-warm-500);
  transition-property: transform, box-shadow, background-color;
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-out);
}

.quick-actions .el-button--primary:hover {
  background: var(--color-warm-600);
  border-color: var(--color-warm-600);
  box-shadow: 0 4px 12px rgba(184, 134, 11, 0.3);
}

.recommended-section {
  margin-top: var(--space-8);
}

.section {
  margin-bottom: var(--space-8);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.section-header h2 {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin: 0;
}

.category-tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}

.category-tab {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition-property: color, background-color, border-color;
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-out);
}

.category-tab:hover {
  background: var(--color-gray-100);
}

.category-tab--active {
  background: rgba(184, 134, 11, 0.08);
  color: var(--color-warm-500);
  border-color: var(--color-warm-500);
  font-weight: 600;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-5);
}

.loading-area,
.empty-area {
  padding: var(--space-6) 0;
  text-align: center;
  color: var(--color-gray-500);
  font-size: var(--text-sm);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
  margin-top: var(--space-8);
}

.guide-card {
  position: relative;
  padding: var(--space-6);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
  transition-property: transform, box-shadow, border-color;
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-out);
  border: 1px solid var(--color-gray-100);
}

.guide-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-warm-400);
  animation: glow-breathe 3s ease-in-out infinite;
}

.guide-card__step {
  width: 40px;
  height: 40px;
  margin: 0 auto var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-dark-100), var(--color-dark-200));
  color: var(--color-warm-400);
  font-size: var(--text-lg);
  font-weight: 700;
}

.guide-card__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
  margin-bottom: var(--space-2);
}

.guide-card__desc {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .welcome-stats {
    flex-wrap: wrap;
    gap: var(--space-4);
  }
}
</style>
