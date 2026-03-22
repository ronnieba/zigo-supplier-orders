import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCart, saveCart, removeFromCart, updateCartQuantity, clearCart, createOrder, type CartItem } from '../api'
import { ShoppingCart, Trash2, CheckCircle, Package } from 'lucide-react'

export default function CartPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])

  useEffect(() => {
    const refresh = () => setItems(getCart())
    refresh()
    window.addEventListener('zigo-cart-change', refresh)
    return () => window.removeEventListener('zigo-cart-change', refresh)
  }, [])

  // Group by supplier
  const bySupplier = items.reduce((acc, item) => {
    if (!acc[item.supplierId]) acc[item.supplierId] = { name: item.supplierName, items: [] }
    acc[item.supplierId].items.push(item)
    return acc
  }, {} as Record<string, { name: string; items: CartItem[] }>)

  function getWeekStart() {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().split('T')[0]
  }

  async function submitSupplier(supplierId: string) {
    const group = bySupplier[supplierId]
    if (!group) return
    setSubmitting(supplierId)
    try {
      await createOrder({
        supplier_id: supplierId,
        week_start: getWeekStart(),
        items: group.items.map(i => ({
          product_id: i.productId,
          quantity: i.quantity,
          unit_price: i.price,
        })),
      })
      // Remove submitted items from cart
      const remaining = getCart().filter(i => i.supplierId !== supplierId)
      saveCart(remaining)
      setDone(d => [...d, supplierId])
    } catch (err) {
      alert('שגיאה בהגשת ההזמנה')
    } finally {
      setSubmitting(null)
    }
  }

  function handleQtyChange(productId: string, val: string) {
    const q = parseFloat(val)
    if (!isNaN(q)) updateCartQuantity(productId, q)
    setItems(getCart())
  }

  function handleRemove(productId: string) {
    removeFromCart(productId)
    setItems(getCart())
  }

  function handleClear() {
    if (!confirm('לנקות את כל הסל?')) return
    clearCart()
    setItems([])
  }

  if (items.length === 0 && done.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-zigo-muted">
        <ShoppingCart size={56} className="opacity-20"/>
        <p className="text-lg">הסל ריק</p>
        <button onClick={() => navigate('/catalog')}
          className="bg-zigo-green text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          עבור לקטלוג
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text">
          <ShoppingCart size={24} className="text-zigo-green"/>סל קניות
        </h2>
        {items.length > 0 && (
          <button onClick={handleClear}
            className="text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
            <Trash2 size={14}/> נקה סל
          </button>
        )}
      </div>

      {/* Done banners */}
      {done.map(sid => (
        <div key={sid} className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle size={18}/>
          הזמנה מ-{bySupplier[sid]?.name || sid} נשלחה בהצלחה!
        </div>
      ))}

      {/* Supplier groups */}
      {Object.entries(bySupplier).map(([supplierId, group]) => {
        const total = group.items.reduce((s, i) => s + i.price * i.quantity, 0)
        const isSubmitted = done.includes(supplierId)
        if (isSubmitted) return null

        return (
          <div key={supplierId} className="bg-zigo-card rounded-xl shadow border border-zigo-border overflow-hidden">
            {/* Supplier header */}
            <div className="bg-zigo-bg border-b border-zigo-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-zigo-green"/>
                <span className="font-semibold text-zigo-text">{group.name}</span>
                <span className="text-xs text-zigo-muted">({group.items.length} פריטים)</span>
              </div>
              <span className="font-bold text-zigo-green">סה"כ ₪{total.toFixed(2)}</span>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zigo-muted border-b border-zigo-border">
                    <th className="px-4 py-2 text-right font-medium">מוצר</th>
                    <th className="px-4 py-2 text-center font-medium">כמות</th>
                    <th className="px-4 py-2 text-center font-medium">מחיר יחידה</th>
                    <th className="px-4 py-2 text-center font-medium">סה"כ</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map(item => (
                    <tr key={item.productId} className="border-b border-zigo-border last:border-0 hover:bg-zigo-bg transition-colors">
                      <td className="px-4 py-2 text-zigo-text font-medium">
                        {item.productName}
                        {item.unit && <span className="text-xs text-zigo-muted mr-1">({item.unit})</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={item.quantity}
                          onChange={e => handleQtyChange(item.productId, e.target.value)}
                          className="w-20 border border-zigo-border rounded-lg px-2 py-1 text-center bg-zigo-bg text-zigo-text text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center text-zigo-muted">₪{item.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center font-semibold text-zigo-text">
                        ₪{(item.price * item.quantity).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => handleRemove(item.productId)}
                          className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Submit button */}
            <div className="px-4 py-3 border-t border-zigo-border flex justify-end">
              <button
                onClick={() => submitSupplier(supplierId)}
                disabled={submitting === supplierId}
                className="bg-zigo-green text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={16}/>
                {submitting === supplierId ? 'שולח...' : `הגש הזמנה ל-${group.name}`}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
