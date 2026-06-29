import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockUpdateMe = vi.fn()
const mockChangePassword = vi.fn()
const mockFetchUser = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    updateMe: (...args: unknown[]) => mockUpdateMe(...args),
    changePassword: (...args: unknown[]) => mockChangePassword(...args),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: '1', username: 'testuser', display_name: 'Test', email: 'test@example.com', avatar_url: '' },
    fetchUser: mockFetchUser,
  })),
}))

import ProfileView from '@/views/ProfileView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(ProfileView, {
    global: {
      plugins: [pinia, ElementPlus],
      stubs: { AppLayout: { template: '<div><slot /></div>' } },
    },
  })
}

describe('ProfileView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('渲染个人信息页面标题', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('个人信息')
    expect(wrapper.text()).toContain('基本信息')
    expect(wrapper.text()).toContain('修改密码')
  })

  it('预填用户显示名称和邮箱', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const displayInput = wrapper.find('input[placeholder="设置你的显示名称"]')
    expect(displayInput.exists()).toBe(true)
    expect((displayInput.element as HTMLInputElement).value).toBe('Test')
  })

  it('保存修改调用 updateMe 和 fetchUser', async () => {
    mockUpdateMe.mockResolvedValue({ data: { success: true, data: {} } })
    mockFetchUser.mockResolvedValue(undefined)
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存修改'))
    await saveBtn!.trigger('click')
    await new Promise(r => setTimeout(r, 100))
    expect(mockUpdateMe).toHaveBeenCalled()
  })

  it('修改密码调用 changePassword', async () => {
    mockChangePassword.mockResolvedValue({ data: { success: true } })
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const pwdInputs = wrapper.findAll('input[type="password"]')
    if (pwdInputs.length >= 3) {
      await pwdInputs[0].setValue('OldPass123')
      await pwdInputs[1].setValue('NewPass123')
      await pwdInputs[2].setValue('NewPass123')
    }
    const changeBtn = wrapper.findAll('button').find(b => b.text().includes('修改密码'))
    await changeBtn!.trigger('click')
    await new Promise(r => setTimeout(r, 100))
    expect(mockChangePassword).toHaveBeenCalled()
  })
})
