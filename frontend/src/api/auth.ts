// 认证相关 API
import client from './client'
import type { ApiResponse } from '@/types/api'
import type {
  TokenResponse,
  UserInfo,
  RegisterRequest,
  LoginRequest,
  UserUpdateRequest,
  PasswordChangeRequest,
} from '@/types/user'

export const authApi = {
  /** 用户注册 */
  register(req: RegisterRequest) {
    return client.post<ApiResponse<{ id: string; tenant_id: string; username: string; email: string }>>('/auth/register', req)
  },

  /** 用户登录 */
  login(req: LoginRequest) {
    return client.post<ApiResponse<TokenResponse>>('/auth/login', req)
  },

  /** 刷新 token */
  refresh(refreshToken: string) {
    return client.post<ApiResponse<TokenResponse>>('/auth/refresh', { refresh_token: refreshToken })
  },

  /** 获取当前用户信息 */
  getMe() {
    return client.get<ApiResponse<UserInfo>>('/users/me')
  },

  /** 更新个人信息 */
  updateMe(req: UserUpdateRequest) {
    return client.put<ApiResponse<UserInfo>>('/users/me', req)
  },

  /** 修改密码 */
  changePassword(req: PasswordChangeRequest) {
    return client.put<ApiResponse<null>>('/users/me/password', req)
  },
}
