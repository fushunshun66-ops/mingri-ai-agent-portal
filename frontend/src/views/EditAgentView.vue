<template>
  <AppLayout>
    <div class="form-page">
      <div class="page-header">
        <h1>编辑 Agent</h1>
        <p>修改 Agent 的配置信息</p>
      </div>
      <div v-if="loading" class="loading-area">
        <el-skeleton :rows="8" animated />
      </div>
      <AgentForm v-else-if="agent" :initial-data="agent" @submit="handleUpdate" />
      <el-empty v-else description="Agent 不存在" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import AgentForm from '@/components/AgentForm.vue'
import { agentsApi } from '@/api/agents'
import { getErrorMessage } from '@/utils/error'
import type { Agent, AgentUpdateRequest } from '@/types/agent'

const route = useRoute()
const router = useRouter()

const agent = ref<Agent | null>(null)
const loading = ref(true)

async function fetchAgent() {
  try {
    const id = route.params.id as string
    const resp = await agentsApi.getById(id)
    if (resp.data.success && resp.data.data) {
      agent.value = resp.data.data
    }
  } catch {
    ElMessage.error('加载 Agent 信息失败')
  } finally {
    loading.value = false
  }
}

async function handleUpdate(data: AgentUpdateRequest) {
  try {
    const id = route.params.id as string
    await agentsApi.update(id, data)
    ElMessage.success('Agent 更新成功')
    router.push(`/agents/${id}`)
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '更新失败'))
  }
}

onMounted(fetchAgent)
</script>

<style scoped>
.form-page { max-width: 800px; }
.loading-area { padding: 48px 0; }
</style>
