// 统一 API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  code: number
  message: string
  data: T | null
  pagination: PaginationMeta | null
  error: ErrorDetail | null
  request_id: string
}

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface ErrorDetail {
  code: string
  message: string
  detail: unknown
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
