// Vue Router 路由配置 + 导航守卫
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/marketplace',
    name: 'Marketplace',
    component: () => import('@/views/MarketplaceView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/agents/create',
    name: 'CreateAgent',
    component: () => import('@/views/CreateAgentView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/agents/:id',
    name: 'AgentDetail',
    component: () => import('@/views/AgentDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/agents/:id/edit',
    name: 'EditAgent',
    component: () => import('@/views/EditAgentView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/my-agents',
    name: 'MyAgents',
    component: () => import('@/views/MyAgentsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/connections',
    name: 'Connections',
    component: () => import('@/views/ConnectionsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // 已登录用户访问 guest 页面 → 重定向到首页
  if (to.meta.guest && authStore.isLoggedIn) {
    return next('/home')
  }

  // 未登录用户访问需要认证的页面 → 重定向到登录页
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  next()
})

export default router
