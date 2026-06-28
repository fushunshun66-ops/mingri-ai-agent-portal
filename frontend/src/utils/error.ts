import type { AxiosError } from 'axios'

export function getErrorMessage(err: unknown, fallback = '操作失败'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as AxiosError<{ message?: string }>
    return axiosErr.response?.data?.message || fallback
  }
  return fallback
}
