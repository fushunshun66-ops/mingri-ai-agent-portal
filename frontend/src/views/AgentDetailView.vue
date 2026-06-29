<template>
  <AppLayout>
    <div class="detail-page" v-if="agent">
      <!-- 头部 -->
      <div class="detail-header">
        <el-button text @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <div class="header-content">
          <el-avatar :size="72" shape="square" :src="agent.icon_url || undefined">
            {{ agent.name.charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="header-info">
            <h1 class="agent-name">{{ agent.name }}</h1>
            <div class="agent-meta">
              <el-tag v-if="agent.category" size="small">{{ agent.category.name }}</el-tag>
              <el-tag size="small" type="info">{{ agent.platform_type?.toUpperCase() || 'BUILTIN' }}</el-tag>
              <span class="version">v{{ agent.version }}</span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <template v-if="installed">
            <el-button type="warning" @click="handleUninstall">卸载</el-button>
            <el-tag type="success" size="large">已安装</el-tag>
          </template>
          <template v-else>
            <el-button type="primary" :loading="installing" @click="handleInstall">
              安装
            </el-button>
          </template>
          <el-button
            type="warning"
            plain
            :icon="isFavorited ? 'StarFilled' : 'Star'"
            @click="handleToggleFavorite"
          >
            {{ isFavorited ? '已收藏' : '收藏' }}
          </el-button>
          <el-button
            v-if="installed"
            type="success"
            @click="handleStartChat"
          >
            💬 开始对话
          </el-button>
          <el-button v-if="isOwner" @click="$router.push(`/agents/${agent.id}/edit`)">
            编辑
          </el-button>
        </div>
      </div>

      <!-- 统计 -->
      <div class="stats-bar">
        <div class="stat-item">
          <el-icon><StarFilled /></el-icon>
          <span>{{ agent.rating_avg.toFixed(1) }} ({{ agent.review_count }} 评价)</span>
        </div>
        <div class="stat-item">
          <el-icon><Download /></el-icon>
          <span>{{ agent.install_count }} 次安装</span>
        </div>
        <div class="stat-item" v-if="agent.owner_id">
          <el-icon><User /></el-icon>
          <span>创建者</span>
        </div>
      </div>

      <!-- 描述 -->
      <el-card class="section-card">
        <template #header><h3>描述</h3></template>
        <div class="description-content" v-html="descriptionHtml" />
      </el-card>

      <!-- 标签 -->
      <el-card class="section-card" v-if="agent.tags && agent.tags.length > 0">
        <template #header><h3>标签</h3></template>
        <div class="tags-area">
          <el-tag v-for="tag in agent.tags" :key="tag.name" size="large">
            {{ tag.name }}
          </el-tag>
        </div>
      </el-card>

      <!-- 能力描述 -->
      <el-card class="section-card" v-if="agent.capability">
        <template #header><h3>能力</h3></template>
        <pre class="capability-json">{{ JSON.stringify(agent.capability, null, 2) }}</pre>
      </el-card>

      <!-- 评论 -->
      <el-card class="section-card">
        <template #header><h3>评价 ({{ reviews.length }})</h3></template>
        <div v-if="reviews.length === 0" class="no-reviews">暂无评价</div>
        <div v-for="review in reviews" :key="review.id" class="review-item">
          <div class="review-header">
            <el-rate :model-value="review.rating" disabled show-score size="small" />
            <span class="review-time">{{ review.created_at ? new Date(review.created_at).toLocaleDateString() : '' }}</span>
          </div>
          <p class="review-comment" v-if="review.comment">{{ review.comment }}</p>
        </div>

        <el-divider />
        <div class="add-review">
          <h4>发表评价</h4>
          <el-rate v-model="reviewRating" />
          <el-input
            v-model="reviewComment"
            type="textarea"
            :rows="2"
            placeholder="写下你的使用体验..."
            class="review-input"
          />
          <el-button type="primary" :loading="submittingReview" @click="submitReview">
            提交评价
          </el-button>
        </div>
      </el-card>
    </div>

    <div v-else-if="loading" class="loading-area">
      <el-skeleton :rows="6" animated />
    </div>
    <div v-else class="error-area">
      <el-empty description="Agent 不存在或已被删除" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import DOMPurify from 'dompurify'
import { ArrowLeft, StarFilled, Download, User } from '@element-plus/icons-vue'
import AppLayout from '@/components/AppLayout.vue'
import { agentsApi } from '@/api/agents'
import { useAuthStore } from '@/stores/auth'
import { useAgentsStore } from '@/stores/agents'
import type { Agent, Review } from '@/types/agent'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const agentsStore = useAgentsStore()

const agent = ref<Agent | null>(null)
const reviews = ref<Review[]>([])
const loading = ref(true)
const installing = ref(false)
const installed = ref(false)
const submittingReview = ref(false)
const isFavorited = ref(false)

const reviewRating = ref(0)
const reviewComment = ref('')

const isOwner = computed(() => agent.value?.owner_id === authStore.user?.id)

const descriptionHtml = computed(() => {
  if (!agent.value?.description) return '暂无描述'
  const withBreaks = agent.value.description.replace(/\n/g, '<br>')
  return DOMPurify.sanitize(withBreaks)
})

async function fetchDetail() {
  loading.value = true
  try {
    const id = route.params.id as string
    const [agentResp, reviewsResp] = await Promise.all([
      agentsApi.getById(id),
      agentsApi.getReviews(id),
    ])
    if (agentResp.data.success && agentResp.data.data) {
      agent.value = agentResp.data.data
    }
    if (reviewsResp.data.success && reviewsResp.data.data) {
      reviews.value = reviewsResp.data.data
    }
  } catch {
    ElMessage.error('加载 Agent 详情失败')
  } finally {
    loading.value = false
  }
}

async function handleInstall() {
  if (!agent.value) return
  installing.value = true
  try {
    await agentsApi.install(agent.value!.id)
    ElMessage.success('安装成功')
    installed.value = true
  } catch {
    ElMessage.error('安装失败')
  } finally {
    installing.value = false
  }
}

async function handleUninstall() {
  if (!agent.value) return
  try {
    await agentsApi.uninstall(agent.value!.id)
    ElMessage.success('卸载成功')
    installed.value = false
  } catch {
    ElMessage.error('卸载失败')
  }
}

async function submitReview() {
  if (!agent.value) return
  if (reviewRating.value === 0) {
    ElMessage.warning('请先评分')
    return
  }
  submittingReview.value = true
  try {
    const resp = await agentsApi.createReview(agent.value!.id, {
      rating: reviewRating.value,
      comment: reviewComment.value || undefined,
    })
    if (resp.data.success && resp.data.data) {
      reviews.value.unshift(resp.data.data)
      reviewRating.value = 0
      reviewComment.value = ''
      ElMessage.success('评价提交成功')
    }
  } catch {
    ElMessage.error('评价提交失败')
  } finally {
    submittingReview.value = false
  }
}

async function handleToggleFavorite() {
  if (!agent.value) return
  try {
    await agentsStore.toggleFavorite(agent.value.id, isFavorited.value)
    isFavorited.value = !isFavorited.value
    ElMessage.success(isFavorited.value ? '已收藏' : '已取消收藏')
  } catch {
    ElMessage.error('操作失败')
  }
}

function handleStartChat() {
  if (!agent.value) return
  router.push({ path: '/chat', query: { agent_id: agent.value.id } })
}

onMounted(fetchDetail)
</script>

<style scoped>
.detail-page { max-width: 900px; }

.detail-header { margin-bottom: var(--space-6); }

.header-content {
  display: flex;
  gap: var(--space-5);
  align-items: center;
  margin-top: var(--space-4);
}

.header-info { flex: 1; }

.agent-name {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin: 0 0 var(--space-2);
  text-wrap: balance;
}

.agent-meta {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

.version {
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.header-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-5);
  flex-wrap: wrap;
}

.stats-bar {
  display: flex;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-gray-100);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-gray-500);
  font-size: var(--text-base);
  font-variant-numeric: tabular-nums;
}

.section-card {
  margin-bottom: var(--space-5);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-gray-100);
}

.section-card :deep(.el-card__header) {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-gray-100);
}

.section-card :deep(.el-card__header h3) {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
}

.section-card :deep(.el-card__body) {
  padding: var(--space-5);
}

.description-content {
  line-height: 1.8;
  color: var(--color-gray-600);
  text-wrap: pretty;
}

.tags-area {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.tags-area :deep(.el-tag) {
  border-radius: var(--radius-full);
  background: var(--color-primary-50);
  border-color: var(--color-primary-100);
  color: var(--color-primary-600);
}

.capability-json {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--color-gray-50);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-100);
  overflow-x: auto;
  color: var(--color-gray-700);
}

.review-item {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-gray-100);
}

.review-item:last-of-type {
  border-bottom: none;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.review-time {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.review-comment {
  color: var(--color-gray-600);
  font-size: var(--text-base);
  margin-top: var(--space-2);
  text-wrap: pretty;
}

.no-reviews {
  color: var(--color-gray-500);
  font-size: var(--text-base);
  padding: var(--space-4) 0;
  text-align: center;
}

.add-review { margin-top: var(--space-2); }

.add-review h4 {
  margin-bottom: var(--space-3);
  font-size: var(--text-md);
  color: var(--color-gray-800);
}

.review-input { margin: var(--space-3) 0; }

.loading-area,
.error-area {
  max-width: 900px;
  padding: var(--space-12) 0;
}

.error-area :deep(.el-empty__description) {
  color: var(--color-gray-500);
}
</style>
