// Vitest 全局测试配置
import { config } from '@vue/test-utils'
import { vi } from 'vitest'
import ElementPlus from 'element-plus'

// 注册 Element Plus 作为全局插件
config.global.plugins = [ElementPlus]

// 设置常用组件 stub（仅对不需要完整渲染的组件）
config.global.stubs = {
  // 路由相关
  'router-link': true,
  'router-view': true,

  // 复杂交互组件 — 仅 stub 不需要完整行为测试的
  'el-dropdown': true,
  'el-dropdown-menu': true,
  'el-dropdown-item': true,
  'el-empty': true,
  'el-skeleton': true,
  'el-pagination': true,
  'el-avatar': true,
  'el-icon': true,
  'el-popconfirm': true,
  'el-descriptions': true,
  'el-descriptions-item': true,
  'el-table': true,
  'el-table-column': true,
  'el-rate': true,
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

// Mock Element Plus icons
vi.mock('@element-plus/icons-vue', () => ({
  Search: { template: '<span>Search</span>' },
  ArrowDown: { template: '<span>ArrowDown</span>' },
  StarFilled: { template: '<span>StarFilled</span>' },
  Download: { template: '<span>Download</span>' },
  User: { template: '<span>User</span>' },
  Edit: { template: '<span>Edit</span>' },
  Delete: { template: '<span>Delete</span>' },
  Plus: { template: '<span>Plus</span>' },
}))
