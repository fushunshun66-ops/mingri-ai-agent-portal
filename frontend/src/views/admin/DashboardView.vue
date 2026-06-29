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
            <div class="metric-card__header">
              <div class="metric-card__icon metric-card__icon--agents">
                <span>🤖</span>
              </div>
            </div>
            <div class="metric-card__value">{{ overview.total_agents }}</div>
            <div class="metric-card__label">Agent 总数</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__header">
              <div class="metric-card__icon metric-card__icon--users">
                <span>👥</span>
              </div>
            </div>
            <div class="metric-card__value">{{ overview.active_users }}</div>
            <div class="metric-card__label">活跃用户</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__header">
              <div class="metric-card__icon metric-card__icon--sessions">
                <span>💬</span>
              </div>
            </div>
            <div class="metric-card__value">{{ overview.today_sessions }}</div>
            <div class="metric-card__label">今日会话</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__header">
              <div class="metric-card__icon metric-card__icon--tokens">
                <span>⚡</span>
              </div>
            </div>
            <div class="metric-card__value">{{ formatTokens(overview.total_tokens) }}</div>
            <div class="metric-card__label">总 Token 消耗</div>
          </div>
        </div>

        <!-- 图表区：平台分布 + 趋势 -->
        <div class="charts-row">
          <div class="chart-panel">
            <h3 class="chart-panel__title">平台分布</h3>
            <v-chart
              v-if="overview.platform_distribution.length"
              class="chart-container"
              :option="platformChartOption"
              autoresize
            />
            <el-empty v-else description="暂无平台分布数据" />
          </div>

          <div class="chart-panel">
            <h3 class="chart-panel__title">会话 / 消息趋势（近 30 天）</h3>
            <v-chart
              v-if="timeline.length"
              class="chart-container"
              :option="timelineChartOption"
              autoresize
            />
            <el-empty v-else description="暂无趋势数据" />
          </div>
        </div>

        <!-- 热门 Agent 表格 -->
        <div class="table-panel">
          <h3 class="chart-panel__title">热门 Agent</h3>
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
import { use } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import AppLayout from '@/components/AppLayout.vue'
import { adminApi, type DashboardOverview, type TimelinePoint } from '@/api/admin'

use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const CHART_COLORS = {
  primary: '#b8860b',
  primaryLight: '#1e3a5f',
  green: '#0891b2',
  orange: '#d97706',
  gray: 'rgba(255,255,255,0.06)',
  grayText: '#94a3b8',
}

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

const platformChartOption = computed<EChartsOption>(() => {
  const data = overview.value.platform_distribution
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: CHART_COLORS.gray } },
      axisLabel: { color: CHART_COLORS.grayText },
    },
    yAxis: {
      type: 'category',
      data: data.map((p) => p.platform),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: CHART_COLORS.grayText },
    },
    series: [
      {
        type: 'bar',
        data: data.map((p) => p.count),
        barWidth: 16,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#b8860b' },
              { offset: 1, color: '#1e3a5f' },
            ],
          },
        },
      },
    ],
  }
})

const timelineChartOption = computed<EChartsOption>(() => {
  const dates = timeline.value.map((t) => {
    const d = new Date(t.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['会话', '消息'],
      bottom: 0,
      textStyle: { color: CHART_COLORS.grayText },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: CHART_COLORS.gray } },
      axisLabel: { color: CHART_COLORS.grayText, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: CHART_COLORS.gray } },
      axisLabel: { color: CHART_COLORS.grayText },
    },
    series: [
      {
        name: '会话',
        type: 'line',
        smooth: true,
        data: timeline.value.map((t) => t.sessions),
        itemStyle: { color: '#b8860b' },
        lineStyle: { color: '#b8860b', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(184, 134, 11, 0.2)' },
              { offset: 1, color: 'rgba(184, 134, 11, 0.02)' },
            ],
          },
        },
      },
      {
        name: '消息',
        type: 'line',
        smooth: true,
        data: timeline.value.map((t) => t.messages),
        itemStyle: { color: CHART_COLORS.green },
        lineStyle: { color: CHART_COLORS.green, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(8, 145, 178, 0.2)' },
              { offset: 1, color: 'rgba(8, 145, 178, 0.02)' },
            ],
          },
        },
      },
    ],
  }
})

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
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin: 0;
}

.loading-wrap {
  padding: var(--space-12) 0;
}

.error-state {
  padding: var(--space-16) 0;
  text-align: center;
}

.metric-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.metric-card {
  background: linear-gradient(135deg, var(--color-dark-100), var(--color-dark-200));
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-shadow: var(--shadow-sm);
  border: var(--border-glow);
  color: rgba(255, 255, 255, 0.85);
  transition-property: transform, box-shadow, border-color;
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-out);
}

.metric-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-warm-400);
  transform: translateY(-1px);
}

.metric-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.metric-card__icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.metric-card__icon--agents {
  background: rgba(184, 134, 11, 0.15);
}

.metric-card__icon--users {
  background: rgba(8, 145, 178, 0.15);
}

.metric-card__icon--sessions {
  background: rgba(5, 150, 105, 0.15);
}

.metric-card__icon--tokens {
  background: rgba(30, 58, 95, 0.25);
}

.metric-card__value {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--color-warm-400);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.metric-card__label {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.55);
  margin-top: var(--space-1);
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.chart-panel {
  background: linear-gradient(135deg, var(--color-dark-100), var(--color-dark-200));
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  border: var(--border-glow);
}

.chart-panel__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 var(--space-4);
}

.chart-container {
  width: 100%;
  height: 280px;
}

.table-panel {
  background: linear-gradient(135deg, var(--color-dark-100), var(--color-dark-200));
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  border: var(--border-glow);
}

.table-panel .chart-panel__title {
  color: rgba(255, 255, 255, 0.85);
}

.table-panel :deep(.el-table) {
  background: var(--color-dark-100);
  --el-table-tr-bg-color: var(--color-dark-100);
  --el-table-border-color: rgba(255, 255, 255, 0.06);
  --el-table-header-bg-color: var(--color-dark-200);
  --el-table-row-hover-bg-color: rgba(184, 134, 11, 0.08);
}

.table-panel :deep(.el-table .el-table__body tr.el-table__row--striped td) {
  background: var(--color-dark-200);
}

.table-panel :deep(.el-table th) {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  font-size: var(--text-sm);
}

.table-panel :deep(.el-table td) {
  color: rgba(255, 255, 255, 0.85);
}

.rating {
  color: var(--color-accent-orange);
  font-weight: 600;
}

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
