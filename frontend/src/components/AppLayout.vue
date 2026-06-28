<template>
  <el-container class="app-layout">
    <!-- 顶部导航栏 -->
    <el-header class="app-header" height="60px">
      <div class="header-left">
        <h1 class="brand-logo">智能体门户</h1>
      </div>
      <div class="header-nav">
        <router-link to="/home" class="nav-item">首页</router-link>
        <router-link to="/marketplace" class="nav-item">Agent 市场</router-link>
        <router-link to="/my-agents" class="nav-item">我的 Agent</router-link>
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
  background-color: var(--bg-color);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
}

.brand-logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
}

.header-nav {
  display: flex;
  gap: 8px;
}

.nav-item {
  padding: 8px 16px;
  color: var(--text-regular);
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-item:hover,
.nav-item.router-link-active {
  color: var(--primary-color);
  background-color: rgba(64, 158, 255, 0.08);
}

.admin-nav {
  color: var(--color-warning, #e6a23c);
  font-weight: 500;
}

.admin-nav:hover,
.admin-nav.router-link-active {
  color: var(--color-warning, #e6a23c);
  background-color: rgba(230, 162, 60, 0.08);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.username {
  font-size: 14px;
  color: var(--text-primary);
}

.app-body {
  min-height: calc(100vh - 60px);
}

.app-sidebar {
  background: #fff;
  border-right: 1px solid var(--border-color);
  padding-top: 16px;
}

.sidebar-title {
  padding: 0 20px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.app-main {
  background: var(--bg-color);
  min-height: calc(100vh - 60px);
}
</style>
