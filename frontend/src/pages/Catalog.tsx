import { useState, useEffect } from 'react'
import { getSuppliers, getProducts, getCategories, type Supplier, type Product } from '../api'
import { Package, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'

function PriceTag({ price, change }: { price?: number; change?: number }) {
  if (!price) return <span className="text-gray-400 text-sm">—</span>
  return (
    <div className="text-left">
      <div className="font-bold text-gray-800">₪{price.toFixed(2)}</div>
      {change !== undefined && change !== null && (
        <div className={`text-xs flex items-center gap-0.5 ${change > 0 ? 'text-red-500' : change < 0 ? 'text-green-600' : 'text-gray-400'}`}>
          {change > 0 ? <TrendingUp size={11}/> : change < 0 ? <TrendingDown size={11}/> : <Minus size={11}/>}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  )
}

export default function Catalog() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getSuppliers().then(s => {
      setSuppliers(s)
      if (s.length > 0) setSupplierId(s[0].id)
    })
  }, [])

  useEffect(() => {
    if (!supplierId) return
    getCategories(supplierId).then(setCategories)
    loadProducts()
  }, [supplierId])

  useEffect(() => {
    if (!supplierId) return
    const timer = setTimeout(loadProducts, 300)
    return () => clearTimeout(timer)
  }, [search, category])

  async function loadProducts() {
    if (!supplierId) return
    setLoading(true)
    try {
      const p = await getProducts({ supplier_id: supplierId, search, category })
      setProducts(p)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Package size={24}/>קטלוג מוצרים</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3">
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-32">
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute right-3 top-2.5 text-gray-400"/>
          <input className="w-full border rounded-lg pr-9 pl-3 py-2 text-sm"
            placeholder="חפש מוצר..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        {categories.length > 0 && (
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">כל הקטגוריות</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">טוען...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {supplierId ? 'לא נמצאו מוצרים — העלה קטלוג PDF בעמוד הספקים' : 'בחר ספק'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מוצר</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">קוד</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">קטגוריה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">יחידה</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">מחיר</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.code || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.unit || '—'}</td>
                  <td className="px-4 py-3">
                    <PriceTag price={p.latest_price} change={p.price_change_pct}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {products.length > 0 && (
        <p className="text-sm text-gray-400 text-center">{products.length} מוצרים</p>
      )}
    </div>
  )
}
