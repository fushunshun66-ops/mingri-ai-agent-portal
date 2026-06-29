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

import { agentsApi } from '@/api/agents'

describe('agentsApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getCategories 调用 GET /categories', () => {
    agentsApi.getCategories()
    expect(mockGet).toHaveBeenCalledWith('/categories')
  })

  it('create 调用 POST /agents', () => {
    const req = { name: 'Test', platform_type: 'dify' as const }
    agentsApi.create(req)
    expect(mockPost).toHaveBeenCalledWith('/agents', req)
  })

  it('list 调用 GET /agents 带 query', () => {
    const query = { page: 1, page_size: 20 }
    agentsApi.list(query)
    expect(mockGet).toHaveBeenCalledWith('/agents', { params: query })
  })

  it('getById 调用 GET /agents/:id', () => {
    agentsApi.getById('abc')
    expect(mockGet).toHaveBeenCalledWith('/agents/abc')
  })

  it('update 调用 PUT /agents/:id', () => {
    agentsApi.update('abc', { name: 'New' })
    expect(mockPut).toHaveBeenCalledWith('/agents/abc', { name: 'New' })
  })

  it('delete 调用 DELETE /agents/:id', () => {
    agentsApi.delete('abc')
    expect(mockDelete).toHaveBeenCalledWith('/agents/abc')
  })

  it('install / uninstall 调用正确端点', () => {
    agentsApi.install('abc')
    expect(mockPost).toHaveBeenCalledWith('/agents/abc/install')
    agentsApi.uninstall('abc')
    expect(mockDelete).toHaveBeenCalledWith('/agents/abc/install')
  })

  it('getMyAgents 带分页参数', () => {
    agentsApi.getMyAgents(2, 10)
    expect(mockGet).toHaveBeenCalledWith('/agents/my', { params: { page: 2, page_size: 10 } })
  })

  it('createReview / getReviews 调用正确端点', () => {
    agentsApi.createReview('abc', { rating: 5, comment: '好' })
    expect(mockPost).toHaveBeenCalledWith('/agents/abc/reviews', { rating: 5, comment: '好' })
    agentsApi.getReviews('abc', 1, 10)
    expect(mockGet).toHaveBeenCalledWith('/agents/abc/reviews', { params: { page: 1, page_size: 10 } })
  })

  it('favorite / unfavorite 调用正确端点', () => {
    agentsApi.favorite('abc')
    expect(mockPost).toHaveBeenCalledWith('/agents/abc/favorite')
    agentsApi.unfavorite('abc')
    expect(mockDelete).toHaveBeenCalledWith('/agents/abc/favorite')
  })

  it('getFavorites / getRecommended / getRecent 调用正确端点', () => {
    agentsApi.getFavorites()
    expect(mockGet).toHaveBeenCalledWith('/agents/favorites', { params: { page: 1, page_size: 20 } })
    agentsApi.getRecommended()
    expect(mockGet).toHaveBeenCalledWith('/agents/recommended')
    agentsApi.getRecent(5)
    expect(mockGet).toHaveBeenCalledWith('/agents/recent', { params: { limit: 5 } })
  })

  it('uploadIcon 使用 FormData POST', () => {
    const file = new File(['x'], 'icon.png', { type: 'image/png' })
    agentsApi.uploadIcon('abc', file)
    expect(mockPost).toHaveBeenCalledWith('/agents/abc/icon', expect.any(FormData))
  })
})
