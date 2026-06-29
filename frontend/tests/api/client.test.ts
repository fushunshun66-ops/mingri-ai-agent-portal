import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockError = vi.fn()
vi.mock('element-plus', () => ({
  ElMessage: { error: (...args: unknown[]) => mockError(...args) },
}))

import client from '@/api/client'
import type { InternalAxiosRequestConfig } from 'axios'

function successAdapter(data: unknown) {
  return (config: InternalAxiosRequestConfig) =>
    Promise.resolve({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })
}

describe('api client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('请求拦截器注入 Authorization header', async () => {
    localStorage.setItem('access_token', 'my-token')
    let capturedHeaders: Record<string, string> = {}
    await client.get('/test', {
      adapter: (config) => {
        capturedHeaders = config.headers as Record<string, string>
        return Promise.resolve({
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      },
    })
    expect(capturedHeaders.Authorization).toBe('Bearer my-token')
  })

  it('响应拦截器 success=false 时 reject 并显示错误', async () => {
    await expect(
      client.get('/fail', { adapter: successAdapter({ success: false, message: '业务失败' }) }),
    ).rejects.toThrow('业务失败')
    expect(mockError).toHaveBeenCalledWith('业务失败')
  })

  it('响应拦截器 success=true 时正常返回', async () => {
    const resp = await client.get('/ok', {
      adapter: successAdapter({ success: true, data: { id: '1' } }),
    })
    expect(resp.data.success).toBe(true)
  })

  it('401 无 refresh_token 时清除 storage', async () => {
    const locationMock = { href: 'http://localhost/' }
    vi.stubGlobal('location', locationMock)
    localStorage.setItem('access_token', 'expired')

    await expect(
      client.get('/protected', {
        adapter: (config) =>
          Promise.reject({
            config,
            response: { status: 401, data: { message: 'Unauthorized' } },
            isAxiosError: true,
          }),
      }),
    ).rejects.toBeTruthy()

    expect(localStorage.getItem('access_token')).toBeNull()
  })

  it('401 有 refresh_token 时刷新并重试请求', async () => {
    localStorage.setItem('access_token', 'old-token')
    localStorage.setItem('refresh_token', 'refresh-token')

    const axios = await import('axios')
    const postSpy = vi.spyOn(axios.default, 'post').mockResolvedValue({
      data: {
        success: true,
        data: { access_token: 'new-token', refresh_token: 'new-refresh', expires_in: 3600 },
      },
    })

    let attempts = 0
    const resp = await client.get('/protected', {
      adapter: (config) => {
        attempts++
        if (attempts === 1) {
          return Promise.reject({
            config: { ...config, headers: config.headers || {} },
            response: { status: 401, data: { message: 'Unauthorized' } },
            isAxiosError: true,
          })
        }
        return Promise.resolve({
          data: { success: true, data: { ok: true } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      },
    })

    expect(postSpy).toHaveBeenCalled()
    expect(localStorage.getItem('access_token')).toBe('new-token')
    expect(resp.data.success).toBe(true)
    postSpy.mockRestore()
  })

  it('网络错误时显示错误消息', async () => {
    await expect(
      client.get('/network-error', {
        adapter: (config) =>
          Promise.reject({
            config,
            message: 'Network Error',
            response: { status: 500, data: { message: '服务器错误' } },
            isAxiosError: true,
          }),
      }),
    ).rejects.toBeTruthy()
    expect(mockError).toHaveBeenCalled()
  })
})
