// 平台连接相关 API
import client from './client'
import type { ApiResponse } from '@/types/api'
import type {
  Connection,
  ConnectionCreateRequest,
  ConnectionUpdateRequest,
} from '@/types/connection'

export const connectionsApi = {
  /** 创建连接 */
  create(req: ConnectionCreateRequest) {
    return client.post<ApiResponse<Connection>>('/connections', req)
  },

  /** 连接列表 */
  list(page = 1, pageSize = 20) {
    return client.get<ApiResponse<Connection[]>>('/connections', { params: { page, page_size: pageSize } })
  },

  /** 连接详情 */
  getById(id: string) {
    return client.get<ApiResponse<Connection>>(`/connections/${id}`)
  },

  /** 编辑连接 */
  update(id: string, req: ConnectionUpdateRequest) {
    return client.put<ApiResponse<Connection>>(`/connections/${id}`, req)
  },

  /** 删除连接 */
  delete(id: string) {
    return client.delete<ApiResponse<null>>(`/connections/${id}`)
  },
}
