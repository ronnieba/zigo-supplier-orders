import { useState, useEffect } from 'react'
import { getSuppliers, getPriceChanges, getTopProducts, type Supplier, type PriceChange, type TopProduct } from '../api'
import { BarChart2, TrendingUp, TrendingDown, Award } from 'lucide-react'

export default function Analytics() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    getSuppliers().then(s => {
      setSuppliers(s)
      if (s.length > 0) setSupplierId(s[0].id)
    })
  }, [])

  useEffect(() => {
    if (!supplierId) return
    getPriceChanges(supplierId).then(setPriceChanges)
    getTopProducts(supplierId).then(setTopProducts)
  }, [supplierId])

  const increases = priceChanges.filter(p => p.change_pct > 0)
  const decreases = priceChanges.filter(p => p.change_pct < 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart2 size={24}/>אנליטיקות</h2>
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Price increases */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
            <TrendingUp size={18}/>עליות מחיר ({increases.length})
          </h3>
          {increases.length === 0 ? (
            <p className="text-gray-400 text-sm">אין עליות מחיר</p>
          ) : (
            <div className="space-y-2">
              {increases.slice(0, 10).map(p => (
                <PriceRow key={p.product_id} p={p}/>
              ))}
            </div>
          )}
        </div>

        {/* Price decreases */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-600">
            <TrendingDown size={18}/>ירידות מחיר ({decreases.length})
          </h3>
          {decreases.length === 0 ? (
            <p className="text-gray-400 text-sm">אין ירידות מחיר</p>
          ) : (
            <div className="space-y-2">
              {decreases.slice(0, 10).map(p => (
                <PriceRow key={p.product_id} p={p}/>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl shadow p-4 md:col-span-2">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Award size={18} className="text-yellow-500"/>מוצרים מובילים
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">אין נתוני הזמנות עדיין</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {topProducts.map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'
                  }`}>{i + 1}</span>
                  <span className="flex-1 font-medium text-sm">{p.product_name}</span>
                  <span className="text-xs text-gray-500">{p.times_ordered} פעמים</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PriceRow({ p }: { p: PriceChange }) {
  const up = p.change_pct > 0
  return (
    <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50">
      <span className="truncate font-medium">{p.product_name}</span>
      <div className="flex items-center gap-2 mr-2 whitespace-nowrap">
        <span className="text-gray-400">₪{p.old_price.toFixed(2)}</span>
        <span className="text-gray-400">→</span>
        <span>₪{p.new_price.toFixed(2)}</span>
        <span className={`font-bold ${up ? 'text-red-500' : 'text-green-600'}`}>
          {up ? '+' : ''}{p.change_pct}%
        </span>
      </div>
    </div>
  )
}
