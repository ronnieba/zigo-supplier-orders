import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSuppliers, getOrders, deleteOrder, confirmOrder, type Supplier, type Order } from '../api'
import { History, ChevronDown, ChevronUp, Trash2, CheckCircle, MessageCircle, Printer } from 'lucide-react'

export default function OrderHistory() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    getSuppliers().then(s => {
      setSuppliers(s)
      if (s.length > 0) setSupplierId(s[0].id)
    })
  }, [])

  useEffect(() => { if (supplierId) load() }, [supplierId])

  async function load() {
    const o = await getOrders(supplierId)
    setOrders(o)
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
      text += `• ${item.product_name}  ×${item.quantity}${item.product_unit ? ' ' + item.product_unit : ''}  ₪${item.total_price.toFixed(2)}\n`
    }
    text += `\n*סה"כ: ₪${order.total_cost?.toFixed(2)}*`
    if (order.notes) text += `\n\nהערות: ${order.notes}`

    const encoded = encodeURIComponent(text)
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text"><History size={24}/>היסטוריית הזמנות</h2>

      <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text">
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {orders.length === 0 && <p className="text-center text-zigo-muted py-8">אין הזמנות עדיין</p>}
        {orders.map(order => (
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
                  <div className="font-semibold text-zigo-text">שבוע {order.week_start}</div>
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
                  <div className="px-4 py-2 text-sm text-zigo-muted border-t border-zigo-border">הערה: {order.notes}</div>
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
        ))}
      </div>
    </div>
  )
}
