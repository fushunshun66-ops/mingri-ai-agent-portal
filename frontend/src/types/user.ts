// 用户相关类型定义

export type UserStatus = 'active' | 'disabled' | 'invited'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface UserInfo {
  id: string
  tenant_id: string
  username: string
  email: string
  display_name: string | null
  avatar_url: string | null
  status: UserStatus
  roles: string[]
  created_at: string | null
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  display_name?: string
  tenant_name?: string
  tenant_slug?: string
}

export interface LoginRequest {
  username: string
  password: string
  tenant_slug: string
}

export interface RefreshRequest {
  refresh_token: string
}

export interface UserUpdateRequest {
  display_name?: string
  avatar_url?: string
  email?: string
}

export interface PasswordChangeRequest {
  old_password: string
  new_password: string
}
