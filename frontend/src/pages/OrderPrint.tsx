import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrder, getSuppliers, type Order, type Supplier } from '../api'
import { ArrowRight, Printer } from 'lucide-react'

export default function OrderPrint() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [supplier, setSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    if (!orderId) return
    Promise.all([getOrder(orderId), getSuppliers()]).then(([o, suppliers]) => {
      setOrder(o)
      setSupplier(suppliers.find(s => s.id === o.supplier_id) || null)
    })
  }, [orderId])

  if (!order) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-zigo-muted">טוען...</div>
    </div>
  )

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="no-print flex gap-3 mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-zigo-muted hover:text-zigo-text transition-colors text-sm"
        >
          <ArrowRight size={16}/> חזור
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-zigo-green text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 transition"
        >
          <Printer size={16}/> הדפס
        </button>
      </div>

      {/* Print content */}
      <div className="print-area bg-white text-black p-8 rounded-xl max-w-2xl mx-auto border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold">זיגו קפה</h1>
            <p className="text-gray-500 text-sm">מערכת הזמנות ספקים</p>
          </div>
          <div className="text-left">
            <div className="text-lg font-bold">{supplier?.name || 'ספק'}</div>
            {supplier?.contact && <div className="text-sm text-gray-500">{supplier.contact}</div>}
          </div>
        </div>

        {/* Order info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-gray-500">שבוע: </span>
            <span className="font-medium">{order.week_start}</span>
          </div>
          <div>
            <span className="text-gray-500">סטטוס: </span>
            <span className={`font-medium ${order.status === 'confirmed' ? 'text-green-600' : 'text-orange-500'}`}>
              {order.status === 'confirmed' ? 'מאושר' : 'טיוטה'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">תאריך יצירה: </span>
            <span className="font-medium">{new Date(order.created_at).toLocaleDateString('he-IL')}</span>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-right p-3 font-semibold border border-gray-200">#</th>
              <th className="text-right p-3 font-semibold border border-gray-200">שם מוצר</th>
              <th className="text-center p-3 font-semibold border border-gray-200">כמות</th>
              <th className="text-left p-3 font-semibold border border-gray-200">מחיר יחידה</th>
              <th className="text-left p-3 font-semibold border border-gray-200">סה"כ</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3 border border-gray-200 text-gray-500">{i + 1}</td>
                <td className="p-3 border border-gray-200 font-medium">{item.product_name}</td>
                <td className="p-3 border border-gray-200 text-center">
                  {item.quantity} {item.product_unit || ''}
                </td>
                <td className="p-3 border border-gray-200">₪{item.unit_price.toFixed(2)}</td>
                <td className="p-3 border border-gray-200 font-semibold">₪{item.total_price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={4} className="p-3 border border-gray-200 text-left">סה"כ לתשלום</td>
              <td className="p-3 border border-gray-200 text-green-700 text-lg">₪{order.total_cost?.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {order.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 text-sm">
            <span className="font-medium">הערות: </span>{order.notes}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          הודפס מתוך מערכת הזמנות ספקים — זיגו קפה
        </div>
      </div>
    </>
  )
}
