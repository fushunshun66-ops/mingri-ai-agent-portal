<template>
  <AppLayout>
    <div class="connections-page">
      <div class="page-header">
        <div>
          <h1>平台连接管理</h1>
          <p>管理外部 Agent 平台的 API 连接</p>
        </div>
        <el-button type="primary" @click="showCreateDialog = true">创建连接</el-button>
      </div>

      <div v-if="loading" class="loading-area">
        <el-skeleton :rows="4" animated />
      </div>

      <el-empty v-else-if="connections.length === 0" description="暂无平台连接" />

      <el-card v-for="conn in connections" :key="conn.id" class="connection-card" shadow="hover">
        <div class="conn-header">
          <div class="conn-info">
            <h3>{{ conn.name }}</h3>
            <el-tag :type="conn.status === 'active' ? 'success' : 'danger'" size="small">
              {{ conn.status === 'active' ? '活跃' : '已禁用' }}
            </el-tag>
            <el-tag size="small" type="info">{{ conn.platform_type.toUpperCase() }}</el-tag>
          </div>
          <div class="conn-actions">
            <el-button size="small" @click="openEditDialog(conn)">编辑</el-button>
            <el-popconfirm
              title="确定要删除该连接吗？"
              @confirm="handleDelete(conn.id)"
            >
              <template #reference>
                <el-button size="small" type="danger" text>删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
        <div class="conn-time" v-if="conn.created_at">
          创建于 {{ new Date(conn.created_at).toLocaleString() }}
        </div>
      </el-card>

      <!-- 创建/编辑对话框 -->
      <el-dialog
        v-model="showCreateDialog"
        :title="editingConnection ? '编辑连接' : '创建连接'"
        width="500px"
      >
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
        >
          <el-form-item label="连接名称" prop="name">
            <el-input v-model="form.name" placeholder="如：Dify 生产环境" />
          </el-form-item>
          <el-form-item label="平台类型" prop="platform_type">
            <el-select v-model="form.platform_type" placeholder="选择平台" :disabled="!!editingConnection">
              <el-option label="Dify" value="dify" />
              <el-option label="N8N" value="n8n" />
              <el-option label="Coze" value="coze" />
            </el-select>
          </el-form-item>
          <el-form-item label="API Key" prop="api_key">
            <el-input
              v-model="form.api_key"
              :placeholder="editingConnection ? '留空则不变' : '请输入 API Key'"
              show-password
            />
          </el-form-item>
          <el-form-item label="Base URL" prop="base_url">
            <el-input v-model="form.base_url" placeholder="https://api.dify.ai/v1" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ editingConnection ? '保存' : '创建' }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import { connectionsApi } from '@/api/connections'
import { getErrorMessage } from '@/utils/error'
import type { Connection } from '@/types/connection'

const connections = ref<Connection[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const editingConnection = ref<Connection | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  platform_type: '',
  api_key: '',
  base_url: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入连接名称', trigger: 'blur' }],
  platform_type: [{ required: true, message: '请选择平台类型', trigger: 'change' }],
}

async function fetchConnections() {
  loading.value = true
  try {
    const resp = await connectionsApi.list()
    if (resp.data.success && resp.data.data) {
      connections.value = resp.data.data
    }
  } catch {
    ElMessage.error('加载连接列表失败')
  } finally {
    loading.value = false
  }
}

function openEditDialog(conn: Connection) {
  editingConnection.value = conn
  form.name = conn.name
  form.platform_type = conn.platform_type
  form.api_key = ''
  form.base_url = (conn.config as Record<string, string>)?.base_url ?? ''
  showCreateDialog.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const config: Record<string, string> = {}
    if (form.api_key) config.api_key = form.api_key
    if (form.base_url) config.base_url = form.base_url

    if (editingConnection.value) {
      const updateData: Record<string, unknown> = { name: form.name }
      if (Object.keys(config).length > 0) updateData.config = config
      await connectionsApi.update(editingConnection.value.id, updateData)
      ElMessage.success('连接更新成功')
    } else {
      await connectionsApi.create({
        name: form.name,
        platform_type: form.platform_type,
        config: Object.keys(config).length > 0 ? config : undefined,
      })
      ElMessage.success('连接创建成功')
    }
    showCreateDialog.value = false
    editingConnection.value = null
    form.name = ''
    form.platform_type = ''
    form.api_key = ''
    form.base_url = ''
    await fetchConnections()
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '操作失败'))
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: string) {
  try {
    await connectionsApi.delete(id)
    ElMessage.success('连接已删除')
    await fetchConnections()
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(fetchConnections)
</script>

<style scoped>
.connections-page { max-width: 900px; }

.connections-page .page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
}

.connections-page .page-header h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-gray-800);
  margin: 0 0 var(--space-2);
}

.connections-page .page-header p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0;
}

.connection-card {
  margin-bottom: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-gray-100);
  transition: box-shadow var(--duration-normal) var(--ease-out),
              border-color var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

.connection-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-100);
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .connection-card:hover {
    transform: none;
  }
}

.connection-card :deep(.el-card__body) {
  padding: var(--space-5);
}

.conn-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.conn-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.conn-info h3 {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-gray-800);
}

.conn-time {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.connections-page :deep(.el-empty) {
  padding: var(--space-12) 0;
}

.connections-page :deep(.el-empty__description) {
  color: var(--color-gray-500);
}

.loading-area { padding: var(--space-6) 0; }
</style>
