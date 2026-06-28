<template>
  <AppLayout>
    <div class="my-agents-page">
      <div class="page-header">
        <h1>我的 Agent</h1>
        <p>管理已安装、收藏和最近使用的 Agent</p>
      </div>

      <!-- Tab 切换 -->
      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="已安装" name="installed" />
        <el-tab-pane label="收藏" name="favorites" />
        <el-tab-pane label="最近使用" name="recent" />
      </el-tabs>

      <div v-if="loading" class="loading-area">
        <el-skeleton :rows="4" animated />
      </div>

      <el-empty v-else-if="currentList.length === 0" :description="emptyText">
        <el-button v-if="activeTab === 'installed'" type="primary" @click="$router.push('/marketplace')">
          前往市场
        </el-button>
      </el-empty>

      <div v-else class="agent-grid">
        <AgentCard
          v-for="agent in currentList"
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import AgentCard from '@/components/AgentCard.vue'
import { agentsApi } from '@/api/agents'
import type { Agent } from '@/types/agent'

const activeTab = ref<'installed' | 'favorites' | 'recent'>('installed')
const myAgents = ref<Agent[]>([])
const favorites = ref<Agent[]>([])
const recent = ref<Agent[]>([])
const loading = ref(true)
const currentPage = ref(1)
const pageSize = 20
const total = ref(0)

const currentList = computed<Agent[]>(() => {
  switch (activeTab.value) {
    case 'installed': return myAgents.value
    case 'favorites': return favorites.value
    case 'recent': return recent.value
  }
})

const emptyText = computed(() => {
  switch (activeTab.value) {
    case 'installed': return '还没有安装任何 Agent'
    case 'favorites': return '还没有收藏任何 Agent'
    case 'recent': return '还没有使用记录'
  }
})

async function fetchMyAgents(page = 1) {
  loading.value = true
  try {
    const resp = await agentsApi.getMyAgents(page, pageSize)
    if (resp.data.success && resp.data.data) {
      myAgents.value = resp.data.data
      total.value = resp.data.pagination?.total ?? 0
    }
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function fetchFavorites(page = 1) {
  loading.value = true
  try {
    const resp = await agentsApi.getFavorites(page, pageSize)
    if (resp.data.success && resp.data.data) {
      favorites.value = resp.data.data
      total.value = resp.data.pagination?.total ?? 0
    }
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function fetchRecent() {
  loading.value = true
  try {
    const resp = await agentsApi.getRecent(pageSize)
    if (resp.data.success && resp.data.data) {
      recent.value = resp.data.data
      total.value = resp.data.length
    }
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

function loadTabData() {
  switch (activeTab.value) {
    case 'installed': fetchMyAgents(currentPage.value); break
    case 'favorites': fetchFavorites(currentPage.value); break
    case 'recent': fetchRecent(); break
  }
}

function onTabChange() {
  currentPage.value = 1
  loadTabData()
}

function onPageChange(page: number) {
  currentPage.value = page
  loadTabData()
}

onMounted(() => fetchMyAgents())
</script>

<style scoped>
.my-agents-page { max-width: 1400px; }
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 16px;
}
.pagination-area {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}
.loading-area { padding: 24px 0; }
</style>
