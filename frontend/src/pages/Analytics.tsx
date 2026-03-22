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
        <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text"><BarChart2 size={24}/>אנליטיקות</h2>
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-card text-zigo-text">
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Price increases */}
        <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-500">
            <TrendingUp size={18}/>עליות מחיר ({increases.length})
          </h3>
          {increases.length === 0 ? (
            <p className="text-zigo-muted text-sm">אין עליות מחיר</p>
          ) : (
            <div className="space-y-2">
              {increases.slice(0, 10).map(p => (
                <PriceRow key={p.product_id} p={p}/>
              ))}
            </div>
          )}
        </div>

        {/* Price decreases */}
        <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-zigo-green">
            <TrendingDown size={18}/>ירידות מחיר ({decreases.length})
          </h3>
          {decreases.length === 0 ? (
            <p className="text-zigo-muted text-sm">אין ירידות מחיר</p>
          ) : (
            <div className="space-y-2">
              {decreases.slice(0, 10).map(p => (
                <PriceRow key={p.product_id} p={p}/>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-zigo-card rounded-xl shadow p-4 md:col-span-2 border border-zigo-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-zigo-text">
            <Award size={18} className="text-yellow-500"/>מוצרים מובילים
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-zigo-muted text-sm">אין נתוני הזמנות עדיין</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {topProducts.map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zigo-bg transition-colors">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                    i === 1 ? 'bg-zigo-bg text-zigo-muted' :
                    i === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-zigo-bg text-zigo-muted'
                  }`}>{i + 1}</span>
                  <span className="flex-1 font-medium text-sm text-zigo-text">{p.product_name}</span>
                  <span className="text-xs text-zigo-muted">{p.times_ordered} פעמים</span>
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
    <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-zigo-bg transition-colors">
      <span className="truncate font-medium text-zigo-text">{p.product_name}</span>
      <div className="flex items-center gap-2 mr-2 whitespace-nowrap">
        <span className="text-zigo-muted">₪{p.old_price.toFixed(2)}</span>
        <span className="text-zigo-muted">→</span>
        <span className="text-zigo-text">₪{p.new_price.toFixed(2)}</span>
        <span className={`font-bold ${up ? 'text-red-500' : 'text-zigo-green'}`}>
          {up ? '+' : ''}{p.change_pct}%
        </span>
      </div>
    </div>
  )
}
