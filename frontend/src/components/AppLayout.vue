<template>
  <el-container class="app-layout">
    <!-- 顶部导航栏 -->
    <el-header class="app-header" height="56px">
      <div class="header-left">
        <h1 class="brand-logo">智能体门户</h1>
      </div>
      <div class="header-nav">
        <router-link to="/home" class="nav-item">首页</router-link>
        <router-link to="/marketplace" class="nav-item">Agent 市场</router-link>
        <router-link to="/my-agents" class="nav-item">我的 Agent</router-link>
        <router-link to="/chat" class="nav-item">对话</router-link>
        <router-link to="/connections" class="nav-item">管理连接</router-link>
        <router-link
          v-if="authStore.isAdmin"
          to="/admin/dashboard"
          class="nav-item admin-nav"
        >管理中心</router-link>
      </div>
      <div class="header-right">
        <el-dropdown trigger="click">
          <span class="user-info">
            <el-avatar :size="32" :src="authStore.user?.avatar_url || undefined">
              {{ authStore.displayName.charAt(0).toUpperCase() }}
            </el-avatar>
            <span class="username">{{ authStore.displayName }}</span>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item>
                <router-link to="/profile">个人信息</router-link>
              </el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">退出</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-container class="app-body">
      <!-- 侧边栏 -->
      <el-aside class="app-sidebar" width="220px">
        <div class="sidebar-title">Agent 分类</div>
        <template v-if="agentsStore.categories.length > 0">
          <el-menu :default-active="currentRoute" router>
            <el-menu-item
              v-for="cat in agentsStore.categories"
              :key="cat.id"
              :index="`/marketplace?category=${cat.id}`"
            >
              <span>{{ cat.name }}</span>
            </el-menu-item>
          </el-menu>
        </template>
        <el-empty v-else description="暂无分类" :image-size="40" />

        <!-- 管理后台侧边栏（仅管理员可见） -->
        <template v-if="authStore.isAdmin">
          <div class="sidebar-title" style="margin-top: 16px">管理中心</div>
          <el-menu :default-active="currentRoute" router>
            <el-menu-item index="/admin/dashboard">
              <span>📊 仪表盘</span>
            </el-menu-item>
            <el-menu-item index="/admin/agents">
              <span>🤖 Agent 统计</span>
            </el-menu-item>
            <el-menu-item index="/admin/users">
              <span>👥 用户统计</span>
            </el-menu-item>
            <el-menu-item index="/admin/audit">
              <span>📋 审计日志</span>
            </el-menu-item>
          </el-menu>
        </template>
      </el-aside>

      <!-- 主内容区 -->
      <el-main class="app-main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAgentsStore } from '@/stores/agents'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const agentsStore = useAgentsStore()

const currentRoute = computed(() => route.path)

onMounted(() => {
  if (agentsStore.categories.length === 0) {
    agentsStore.fetchCategories()
  }
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--color-dark-200);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 40, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
}

.brand-logo {
  font-size: var(--text-lg);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: var(--tracking-tight);
  margin: 0;
}

.header-nav {
  display: flex;
  gap: var(--space-1);
}

.nav-item {
  padding: var(--space-2) var(--space-4);
  color: rgba(255, 255, 255, 0.65);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  transition-property: color, background-color;
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-out);
}

.nav-item:hover {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(184, 134, 11, 0.1);
}

.nav-item.router-link-active {
  color: var(--color-warm-400);
  background: rgba(184, 134, 11, 0.12);
  font-weight: 600;
}

.nav-item.admin-nav {
  color: rgba(255, 255, 255, 0.65);
}

.nav-item.admin-nav:hover {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(184, 134, 11, 0.1);
}

.nav-item.admin-nav.router-link-active {
  color: var(--color-warm-400);
  background: rgba(184, 134, 11, 0.12);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.08);
}

.username {
  font-size: var(--text-sm);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.app-body {
  min-height: calc(100vh - 56px);
}

.app-sidebar {
  background: var(--color-dark-50);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: var(--space-3);
}

.app-sidebar :deep(.el-menu) {
  border-right: none;
  background: transparent;
}

.app-sidebar :deep(.el-menu-item) {
  height: 40px;
  margin: 2px var(--space-2);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.65);
  transition-property: color, background-color;
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-out);
}

.app-sidebar :deep(.el-menu-item:hover) {
  background: rgba(184, 134, 11, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.app-sidebar :deep(.el-menu-item.is-active) {
  background: rgba(184, 134, 11, 0.12);
  color: var(--color-warm-400);
  font-weight: 600;
}

.sidebar-title {
  padding: 0 var(--space-5) var(--space-2);
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.35);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.app-main {
  background: var(--bg-page);
  min-height: calc(100vh - 56px);
  padding: var(--space-5);
}
</style>
