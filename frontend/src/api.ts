const BASE = '/api'

// ─── Auth token ───────────────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem('zigo-token')
}
export function setToken(t: string) {
  localStorage.setItem('zigo-token', t)
}
export function clearToken() {
  localStorage.removeItem('zigo-token')
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const checkAuth = () => req<{ auth_required: boolean }>('/auth/check')
export const login = (password: string) =>
  req<{ ok: boolean; token: string | null; auth_required: boolean }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ password }),
  })

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const getSuppliers = () => req<Supplier[]>('/suppliers/')
export const createSupplier = (data: { name: string; contact?: string }) =>
  req<Supplier>('/suppliers/', { method: 'POST', body: JSON.stringify(data) })
export const deleteSupplier = (id: string) =>
  req(`/suppliers/${id}`, { method: 'DELETE' })
export const updateSupplier = (id: string, data: { name: string; contact?: string }) =>
  req<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// ─── Budget ───────────────────────────────────────────────────────────────────
export const getBudget = (supplier_id: string) =>
  req<Budget | null>(`/suppliers/${supplier_id}/budget`)
export const setBudget = (supplier_id: string, weekly_budget: number) =>
  req<Budget>(`/suppliers/${supplier_id}/budget`, { method: 'PUT', body: JSON.stringify({ weekly_budget }) })

// ─── Catalogs ─────────────────────────────────────────────────────────────────
export const getCatalogs = (supplier_id?: string) =>
  req<Catalog[]>(`/catalogs/${supplier_id ? `?supplier_id=${supplier_id}` : ''}`)

export const uploadCatalog = (supplier_id: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  const token = getToken()
  return fetch(`${BASE}/catalogs/upload?supplier_id=${supplier_id}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  }).then(r => r.json())
}

export const deleteCatalog = (id: string) =>
  req(`/catalogs/${id}`, { method: 'DELETE' })

// ─── Products ─────────────────────────────────────────────────────────────────
export const getProducts = (params: { supplier_id?: string; search?: string; category?: string } = {}) => {
  const qs = new URLSearchParams()
  if (params.supplier_id) qs.set('supplier_id', params.supplier_id)
  if (params.search) qs.set('search', params.search)
  if (params.category) qs.set('category', params.category)
  return req<Product[]>(`/products/?${qs}`)
}

export const getCategories = (supplier_id?: string) =>
  req<string[]>(`/products/categories${supplier_id ? `?supplier_id=${supplier_id}` : ''}`)

export const getPriceHistory = (product_id: string) =>
  req<PricePoint[]>(`/products/${product_id}/price-history`)

export const compareProducts = (name: string) =>
  req<ProductComparison[]>(`/products/compare?name=${encodeURIComponent(name)}`)

// ─── Orders ───────────────────────────────────────────────────────────────────
export const getOrders = (supplier_id?: string, product_name?: string) => {
  const qs = new URLSearchParams()
  if (supplier_id) qs.set('supplier_id', supplier_id)
  if (product_name) qs.set('product_name', product_name)
  return req<Order[]>(`/orders/?${qs}`)
}

export const getOrder = (id: string) => req<Order>(`/orders/${id}`)

export const createOrder = (data: OrderCreate) =>
  req<Order>('/orders/', { method: 'POST', body: JSON.stringify(data) })

export const confirmOrder = (id: string) =>
  req(`/orders/${id}/confirm`, { method: 'PATCH' })

export const deleteOrder = (id: string) =>
  req(`/orders/${id}`, { method: 'DELETE' })

export const getSuggestions = (supplier_id: string) =>
  req<Record<string, Suggestion>>(`/orders/suggestions/${supplier_id}`)

export function exportOrdersUrl(supplier_id?: string, product_name?: string): string {
  const qs = new URLSearchParams()
  if (supplier_id) qs.set('supplier_id', supplier_id)
  if (product_name) qs.set('product_name', product_name)
  const token = getToken()
  if (token) qs.set('_token', token)
  return `${BASE}/orders/export?${qs}`
}

// ─── Templates ────────────────────────────────────────────────────────────────
export const getTemplates = (supplier_id: string) =>
  req<OrderTemplate[]>(`/templates/?supplier_id=${supplier_id}`)
export const createTemplate = (data: { supplier_id: string; name: string; items: { product_id: string; quantity: number }[] }) =>
  req<OrderTemplate>('/templates/', { method: 'POST', body: JSON.stringify(data) })
export const getTemplate = (id: string) => req<OrderTemplate>(`/templates/${id}`)
export const deleteTemplate = (id: string) => req(`/templates/${id}`, { method: 'DELETE' })

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getDashboard = (supplier_id: string) =>
  req<Dashboard>(`/analytics/dashboard/${supplier_id}`)

export const getAllSuppliersSummary = () =>
  req<SupplierSummary[]>('/analytics/summary')

export const getPriceChanges = (supplier_id: string) =>
  req<PriceChange[]>(`/analytics/price-changes/${supplier_id}`)

export const getTopProducts = (supplier_id: string) =>
  req<TopProduct[]>(`/analytics/top-products/${supplier_id}`)

// ─── Backup ───────────────────────────────────────────────────────────────────
export async function downloadBackup(): Promise<void> {
  const token = getToken()
  const res = await fetch(`${BASE}/backup/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const data = await res.json()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date().toISOString().split('T')[0]
  a.download = `zigo-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(json: object): Promise<{ ok: boolean; added: number; skipped: number; error?: string }> {
  const token = getToken()
  const res = await fetch(`${BASE}/backup/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(json),
  })
  return res.json()
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Supplier { id: string; name: string; contact?: string }
export interface Budget { supplier_id: string; weekly_budget: number }
export interface Catalog { id: string; supplier_id: string; filename: string; parsed: boolean; products_count: number; uploaded_at: string }
export interface Product { id: string; supplier_id: string; code?: string; name: string; category?: string; unit?: string; latest_price?: number; prev_price?: number; price_change_pct?: number }
export interface PricePoint { price: number; date: string; catalog_id: string }
export interface OrderItem { id: string; product_id: string; product_name: string; product_code?: string; product_unit?: string; quantity: number; unit_price: number; total_price: number }
export interface Order { id: string; supplier_id: string; week_start: string; status: string; notes?: string; total_cost: number; created_at: string; items: OrderItem[] }
export interface OrderCreate { supplier_id: string; week_start: string; notes?: string; items: { product_id: string; quantity: number; unit_price: number }[] }
export interface Suggestion { suggested_qty: number; avg_qty: number; trend: 'up' | 'down' | 'stable'; order_count: number }
export interface BudgetInfo { weekly_budget: number; current_week_spent: number; pct_used: number; current_week: string | null }
export interface Dashboard { total_orders: number; total_spent: number; weekly_chart: { week: string; total: number }[]; price_alerts: PriceChange[]; budget: BudgetInfo | null }
export interface SupplierSummary { supplier_id: string; supplier_name: string; week_spent: number; total_spent: number; total_orders: number; budget: { weekly_budget: number; pct_used: number } | null }
export interface PriceChange { product_id: string; product_name: string; old_price: number; new_price: number; change_pct: number }
export interface TopProduct { product_id: string; product_name: string; times_ordered: number }
export interface ProductComparison {
  name: string
  min_price: number | null
  matches: { product_id: string; supplier_id: string; supplier_name: string; price: number | null; unit: string | null; code: string | null }[]
}
export interface OrderTemplateItem { id: string; product_id: string; product_name: string; product_unit?: string; quantity: number; unit_price?: number }
export interface OrderTemplate { id: string; supplier_id: string; name: string; created_at: string; items: OrderTemplateItem[] }
