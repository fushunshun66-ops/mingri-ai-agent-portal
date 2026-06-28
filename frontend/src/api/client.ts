// Axios 实例：base URL、JWT 注入、响应拦截
import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/api'
import { ElMessage } from 'element-plus'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：自动注入 JWT token
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// 响应拦截器：统一错误处理 + token 过期自动刷新
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

client.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response
    if (!data.success) {
      ElMessage.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return response
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 401 且非 refresh 请求 → 尝试刷新 token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return client(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        isRefreshing = false
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data: refreshData } = await axios.post<ApiResponse<{
          access_token: string
          refresh_token: string
          expires_in: number
        }>>('/api/v1/auth/refresh', { refresh_token: refreshToken })

        if (refreshData.success && refreshData.data) {
          const newAccessToken = refreshData.data.access_token
          const newRefreshToken = refreshData.data.refresh_token
          localStorage.setItem('access_token', newAccessToken)
          localStorage.setItem('refresh_token', newRefreshToken)

          processQueue(null, newAccessToken)

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          }
          return client(originalRequest)
        }
      } catch {
        processQueue(error, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    const message = error.response?.data?.message || error.message || '网络错误'
    if (error.response?.status !== 401 && error.response?.status !== 422) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  },
)

export default client
