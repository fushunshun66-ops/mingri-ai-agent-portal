<template>
  <AppLayout>
    <div class="my-agents-page">
      <div class="page-header">
        <h1>我的 Agent</h1>
        <p>已安装的 AI Agent 列表</p>
      </div>

      <div v-if="loading" class="loading-area">
        <el-skeleton :rows="4" animated />
      </div>

      <el-empty v-else-if="agents.length === 0" description="还没有安装任何 Agent">
        <el-button type="primary" @click="$router.push('/marketplace')">
          前往市场
        </el-button>
      </el-empty>

      <div v-else class="agent-grid">
        <AgentCard
          v-for="agent in agents"
          :key="agent.id"
          :agent="agent"
          @click="$router.push(`/agents/${agent.id}`)"
        />
      </div>

      <div v-if="total > pageSize" class="pagination-area">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="onPageChange"
        />
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import AgentCard from '@/components/AgentCard.vue'
import { agentsApi } from '@/api/agents'
import type { Agent } from '@/types/agent'

const agents = ref<Agent[]>([])
const total = ref(0)
const loading = ref(true)
const currentPage = ref(1)
const pageSize = 20

async function fetchAgents(page = 1) {
  loading.value = true
  try {
    const resp = await agentsApi.getMyAgents(page, pageSize)
    if (resp.data.success && resp.data.data) {
      agents.value = resp.data.data
      total.value = resp.data.pagination?.total ?? 0
    }
  } catch {
    ElMessage.error('加载我的 Agent 列表失败')
  } finally {
    loading.value = false
  }
}

function onPageChange(page: number) {
  currentPage.value = page
  fetchAgents(page)
}

onMounted(() => fetchAgents())
</script>

<style scoped>
.my-agents-page { max-width: 1400px; }
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.pagination-area {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}
.loading-area { padding: 24px 0; }
</style>
