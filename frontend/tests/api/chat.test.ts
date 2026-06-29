import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/api/client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

import { chatApi } from '@/api/chat'

describe('chatApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createSession 调用 POST /chat/sessions', () => {
    const req = { agent_id: 'a1', title: '新会话' }
    chatApi.createSession(req)
    expect(mockPost).toHaveBeenCalledWith('/chat/sessions', req)
  })

  it('getSessions 带可选参数', () => {
    chatApi.getSessions({ agent_id: 'a1', page: 1 })
    expect(mockGet).toHaveBeenCalledWith('/chat/sessions', { params: { agent_id: 'a1', page: 1 } })
    chatApi.getSessions()
    expect(mockGet).toHaveBeenCalledWith('/chat/sessions', { params: undefined })
  })

  it('getSession 调用 GET /chat/sessions/:id', () => {
    chatApi.getSession('s1')
    expect(mockGet).toHaveBeenCalledWith('/chat/sessions/s1')
  })

  it('updateSession 调用 PUT /chat/sessions/:id', () => {
    chatApi.updateSession('s1', { title: '重命名' })
    expect(mockPut).toHaveBeenCalledWith('/chat/sessions/s1', { title: '重命名' })
  })

  it('deleteSession 调用 DELETE /chat/sessions/:id', () => {
    chatApi.deleteSession('s1')
    expect(mockDelete).toHaveBeenCalledWith('/chat/sessions/s1')
  })

  it('sendMessage 调用 POST /chat/sessions/:id/messages', () => {
    chatApi.sendMessage('s1', '你好')
    expect(mockPost).toHaveBeenCalledWith('/chat/sessions/s1/messages', { role: 'user', content: '你好' })
  })

  it('getMessages 带分页参数', () => {
    chatApi.getMessages('s1', 2, 20)
    expect(mockGet).toHaveBeenCalledWith('/chat/sessions/s1/messages', { params: { page: 2, page_size: 20 } })
  })

  it('sendFeedback 调用 POST /chat/messages/:id/feedback', () => {
    chatApi.sendFeedback('m1', 'like')
    expect(mockPost).toHaveBeenCalledWith('/chat/messages/m1/feedback', { rating: 'like' })
  })
})
