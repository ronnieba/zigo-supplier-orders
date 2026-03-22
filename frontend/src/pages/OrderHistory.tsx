import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSuppliers, getOrders, deleteOrder, confirmOrder, exportOrdersUrl, type Supplier, type Order } from '../api'
import { History, ChevronDown, ChevronUp, Trash2, CheckCircle, MessageCircle, Printer, Search, Download, X } from 'lucide-react'

export default function OrderHistory() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hidePrices, setHidePrices] = useState(false)

  useEffect(() => {
    getSuppliers().then(s => {
      setSuppliers(s)
      if (s.length > 0) setSupplierId(s[0].id)
    })
  }, [])

  useEffect(() => { if (supplierId) load() }, [supplierId])

  async function load() {
    setLoading(true)
    try {
      const o = await getOrders(supplierId || undefined, productSearch.trim() || undefined)
      setOrders(o)
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('למחוק הזמנה זו?')) return
    await deleteOrder(id)
    load()
  }

  async function confirm_(id: string) {
    await confirmOrder(id)
    load()
  }

  function sendWhatsApp(order: Order) {
    const supplier = suppliers.find(s => s.id === order.supplier_id)
    const supplierName = supplier?.name || 'ספק'
    const phone = supplier?.contact?.replace(/\D/g, '') || ''

    let text = `*הזמנה — ${supplierName}*\n`
    text += `שבוע: ${order.week_start}\n\n`
    for (const item of order.items) {
      if (hidePrices) {
        text += `• ${item.product_name}  ×${item.quantity}${item.product_unit ? ' ' + item.product_unit : ''}\n`
      } else {
        text += `• ${item.product_name}  ×${item.quantity}${item.product_unit ? ' ' + item.product_unit : ''}  ₪${item.total_price.toFixed(2)}\n`
      }
    }
    if (!hidePrices) text += `\n*סה"כ: ₪${order.total_cost?.toFixed(2)}*`
    if (order.notes) text += `\n\nהערות: ${order.notes}`

    const encoded = encodeURIComponent(text)
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  function handleExcel() {
    const url = exportOrdersUrl(supplierId || undefined, productSearch.trim() || undefined)
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text">
        <History size={24}/>היסטוריית הזמנות
      </h2>

      {/* Filters bar */}
      <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-zigo-muted block mb-1">ספק</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
            className="border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text">
            <option value="">כל הספקים</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-40">
          <label className="text-xs text-zigo-muted block mb-1">חיפוש מוצר</label>
          <div className="relative">
            <Search size={14} className="absolute right-3 top-2.5 text-zigo-muted"/>
            <input
              className="w-full border border-zigo-border rounded-lg pr-9 pl-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
              placeholder="שם מוצר..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
            {productSearch && (
              <button onClick={() => { setProductSearch(''); setTimeout(load, 50) }}
                className="absolute left-2 top-2 text-zigo-muted hover:text-zigo-text">
                <X size={14}/>
              </button>
            )}
          </div>
        </div>

        <button onClick={load}
          className="bg-zigo-green text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 transition">
          חפש
        </button>

        <button onClick={handleExcel}
          className="flex items-center gap-1.5 border border-zigo-border bg-zigo-bg text-zigo-text px-3 py-2 rounded-lg text-sm hover:bg-zigo-card transition">
          <Download size={15} className="text-green-500"/>
          ייצוא Excel
        </button>

        <label className="flex items-center gap-2 text-sm cursor-pointer text-zigo-muted mr-1">
          <input type="checkbox" checked={hidePrices} onChange={e => setHidePrices(e.target.checked)}
            className="accent-zigo-green"/>
          הסתר מחירים בייצוא
        </label>
      </div>

      {/* Orders list */}
      {loading ? (
        <p className="text-center text-zigo-muted py-8">טוען...</p>
      ) : (
        <div className="space-y-3">
          {orders.length === 0 && <p className="text-center text-zigo-muted py-8">אין הזמנות</p>}
          {orders.map(order => {
            const supplierName = suppliers.find(s => s.id === order.supplier_id)?.name || ''
            return (
              <div key={order.id} className="bg-zigo-card rounded-xl shadow overflow-hidden border border-zigo-border">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-zigo-bg transition-colors"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    {expanded === order.id
                      ? <ChevronUp size={18} className="text-zigo-muted"/>
                      : <ChevronDown size={18} className="text-zigo-muted"/>}
                    <div>
                      <div className="font-semibold text-zigo-text">
                        {supplierName && <span className="text-zigo-muted text-sm ml-2">{supplierName} ·</span>}
                        שבוע {order.week_start}
                      </div>
                      <div className="text-sm text-zigo-muted">{order.items.length} פריטים</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'confirmed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {order.status === 'confirmed' ? 'מאושר' : 'טיוטה'}
                    </span>
                    <span className="font-bold text-lg text-zigo-text">₪{order.total_cost?.toFixed(2)}</span>
                  </div>
                </div>

                {expanded === order.id && (
                  <div className="border-t border-zigo-border">
                    <table className="w-full text-sm">
                      <thead className="bg-zigo-bg">
                        <tr>
                          <th className="text-right px-4 py-2 text-zigo-muted font-medium">מוצר</th>
                          <th className="px-4 py-2 text-zigo-muted font-medium text-center">כמות</th>
                          <th className="px-4 py-2 text-zigo-muted font-medium text-left">מחיר יחידה</th>
                          <th className="px-4 py-2 text-zigo-muted font-medium text-left">סה"כ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map(item => (
                          <tr key={item.id} className="border-t border-zigo-border hover:bg-zigo-bg transition-colors">
                            <td className="px-4 py-2 text-zigo-text">{item.product_name}</td>
                            <td className="px-4 py-2 text-center text-zigo-text">{item.quantity} {item.product_unit || ''}</td>
                            <td className="px-4 py-2 text-left text-zigo-muted">₪{item.unit_price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-left font-medium text-zigo-text">₪{item.total_price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {order.notes && (
                      <div className="px-4 py-2.5 text-sm bg-zigo-bg/50 border-t border-zigo-border flex gap-2">
                        <span className="text-zigo-muted shrink-0">💬 הערה:</span>
                        <span className="text-zigo-text">{order.notes}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 p-3 border-t border-zigo-border bg-zigo-bg">
                      {order.status === 'draft' && (
                        <button onClick={() => confirm_(order.id)}
                          className="flex items-center gap-1 bg-zigo-green text-white px-3 py-1.5 rounded-lg text-sm hover:opacity-90 transition">
                          <CheckCircle size={14}/> אשר הזמנה
                        </button>
                      )}
                      <button onClick={() => sendWhatsApp(order)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition">
                        <MessageCircle size={14}/> WhatsApp
                      </button>
                      <button onClick={() => navigate(`/orders/${order.id}/print`)}
                        className="flex items-center gap-1 bg-zigo-card text-zigo-text border border-zigo-border px-3 py-1.5 rounded-lg text-sm hover:bg-zigo-bg transition">
                        <Printer size={14}/> הדפס PDF
                      </button>
                      <button onClick={() => remove(order.id)}
                        className="flex items-center gap-1 text-red-500 border border-red-500/40 bg-red-500/10 px-3 py-1.5 rounded-lg text-sm hover:bg-red-500/20 transition">
                        <Trash2 size={14}/> מחק
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
