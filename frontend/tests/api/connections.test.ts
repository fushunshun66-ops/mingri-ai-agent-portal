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

import { connectionsApi } from '@/api/connections'

describe('connectionsApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create 调用 POST /connections', () => {
    const req = { name: 'Dify', platform_type: 'dify' as const, api_key: 'key', base_url: 'https://api.dify.ai' }
    connectionsApi.create(req)
    expect(mockPost).toHaveBeenCalledWith('/connections', req)
  })

  it('list 带分页参数', () => {
    connectionsApi.list(2, 10)
    expect(mockGet).toHaveBeenCalledWith('/connections', { params: { page: 2, page_size: 10 } })
  })

  it('getById 调用 GET /connections/:id', () => {
    connectionsApi.getById('c1')
    expect(mockGet).toHaveBeenCalledWith('/connections/c1')
  })

  it('update 调用 PUT /connections/:id', () => {
    connectionsApi.update('c1', { name: '新名称' })
    expect(mockPut).toHaveBeenCalledWith('/connections/c1', { name: '新名称' })
  })

  it('delete 调用 DELETE /connections/:id', () => {
    connectionsApi.delete('c1')
    expect(mockDelete).toHaveBeenCalledWith('/connections/c1')
  })
})
