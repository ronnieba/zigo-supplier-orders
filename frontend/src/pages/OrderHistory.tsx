import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSuppliers, getOrders, deleteOrder, confirmOrder, exportOrdersUrl, type Supplier, type Order } from '../api'
import { History, ChevronDown, ChevronUp, Trash2, CheckCircle, MessageCircle, Printer, Search, Download, X, Phone, Pencil } from 'lucide-react'

export default function OrderHistory() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [suppliersReady, setSuppliersReady] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hidePrices, setHidePrices] = useState(false)
  const [waModal, setWaModal] = useState<{ order: Order; phone: string; text: string } | null>(null)

  useEffect(() => {
    getSuppliers().then(s => {
      setSuppliers(s)
      // Default to first supplier but allow "all" (empty string) to work too
      if (s.length > 0) setSupplierId(s[0].id)
      setSuppliersReady(true)
    })
  }, [])

  // Reload orders whenever supplierId changes — but wait until suppliers are fetched
  // (avoids a spurious load on first render when supplierId='' and suppliers are empty)
  useEffect(() => { if (suppliersReady) load() }, [supplierId, suppliersReady])

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

  function formatPhoneForWA(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('0')) return '972' + digits.slice(1)
    return digits
  }

  /** Parse an ISO date string (YYYY-MM-DD) as LOCAL midnight to avoid UTC-offset bugs. */
  function parseLocalDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  /** Return ISO week number (1-53) for a given date. */
  function isoWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dow = d.getUTCDay() || 7          // Sun=0 → 7, Mon=1..Sat=6
    d.setUTCDate(d.getUTCDate() + 4 - dow)  // shift to nearest Thursday
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  }

  /** Format "2026-04-21" → "שבוע 17 · 21/04/2026" */
  function formatWeekLabel(iso: string): string {
    const date = parseLocalDate(iso)
    const week = isoWeekNumber(date)
    const dd   = String(date.getDate()).padStart(2, '0')
    const mm   = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `שבוע ${week} · ${dd}/${mm}/${yyyy}`
  }

  function buildWhatsAppText(order: Order): string {
    const supplier = suppliers.find(s => s.id === order.supplier_id)
    const supplierName = supplier?.name || 'ספק'
    let text = `*הזמנה — ${supplierName}*\n`
    text += `${formatWeekLabel(order.week_start)}\n\n`
    for (const item of order.items) {
      if (hidePrices) {
        text += `• ${item.product_name}  ×${item.quantity}${item.product_unit ? ' ' + item.product_unit : ''}\n`
      } else {
        text += `• ${item.product_name}  ×${item.quantity}${item.product_unit ? ' ' + item.product_unit : ''}  ₪${item.total_price.toFixed(2)}\n`
      }
    }
    if (!hidePrices) text += `\n*סה"כ: ₪${order.total_cost?.toFixed(2)}*`
    if (order.notes) text += `\n\nהערות: ${order.notes}`
    return text
  }

  function openWhatsAppModal(order: Order) {
    const supplier = suppliers.find(s => s.id === order.supplier_id)
    const rawPhone = supplier?.whatsapp || supplier?.contact || ''
    const phone = formatPhoneForWA(rawPhone)
    const text = buildWhatsAppText(order)
    setWaModal({ order, phone, text })
  }

  function sendWhatsApp(phone: string, text: string) {
    const encoded = encodeURIComponent(text)
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
    setWaModal(null)
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
                        {formatWeekLabel(order.week_start)}
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

                    <div className="flex flex-wrap gap-2 p-3 border-t border-zigo-border bg-zigo-bg items-center">
                      <label className="flex items-center gap-1.5 text-xs text-zigo-muted cursor-pointer">
                        <input type="checkbox" checked={hidePrices} onChange={e => setHidePrices(e.target.checked)} className="rounded"/>
                        הסתר מחירים בייצוא
                      </label>
                      <button onClick={() => navigate(`/order/new?edit=${order.id}`)}
                        className="flex items-center gap-1 bg-zigo-card text-zigo-text border border-zigo-border px-3 py-1.5 rounded-lg text-sm hover:bg-zigo-bg transition">
                        <Pencil size={14}/> ערוך
                      </button>
                      {order.status === 'draft' && (
                        <button onClick={() => confirm_(order.id)}
                          className="flex items-center gap-1 bg-zigo-green text-white px-3 py-1.5 rounded-lg text-sm hover:opacity-90 transition">
                          <CheckCircle size={14}/> אשר הזמנה
                        </button>
                      )}
                      <button onClick={() => openWhatsAppModal(order)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition">
                        <MessageCircle size={14}/> WhatsApp
                      </button>
                      <button onClick={() => navigate(`/orders/${order.id}/print${hidePrices ? '?hide_prices=1' : ''}`)}
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

      {/* WhatsApp modal */}
      {waModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setWaModal(null)}>
          <div className="bg-zigo-card rounded-xl border border-zigo-border shadow-xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zigo-text flex items-center gap-2"><Phone size={16} className="text-green-500"/> שלח WhatsApp</h3>
              <button onClick={() => setWaModal(null)} className="text-zigo-muted hover:text-zigo-text"><X size={18}/></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zigo-muted block">מספר טלפון (ניתן לעריכה)</label>
              <input
                className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text"
                value={waModal.phone}
                onChange={e => setWaModal(m => m ? { ...m, phone: e.target.value } : null)}
                placeholder="9725XXXXXXXX"
                dir="ltr"
              />
              <div className="text-xs text-zigo-muted">פורמט: 972XXXXXXXXX (ישראל)</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => sendWhatsApp(waModal.phone, waModal.text)}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 transition">
                <MessageCircle size={16}/> פתח WhatsApp
              </button>
              <button onClick={() => setWaModal(null)} className="border border-zigo-border text-zigo-muted rounded-lg px-4 py-2 text-sm hover:bg-zigo-bg transition">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
