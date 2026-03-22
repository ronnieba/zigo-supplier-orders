const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

// --- Suppliers ---
export const getSuppliers = () => req<Supplier[]>('/suppliers/')
export const createSupplier = (data: { name: string; contact?: string }) =>
  req<Supplier>('/suppliers/', { method: 'POST', body: JSON.stringify(data) })
export const deleteSupplier = (id: string) =>
  req(`/suppliers/${id}`, { method: 'DELETE' })
export const updateSupplier = (id: string, data: { name: string; contact?: string }) =>
  req<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// --- Budget ---
export const getBudget = (supplier_id: string) =>
  req<Budget | null>(`/suppliers/${supplier_id}/budget`)
export const setBudget = (supplier_id: string, weekly_budget: number) =>
  req<Budget>(`/suppliers/${supplier_id}/budget`, { method: 'PUT', body: JSON.stringify({ weekly_budget }) })

// --- Catalogs ---
export const getCatalogs = (supplier_id?: string) =>
  req<Catalog[]>(`/catalogs/${supplier_id ? `?supplier_id=${supplier_id}` : ''}`)

export const uploadCatalog = (supplier_id: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${BASE}/catalogs/upload?supplier_id=${supplier_id}`, {
    method: 'POST',
    body: form,
  }).then(r => r.json())
}

export const deleteCatalog = (id: string) =>
  req(`/catalogs/${id}`, { method: 'DELETE' })

// --- Products ---
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

// --- Orders ---
export const getOrders = (supplier_id?: string) =>
  req<Order[]>(`/orders/${supplier_id ? `?supplier_id=${supplier_id}` : ''}`)

export const getOrder = (id: string) => req<Order>(`/orders/${id}`)

export const createOrder = (data: OrderCreate) =>
  req<Order>('/orders/', { method: 'POST', body: JSON.stringify(data) })

export const confirmOrder = (id: string) =>
  req(`/orders/${id}/confirm`, { method: 'PATCH' })

export const deleteOrder = (id: string) =>
  req(`/orders/${id}`, { method: 'DELETE' })

export const getSuggestions = (supplier_id: string) =>
  req<Record<string, Suggestion>>(`/orders/suggestions/${supplier_id}`)

// --- Templates ---
export const getTemplates = (supplier_id: string) =>
  req<OrderTemplate[]>(`/templates/?supplier_id=${supplier_id}`)
export const createTemplate = (data: { supplier_id: string; name: string; items: { product_id: string; quantity: number }[] }) =>
  req<OrderTemplate>('/templates/', { method: 'POST', body: JSON.stringify(data) })
export const getTemplate = (id: string) => req<OrderTemplate>(`/templates/${id}`)
export const deleteTemplate = (id: string) => req(`/templates/${id}`, { method: 'DELETE' })

// --- Analytics ---
export const getDashboard = (supplier_id: string) =>
  req<Dashboard>(`/analytics/dashboard/${supplier_id}`)

export const getPriceChanges = (supplier_id: string) =>
  req<PriceChange[]>(`/analytics/price-changes/${supplier_id}`)

export const getTopProducts = (supplier_id: string) =>
  req<TopProduct[]>(`/analytics/top-products/${supplier_id}`)

// --- Types ---
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
export interface PriceChange { product_id: string; product_name: string; old_price: number; new_price: number; change_pct: number }
export interface TopProduct { product_id: string; product_name: string; times_ordered: number }
export interface ProductComparison {
  name: string
  min_price: number | null
  matches: { product_id: string; supplier_id: string; supplier_name: string; price: number | null; unit: string | null; code: string | null }[]
}
export interface OrderTemplateItem { id: string; product_id: string; product_name: string; product_unit?: string; quantity: number; unit_price?: number }
export interface OrderTemplate { id: string; supplier_id: string; name: string; created_at: string; items: OrderTemplateItem[] }
