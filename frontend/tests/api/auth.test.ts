import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()

vi.mock('@/api/client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}))

import { authApi } from '@/api/auth'

describe('authApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('register 调用 POST /auth/register', () => {
    const req = { tenant_slug: 'demo', username: 'u', email: 'a@b.com', password: 'Pass1234!' }
    authApi.register(req)
    expect(mockPost).toHaveBeenCalledWith('/auth/register', req)
  })

  it('login 调用 POST /auth/login', () => {
    const req = { tenant_slug: 'demo', username: 'u', password: 'p' }
    authApi.login(req)
    expect(mockPost).toHaveBeenCalledWith('/auth/login', req)
  })

  it('refresh 调用 POST /auth/refresh', () => {
    authApi.refresh('refresh-token')
    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'refresh-token' })
  })

  it('getMe 调用 GET /users/me', () => {
    authApi.getMe()
    expect(mockGet).toHaveBeenCalledWith('/users/me')
  })

  it('updateMe 调用 PUT /users/me', () => {
    const req = { display_name: '新名称' }
    authApi.updateMe(req)
    expect(mockPut).toHaveBeenCalledWith('/users/me', req)
  })

  it('changePassword 调用 PUT /users/me/password', () => {
    const req = { old_password: 'old', new_password: 'new12345' }
    authApi.changePassword(req)
    expect(mockPut).toHaveBeenCalledWith('/users/me/password', req)
  })
})
