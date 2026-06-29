// RegisterView 测试 — 注册表单渲染和布局
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

const mockRegister = vi.fn()
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: (...args: unknown[]) => mockRegister(...args),
    getMe: vi.fn(),
    refresh: vi.fn(),
  },
}))

import RegisterView from '@/views/RegisterView.vue'

function createWrapper() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/register', component: RegisterView },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })

  return {
    wrapper: mount(RegisterView, {
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

describe('RegisterView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('渲染注册表单包含企业标识、企业名称、用户名、邮箱、密码字段', () => {
    const { wrapper } = createWrapper()
    const html = wrapper.html()
    expect(html).toContain('企业标识')
    expect(html).toContain('企业名称')
    expect(html).toContain('用户名')
    expect(html).toContain('邮箱')
    expect(html).toContain('密码')
  })

  it('显示注册页面标题', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.text()).toContain('注册')
  })

  it('保留 el-row 双列 tenant 字段布局', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.el-row').exists()).toBe(true)
    expect(wrapper.findAll('.el-col').length).toBeGreaterThanOrEqual(2)
  })

  it('包含登录页面的跳转链接', () => {
    const { wrapper } = createWrapper()
    const routerLinks = wrapper.findAll('a')
    const loginLink = routerLinks.find(link => link.text().includes('返回登录'))
    expect(loginLink).toBeTruthy()
  })

  it('使用左右分栏布局：wrapper、brand、form-panel', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.find('.register-wrapper').exists()).toBe(true)
    expect(wrapper.find('.register-brand').exists()).toBe(true)
    expect(wrapper.find('.register-form-panel').exists()).toBe(true)
  })

  it('品牌区展示产品名称与 Slogan', () => {
    const { wrapper } = createWrapper()
    const brand = wrapper.find('.register-brand')
    expect(brand.text()).toContain('企业智能体')
    expect(brand.find('.register-brand__logo').exists()).toBe(true)
    expect(brand.find('.register-brand__slogan').exists()).toBe(true)
  })

  it('不使用旧版紫色渐变背景', () => {
    const { wrapper } = createWrapper()
    const html = wrapper.html()
    expect(html).not.toContain('#667eea')
    expect(html).not.toContain('#764ba2')
  })
})
