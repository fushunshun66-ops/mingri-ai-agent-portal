// Agent 相关 API
import client from './client'
import type { ApiResponse, PaginationMeta } from '@/types/api'
import type {
  Agent,
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentListQuery,
  Category,
  Review,
  ReviewCreateRequest,
} from '@/types/agent'

export const agentsApi = {
  /** 获取分类列表 */
  getCategories() {
    return client.get<ApiResponse<Category[]>>('/categories')
  },

  /** 创建 Agent */
  create(req: AgentCreateRequest) {
    return client.post<ApiResponse<Agent>>('/agents', req)
  },

  /** Agent 列表（分页 + 筛选） */
  list(query: AgentListQuery) {
    return client.get<ApiResponse<Agent[]>>('/agents', { params: query })
  },

  /** Agent 详情 */
  getById(id: string) {
    return client.get<ApiResponse<Agent>>(`/agents/${id}`)
  },

  /** 编辑 Agent */
  update(id: string, req: AgentUpdateRequest) {
    return client.put<ApiResponse<Agent>>(`/agents/${id}`, req)
  },

  /** 删除 Agent */
  delete(id: string) {
    return client.delete<ApiResponse<null>>(`/agents/${id}`)
  },

  /** 安装 Agent */
  install(id: string) {
    return client.post<ApiResponse<{ id: string; agent_id: string; installed_at: string }>>(`/agents/${id}/install`)
  },

  /** 卸载 Agent */
  uninstall(id: string) {
    return client.delete<ApiResponse<null>>(`/agents/${id}/install`)
  },

  /** 我的 Agent */
  getMyAgents(page = 1, pageSize = 20) {
    return client.get<ApiResponse<Agent[]>>('/agents/my', { params: { page, page_size: pageSize } })
  },

  /** 提交评论 */
  createReview(agentId: string, req: ReviewCreateRequest) {
    return client.post<ApiResponse<Review>>(`/agents/${agentId}/reviews`, req)
  },

  /** 获取评论列表 */
  getReviews(agentId: string, page = 1, pageSize = 20) {
    return client.get<ApiResponse<Review[]>>(`/agents/${agentId}/reviews`, { params: { page, page_size: pageSize } })
  },

  /** 收藏 Agent */
  favorite(id: string) {
    return client.post<ApiResponse<null>>(`/agents/${id}/favorite`)
  },

  /** 取消收藏 Agent */
  unfavorite(id: string) {
    return client.delete<ApiResponse<null>>(`/agents/${id}/favorite`)
  },

  /** 获取收藏列表 */
  getFavorites(page = 1, pageSize = 20) {
    return client.get<ApiResponse<Agent[]>>('/agents/favorites', { params: { page, page_size: pageSize } })
  },

  /** 获取推荐 Agent */
  getRecommended() {
    return client.get<ApiResponse<Agent[]>>('/agents/recommended')
  },

  /** 获取最近使用 */
  getRecent(limit = 20) {
    return client.get<ApiResponse<Agent[]>>('/agents/recent', { params: { limit } })
  },

  /** 上传图标 */
  uploadIcon(id: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return client.post<ApiResponse<{ icon_url: string }>>(`/agents/${id}/icon`, formData)
  },
}
