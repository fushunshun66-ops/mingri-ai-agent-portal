import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '@/utils/error'

describe('getErrorMessage', () => {
  it('从 Axios 错误中提取 message', () => {
    const err = { response: { data: { message: '用户名已存在' } } }
    expect(getErrorMessage(err)).toBe('用户名已存在')
  })

  it('无 response message 时返回 fallback', () => {
    const err = { response: { data: {} } }
    expect(getErrorMessage(err, '操作失败')).toBe('操作失败')
  })

  it('非 Axios 错误返回 fallback', () => {
    expect(getErrorMessage(new Error('oops'), '默认错误')).toBe('默认错误')
    expect(getErrorMessage(null)).toBe('操作失败')
    expect(getErrorMessage(undefined, '自定义')).toBe('自定义')
  })
})
