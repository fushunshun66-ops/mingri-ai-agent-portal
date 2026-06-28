<template>
  <AppLayout>
    <div class="admin-page">
      <div class="page-header">
        <h2 class="page-title">审计日志</h2>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出 CSV
        </el-button>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="filters.user_id"
          placeholder="用户 ID"
          clearable
          style="width: 160px"
        />
        <el-select
          v-model="filters.action"
          placeholder="操作类型"
          clearable
          style="width: 140px"
        >
          <el-option label="创建" value="create" />
          <el-option label="更新" value="update" />
          <el-option label="删除" value="delete" />
          <el-option label="登录" value="login" />
          <el-option label="导出" value="export" />
        </el-select>
        <el-select
          v-model="filters.resource_type"
          placeholder="资源类型"
          clearable
          style="width: 140px"
        >
          <el-option label="Agent" value="agent" />
          <el-option label="用户" value="user" />
          <el-option label="会话" value="session" />
          <el-option label="连接" value="connection" />
          <el-option label="租户" value="tenant" />
        </el-select>
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
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="user" label="用户" width="120" />
          <el-table-column prop="action" label="操作" width="100">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="actionTagType(row.action)"
              >
                {{ actionLabel(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="resource_type" label="资源类型" width="110">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ resourceLabel(row.resource_type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="resource_id" label="资源 ID" width="120" />
          <el-table-column prop="result" label="结果" width="80">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.result === 'success' ? 'success' : 'danger'"
              >
                {{ row.result === 'success' ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="detail" label="详情" min-width="160">
            <template #default="{ row }">
              <span class="detail-text">{{ row.detail || '-' }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无审计日志" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import AppLayout from '@/components/AppLayout.vue'
import { adminApi, type AuditLogEntry } from '@/api/admin'

const loading = ref(false)
const error = ref<string | null>(null)
const list = ref<AuditLogEntry[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const dateRange = ref<[string, string] | null>(null)

const filters = reactive({
  user_id: '',
  action: '',
  resource_type: '',
})

function formatDate(iso: string): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return iso
  }
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    create: '创建', update: '更新', delete: '删除',
    login: '登录', export: '导出', install: '安装',
    uninstall: '卸载', view: '查看', search: '搜索',
  }
  return map[action] || action
}

function actionTagType(action: string): string {
  const map: Record<string, string> = {
    create: 'success', update: 'warning', delete: 'danger',
    login: '', export: 'info', install: 'success',
    uninstall: 'danger', view: '', search: '',
  }
  return map[action] || 'info'
}

function resourceLabel(type: string): string {
  const map: Record<string, string> = {
    agent: 'Agent', user: '用户', session: '会话',
    connection: '连接', tenant: '租户', chat: '对话',
    message: '消息', feedback: '反馈', category: '分类',
  }
  return map[type] || type
}

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, unknown> = {
      page: page.value,
      page_size: pageSize.value,
    }
    if (filters.user_id) params.user_id = filters.user_id
    if (filters.action) params.action = filters.action
    if (filters.resource_type) params.resource_type = filters.resource_type
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const { data: resp } = await adminApi.getAuditLogs(params)
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
  filters.user_id = ''
  filters.action = ''
  filters.resource_type = ''
  dateRange.value = null
  page.value = 1
  fetchData()
}

function onPageSizeChange() {
  page.value = 1
  fetchData()
}

async function handleExport() {
  try {
    const params: Record<string, unknown> = {}
    if (filters.user_id) params.user_id = filters.user_id
    if (filters.action) params.action = filters.action
    if (filters.resource_type) params.resource_type = filters.resource_type
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }

    const response = await adminApi.exportAuditLogs(params)
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败，请重试')
  }
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.filter-bar {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.table-wrap {
  background: #fff;
  border-radius: 12px;
  padding: 4px 0 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px 16px;
}

.error-state {
  padding: 60px 0;
  text-align: center;
}

.detail-text {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
