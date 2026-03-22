import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSuppliers, getProducts, getSuggestions, createOrder, type Supplier, type Product, type Suggestion } from '../api'
import { ShoppingCart, Plus, Minus, Search, CheckCircle } from 'lucide-react'

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()        // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)  // Monday
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().split('T')[0]
}

export default function NewOrder() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({})
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getSuppliers().then(s => {
      setSuppliers(s)
      if (s.length > 0) setSupplierId(s[0].id)
    })
  }, [])

  useEffect(() => {
    if (!supplierId) return
    getProducts({ supplier_id: supplierId }).then(setProducts)
    getSuggestions(supplierId).then(setSuggestions)
    setCart([])
  }, [supplierId])

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  function setQty(product: Product, qty: number) {
    if (qty <= 0) {
      setCart(c => c.filter(i => i.product.id !== product.id))
      return
    }
    const price = product.latest_price || 0
    setCart(c => {
      const existing = c.find(i => i.product.id === product.id)
      if (existing) return c.map(i => i.product.id === product.id ? { ...i, quantity: qty } : i)
      return [...c, { product, quantity: qty, unit_price: price }]
    })
  }

  function getQty(productId: string) {
    return cart.find(i => i.product.id === productId)?.quantity || 0
  }

  const total = cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  async function submit() {
    if (cart.length === 0) return
    setSaving(true)
    try {
      await createOrder({
        supplier_id: supplierId,
        week_start: weekStart,
        notes,
        items: cart.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      })
      setDone(true)
      setTimeout(() => navigate('/orders'), 1500)
    } finally {
      setSaving(false)
    }
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <CheckCircle size={64} className="text-zigo-green"/>
      <p className="text-xl font-semibold text-zigo-green">ההזמנה נשמרה!</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text"><ShoppingCart size={24}/>הזמנה חדשה</h2>

      {/* Header controls */}
      <div className="bg-zigo-card rounded-xl shadow p-4 flex flex-wrap gap-3 border border-zigo-border">
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="border border-zigo-border rounded-lg px-3 py-2 text-sm flex-1 min-w-32 bg-zigo-bg text-zigo-text">
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div>
          <label className="text-xs text-zigo-muted block mb-1">שבוע</label>
          <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
            className="border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text"/>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Products panel */}
        <div className="lg:col-span-2 bg-zigo-card rounded-xl shadow border border-zigo-border">
          <div className="p-3 border-b border-zigo-border">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-2.5 text-zigo-muted"/>
              <input className="w-full border border-zigo-border rounded-lg pr-9 pl-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
                placeholder="חפש מוצר..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="divide-y divide-zigo-border max-h-[60vh] overflow-y-auto">
            {filtered.map(p => {
              const qty = getQty(p.id)
              const sug = suggestions[p.id]
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zigo-bg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-zigo-text">{p.name}</div>
                    <div className="text-xs text-zigo-muted flex items-center gap-2">
                      {p.latest_price ? `₪${p.latest_price.toFixed(2)}` : 'אין מחיר'}
                      {p.unit && <span>· {p.unit}</span>}
                      {sug && sug.order_count > 0 && (
                        <span className="bg-zigo-bg text-zigo-green border border-zigo-border px-1.5 py-0.5 rounded text-xs">
                          מוצע: {sug.suggested_qty}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Qty control */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(p, qty - 1)}
                      className="w-8 h-8 rounded-full border border-zigo-border flex items-center justify-center text-zigo-text hover:bg-zigo-bg transition-colors">
                      <Minus size={14}/>
                    </button>
                    <input
                      type="number"
                      className="w-14 border border-zigo-border rounded-lg text-center py-1 text-sm bg-zigo-bg text-zigo-text"
                      value={qty || ''}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      onChange={e => setQty(p, parseFloat(e.target.value) || 0)}
                    />
                    <button onClick={() => setQty(p, qty + 1)}
                      className="w-8 h-8 rounded-full border border-zigo-border flex items-center justify-center text-zigo-text hover:bg-zigo-bg transition-colors">
                      <Plus size={14}/>
                    </button>
                    {sug && sug.order_count > 0 && qty === 0 && (
                      <button onClick={() => setQty(p, sug.suggested_qty)}
                        className="text-xs text-zigo-green hover:opacity-70 px-1">+</button>
                    )}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-zigo-muted text-sm">לא נמצאו מוצרים</p>
            )}
          </div>
        </div>

        {/* Cart summary */}
        <div className="bg-zigo-card rounded-xl shadow p-4 flex flex-col gap-3 h-fit sticky top-4 border border-zigo-border">
          <h3 className="font-bold text-zigo-text">סיכום הזמנה</h3>
          {cart.length === 0 ? (
            <p className="text-zigo-muted text-sm">הוסף מוצרים</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="truncate text-zigo-text">{item.product.name}</span>
                  <span className="text-zigo-muted whitespace-nowrap mr-2">
                    {item.quantity} × ₪{item.unit_price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-zigo-border pt-2 flex justify-between font-bold text-zigo-text">
            <span>סה"כ</span>
            <span>₪{total.toFixed(2)}</span>
          </div>
          <textarea className="border border-zigo-border rounded-lg px-3 py-2 text-sm resize-none bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
            rows={2} placeholder="הערות..." value={notes} onChange={e => setNotes(e.target.value)}/>
          <button
            onClick={submit}
            disabled={cart.length === 0 || saving}
            className="w-full bg-zigo-green text-white rounded-xl py-3 font-bold hover:opacity-90 disabled:opacity-40 transition">
            {saving ? 'שומר...' : 'שמור הזמנה'}
          </button>
        </div>
      </div>
    </div>
  )
}
