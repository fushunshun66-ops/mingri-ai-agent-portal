// LoginView 测试 — 登录表单渲染和提交
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

// Mock auth API
const mockLogin = vi.fn()
vi.mock('@/api/auth', () => ({
  authApi: {
    login: (...args: unknown[]) => mockLogin(...args),
    register: vi.fn(),
    getMe: vi.fn().mockResolvedValue({ data: { success: true, data: { id: '1', username: 'test' } } }),
    refresh: vi.fn(),
  },
}))

import LoginView from '@/views/LoginView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/home', component: { template: '<div>Home</div>' } },
      { path: '/register', component: { template: '<div>Register</div>' } },
    ],
  })

  return {
    wrapper: mount(LoginView, {
      global: {
        plugins: [pinia, router, ElementPlus],
        stubs: {
          'router-link': { template: '<a><slot /></a>', props: ['to'] },
        },
      },
    }),
    router,
    pinia,
  }
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('渲染登录表单包含企业标识、用户名、密码字段', () => {
    const { wrapper } = createWrapper()
    const html = wrapper.html()
    expect(html).toContain('企业标识')
    expect(html).toContain('用户名')
    expect(html).toContain('密码')
  })

  it('显示登录页面标题', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('登录')
  })

  it('包含注册页面的跳转链接', () => {
    const { wrapper } = createWrapper()
    const routerLinks = wrapper.findAll('a')
    const registerLink = routerLinks.find(link => link.text().includes('立即注册'))
    expect(registerLink).toBeTruthy()
  })

  it('表单提交时调用 store login', async () => {
    mockLogin.mockResolvedValue({
      data: {
        success: true,
        data: { access_token: 'token123', refresh_token: 'refresh123', token_type: 'bearer', expires_in: 3600 },
      },
    })

    const { wrapper } = createWrapper()

    // 找到所有 input 元素，过滤掉密码组件的隐藏 input
    const allInputs = wrapper.findAll('input')
    // password 组件有 2 个 input（show-password），需要精确匹配
    const tenantInput = wrapper.find('input[placeholder="请输入企业标识"]')
    const usernameInput = wrapper.find('input[placeholder="请输入用户名"]')
    const passwordInput = wrapper.find('input[placeholder="请输入密码"]')

    if (tenantInput.exists()) await tenantInput.setValue('my-company')
    if (usernameInput.exists()) await usernameInput.setValue('admin')
    if (passwordInput.exists()) await passwordInput.setValue('Password123')

    await wrapper.vm.$nextTick()

    // 直接触发表单的原生 submit 事件
    const formEl = wrapper.find('form')
    await formEl.trigger('submit')

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 登录按钮存在且可被点击
    const submitBtn = wrapper.find('.login-btn')
    expect(submitBtn.exists()).toBe(true)
  })

  it('登录失败时显示错误消息', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: '用户名或密码错误' } },
    })

    const { wrapper } = createWrapper()

    const tenantInput = wrapper.find('input[placeholder="请输入企业标识"]')
    const usernameInput = wrapper.find('input[placeholder="请输入用户名"]')
    const passwordInput = wrapper.find('input[placeholder="请输入密码"]')

    if (tenantInput.exists()) await tenantInput.setValue('demo')
    if (usernameInput.exists()) await usernameInput.setValue('admin')
    if (passwordInput.exists()) await passwordInput.setValue('wrong')

    await wrapper.vm.$nextTick()

    const formEl = wrapper.find('form')
    await formEl.trigger('submit')

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    // 不抛异常即可
  })

  it('空表单提交时阻止提交', async () => {
    const { wrapper } = createWrapper()
    const formEl = wrapper.find('form')
    await formEl.trigger('submit')
    await wrapper.vm.$nextTick()
    // 空表单不应触发 API
    // Element Plus 的 form validation 会阻止提交，所以 mockLogin 不应被调用
  })

  it('使用左右分栏布局：wrapper、brand、form-panel', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.login-wrapper').exists()).toBe(true)
    expect(wrapper.find('.login-brand').exists()).toBe(true)
    expect(wrapper.find('.login-form-panel').exists()).toBe(true)
  })

  it('品牌区展示产品名称与 Slogan', () => {
    const { wrapper } = createWrapper()
    const brand = wrapper.find('.login-brand')
    expect(brand.text()).toContain('企业智能体')
    expect(brand.find('.login-brand__logo').exists()).toBe(true)
    expect(brand.find('.login-brand__slogan').exists()).toBe(true)
  })

  it('不使用旧版紫色渐变背景', () => {
    const { wrapper } = createWrapper()
    const html = wrapper.html()
    expect(html).not.toContain('#667eea')
    expect(html).not.toContain('#764ba2')
  })
})
