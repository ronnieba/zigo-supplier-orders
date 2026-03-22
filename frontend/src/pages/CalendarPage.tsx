import { useState, useEffect } from 'react'
import { getOrders, getSuppliers, type Order, type Supplier } from '../api'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const HEBREW_DAYS = ['א','ב','ג','ד','ה','ו','ש']

export default function CalendarPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [current, setCurrent] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    getOrders().then(setOrders)
    getSuppliers().then(setSuppliers)
  }, [])

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]))

  // Build map: dateString -> orders
  const ordersByDate: Record<string, Order[]> = {}
  for (const o of orders) {
    if (!ordersByDate[o.week_start]) ordersByDate[o.week_start] = []
    ordersByDate[o.week_start].push(o)
  }

  const year = current.getFullYear()
  const month = current.getMonth()

  // First day of month
  const firstDay = new Date(year, month, 1)
  // Day of week for first day (0=Sun)
  let startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build grid cells (pad with nulls for leading empty cells)
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function dateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const selectedOrders = selectedDay ? (ordersByDate[selectedDay] || []) : []

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text">
        <Calendar size={24}/>לוח שנה
      </h2>

      {/* Month navigation */}
      <div className="bg-zigo-card rounded-xl shadow border border-zigo-border p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg hover:bg-zigo-bg text-zigo-muted hover:text-zigo-text transition-colors"
          >
            <ChevronLeft size={20}/>
          </button>
          <h3 className="text-lg font-bold text-zigo-text">
            {HEBREW_MONTHS[month]} {year}
          </h3>
          <button
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg hover:bg-zigo-bg text-zigo-muted hover:text-zigo-text transition-colors"
          >
            <ChevronRight size={20}/>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {HEBREW_DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-zigo-muted py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const ds = dateStr(day)
            const dayOrders = ordersByDate[ds] || []
            const isSelected = selectedDay === ds
            const isToday = ds === new Date().toISOString().split('T')[0]

            return (
              <button
                key={ds}
                onClick={() => setSelectedDay(isSelected ? null : ds)}
                className={`
                  relative flex flex-col items-center py-2 rounded-lg text-sm transition-colors
                  ${isSelected ? 'bg-zigo-green text-white' : isToday ? 'bg-zigo-bg border border-zigo-green text-zigo-green font-bold' : 'hover:bg-zigo-bg text-zigo-text'}
                `}
              >
                <span>{day}</span>
                {dayOrders.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayOrders.slice(0, 3).map((_, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-zigo-green'}`}/>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day orders */}
      {selectedDay && (
        <div className="space-y-3">
          <h3 className="font-semibold text-zigo-text">
            הזמנות לשבוע {selectedDay}
          </h3>
          {selectedOrders.length === 0 ? (
            <div className="bg-zigo-card rounded-xl border border-zigo-border p-6 text-center">
              <p className="text-zigo-muted">אין הזמנות בשבוע זה</p>
              <button
                onClick={() => navigate('/order/new')}
                className="mt-3 text-sm text-zigo-green hover:opacity-80 font-medium"
              >
                + צור הזמנה חדשה
              </button>
            </div>
          ) : (
            selectedOrders.map(order => (
              <div key={order.id} className="bg-zigo-card rounded-xl border border-zigo-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zigo-text">
                      {supplierMap[order.supplier_id]?.name || 'ספק לא ידוע'}
                    </div>
                    <div className="text-sm text-zigo-muted">{order.items.length} פריטים</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'confirmed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {order.status === 'confirmed' ? 'מאושר' : 'טיוטה'}
                    </span>
                    <span className="font-bold text-zigo-text">₪{order.total_cost?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Summary: months with most orders */}
      <div className="bg-zigo-card rounded-xl border border-zigo-border p-4">
        <h3 className="font-semibold text-zigo-text mb-3">סה"כ הזמנות החודש</h3>
        {(() => {
          const monthOrders = orders.filter(o => {
            const d = new Date(o.week_start)
            return d.getFullYear() === year && d.getMonth() === month
          })
          if (monthOrders.length === 0) return (
            <p className="text-zigo-muted text-sm">אין הזמנות בחודש זה</p>
          )
          const total = monthOrders.reduce((s, o) => s + (o.total_cost || 0), 0)
          return (
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-zigo-muted">הזמנות</div>
                <div className="text-2xl font-bold text-zigo-text">{monthOrders.length}</div>
              </div>
              <div>
                <div className="text-zigo-muted">סה"כ</div>
                <div className="text-2xl font-bold text-zigo-green">₪{total.toFixed(0)}</div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
