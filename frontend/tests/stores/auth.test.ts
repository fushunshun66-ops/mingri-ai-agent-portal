import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockLogin = vi.fn()
const mockRegister = vi.fn()
const mockGetMe = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    login: (...args: unknown[]) => mockLogin(...args),
    register: (...args: unknown[]) => mockRegister(...args),
    getMe: (...args: unknown[]) => mockGetMe(...args),
    refresh: vi.fn(),
  },
}))

import { useAuthStore } from '@/stores/auth'

function makeJwt(expOffsetSec: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }))
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expOffsetSec }))
  return `${header}.${payload}.sig`
}

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('初始状态未登录', () => {
    const store = useAuthStore()
    expect(store.isLoggedIn).toBe(false)
    expect(store.user).toBeNull()
  })

  it('login 成功后设置 token 并获取用户信息', async () => {
    const validToken = makeJwt(3600)
    mockLogin.mockResolvedValue({
      data: {
        success: true,
        data: { access_token: validToken, refresh_token: 'rt', token_type: 'bearer', expires_in: 3600 },
      },
    })
    mockGetMe.mockResolvedValue({
      data: { success: true, data: { id: '1', username: 'admin', display_name: 'Admin', roles: ['tenant_admin'] } },
    })

    const store = useAuthStore()
    await store.login({ tenant_slug: 'demo', username: 'admin', password: 'pass' })

    expect(store.isLoggedIn).toBe(true)
    expect(store.user?.username).toBe('admin')
    expect(localStorage.getItem('access_token')).toBe(validToken)
  })

  it('login 后 fetchUser 失败时清除 token', async () => {
    const validToken = makeJwt(3600)
    mockLogin.mockResolvedValue({
      data: {
        success: true,
        data: { access_token: validToken, refresh_token: 'rt', token_type: 'bearer', expires_in: 3600 },
      },
    })
    mockGetMe.mockRejectedValue(new Error('network'))

    const store = useAuthStore()
    await store.login({ tenant_slug: 'demo', username: 'admin', password: 'pass' })
    // fetchUser 内部 catch 后 clearAuth，login 仍 resolve
    expect(store.isLoggedIn).toBe(false)
    expect(store.user).toBeNull()
  })

  it('register 调用 API 并返回响应', async () => {
    mockRegister.mockResolvedValue({ data: { success: true, data: { id: '1', username: 'new' } } })
    const store = useAuthStore()
    const resp = await store.register({
      tenant_slug: 'demo', username: 'new', email: 'a@b.com', password: 'Pass1234!',
    })
    expect(resp.success).toBe(true)
  })

  it('hasRole 和 isAdmin 判断角色', async () => {
    mockGetMe.mockResolvedValue({
      data: { success: true, data: { id: '1', username: 'admin', roles: ['tenant_admin'] } },
    })
    const store = useAuthStore()
    store.accessToken = makeJwt(3600)
    await store.fetchUser()

    expect(store.hasRole(['tenant_admin'])).toBe(true)
    expect(store.isAdmin).toBe(true)
  })

  it('fetchUser 失败时 clearAuth', async () => {
    const store = useAuthStore()
    store.accessToken = makeJwt(3600)
    mockGetMe.mockRejectedValue(new Error('401'))
    await store.fetchUser()
    expect(store.user).toBeNull()
  })

  it('fetchUser 无 token 时不调用 API', async () => {
    const store = useAuthStore()
    await store.fetchUser()
    expect(mockGetMe).not.toHaveBeenCalled()
  })

  it('logout 清除认证状态', async () => {
    const store = useAuthStore()
    store.accessToken = makeJwt(3600)
    localStorage.setItem('access_token', store.accessToken)
    await store.logout()
    expect(store.isLoggedIn).toBe(false)
  })

  it('initFromStorage 从 localStorage 恢复有效 token', async () => {
    const validToken = makeJwt(3600)
    localStorage.setItem('access_token', validToken)
    localStorage.setItem('refresh_token', 'rt')
    mockGetMe.mockResolvedValue({
      data: { success: true, data: { id: '1', username: 'user' } },
    })

    const store = useAuthStore()
    await store.initFromStorage()
    expect(store.isLoggedIn).toBe(true)
  })

  it('过期 token 时 isLoggedIn 为 false', () => {
    const store = useAuthStore()
    store.accessToken = makeJwt(-3600)
    expect(store.isLoggedIn).toBe(false)
  })

  it('无效 token 格式视为过期', () => {
    const store = useAuthStore()
    store.accessToken = 'not-a-valid-jwt'
    expect(store.isLoggedIn).toBe(false)
  })

  it('hasRole 无 roles 时返回 false', () => {
    const store = useAuthStore()
    store.user = { id: '1', username: 'u' } as ReturnType<typeof useAuthStore>['user']
    expect(store.hasRole(['admin'])).toBe(false)
  })

  it('displayName 无 display_name 时回退 username', async () => {
    mockGetMe.mockResolvedValue({
      data: { success: true, data: { id: '1', username: 'fallback_user' } },
    })
    const store = useAuthStore()
    store.accessToken = makeJwt(3600)
    await store.fetchUser()
    expect(store.displayName).toBe('fallback_user')
  })
})
