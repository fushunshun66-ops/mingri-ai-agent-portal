<template>
  <AppLayout>
    <div class="home-page">
      <div class="welcome-banner">
        <h1 class="welcome-title">欢迎回来，{{ authStore.displayName }}</h1>
        <p class="welcome-subtitle">探索和使用企业内部 AI Agent，提升工作效率</p>
        <div class="quick-actions">
          <el-button type="primary" size="large" @click="$router.push('/marketplace')">
            浏览 Agent 市场
          </el-button>
          <el-button size="large" @click="$router.push('/my-agents')">
            我的 Agent
          </el-button>
        </div>
      </div>

      <div class="stats-row">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-number">探索</div>
          <div class="stat-label">前往市场发现更多 Agent</div>
        </el-card>
        <el-card class="stat-card" shadow="hover">
          <div class="stat-number">安装</div>
          <div class="stat-label">一键安装到你的工作空间</div>
        </el-card>
        <el-card class="stat-card" shadow="hover">
          <div class="stat-number">使用</div>
          <div class="stat-label">直接与 Agent 对话交互</div>
        </el-card>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<style scoped>
.home-page {
  max-width: 1200px;
}

.welcome-banner {
  background: linear-gradient(135deg, var(--primary-color) 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 48px 40px;
  color: #fff;
  margin-bottom: 32px;
}

.welcome-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px;
}

.welcome-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 24px;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.quick-actions .el-button--primary {
  background: #fff;
  color: var(--primary-color);
  border-color: #fff;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-card {
  text-align: center;
  padding: 24px 0;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
