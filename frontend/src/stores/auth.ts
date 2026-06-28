// 认证状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, TokenResponse, LoginRequest, RegisterRequest } from '@/types/user'
import { authApi } from '@/api/auth'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)

  const isLoggedIn = computed(() => {
    if (!accessToken.value) return false
    return !isTokenExpired(accessToken.value)
  })
  const username = computed(() => user.value?.username ?? '')
  const displayName = computed(() => user.value?.display_name ?? user.value?.username ?? '')

  /** 判断当前用户是否拥有指定角色 */
  const hasRole = (roles: string[]) => {
    if (!user.value?.roles) return false
    return roles.some(role => user.value!.roles.includes(role))
  }

  /** 是否为管理员（tenant_admin 或 super_admin） */
  const isAdmin = computed(() => hasRole(['tenant_admin', 'super_admin']))

  function setTokens(token: TokenResponse) {
    accessToken.value = token.access_token
    refreshToken.value = token.refresh_token
    // TODO: 迁移到 httpOnly cookie，消除 XSS 令牌窃取风险
    localStorage.setItem('access_token', token.access_token)
    localStorage.setItem('refresh_token', token.refresh_token)
  }

  function clearAuth() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  async function login(req: LoginRequest) {
    const { data: resp } = await authApi.login(req)
    if (resp.success && resp.data) {
      const tokens = resp.data
      accessToken.value = tokens.access_token
      refreshToken.value = tokens.refresh_token
      // TODO: 迁移到 httpOnly cookie，消除 XSS 令牌窃取风险
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)

      try {
        await fetchUser()
      } catch {
        accessToken.value = null
        refreshToken.value = null
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        throw new Error('获取用户信息失败')
      }
    }
    return resp
  }

  async function register(req: RegisterRequest) {
    const { data: resp } = await authApi.register(req)
    return resp
  }

  async function fetchUser() {
    if (!accessToken.value) return
    try {
      const { data: resp } = await authApi.getMe()
      if (resp.success && resp.data) {
        user.value = resp.data
      }
    } catch {
      clearAuth()
    }
  }

  async function logout() {
    clearAuth()
  }

  // 初始化时从 localStorage 读取 token
  async function initFromStorage() {
    const storedAccess = localStorage.getItem('access_token')
    const storedRefresh = localStorage.getItem('refresh_token')
    if (storedAccess && !isTokenExpired(storedAccess)) {
      accessToken.value = storedAccess
      refreshToken.value = storedRefresh
      fetchUser()
    } else {
      clearAuth()
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    isLoggedIn,
    username,
    displayName,
    hasRole,
    isAdmin,
    login,
    register,
    fetchUser,
    logout,
    clearAuth,
    initFromStorage,
  }
})
