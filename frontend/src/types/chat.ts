// Chat 会话与消息类型定义

export type MessageRole = 'user' | 'assistant'

export interface ChatSession {
  id: string
  tenant_id: string
  user_id: string
  agent_id: string | null
  title: string
  message_count: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: MessageRole
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface SessionCreateRequest {
  agent_id?: string
  title?: string
}

export interface SessionUpdateRequest {
  title?: string
  is_archived?: boolean
}

export interface MessageCreateRequest {
  role: MessageRole
  content: string
  metadata?: Record<string, unknown>
}

export interface MessageFeedbackRequest {
  rating: 'like' | 'dislike'
}

export interface StreamChunk {
  content?: string
  done?: boolean
  error?: string
}
