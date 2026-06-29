import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockGetAuditLogs = vi.fn()
const mockExportAuditLogs = vi.fn()

vi.mock('@/api/admin', () => ({
  adminApi: {
    getAuditLogs: (...args: unknown[]) => mockGetAuditLogs(...args),
    exportAuditLogs: (...args: unknown[]) => mockExportAuditLogs(...args),
  },
}))

import AuditLogView from '@/views/admin/AuditLogView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(AuditLogView, {
    global: {
      plugins: [pinia, ElementPlus],
      stubs: { AppLayout: { template: '<div><slot /></div>' } },
    },
  })
}

describe('AuditLogView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuditLogs.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [{
            id: '1', timestamp: '2026-01-01T00:00:00Z', user: 'admin',
            action: 'create', resource_type: 'agent', resource_id: 'a1',
            result: 'success', detail: '创建 Agent',
          }],
          total: 1, page: 1, page_size: 20, total_pages: 1,
        },
      },
    })
  })

  it('渲染审计日志标题和导出按钮', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('审计日志')
    expect(wrapper.text()).toContain('导出 CSV')
  })

  it('挂载时加载审计日志', async () => {
    createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetAuditLogs).toHaveBeenCalled()
  })

  it('点击查询按钮重新加载', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    mockGetAuditLogs.mockClear()
    const searchBtn = wrapper.findAll('button').find(b => b.text().includes('查询'))
    await searchBtn!.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetAuditLogs).toHaveBeenCalled()
  })

  it('点击导出按钮调用 exportAuditLogs', async () => {
    mockExportAuditLogs.mockResolvedValue({ data: new Blob(['csv']) })
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    const exportBtn = wrapper.findAll('button').find(b => b.text().includes('导出'))
    await exportBtn!.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockExportAuditLogs).toHaveBeenCalled()
  })

  it('点击重置按钮重新加载', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    mockGetAuditLogs.mockClear()
    const resetBtn = wrapper.findAll('button').find(b => b.text().includes('重置'))
    await resetBtn!.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetAuditLogs).toHaveBeenCalled()
  })
})
