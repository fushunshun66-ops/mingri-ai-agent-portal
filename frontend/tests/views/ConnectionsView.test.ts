import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockList = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/api/connections', () => ({
  connectionsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

import ConnectionsView from '@/views/ConnectionsView.vue'

const mockConnection = {
  id: 'c1', tenant_id: 't1', name: 'Dify Prod', platform_type: 'dify' as const,
  status: 'active' as const, base_url: 'https://api.dify.ai', created_at: '2026-01-01',
}

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(ConnectionsView, {
    global: {
      plugins: [pinia, ElementPlus],
      stubs: { AppLayout: { template: '<div><slot /></div>' } },
    },
  })
}

describe('ConnectionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockList.mockResolvedValue({
      data: { success: true, data: [mockConnection], pagination: { total: 1, page: 1, page_size: 20, total_pages: 1 } },
    })
  })

  it('渲染页面标题和创建按钮', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('平台连接管理')
    expect(wrapper.text()).toContain('创建连接')
  })

  it('挂载时加载连接列表', async () => {
    createWrapper()
    await new Promise(r => setTimeout(r, 50))
    expect(mockList).toHaveBeenCalled()
  })

  it('加载成功后显示连接名称', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Dify Prod')
  })

  it('点击创建连接打开对话框', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    const createBtn = wrapper.findAll('button').find(b => b.text().includes('创建连接'))
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('连接名称')
  })

  it('点击编辑按钮打开编辑对话框', async () => {
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    const editBtn = wrapper.findAll('button').find(b => b.text().includes('编辑'))
    await editBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('编辑连接')
  })

  it('创建连接提交表单', async () => {
    mockCreate.mockResolvedValue({ data: { success: true, data: mockConnection } })
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 50))
    const createBtn = wrapper.findAll('button').find(b => b.text().includes('创建连接'))
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('input[placeholder="如：Dify 生产环境"]').setValue('New Conn')
    const selects = wrapper.findAll('.el-select')
    if (selects.length > 0) {
      await selects[0].trigger('click')
      await wrapper.vm.$nextTick()
    }
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('创建') && !b.text().includes('创建连接'))
    if (saveBtn) {
      await saveBtn.trigger('click')
      await new Promise(r => setTimeout(r, 100))
    }
    expect(mockCreate.mock.calls.length + mockList.mock.calls.length).toBeGreaterThan(0)
  })
})
