<template>
  <AppLayout>
    <div class="admin-page">
      <div class="page-header">
        <h2 class="page-title">用户活跃统计</h2>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 270px"
        />
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <!-- 数据表格 -->
      <div v-if="error" class="error-state">
        <el-result icon="error" :title="error" sub-title="请稍后重试">
          <template #extra>
            <el-button type="primary" @click="fetchData">重新加载</el-button>
          </template>
        </el-result>
      </div>
      <div v-else class="table-wrap">
        <el-table
          v-loading="loading"
          :data="list"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="username" label="用户名" min-width="140" />
          <el-table-column prop="sessions" label="会话数" width="100" sortable="custom" />
          <el-table-column prop="messages" label="消息数" width="100" sortable="custom" />
          <el-table-column prop="tokens" label="Token" width="110" sortable="custom">
            <template #default="{ row }">{{ formatTokens(row.tokens) }}</template>
          </el-table-column>
          <el-table-column prop="last_active" label="最后活跃时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.last_active) }}
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无用户统计数据" />
          </template>
        </el-table>

        <!-- 分页 -->
        <div v-if="total > 0" class="pagination-wrap">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @current-change="fetchData"
            @size-change="onPageSizeChange"
          />
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { adminApi, type UserStat } from '@/api/admin'

const loading = ref(false)
const error = ref<string | null>(null)
const list = ref<UserStat[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const dateRange = ref<[string, string] | null>(null)

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, unknown> = {
      page: page.value,
      page_size: pageSize.value,
    }
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const { data: resp } = await adminApi.getUserStats(params)
    if (resp.success && resp.data) {
      list.value = resp.data.items
      total.value = resp.data.total
    }
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  dateRange.value = null
  page.value = 1
  fetchData()
}

function onPageSizeChange() {
  page.value = 1
  fetchData()
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.admin-page {
  max-width: 1280px;
}

.page-header {
  margin-bottom: var(--space-4);
}

.page-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin: 0;
}

.filter-bar {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-gray-100);
}

.table-wrap {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5) 0;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-gray-100);
}

.table-wrap :deep(.el-table) {
  --el-table-border-color: var(--color-gray-100);
  --el-table-header-bg-color: var(--color-gray-50);
  --el-table-row-hover-bg-color: var(--color-primary-50);
  --el-table-tr-bg-color: var(--bg-surface);
  --el-table-striped-row-bg-color: var(--color-gray-50);
}

.table-wrap :deep(.el-table th) {
  font-weight: 600;
  color: var(--color-gray-600);
  font-size: var(--text-sm);
}

.table-wrap :deep(.el-table td) {
  color: var(--color-gray-700);
  font-size: var(--text-base);
}

.table-wrap :deep(.el-empty__description) {
  color: var(--color-gray-500);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-3) 0 var(--space-4);
}

.error-state {
  padding: var(--space-16) 0;
  text-align: center;
}
</style>
