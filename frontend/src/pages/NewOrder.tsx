import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSuppliers, getProducts, getSuggestions, createOrder, getTemplates, createTemplate, deleteTemplate,
  compareProducts,
  type Supplier, type Product, type Suggestion, type OrderTemplate, type CompareResult
} from '../api'
import { ShoppingCart, Plus, Minus, Search, CheckCircle, AlertTriangle, BookmarkPlus, BookOpen, Trash2, X } from 'lucide-react'

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().split('T')[0]
}

export default function NewOrder() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({})
  const [templates, setTemplates] = useState<OrderTemplate[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // Filter state
  const [globalSearch, setGlobalSearch] = useState(false)
  const [filterRecent, setFilterRecent] = useState(false)
  const [filterInStock, setFilterInStock] = useState(false)
  const [globalResults, setGlobalResults] = useState<CompareResult[]>([])

  // Template UI state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

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
    getTemplates(supplierId).then(setTemplates)
    setCart([])
  }, [supplierId])

  useEffect(() => {
    if (globalSearch && search.trim().length >= 2) {
      compareProducts(search.trim()).then(setGlobalResults)
    } else {
      setGlobalResults([])
    }
  }, [globalSearch, search])

  const filtered = (() => {
    if (globalSearch && search.trim().length >= 2) return [] // shown separately
    let list = products.filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    )
    if (filterRecent) {
      list = list.filter(p => {
        const sug = suggestions[p.id]
        return sug && sug.avg_qty > 0
      })
    }
    if (filterInStock) {
      list = list.filter(p => p.in_stock === true)
    }
    return list
  })()

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

  function getDeviationAlert(productId: string, qty: number): string | null {
    const sug = suggestions[productId]
    if (!sug || sug.order_count < 2 || qty === 0) return null
    const deviation = Math.abs(qty - sug.avg_qty) / (sug.avg_qty || 1)
    if (deviation > 0.5) {
      const dir = qty > sug.avg_qty ? 'גבוהה' : 'נמוכה'
      return `כמות ${dir} מהרגיל (ממוצע: ${sug.avg_qty})`
    }
    return null
  }

  async function loadTemplate(template: OrderTemplate) {
    setShowTemplates(false)
    const productMap = Object.fromEntries(products.map(p => [p.id, p]))
    const newCart: CartItem[] = []
    for (const item of template.items) {
      const product = productMap[item.product_id]
      if (product) {
        newCart.push({
          product,
          quantity: item.quantity,
          unit_price: product.latest_price || item.unit_price || 0,
        })
      }
    }
    setCart(newCart)
  }

  async function saveAsTemplate() {
    if (!templateName.trim() || cart.length === 0) return
    setSavingTemplate(true)
    try {
      const t = await createTemplate({
        supplier_id: supplierId,
        name: templateName.trim(),
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      })
      setTemplates(prev => [t, ...prev])
      setTemplateName('')
      setShowSaveTemplate(false)
    } finally {
      setSavingTemplate(false)
    }
  }

  async function removeTemplate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
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
          <div className="p-3 border-b border-zigo-border space-y-2">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-2.5 text-zigo-muted"/>
              <input className="w-full border border-zigo-border rounded-lg pr-9 pl-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
                placeholder="חפש מוצר..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={globalSearch} onChange={e => setGlobalSearch(e.target.checked)} className="rounded"/>
                <span className={globalSearch ? 'text-zigo-green font-medium' : 'text-zigo-muted'}>חיפוש בכל הספקים</span>
              </label>
              <button
                onClick={() => setFilterRecent(v => !v)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterRecent ? 'bg-zigo-green text-white border-zigo-green' : 'border-zigo-border text-zigo-muted hover:border-zigo-green hover:text-zigo-green'}`}
              >
                הוזמנו לאחרונה
              </button>
              <button
                onClick={() => setFilterInStock(v => !v)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterInStock ? 'bg-zigo-green text-white border-zigo-green' : 'border-zigo-border text-zigo-muted hover:border-zigo-green hover:text-zigo-green'}`}
              >
                במלאי
              </button>
            </div>
          </div>
          <div className="divide-y divide-zigo-border max-h-[60vh] overflow-y-auto">
            {globalSearch && search.trim().length >= 2 && globalResults.map(p => {
              const qty = getQty(p.product_id)
              return (
                <div key={p.product_id} className="flex items-center gap-3 px-4 py-3 hover:bg-zigo-bg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-zigo-text">{p.product_name}</div>
                    <div className="text-xs text-zigo-muted flex items-center gap-2">
                      {p.latest_price ? `₪${p.latest_price.toFixed(2)}` : 'אין מחיר'}
                      {p.unit && <span>· {p.unit}</span>}
                      <span className="text-zigo-green">{p.supplier_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => {
                      const prod: Product = { id: p.product_id, supplier_id: p.supplier_id, name: p.product_name, unit: p.unit, latest_price: p.latest_price }
                      setQty(prod, qty - 1)
                    }} className="w-8 h-8 rounded-full border border-zigo-border flex items-center justify-center text-zigo-text hover:bg-zigo-bg transition-colors">
                      <Minus size={14}/>
                    </button>
                    <input
                      type="number"
                      className="w-14 border border-zigo-border rounded-lg text-center py-1 text-sm bg-zigo-bg text-zigo-text"
                      value={qty || ''}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      onChange={e => {
                        const prod: Product = { id: p.product_id, supplier_id: p.supplier_id, name: p.product_name, unit: p.unit, latest_price: p.latest_price }
                        setQty(prod, parseFloat(e.target.value) || 0)
                      }}
                    />
                    <button onClick={() => {
                      const prod: Product = { id: p.product_id, supplier_id: p.supplier_id, name: p.product_name, unit: p.unit, latest_price: p.latest_price }
                      setQty(prod, qty + 1)
                    }} className="w-8 h-8 rounded-full border border-zigo-border flex items-center justify-center text-zigo-text hover:bg-zigo-bg transition-colors">
                      <Plus size={14}/>
                    </button>
                  </div>
                </div>
              )
            })}
            {!globalSearch && filtered.map(p => {
              const qty = getQty(p.id)
              const sug = suggestions[p.id]
              const alert = getDeviationAlert(p.id, qty)
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zigo-bg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-zigo-text">{p.name}</div>
                    <div className="text-xs text-zigo-muted flex items-center gap-2 flex-wrap">
                      {p.latest_price ? `₪${p.latest_price.toFixed(2)}` : 'אין מחיר'}
                      {p.unit && <span>· {p.unit}</span>}
                      {sug && sug.order_count > 0 && (
                        <span className="bg-zigo-bg text-zigo-green border border-zigo-border px-1.5 py-0.5 rounded text-xs">
                          מוצע: {sug.suggested_qty}
                        </span>
                      )}
                      {alert && (
                        <span className="flex items-center gap-1 text-orange-400 text-xs">
                          <AlertTriangle size={11}/>{alert}
                        </span>
                      )}
                    </div>
                  </div>
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
            {!globalSearch && filtered.length === 0 && (
              <p className="p-6 text-center text-zigo-muted text-sm">לא נמצאו מוצרים</p>
            )}
            {globalSearch && search.trim().length >= 2 && globalResults.length === 0 && (
              <p className="p-6 text-center text-zigo-muted text-sm">לא נמצאו תוצאות</p>
            )}
            {globalSearch && search.trim().length < 2 && (
              <p className="p-6 text-center text-zigo-muted text-sm">הקלד לפחות 2 תווים לחיפוש</p>
            )}
          </div>
        </div>

        {/* Cart summary */}
        <div className="bg-zigo-card rounded-xl shadow p-4 flex flex-col gap-3 h-fit sticky top-4 border border-zigo-border">
          <h3 className="font-bold text-zigo-text">סיכום הזמנה</h3>

          {/* Templates */}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowTemplates(v => !v); setShowSaveTemplate(false) }}
              className="flex items-center gap-1 text-xs text-zigo-muted border border-zigo-border rounded-lg px-2 py-1 hover:bg-zigo-bg transition-colors"
            >
              <BookOpen size={13}/> טען תבנית
              {templates.length > 0 && <span className="bg-zigo-green text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{templates.length}</span>}
            </button>
            <button
              onClick={() => { setShowSaveTemplate(v => !v); setShowTemplates(false) }}
              disabled={cart.length === 0}
              className="flex items-center gap-1 text-xs text-zigo-muted border border-zigo-border rounded-lg px-2 py-1 hover:bg-zigo-bg transition-colors disabled:opacity-40"
            >
              <BookmarkPlus size={13}/> שמור תבנית
            </button>
          </div>

          {/* Template list */}
          {showTemplates && (
            <div className="border border-zigo-border rounded-lg overflow-hidden">
              {templates.length === 0 ? (
                <p className="text-xs text-zigo-muted p-3">אין תבניות שמורות</p>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 border-b border-zigo-border last:border-0 hover:bg-zigo-bg transition-colors">
                    <button
                      onClick={() => loadTemplate(t)}
                      className="text-sm text-zigo-text text-right flex-1 hover:text-zigo-green"
                    >
                      {t.name}
                      <span className="text-xs text-zigo-muted mr-1">({t.items.length} פריטים)</span>
                    </button>
                    <button onClick={e => removeTemplate(t.id, e)} className="text-red-400 hover:text-red-500 p-1">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Save template form */}
          {showSaveTemplate && (
            <div className="flex gap-2">
              <input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="שם התבנית..."
                className="flex-1 text-sm border border-zigo-border rounded-lg px-2 py-1.5 bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
                onKeyDown={e => e.key === 'Enter' && saveAsTemplate()}
                autoFocus
              />
              <button onClick={saveAsTemplate} disabled={savingTemplate || !templateName.trim()}
                className="bg-zigo-green text-white rounded-lg px-3 text-xs hover:opacity-90 disabled:opacity-40">
                שמור
              </button>
              <button onClick={() => setShowSaveTemplate(false)} className="text-zigo-muted hover:text-zigo-text">
                <X size={16}/>
              </button>
            </div>
          )}

          {/* Cart items */}
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
