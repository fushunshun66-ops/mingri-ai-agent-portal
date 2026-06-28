// 管理后台 API 封装
import client from './client'
import type { ApiResponse } from '@/types/api'

// ---- 类型定义 ----

export interface DashboardOverview {
  total_agents: number
  active_users: number
  today_sessions: number
  total_tokens: number
  platform_distribution: PlatformStat[]
  top_agents: TopAgent[]
}

export interface PlatformStat {
  platform: string
  count: number
}

export interface TopAgent {
  id: string
  name: string
  platform: string
  sessions: number
  rating: number
}

export interface TimelinePoint {
  date: string
  sessions: number
  messages: number
}

export interface AgentStat {
  id: string
  name: string
  platform: string
  sessions: number
  messages: number
  tokens: number
  install_count: number
  rating: number
}

export interface UserStat {
  id: string
  username: string
  sessions: number
  messages: number
  tokens: number
  last_active: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  action: string
  resource_type: string
  resource_id: string
  result: string
  detail?: string
}

export interface PaginatedList<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface StatsQuery {
  page?: number
  page_size?: number
  sort_by?: string
  start_date?: string
  end_date?: string
}

export interface AuditLogQuery extends StatsQuery {
  user_id?: string
  action?: string
  resource_type?: string
}

export interface ExportQuery {
  start_date?: string
  end_date?: string
  format?: string
}

// ---- API ----

export const adminApi = {
  /** 获取仪表盘概览 */
  getDashboard() {
    return client.get<ApiResponse<DashboardOverview>>('/admin/dashboard')
  },

  /** 获取时间线图表数据 */
  getTimeline(days: number = 30) {
    return client.get<ApiResponse<TimelinePoint[]>>('/admin/stats/overview', {
      params: { days },
    })
  },

  /** 获取 Agent 统计列表 */
  getAgentStats(params: StatsQuery = {}) {
    return client.get<ApiResponse<PaginatedList<AgentStat>>>('/admin/stats/agents', {
      params,
    })
  },

  /** 获取用户统计列表 */
  getUserStats(params: StatsQuery = {}) {
    return client.get<ApiResponse<PaginatedList<UserStat>>>('/admin/stats/users', {
      params,
    })
  },

  /** 获取审计日志 */
  getAuditLogs(params: AuditLogQuery = {}) {
    return client.get<ApiResponse<PaginatedList<AuditLogEntry>>>('/admin/audit-logs', {
      params,
    })
  },

  /** 导出审计日志 */
  exportAuditLogs(params: ExportQuery = {}) {
    return client.get('/admin/audit-logs/export', {
      params: { ...params, format: params.format || 'csv' },
      responseType: 'blob',
    })
  },
}
