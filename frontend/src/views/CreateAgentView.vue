<template>
  <AppLayout>
    <div class="form-page">
      <div class="page-header">
        <h1>创建 Agent</h1>
        <p>向企业市场发布一个新的 AI Agent</p>
      </div>
      <AgentForm @submit="handleCreate" @icon-file="handleIconFile" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import AgentForm from '@/components/AgentForm.vue'
import { agentsApi } from '@/api/agents'
import { getErrorMessage } from '@/utils/error'
import type { AgentCreateRequest, AgentUpdateRequest } from '@/types/agent'

const router = useRouter()
const iconFile = ref<File | null>(null)

function handleIconFile(file: File) {
  iconFile.value = file
}

async function handleCreate(data: AgentCreateRequest | AgentUpdateRequest) {
  try {
    const resp = await agentsApi.create(data as AgentCreateRequest)
    if (resp.data.success && resp.data.data) {
      // 如果有图标文件，上传图标
      if (iconFile.value) {
        try {
          await agentsApi.uploadIcon(resp.data.data.id, iconFile.value)
        } catch {
          // 图标上传失败不影响创建流程
        }
      }
      ElMessage.success('Agent 创建成功')
      router.push('/marketplace')
    }
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '创建失败'))
  }
}
</script>

<style scoped>
.form-page { max-width: 800px; }
</style>
