import { useState, useEffect, useMemo } from 'react'
import { getSuppliers, getProducts, getCategories, type Supplier, type Product } from '../api'
import { Package, Search, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, SlidersHorizontal, X } from 'lucide-react'

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

export default function Catalog() {
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
  }, [search, category, supplierId])

  async function loadProducts() {
    setLoading(true)
    try {
      const p = await getProducts({
        supplier_id: supplierId || undefined,
        search: search || undefined,
        category: category || undefined,
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

  const hasActiveFilters = supplierId || category || minPrice || maxPrice || search

  function clearFilters() {
    setSupplierId(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setSearch('')
  }

  // Get supplier name for display in all-suppliers view
  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map(s => [s.id, s.name])), [suppliers])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text">
          <Package size={24} className="text-zigo-green"/>קטלוג מוצרים
        </h2>
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

      {/* Filters panel */}
      <div className={`bg-zigo-card border border-zigo-border rounded-xl p-4 space-y-3 transition-all ${showFilters ? '' : 'hidden'}`}>
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
      </div>

      {/* Quick search bar (always visible) */}
      {!showFilters && (
        <div className="relative">
          <Search size={15} className="absolute right-3 top-2.5 text-zigo-muted"/>
          <input
            className="w-full bg-zigo-card border border-zigo-border rounded-xl pr-9 pl-3 py-2 text-sm text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green"
            placeholder="חיפוש מהיר..." value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Results count */}
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

      {/* Products table */}
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
                  <th className="text-right px-4 py-3 font-medium text-zigo-muted hidden md:table-cell">יחידה</th>
                  <th className="text-left px-4 py-3 font-medium text-zigo-muted">
                    <div className="flex items-center gap-1">
                      <SortBtn col="price" current={sortKey} dir={sortDir} onClick={() => toggleSort('price')}/>
                      מחיר
                    </div>
                  </th>
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
                    <td className="px-4 py-3 text-zigo-muted hidden md:table-cell">{p.unit || '—'}</td>
                    <td className="px-4 py-3">
                      <PriceTag price={p.latest_price} change={p.price_change_pct}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
