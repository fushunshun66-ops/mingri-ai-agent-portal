// Agent 相关类型定义

export type AgentStatus = 'draft' | 'published' | 'archived'
export type AgentVisibility = 'private' | 'tenant_visible' | 'public'
export type PlatformType = 'dify' | 'n8n' | 'coze' | 'builtin'

export interface Agent {
  id: string
  tenant_id: string
  name: string
  description: string | null
  icon_url: string | null
  category_id: string | null
  category: Category | null
  tags: Tag[] | null
  platform_type: PlatformType | null
  platform_config: Record<string, unknown> | null
  capability: Record<string, unknown> | null
  input_schema: Record<string, unknown> | null
  output_schema: Record<string, unknown> | null
  visibility: AgentVisibility
  status: AgentStatus
  version: string
  owner_id: string | null
  install_count: number
  rating_avg: number
  review_count: number
  created_at: string | null
  updated_at: string | null
}

export interface Tag {
  name: string
  color?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  sort_order: number
  tenant_id: string | null
}

export interface AgentCreateRequest {
  name: string
  description?: string
  icon_url?: string
  category_id?: string
  tags?: Tag[]
  platform_type?: PlatformType
  platform_config?: Record<string, unknown>
  capability?: Record<string, unknown>
  input_schema?: Record<string, unknown>
  output_schema?: Record<string, unknown>
  visibility?: AgentVisibility
  status?: AgentStatus
  version?: string
}

export interface AgentUpdateRequest {
  name?: string
  description?: string
  icon_url?: string
  category_id?: string
  tags?: Tag[]
  platform_type?: PlatformType
  platform_config?: Record<string, unknown>
  capability?: Record<string, unknown>
  input_schema?: Record<string, unknown>
  output_schema?: Record<string, unknown>
  visibility?: AgentVisibility
  status?: AgentStatus
  version?: string
}

export interface AgentListQuery {
  page: number
  page_size: number
  search?: string
  status?: string
  category_id?: string
  platform_type?: PlatformType
  tags?: string
  sort_by?: string
  sort_order?: string
}

export interface Review {
  id: string
  agent_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string | null
}

export interface ReviewCreateRequest {
  rating: number
  comment?: string
}
