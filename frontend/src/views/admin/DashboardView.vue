<template>
  <AppLayout>
    <div class="admin-dashboard">
      <div class="page-header">
        <h2 class="page-title">管理仪表盘</h2>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">
        <el-skeleton :rows="8" animated />
      </div>

      <!-- 加载错误 -->
      <div v-else-if="error" class="error-state">
        <el-result icon="error" :title="error" sub-title="请稍后重试">
          <template #extra>
            <el-button type="primary" @click="fetchAll">重新加载</el-button>
          </template>
        </el-result>
      </div>

      <!-- 主体内容 -->
      <template v-else>
        <!-- 指标卡片 -->
        <div class="metric-cards">
          <div class="metric-card">
            <div class="metric-icon agents">
              <span>🤖</span>
            </div>
            <div class="metric-body">
              <div class="metric-value">{{ overview.total_agents }}</div>
              <div class="metric-label">Agent 总数</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon users">
              <span>👥</span>
            </div>
            <div class="metric-body">
              <div class="metric-value">{{ overview.active_users }}</div>
              <div class="metric-label">活跃用户</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon sessions">
              <span>💬</span>
            </div>
            <div class="metric-body">
              <div class="metric-value">{{ overview.today_sessions }}</div>
              <div class="metric-label">今日会话</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon tokens">
              <span>⚡</span>
            </div>
            <div class="metric-body">
              <div class="metric-value">{{ formatTokens(overview.total_tokens) }}</div>
              <div class="metric-label">总 Token 消耗</div>
            </div>
          </div>
        </div>

        <!-- 图表区：平台分布 + 趋势 -->
        <div class="charts-row">
          <div class="chart-panel">
            <h3 class="chart-title">平台分布</h3>
            <div v-if="overview.platform_distribution.length" class="bar-chart">
              <div
                v-for="item in platformBars"
                :key="item.platform"
                class="bar-row"
              >
                <span class="bar-label">{{ item.platform }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{ width: item.percent + '%' }"
                  />
                </div>
                <span class="bar-value">{{ item.count }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无平台分布数据" />
          </div>

          <div class="chart-panel">
            <h3 class="chart-title">会话 / 消息趋势（近 30 天）</h3>
            <div v-if="timeline.length" class="timeline-chart">
              <div class="timeline-bars">
                <div
                  v-for="point in timelineBars"
                  :key="point.label"
                  class="timeline-col"
                  :title="`${point.label}: 会话 ${point.sessions} / 消息 ${point.messages}`"
                >
                  <div class="bar-group">
                    <div
                      class="bar-sessions"
                      :style="{ height: point.sessionH + '%' }"
                    />
                    <div
                      class="bar-messages"
                      :style="{ height: point.msgH + '%' }"
                    />
                  </div>
                  <span class="timeline-label">{{ point.label }}</span>
                </div>
              </div>
              <div class="timeline-legend">
                <span class="legend-item"><span class="dot sessions" /> 会话</span>
                <span class="legend-item"><span class="dot messages" /> 消息</span>
              </div>
            </div>
            <el-empty v-else description="暂无趋势数据" />
          </div>
        </div>

        <!-- 热门 Agent 表格 -->
        <div class="table-panel">
          <h3 class="chart-title">热门 Agent</h3>
          <el-table
            v-if="overview.top_agents.length"
            :data="overview.top_agents"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="name" label="Agent 名称" min-width="150" />
            <el-table-column prop="platform" label="平台" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.platform }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sessions" label="会话数" width="100" sortable />
            <el-table-column prop="rating" label="评分" width="80" sortable>
              <template #default="{ row }">
                <span class="rating">⭐ {{ row.rating }}</span>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无热门 Agent 数据" />
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { adminApi, type DashboardOverview, type TimelinePoint } from '@/api/admin'

const loading = ref(true)
const error = ref<string | null>(null)
const overview = ref<DashboardOverview>({
  total_agents: 0,
  active_users: 0,
  today_sessions: 0,
  total_tokens: 0,
  platform_distribution: [],
  top_agents: [],
})
const timeline = ref<TimelinePoint[]>([])

// 平台分布柱状图数据（计算百分比）
const maxPlatformCount = computed(() => {
  if (!overview.value.platform_distribution.length) return 1
  return Math.max(...overview.value.platform_distribution.map((p) => p.count))
})

const platformBars = computed(() =>
  overview.value.platform_distribution.map((p) => ({
    ...p,
    percent: Math.round((p.count / maxPlatformCount.value) * 100),
  })),
)

// 时间线柱状图数据（计算相对高度）
const maxSessions = computed(() => {
  if (!timeline.value.length) return 1
  return Math.max(...timeline.value.map((t) => t.sessions))
})

const maxMessages = computed(() => {
  if (!timeline.value.length) return 1
  return Math.max(...timeline.value.map((t) => t.messages))
})

const timelineBars = computed(() =>
  timeline.value.map((t) => {
    const date = new Date(t.date)
    const label = `${date.getMonth() + 1}/${date.getDate()}`
    return {
      ...t,
      label,
      sessionH: Math.round((t.sessions / maxSessions.value) * 100),
      msgH: Math.round((t.messages / maxMessages.value) * 100),
    }
  }),
)

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

onMounted(() => {
  fetchAll()
})

async function fetchAll() {
  loading.value = true
  error.value = null
  try {
    const [dashResult, tlResult] = await Promise.allSettled([
      adminApi.getDashboard(),
      adminApi.getTimeline(30),
    ])
    if (dashResult.status === 'fulfilled' && dashResult.value.data.success && dashResult.value.data.data) {
      overview.value = dashResult.value.data.data
    }
    if (tlResult.status === 'fulfilled' && tlResult.value.data.success && tlResult.value.data.data) {
      timeline.value = tlResult.value.data.data
    }
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin-dashboard {
  max-width: 1280px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.loading-wrap {
  padding: 40px 0;
}

.error-state {
  padding: 60px 0;
  text-align: center;
}

/* ---- 指标卡片 ---- */
.metric-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.metric-icon.agents { background: #e8f4ff; }
.metric-icon.users { background: #e8ffea; }
.metric-icon.sessions { background: #fff3e8; }
.metric-icon.tokens { background: #f3e8ff; }

.metric-body {
  flex: 1;
  min-width: 0;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.metric-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ---- 图表区 ---- */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-bottom: 24px;
}

.chart-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

/* 平台分布柱状条 */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  width: 70px;
  font-size: 13px;
  color: var(--text-regular);
  text-align: right;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 22px;
  background: #f0f2f5;
  border-radius: 6px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #66b1ff);
  border-radius: 6px;
  transition: width 0.4s ease;
}

.bar-value {
  width: 36px;
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
  flex-shrink: 0;
}

/* 时间线柱状图 */
.timeline-chart {
  display: flex;
  flex-direction: column;
  height: 220px;
}

.timeline-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding-bottom: 6px;
}

.timeline-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  cursor: default;
}

.bar-group {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
}

.bar-sessions {
  width: 45%;
  background: #409eff;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
}

.bar-messages {
  width: 45%;
  background: #67c23a;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
}

.timeline-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 4px;
  white-space: nowrap;
}

.timeline-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.dot.sessions { background: #409eff; }
.dot.messages { background: #67c23a; }

/* ---- 表格区 ---- */
.table-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.rating {
  color: #e6a23c;
  font-weight: 600;
}

/* ---- 响应式 ---- */
@media (max-width: 960px) {
  .metric-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .metric-cards {
    grid-template-columns: 1fr;
  }
}
</style>
