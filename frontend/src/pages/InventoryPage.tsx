import { useState, useEffect } from 'react'
import { getSuppliers, getInventory, setInventory, deleteInventory, getProducts, type Supplier, type InventoryItem } from '../api'
import { Package, AlertTriangle, Plus, Trash2, Check, X, Search } from 'lucide-react'

export default function InventoryPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Record<string, { current_qty: string; min_qty: string }>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [addProductId, setAddProductId] = useState('')
  const [addCurrent, setAddCurrent] = useState('')
  const [addMin, setAddMin] = useState('')

  useEffect(() => {
    getSuppliers().then(s => { setSuppliers(s); if (s.length > 0) setSupplierId(s[0].id) })
  }, [])

  useEffect(() => { load() }, [supplierId, lowOnly])
  useEffect(() => { if (supplierId) getProducts({ supplier_id: supplierId }).then(setProducts) }, [supplierId])

  async function load() {
    setLoading(true)
    try {
      const data = await getInventory(supplierId || undefined, lowOnly)
      setItems(data)
    } finally { setLoading(false) }
  }

  function startEdit(item: InventoryItem) {
    setEditing(e => ({ ...e, [item.product_id]: { current_qty: String(item.current_qty), min_qty: String(item.min_qty) } }))
  }

  async function saveEdit(item: InventoryItem) {
    const e = editing[item.product_id]
    if (!e) return
    await setInventory(item.product_id, { current_qty: parseFloat(e.current_qty) || 0, min_qty: parseFloat(e.min_qty) || 0, unit: item.unit })
    setEditing(prev => { const n = { ...prev }; delete n[item.product_id]; return n })
    load()
  }

  async function removeItem(product_id: string) {
    if (!confirm('להסיר מהמלאי?')) return
    await deleteInventory(product_id)
    load()
  }

  async function addItem() {
    if (!addProductId || !addCurrent) return
    await setInventory(addProductId, { current_qty: parseFloat(addCurrent) || 0, min_qty: parseFloat(addMin) || 0 })
    setShowAdd(false); setAddProductId(''); setAddCurrent(''); setAddMin('')
    load()
  }

  const filtered = items.filter(i => !search || i.product_name.includes(search))
  const lowCount = items.filter(i => i.low_stock).length
  const untrackedProducts = products.filter(p => !items.find(i => i.product_id === p.id))

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text">
        <Package size={24}/> ניהול מלאי
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zigo-card rounded-xl border border-zigo-border p-4 text-center">
          <div className="text-2xl font-bold text-zigo-text">{items.length}</div>
          <div className="text-sm text-zigo-muted">מוצרים במעקב</div>
        </div>
        <div className={`rounded-xl border p-4 text-center ${lowCount > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-zigo-card border-zigo-border'}`}>
          <div className={`text-2xl font-bold ${lowCount > 0 ? 'text-red-600' : 'text-zigo-text'}`}>{lowCount}</div>
          <div className="text-sm text-zigo-muted">מלאי נמוך</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zigo-card rounded-xl border border-zigo-border p-3 flex flex-wrap gap-3 items-center">
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text">
          <option value="">כל הספקים</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute right-3 top-2.5 text-zigo-muted"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש מוצר..."
            className="w-full pr-8 pl-3 py-2 border border-zigo-border rounded-lg text-sm bg-zigo-bg text-zigo-text"/>
        </div>
        <label className="flex items-center gap-2 text-sm text-zigo-text cursor-pointer">
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} className="rounded"/>
          מלאי נמוך בלבד
        </label>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-zigo-accent text-white px-3 py-2 rounded-lg text-sm font-medium bg-zigo-green">
          <Plus size={14}/> הוסף מוצר
        </button>
      </div>

      {/* Add product panel */}
      {showAdd && (
        <div className="bg-zigo-card rounded-xl border border-zigo-border p-4 space-y-3">
          <div className="font-semibold text-zigo-text text-sm">הוספת מוצר למלאי</div>
          <div className="flex flex-wrap gap-3 items-end">
            <select value={addProductId} onChange={e => setAddProductId(e.target.value)}
              className="flex-1 min-w-[200px] border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text">
              <option value="">בחר מוצר...</option>
              {untrackedProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="כמות נוכחית" value={addCurrent} onChange={e => setAddCurrent(e.target.value)}
              className="w-32 border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text"/>
            <input type="number" placeholder="מינימום" value={addMin} onChange={e => setAddMin(e.target.value)}
              className="w-28 border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text"/>
            <button onClick={addItem} className="bg-zigo-green text-white px-4 py-2 rounded-lg text-sm flex items-center"><Check size={14}/></button>
            <button onClick={() => setShowAdd(false)} className="bg-gray-200 dark:bg-gray-700 text-zigo-text px-3 py-2 rounded-lg text-sm flex items-center"><X size={14}/></button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-zigo-muted">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-zigo-muted">אין פריטים במלאי. לחץ "הוסף מוצר" כדי להתחיל.</div>
      ) : (
        <div className="bg-zigo-card rounded-xl border border-zigo-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zigo-bg border-b border-zigo-border">
                <tr>
                  <th className="text-right px-4 py-3 text-zigo-muted font-medium">מוצר</th>
                  <th className="text-right px-3 py-3 text-zigo-muted font-medium">ספק</th>
                  <th className="text-center px-3 py-3 text-zigo-muted font-medium">כמות נוכחית</th>
                  <th className="text-center px-3 py-3 text-zigo-muted font-medium">מינימום</th>
                  <th className="text-center px-3 py-3 text-zigo-muted font-medium">יחידה</th>
                  <th className="text-center px-3 py-3 text-zigo-muted font-medium">סטטוס</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zigo-border">
                {filtered.map(item => {
                  const ed = editing[item.product_id]
                  return (
                    <tr key={item.product_id} className={`${item.low_stock ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-4 py-3 font-medium text-zigo-text">{item.product_name}</td>
                      <td className="px-3 py-3 text-zigo-muted text-xs">{item.supplier_name}</td>
                      <td className="px-3 py-3 text-center">
                        {ed ? (
                          <input type="number" value={ed.current_qty}
                            onChange={e => setEditing(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], current_qty: e.target.value } }))}
                            className="w-20 text-center border border-zigo-border rounded px-2 py-1 text-sm bg-zigo-bg text-zigo-text"/>
                        ) : (
                          <span className="font-mono text-zigo-text">{item.current_qty}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {ed ? (
                          <input type="number" value={ed.min_qty}
                            onChange={e => setEditing(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], min_qty: e.target.value } }))}
                            className="w-20 text-center border border-zigo-border rounded px-2 py-1 text-sm bg-zigo-bg text-zigo-text"/>
                        ) : (
                          <span className="font-mono text-zigo-muted">{item.min_qty}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-zigo-muted text-xs">{item.unit}</td>
                      <td className="px-3 py-3 text-center">
                        {item.low_stock
                          ? <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle size={12}/>נמוך</span>
                          : <span className="text-green-600 text-xs">✓ תקין</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {ed ? (
                            <>
                              <button onClick={() => saveEdit(item)} className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1.5 rounded"><Check size={14}/></button>
                              <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[item.product_id]; return n })} className="text-zigo-muted hover:bg-zigo-bg p-1.5 rounded"><X size={14}/></button>
                            </>
                          ) : (
                            <button onClick={() => startEdit(item)} className="text-zigo-muted hover:text-zigo-text hover:bg-zigo-bg p-1.5 rounded text-xs">ערוך</button>
                          )}
                          <button onClick={() => removeItem(item.product_id)} className="text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
