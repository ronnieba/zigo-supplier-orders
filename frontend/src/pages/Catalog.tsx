import { useState, useEffect, useMemo } from 'react'
import { getSuppliers, getProducts, getCategories, compareProducts, addToCart, createProduct, updateProduct, deleteProduct, type Supplier, type Product, type CompareResult } from '../api'
import { Package, Search, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, SlidersHorizontal, X, GitCompare, ShoppingCart, Plus, Pencil, Trash2, CheckSquare } from 'lucide-react'

type CatalogTab = 'catalog' | 'global'

type SortKey = 'name' | 'price' | 'change'
type SortDir = 'asc' | 'desc'

function PriceTag({ price, change }: { price?: number; change?: number }) {
  if (!price) return <span className="text-zigo-muted text-sm">—</span>
  return (
    <div className="text-left">
      <div className="font-bold text-zigo-text">₪{price.toFixed(2)}</div>
      {change !== undefined && change !== null && (
        <div className={`text-xs flex items-center gap-0.5 ${change > 0 ? 'text-red-500' : change < 0 ? 'text-green-600' : 'text-zigo-muted'}`}>
          {change > 0 ? <TrendingUp size={11}/> : change < 0 ? <TrendingDown size={11}/> : <Minus size={11}/>}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  )
}

function SortBtn({ col, current, dir, onClick }: { col: SortKey; current: SortKey; dir: SortDir; onClick: () => void }) {
  const active = col === current
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 hover:text-zigo-green transition-colors">
      {active ? (dir === 'asc' ? <ChevronUp size={13}/> : <ChevronDown size={13}/>) : <ChevronDown size={13} className="opacity-30"/>}
    </button>
  )
}

interface ProductFormData {
  name: string; code: string; category: string; unit: string; price: string
}

function ProductModal({
  suppliers, supplierId, editProduct, onClose, onSaved
}: {
  suppliers: Supplier[]
  supplierId: string
  editProduct: Product | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ProductFormData>({
    name: editProduct?.name ?? '',
    code: editProduct?.code ?? '',
    category: editProduct?.category ?? '',
    unit: editProduct?.unit ?? '',
    price: editProduct?.latest_price != null ? String(editProduct.latest_price) : '',
  })
  const [selSupplierId, setSelSupplierId] = useState(supplierId || (suppliers[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם מוצר הוא שדה חובה'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
      }
      if (editProduct) {
        await updateProduct(editProduct.id, payload)
      } else {
        await createProduct({ supplier_id: selSupplierId, ...payload })
      }
      onSaved()
    } catch {
      setError('שגיאה בשמירה — נסה שנית')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof ProductFormData, type = 'text', required = false) => (
    <div className="space-y-1">
      <label className="text-xs text-zigo-muted font-medium">{label}{required && ' *'}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        step={type === 'number' ? '0.01' : undefined}
        className="w-full bg-zigo-bg border border-zigo-border rounded-lg px-3 py-2 text-sm text-zigo-text focus:outline-none focus:border-zigo-green"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-zigo-card border border-zigo-border rounded-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zigo-text text-lg">{editProduct ? 'עריכת מוצר' : 'הוספת מוצר'}</h3>
          <button onClick={onClose} className="text-zigo-muted hover:text-zigo-text"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!editProduct && (
            <div className="space-y-1">
              <label className="text-xs text-zigo-muted font-medium">ספק *</label>
              <select
                value={selSupplierId}
                onChange={e => setSelSupplierId(e.target.value)}
                className="w-full bg-zigo-bg border border-zigo-border rounded-lg px-3 py-2 text-sm text-zigo-text focus:outline-none focus:border-zigo-green"
              >
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {field('שם מוצר', 'name', 'text', true)}
          {field('קוד מוצר', 'code')}
          {field('קטגוריה', 'category')}
          <div className="space-y-1">
            <label className="text-xs text-zigo-muted font-medium">סוג יחידה</label>
            <select
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="w-full bg-zigo-bg border border-zigo-border rounded-lg px-3 py-2 text-sm text-zigo-text focus:outline-none focus:border-zigo-green"
            >
              <option value="">— לא צוין —</option>
              <optgroup label="משקל">
                <option value="ק״ג">ק״ג — לפי קילוגרם</option>
                <option value="גרם">גרם</option>
              </optgroup>
              <optgroup label="יחידות">
                <option value="יח׳">יח׳ — לפי יחידה</option>
                <option value="ארגז">ארגז</option>
                <option value="קרטון">קרטון</option>
                <option value="שקית">שקית</option>
                <option value="חבילה">חבילה</option>
                <option value="מגש">מגש</option>
                <option value="כד">כד</option>
                <option value="צנצנת">צנצנת</option>
                <option value="בקבוק">בקבוק</option>
              </optgroup>
              <optgroup label="נפח">
                <option value="ליטר">ליטר</option>
                <option value="מ&quot;ל">מ"ל</option>
              </optgroup>
            </select>
          </div>
          {field('מחיר (₪)', 'price', 'number')}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-zigo-border rounded-lg py-2 text-sm text-zigo-muted hover:text-zigo-text transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-zigo-green text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors">
              {saving ? 'שומר...' : editProduct ? 'שמור שינויים' : 'הוסף מוצר'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Catalog() {
  const [tab, setTab] = useState<CatalogTab>('catalog')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')   // '' = כל הספקים
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [compareSearch, setCompareSearch] = useState('')
  const [compareResults, setCompareResults] = useState<CompareResult[]>([])
  const [compareLoading, setCompareLoading] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalResults, setGlobalResults] = useState<CompareResult[]>([])
  const [globalLoading, setGlobalLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)

  useEffect(() => {
    getSuppliers().then(s => setSuppliers(s))
    getCategories().then(setCategories)
    loadProducts()
  }, [])

  useEffect(() => {
    if (supplierId !== undefined) {
      getCategories(supplierId || undefined).then(setCategories)
      setCategory('')
    }
  }, [supplierId])

  useEffect(() => {
    const timer = setTimeout(loadProducts, 300)
    return () => clearTimeout(timer)
  }, [search, category, supplierId, inStockOnly])

  async function loadProducts() {
    setLoading(true)
    try {
      const p = await getProducts({
        supplier_id: supplierId || undefined,
        search: search || undefined,
        category: category || undefined,
        in_stock: inStockOnly || undefined,
      })
      setProducts(p)
    } finally {
      setLoading(false)
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let list = [...products]
    const min = parseFloat(minPrice)
    const max = parseFloat(maxPrice)
    if (!isNaN(min)) list = list.filter(p => (p.latest_price ?? 0) >= min)
    if (!isNaN(max)) list = list.filter(p => (p.latest_price ?? 0) <= max)
    list.sort((a, b) => {
      let va = 0, vb = 0
      if (sortKey === 'name') return sortDir === 'asc'
        ? a.name.localeCompare(b.name, 'he')
        : b.name.localeCompare(a.name, 'he')
      if (sortKey === 'price') { va = a.latest_price ?? 0; vb = b.latest_price ?? 0 }
      if (sortKey === 'change') { va = a.price_change_pct ?? 0; vb = b.price_change_pct ?? 0 }
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return list
  }, [products, minPrice, maxPrice, sortKey, sortDir])

  const hasActiveFilters = supplierId || category || minPrice || maxPrice || search || inStockOnly

  function clearFilters() {
    setSupplierId(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setSearch(''); setInStockOnly(false)
  }

  useEffect(() => {
    if (!compareSearch.trim() || compareSearch.length < 2) {
      setCompareResults([])
      return
    }
    const timer = setTimeout(async () => {
      setCompareLoading(true)
      try {
        const r = await compareProducts(compareSearch)
        setCompareResults(r)
      } finally {
        setCompareLoading(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [compareSearch])

  // Global search debounce
  useEffect(() => {
    if (!globalSearch.trim() || globalSearch.length < 2) { setGlobalResults([]); return }
    const t = setTimeout(async () => {
      setGlobalLoading(true)
      try { setGlobalResults(await compareProducts(globalSearch)) }
      finally { setGlobalLoading(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [globalSearch])

  async function handleDeleteProduct(p: Product) {
    try {
      await deleteProduct(p.id)
      setToast(`${p.name} — נמחק`)
      setTimeout(() => setToast(null), 2000)
      loadProducts()
    } catch {
      setToast('שגיאה במחיקה')
      setTimeout(() => setToast(null), 2000)
    }
    setConfirmDelete(null)
  }

  function handleAddToCart(p: Product) {
    const supplier = suppliers.find(s => s.id === p.supplier_id)
    addToCart({
      productId: p.id, productName: p.name,
      supplierId: p.supplier_id, supplierName: supplier?.name || '',
      price: p.latest_price ?? 0, unit: p.unit,
    })
    setToast(`${p.name} — נוסף לסל`)
    setTimeout(() => setToast(null), 1500)
  }

  function handleAddCompareToCart(r: CompareResult) {
    addToCart({
      productId: r.product_id, productName: r.product_name,
      supplierId: r.supplier_id, supplierName: r.supplier_name,
      price: r.latest_price ?? 0, unit: r.unit,
    })
    setToast(`${r.product_name} — נוסף לסל`)
    setTimeout(() => setToast(null), 1500)
  }

  // Get supplier name for display in all-suppliers view
  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map(s => [s.id, s.name])), [suppliers])

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zigo-green text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
          <ShoppingCart size={14}/>{toast}
        </div>
      )}

      {/* Product modal */}
      {showModal && (
        <ProductModal
          suppliers={suppliers}
          supplierId={supplierId}
          editProduct={editingProduct}
          onClose={() => { setShowModal(false); setEditingProduct(null) }}
          onSaved={() => { setShowModal(false); setEditingProduct(null); loadProducts(); setToast(editingProduct ? 'המוצר עודכן' : 'המוצר נוסף'); setTimeout(() => setToast(null), 2000) }}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zigo-card border border-zigo-border rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-zigo-text">מחיקת מוצר</h3>
            <p className="text-sm text-zigo-muted">האם למחוק את <span className="text-zigo-text font-medium">{confirmDelete.name}</span>? פעולה זו אינה הפיכה.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-zigo-border rounded-lg py-2 text-sm text-zigo-muted hover:text-zigo-text transition-colors">
                ביטול
              </button>
              <button onClick={() => handleDeleteProduct(confirmDelete)}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 transition-colors">
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text">
          <Package size={24} className="text-zigo-green"/>קטלוג מוצרים
        </h2>
        <div className="flex gap-2">
          {/* Tab switcher */}
          <div className="flex bg-zigo-card border border-zigo-border rounded-lg p-0.5">
            <button onClick={() => setTab('catalog')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${tab === 'catalog' ? 'bg-zigo-green text-white' : 'text-zigo-muted hover:text-zigo-green'}`}>
              קטלוג
            </button>
            <button onClick={() => setTab('global')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${tab === 'global' ? 'bg-zigo-green text-white' : 'text-zigo-muted hover:text-zigo-green'}`}>
              חיפוש כולל
            </button>
          </div>
          {tab === 'catalog' && (
            <button
              onClick={() => { setEditingProduct(null); setShowModal(true) }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-zigo-green text-zigo-green hover:bg-zigo-green hover:text-white transition-colors">
              <Plus size={15}/>הוסף מוצר
            </button>
          )}
          <button
            onClick={() => { setShowCompare(v => !v); setShowFilters(false) }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${showCompare
                ? 'bg-zigo-green text-white border-zigo-green'
                : 'border-zigo-border text-zigo-muted hover:border-zigo-green hover:text-zigo-green'}`}
          >
            <GitCompare size={15}/>השווה
          </button>
          <button
            onClick={() => setInStockOnly(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${inStockOnly
                ? 'bg-zigo-green text-white border-zigo-green'
                : 'border-zigo-border text-zigo-muted hover:border-zigo-green hover:text-zigo-green'}`}
          >
            <CheckSquare size={15}/>במלאי
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
            ${showFilters || hasActiveFilters
              ? 'bg-zigo-green text-white border-zigo-green'
              : 'border-zigo-border text-zigo-muted hover:border-zigo-green hover:text-zigo-green'}`}
        >
          <SlidersHorizontal size={15}/>
          סינון
          {hasActiveFilters && <span className="bg-white text-zigo-green rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">!</span>}
        </button>
        </div>
      </div>

      {/* Compare panel */}
      {showCompare && (
        <div className="bg-zigo-card border border-zigo-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zigo-text flex items-center gap-2">
              <GitCompare size={16} className="text-zigo-green"/>השוואת מחירים בין ספקים
            </h3>
            <button onClick={() => setShowCompare(false)} className="text-zigo-muted hover:text-zigo-text">
              <X size={16}/>
            </button>
          </div>
          <div className="relative">
            <Search size={15} className="absolute right-3 top-2.5 text-zigo-muted"/>
            <input
              className="w-full bg-zigo-bg border border-zigo-border rounded-lg pr-9 pl-3 py-2 text-sm text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green"
              placeholder="הקלד שם מוצר לחיפוש (מינ׳ 2 תווים)..."
              value={compareSearch}
              onChange={e => setCompareSearch(e.target.value)}
              autoFocus
            />
          </div>
          {compareLoading && <p className="text-center text-zigo-muted text-sm py-2">מחפש...</p>}
          {!compareLoading && compareSearch.length >= 2 && compareResults.length === 0 && (
            <p className="text-center text-zigo-muted text-sm py-2">לא נמצאו מוצרים תואמים</p>
          )}
          {compareResults.length > 0 && (
            <div className="border border-zigo-border rounded-lg overflow-hidden">
              <div className="divide-y divide-zigo-border">
                {compareResults.map(r => (
                  <div key={r.product_id} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-zigo-bg transition-colors">
                    <div>
                      <div className="font-medium text-zigo-text">{r.product_name}</div>
                      <div className="text-xs text-zigo-muted">{r.supplier_name}{r.unit ? ` · ${r.unit}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.latest_price != null
                        ? <span className="font-bold text-zigo-text">₪{r.latest_price.toFixed(2)}</span>
                        : <span className="text-zigo-muted">אין מחיר</span>}
                      <button onClick={() => handleAddCompareToCart(r)}
                        className="bg-zigo-green/10 text-zigo-green border border-zigo-green/30 rounded-lg px-2 py-1 text-xs hover:bg-zigo-green hover:text-white transition-colors">
                        + סל
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global search tab */}
      {tab === 'global' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-3 text-zigo-muted"/>
            <input
              autoFocus
              className="w-full bg-zigo-card border border-zigo-border rounded-xl pr-9 pl-3 py-2.5 text-sm text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green"
              placeholder="חפש מוצר בכל הספקים (מינ׳ 2 תווים)..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
            />
          </div>
          {globalLoading && <p className="text-center text-zigo-muted text-sm py-4">מחפש...</p>}
          {!globalLoading && globalSearch.length >= 2 && globalResults.length === 0 && (
            <p className="text-center text-zigo-muted text-sm py-4">לא נמצאו תוצאות — נסה ניסוח אחר</p>
          )}
          {globalResults.length > 0 && (
            <div className="bg-zigo-card border border-zigo-border rounded-xl overflow-hidden">
              <div className="bg-zigo-bg px-4 py-2 border-b border-zigo-border text-xs text-zigo-muted">
                נמצאו {globalResults.length} תוצאות — ממוינות לפי דמיון
              </div>
              <div className="divide-y divide-zigo-border">
                {globalResults.map(r => (
                  <div key={r.product_id} className="flex items-center justify-between px-4 py-3 hover:bg-zigo-bg transition-colors">
                    <div>
                      <div className="font-medium text-zigo-text">{r.product_name}</div>
                      <div className="text-xs text-zigo-muted mt-0.5">
                        <span className="bg-zigo-green/10 text-zigo-green px-1.5 py-0.5 rounded">{r.supplier_name}</span>
                        {r.unit && <span className="mr-2">{r.unit}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.latest_price != null
                        ? <span className="font-bold text-zigo-text">₪{r.latest_price.toFixed(2)}</span>
                        : <span className="text-zigo-muted text-sm">אין מחיר</span>}
                      <button onClick={() => handleAddCompareToCart(r)}
                        className="bg-zigo-green text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90 flex items-center gap-1">
                        <ShoppingCart size={12}/>הוסף לסל
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters panel */}
      {tab === 'catalog' && <div className={`bg-zigo-card border border-zigo-border rounded-xl p-4 space-y-3 ${showFilters ? '' : 'hidden'}`}>
        <div className="flex flex-wrap gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute right-3 top-2.5 text-zigo-muted"/>
            <input
              className="w-full bg-zigo-header border border-zigo-border rounded-lg pr-9 pl-3 py-2 text-sm text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green"
              placeholder="חפש מוצר..." value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Supplier */}
          <select
            value={supplierId} onChange={e => setSupplierId(e.target.value)}
            className="bg-zigo-header border border-zigo-border rounded-lg px-3 py-2 text-sm text-zigo-text flex-1 min-w-36 focus:outline-none focus:border-zigo-green"
          >
            <option value="">כל הספקים</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Category */}
          <select
            value={category} onChange={e => setCategory(e.target.value)}
            className="bg-zigo-header border border-zigo-border rounded-lg px-3 py-2 text-sm text-zigo-text flex-1 min-w-36 focus:outline-none focus:border-zigo-green"
          >
            <option value="">כל הקטגוריות</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Price range */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-zigo-muted font-medium">טווח מחיר:</span>
          <div className="flex items-center gap-2">
            <input
              type="number" placeholder="מינ׳ ₪" value={minPrice} onChange={e => setMinPrice(e.target.value)}
              className="w-24 bg-zigo-header border border-zigo-border rounded-lg px-3 py-1.5 text-sm text-zigo-text focus:outline-none focus:border-zigo-green"
            />
            <span className="text-zigo-muted">—</span>
            <input
              type="number" placeholder="מקס׳ ₪" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              className="w-24 bg-zigo-header border border-zigo-border rounded-lg px-3 py-1.5 text-sm text-zigo-text focus:outline-none focus:border-zigo-green"
            />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors mr-auto">
              <X size={13}/>נקה הכל
            </button>
          )}
        </div>
      </div>}

      {/* Quick search bar (always visible in catalog tab) */}
      {tab === 'catalog' && !showFilters && (
        <div className="relative">
          <Search size={15} className="absolute right-3 top-2.5 text-zigo-muted"/>
          <input
            className="w-full bg-zigo-card border border-zigo-border rounded-xl pr-9 pl-3 py-2 text-sm text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green"
            placeholder="חיפוש מהיר..." value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Results count */}
      {tab === 'catalog' && (
        <div className="flex items-center justify-between text-sm text-zigo-muted">
          <span>
            {loading ? 'טוען...' : `${filtered.length} מוצרים${!supplierId ? ' (כל הספקים)' : ''}`}
          </span>
          {!supplierId && filtered.length > 0 && (
            <span className="text-xs bg-zigo-green/10 text-zigo-green px-2 py-0.5 rounded-full">
              מציג מכל הספקים
            </span>
          )}
        </div>
      )}

      {/* Products table */}
      {tab === 'catalog' && (
        <div className="bg-zigo-card border border-zigo-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zigo-muted">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zigo-muted">
              {products.length === 0 ? 'לא נמצאו מוצרים — העלה קטלוג PDF בעמוד הספקים' : 'לא נמצאו מוצרים עם הסינון הנוכחי'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zigo-header border-b border-zigo-border">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-zigo-muted">
                      <div className="flex items-center gap-1">
                        מוצר
                        <SortBtn col="name" current={sortKey} dir={sortDir} onClick={() => toggleSort('name')}/>
                      </div>
                    </th>
                    {!supplierId && (
                      <th className="text-right px-4 py-3 font-medium text-zigo-muted hidden sm:table-cell">ספק</th>
                    )}
                    <th className="text-right px-4 py-3 font-medium text-zigo-muted hidden sm:table-cell">קוד</th>
                    <th className="text-right px-4 py-3 font-medium text-zigo-muted hidden md:table-cell">קטגוריה</th>
                    <th className="text-right px-4 py-3 font-medium text-zigo-muted hidden md:table-cell">יחידה / משקל</th>
                    <th className="text-left px-4 py-3 font-medium text-zigo-muted">
                      <div className="flex items-center gap-1">
                        <SortBtn col="price" current={sortKey} dir={sortDir} onClick={() => toggleSort('price')}/>
                        מחיר
                      </div>
                    </th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id}
                      className={`border-b border-zigo-border last:border-0 transition-colors hover:bg-zigo-header ${i % 2 === 0 ? '' : 'bg-zigo-header/40'}`}>
                      <td className="px-4 py-3 font-medium text-zigo-text">{p.name}</td>
                      {!supplierId && (
                        <td className="px-4 py-3 text-zigo-muted text-xs hidden sm:table-cell">
                          <span className="bg-zigo-green/10 text-zigo-green px-2 py-0.5 rounded-full">
                            {supplierMap[p.supplier_id] || '—'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-zigo-muted hidden sm:table-cell">{p.code || '—'}</td>
                      <td className="px-4 py-3 text-zigo-muted hidden md:table-cell">{p.category || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {p.unit
                          ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              ['ק״ג','גרם'].includes(p.unit)
                                ? 'bg-orange-500/10 text-orange-400'
                                : ['ליטר','מ"ל'].includes(p.unit)
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-zigo-green/10 text-zigo-green'
                            }`}>{p.unit}</span>
                          : <span className="text-zigo-muted">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <PriceTag price={p.latest_price} change={p.price_change_pct}/>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          {p.latest_price != null && (
                            <button onClick={() => handleAddToCart(p)}
                              className="text-zigo-muted hover:text-zigo-green p-1 transition-colors" title="הוסף לסל">
                              <ShoppingCart size={15}/>
                            </button>
                          )}
                          <button onClick={() => { setEditingProduct(p); setShowModal(true) }}
                            className="text-zigo-muted hover:text-blue-400 p-1 transition-colors" title="ערוך מוצר">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => setConfirmDelete(p)}
                            className="text-zigo-muted hover:text-red-400 p-1 transition-colors" title="מחק מוצר">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
