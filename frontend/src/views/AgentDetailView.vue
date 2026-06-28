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
import type { Agent, Review } from '@/types/agent'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const agent = ref<Agent | null>(null)
const reviews = ref<Review[]>([])
const loading = ref(true)
const installing = ref(false)
const installed = ref(false)
const submittingReview = ref(false)

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

onMounted(fetchDetail)
</script>

<style scoped>
.detail-page { max-width: 900px; }
.detail-header { margin-bottom: 24px; }
.header-content { display: flex; gap: 20px; align-items: center; margin-top: 16px; }
.header-info { flex: 1; }
.agent-name { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
.agent-meta { display: flex; gap: 8px; align-items: center; }
.version { color: var(--text-secondary); font-size: 13px; }
.header-actions { display: flex; gap: 12px; margin-top: 20px; }
.stats-bar { display: flex; gap: 24px; margin-bottom: 24px; padding: 12px 0; }
.stat-item { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 14px; }
.section-card { margin-bottom: 20px; }
.description-content { line-height: 1.8; color: var(--text-regular); }
.tags-area { display: flex; gap: 8px; flex-wrap: wrap; }
.capability-json { font-size: 13px; background: #f5f7fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
.review-item { padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.review-header { display: flex; justify-content: space-between; align-items: center; }
.review-time { font-size: 12px; color: var(--text-secondary); }
.review-comment { color: var(--text-regular); font-size: 14px; margin-top: 8px; }
.no-reviews { color: var(--text-secondary); font-size: 14px; padding: 16px 0; }
.add-review { margin-top: 8px; }
.add-review h4 { margin-bottom: 12px; }
.review-input { margin: 12px 0; }
.loading-area, .error-area { max-width: 900px; padding: 48px 0; }
</style>
