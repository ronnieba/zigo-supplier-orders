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

// --- Analytics ---
export const getDashboard = (supplier_id: string) =>
  req<Dashboard>(`/analytics/dashboard/${supplier_id}`)

export const getPriceChanges = (supplier_id: string) =>
  req<PriceChange[]>(`/analytics/price-changes/${supplier_id}`)

export const getTopProducts = (supplier_id: string) =>
  req<TopProduct[]>(`/analytics/top-products/${supplier_id}`)

// --- Types ---
export interface Supplier { id: string; name: string; contact?: string }
export interface Catalog { id: string; supplier_id: string; filename: string; parsed: boolean; products_count: number; uploaded_at: string }
export interface Product { id: string; supplier_id: string; code?: string; name: string; category?: string; unit?: string; latest_price?: number; prev_price?: number; price_change_pct?: number }
export interface PricePoint { price: number; date: string; catalog_id: string }
export interface OrderItem { id: string; product_id: string; product_name: string; product_code?: string; product_unit?: string; quantity: number; unit_price: number; total_price: number }
export interface Order { id: string; supplier_id: string; week_start: string; status: string; notes?: string; total_cost: number; created_at: string; items: OrderItem[] }
export interface OrderCreate { supplier_id: string; week_start: string; notes?: string; items: { product_id: string; quantity: number; unit_price: number }[] }
export interface Suggestion { suggested_qty: number; avg_qty: number; trend: 'up' | 'down' | 'stable'; order_count: number }
export interface Dashboard { total_orders: number; total_spent: number; weekly_chart: { week: string; total: number }[]; price_alerts: PriceChange[] }
export interface PriceChange { product_id: string; product_name: string; old_price: number; new_price: number; change_pct: number }
export interface TopProduct { product_id: string; product_name: string; times_ordered: number }
