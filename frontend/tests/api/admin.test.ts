import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/api/client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

import { adminApi } from '@/api/admin'

describe('adminApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getDashboard 调用 GET /admin/dashboard', () => {
    adminApi.getDashboard()
    expect(mockGet).toHaveBeenCalledWith('/admin/dashboard')
  })

  it('getTimeline 带 days 参数', () => {
    adminApi.getTimeline(7)
    expect(mockGet).toHaveBeenCalledWith('/admin/stats/overview', { params: { days: 7 } })
  })

  it('getAgentStats 带查询参数', () => {
    adminApi.getAgentStats({ page: 1, sort_by: 'sessions' })
    expect(mockGet).toHaveBeenCalledWith('/admin/stats/agents', { params: { page: 1, sort_by: 'sessions' } })
  })

  it('getUserStats 带查询参数', () => {
    adminApi.getUserStats({ page: 2 })
    expect(mockGet).toHaveBeenCalledWith('/admin/stats/users', { params: { page: 2 } })
  })

  it('getAuditLogs 带查询参数', () => {
    adminApi.getAuditLogs({ action: 'create' })
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs', { params: { action: 'create' } })
  })

  it('exportAuditLogs 默认 csv 格式', () => {
    adminApi.exportAuditLogs({ start_date: '2026-01-01' })
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs/export', {
      params: { start_date: '2026-01-01', format: 'csv' },
      responseType: 'blob',
    })
  })
})
