// 连接相关类型定义

export type ConnectionStatus = 'active' | 'error' | 'disabled'

export interface Connection {
  id: string
  tenant_id: string
  name: string
  platform_type: string
  config: Record<string, unknown> | null
  status: ConnectionStatus
  last_checked_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ConnectionCreateRequest {
  name: string
  platform_type: string
  config?: Record<string, unknown>
  status?: ConnectionStatus
}

export interface ConnectionUpdateRequest {
  name?: string
  config?: Record<string, unknown>
  status?: ConnectionStatus
}
