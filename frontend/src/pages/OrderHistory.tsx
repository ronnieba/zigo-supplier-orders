import { useState, useEffect } from 'react'
import { getSuppliers, getOrders, deleteOrder, confirmOrder, type Supplier, type Order } from '../api'
import { History, ChevronDown, ChevronUp, Trash2, CheckCircle } from 'lucide-react'

export default function OrderHistory() {
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

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2"><History size={24}/>היסטוריית הזמנות</h2>

      <div className="bg-white rounded-xl shadow p-4">
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {orders.length === 0 && <p className="text-center text-gray-400 py-8">אין הזמנות עדיין</p>}
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
            >
              <div className="flex items-center gap-3">
                {expanded === order.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                <div>
                  <div className="font-semibold">שבוע {order.week_start}</div>
                  <div className="text-sm text-gray-500">{order.items.length} פריטים</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  order.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {order.status === 'confirmed' ? 'מאושר' : 'טיוטה'}
                </span>
                <span className="font-bold text-lg">₪{order.total_cost?.toFixed(2)}</span>
              </div>
            </div>

            {expanded === order.id && (
              <div className="border-t">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right px-4 py-2 text-gray-600">מוצר</th>
                      <th className="px-4 py-2 text-gray-600 text-center">כמות</th>
                      <th className="px-4 py-2 text-gray-600 text-left">מחיר יחידה</th>
                      <th className="px-4 py-2 text-gray-600 text-left">סה"כ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map(item => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2">{item.product_name}</td>
                        <td className="px-4 py-2 text-center">{item.quantity} {item.product_unit || ''}</td>
                        <td className="px-4 py-2 text-left">₪{item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-left font-medium">₪{item.total_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {order.notes && (
                  <div className="px-4 py-2 text-sm text-gray-500 border-t">הערה: {order.notes}</div>
                )}
                <div className="flex gap-2 p-3 border-t bg-gray-50">
                  {order.status === 'draft' && (
                    <button onClick={() => confirm_(order.id)}
                      className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700">
                      <CheckCircle size={14}/> אשר הזמנה
                    </button>
                  )}
                  <button onClick={() => remove(order.id)}
                    className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-sm hover:bg-red-100">
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
