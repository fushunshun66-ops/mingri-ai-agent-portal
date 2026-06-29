import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const ARTIFACTS = path.join(process.cwd(), 'tests/e2e/artifacts')
const TENANT = 'e2e'
const USER = 'e2eadmin'
const PASS = 'Admin123456'

fs.mkdirSync(ARTIFACTS, { recursive: true })

async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('请输入企业标识').fill(TENANT)
  await page.getByPlaceholder('请输入用户名').fill(USER)
  await page.getByPlaceholder('请输入密码').fill(PASS)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/home/, { timeout: 15000 })
  await expect(page.locator('.brand-logo')).toBeVisible()
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: true })
}

test.describe('批次2 视觉升级验收', () => {
  test('认证：登录页布局与设计 Token', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('.login-wrapper')).toBeVisible()
    await expect(page.locator('.login-brand')).toBeVisible()
    await expect(page.locator('.login-form-panel')).toBeVisible()
    await shot(page, '01-login')

    const brandBg = await page.locator('.login-brand').evaluate((el) =>
      getComputedStyle(el).backgroundImage,
    )
    expect(brandBg).not.toMatch(/purple|violet|409EFF/i)

    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500').trim(),
    )
    expect(primary.toLowerCase()).toBe('#1a56db')
  })

  test('认证：登录成功进入首页', async ({ page }) => {
    await login(page)
    await expect(page.locator('.welcome-banner')).toBeVisible()
    await shot(page, '02-home-after-login')
  })

  test('认证：注册页布局', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: '立即注册' }).click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.locator('.login-wrapper')).toBeVisible()
    await shot(page, '03-register')
  })

  test('导航与布局 AppLayout', async ({ page }) => {
    await login(page)

    const navRoutes: Array<{ label: string; url: RegExp }> = [
      { label: '首页', url: /\/home/ },
      { label: 'Agent 市场', url: /\/marketplace/ },
      { label: '我的 Agent', url: /\/my-agents/ },
      { label: '对话', url: /\/chat/ },
      { label: '管理连接', url: /\/connections/ },
    ]

    for (const { label, url } of navRoutes) {
      const link = page.getByRole('link', { name: label, exact: true })
      await expect(link).toBeVisible()
      await link.click()
      await expect(page).toHaveURL(url)
      await expect(page.locator('.app-layout')).toBeVisible()
    }

    const adminLink = page.getByRole('link', { name: '管理中心' })
    await expect(adminLink).toBeVisible()
    await adminLink.click()
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await shot(page, '04-admin-nav')

    await expect(page.locator('.sidebar-title').first()).toContainText('Agent 分类')
  })

  test('首页 HomeView 元素', async ({ page }) => {
    await login(page)
    await page.goto('/home')
    await expect(page.locator('.welcome-banner')).toBeVisible()
    await expect(page.locator('.welcome-search input')).toBeVisible()
    await expect(page.locator('.welcome-stats')).toBeVisible()
    await expect(page.locator('.category-tab').first()).toBeVisible()
    await expect(page.locator('.guide-card').first()).toBeVisible()

    const cards = page.locator('.agent-card')
    if (await cards.count()) {
      await cards.first().click()
      await expect(page).toHaveURL(/\/agents\//)
    }
    await shot(page, '05-home')
  })

  test('市场 MarketplaceView', async ({ page }) => {
    await login(page)
    await page.goto('/marketplace')
    await expect(page.locator('.category-pill').first()).toBeVisible()
    await page.locator('.category-pill').first().click()
    await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '创建 Agent' })).toBeVisible()
    await page.reload()
    await expect(page.locator('.agent-grid-skeleton, .agent-grid, .el-empty').first()).toBeVisible({
      timeout: 10000,
    })
    await shot(page, '06-marketplace')
  })

  test('对话 ChatView', async ({ page }) => {
    await login(page)
    await page.goto('/chat')
    await expect(page.locator('.chat-page')).toBeVisible()

    const createBtn = page.getByRole('button', { name: /新建对话/ })
    await expect(createBtn.first()).toBeVisible()
    await createBtn.first().click()

    const input = page.locator('.input-textarea, .chat-input textarea').first()
    await expect(input).toBeVisible({ timeout: 10000 })
    await input.fill('你好，请用 Markdown 回复')

    const send = page.getByRole('button', { name: /发送/ })
    if (await send.count()) await send.first().click()

    await shot(page, '07-chat')
  })

  test('管理 DashboardView ECharts', async ({ page }) => {
    await login(page)
    await page.goto('/admin/dashboard')
    await expect(page.locator('.metric-card').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.chart-panel').first()).toBeVisible()
    await expect(
      page.locator('.chart-panel .chart-container canvas, .chart-panel .el-empty').first(),
    ).toBeVisible()
    await expect(
      page.locator('.table-panel .el-table, .table-panel .el-empty').first(),
    ).toBeVisible()
    await shot(page, '08-dashboard')
  })

  test('设计 Token：无 Element 默认蓝与紫色渐变残留', async ({ page }) => {
    await login(page)
    const pages = ['/home', '/marketplace', '/my-agents', '/connections', '/profile']
    const offenders: string[] = []

    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      const hits = await page.evaluate((r) => {
        const bad: string[] = []
        document.querySelectorAll('*').forEach((el) => {
          const s = getComputedStyle(el)
          const bg = `${s.background} ${s.backgroundColor} ${s.backgroundImage}`
          const color = s.color
          if (/409EFF|409eff|#667eea|#764ba2|purple|violet/i.test(bg + color)) {
            bad.push(`${r}:${(el as HTMLElement).className}`)
          }
        })
        return bad.slice(0, 5)
      }, route)
      offenders.push(...hits)
    }

    expect(offenders, `发现旧色残留: ${offenders.join(', ')}`).toHaveLength(0)

    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500').trim(),
    )
    expect(primary.toLowerCase()).toBe('#1a56db')
  })

  test('页面切换过渡动画存在', async ({ page }) => {
    await login(page)
    const hasTransitionCss = await page.evaluate(() => {
      const sheets = [...document.styleSheets]
      for (const sheet of sheets) {
        try {
          const rules = [...sheet.cssRules].map((r) => r.cssText).join(' ')
          if (/page-enter|page-leave|fade|slide|transition-enter/i.test(rules)) return true
        } catch {
          /* cross-origin */
        }
      }
      return document.querySelector('.page-enter-active, .page-leave-active') !== null
    })
    expect(hasTransitionCss).toBe(true)
  })
})
