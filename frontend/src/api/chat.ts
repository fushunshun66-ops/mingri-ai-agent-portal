// Chat 会话与消息 API
import client from './client'
import type { ApiResponse } from '@/types/api'
import type {
  ChatSession,
  ChatMessage,
  SessionCreateRequest,
  SessionUpdateRequest,
} from '@/types/chat'

export const chatApi = {
  /** 创建会话 */
  createSession(req: SessionCreateRequest) {
    return client.post<ApiResponse<ChatSession>>('/chat/sessions', req)
  },

  /** 获取会话列表 */
  getSessions(params?: { agent_id?: string; page?: number; page_size?: number }) {
    return client.get<ApiResponse<ChatSession[]>>('/chat/sessions', { params })
  },

  /** 获取会话详情 */
  getSession(id: string) {
    return client.get<ApiResponse<ChatSession>>(`/chat/sessions/${id}`)
  },

  /** 更新会话 */
  updateSession(id: string, req: SessionUpdateRequest) {
    return client.put<ApiResponse<ChatSession>>(`/chat/sessions/${id}`, req)
  },

  /** 删除/归档会话 */
  deleteSession(id: string) {
    return client.delete<ApiResponse<null>>(`/chat/sessions/${id}`)
  },

  /** 发送消息（非流式） */
  sendMessage(sessionId: string, content: string) {
    return client.post<ApiResponse<ChatMessage>>(`/chat/sessions/${sessionId}/messages`, {
      role: 'user',
      content,
    })
  },

  /** 获取消息历史 */
  getMessages(sessionId: string, page = 1, pageSize = 50) {
    return client.get<ApiResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}/messages`, {
      params: { page, page_size: pageSize },
    })
  },

  /** 提交消息反馈 */
  sendFeedback(messageId: string, rating: 'like' | 'dislike') {
    return client.post<ApiResponse<null>>(`/chat/messages/${messageId}/feedback`, { rating })
  },
}
