<template>
  <AppLayout>
    <div class="form-page">
      <div class="page-header">
        <h1>创建 Agent</h1>
        <p>向企业市场发布一个新的 AI Agent</p>
      </div>
      <AgentForm @submit="handleCreate" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import AgentForm from '@/components/AgentForm.vue'
import { agentsApi } from '@/api/agents'
import { getErrorMessage } from '@/utils/error'
import type { AgentCreateRequest, AgentUpdateRequest } from '@/types/agent'

const router = useRouter()

async function handleCreate(data: AgentCreateRequest | AgentUpdateRequest) {
  try {
    await agentsApi.create(data as AgentCreateRequest)
    ElMessage.success('Agent 创建成功')
    router.push('/marketplace')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '创建失败'))
  }
}
</script>

<style scoped>
.form-page { max-width: 800px; }
</style>
