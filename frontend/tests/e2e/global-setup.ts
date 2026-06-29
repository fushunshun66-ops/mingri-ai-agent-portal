import type { FullConfig } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const API = BASE.replace(':5173', ':8000')

async function api(path: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, options)
  const body = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(`${path} failed: ${JSON.stringify(body)}`)
  return body
}

export default async function globalSetup(_config: FullConfig) {
  const login = await api('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'e2eadmin',
      password: 'Admin123456',
      tenant_slug: 'e2e',
    }),
  })
  const loginData = login.data as { access_token: string }
  const token = loginData.access_token
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const agents = await api('/api/v1/agents?page=1&page_size=1', { headers })
  const pagination = agents.pagination as { total?: number } | undefined
  if ((pagination?.total ?? 0) > 0) return

  const cats = await api('/api/v1/categories', { headers })
  const categoryId = (cats.data as Array<{ id: string }>)?.[0]?.id
  await api('/api/v1/agents', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: `E2E Test Agent ${Date.now()}`,
      description: 'Playwright 验收用 Agent',
      category_id: categoryId,
      status: 'published',
      visibility: 'tenant_visible',
      platform_type: 'mock',
      platform_config: {},
    }),
  })
}
