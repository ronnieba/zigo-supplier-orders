import { useState, useEffect } from 'react'
import { getSuppliers, getDashboard, type Supplier, type Dashboard as DashboardData } from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, ShoppingCart, AlertTriangle, DollarSign } from 'lucide-react'

export default function Dashboard() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    getSuppliers().then(s => {
      setSuppliers(s)
      if (s.length > 0) setSupplierId(s[0].id)
    })
  }, [])

  useEffect(() => {
    if (supplierId) getDashboard(supplierId).then(setData)
  }, [supplierId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">לוח בקרה</h2>
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {!data ? (
        <p className="text-center text-gray-400 py-12">
          {suppliers.length === 0 ? 'הוסף ספק ראשון בעמוד הספקים' : 'טוען...'}
        </p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={ShoppingCart} label="הזמנות" value={data.total_orders} color="blue"/>
            <StatCard icon={DollarSign} label='סה"כ הוצאות' value={`₪${data.total_spent.toFixed(0)}`} color="green"/>
            <StatCard icon={AlertTriangle} label="התראות מחיר" value={data.price_alerts.length} color="orange"/>
          </div>

          {/* Weekly chart */}
          {data.weekly_chart.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-4 text-gray-700">הוצאות שבועיות</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.weekly_chart}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }}/>
                  <YAxis tick={{ fontSize: 11 }}/>
                  <Tooltip formatter={(v: number) => [`₪${v.toFixed(2)}`, 'סה"כ']}/>
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Price alerts */}
          {data.price_alerts.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500"/>
                שינויי מחיר
              </h3>
              <div className="space-y-2">
                {data.price_alerts.slice(0, 8).map(alert => (
                  <div key={alert.product_id} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{alert.product_name}</span>
                    <div className="flex items-center gap-3 mr-3">
                      <span className="text-gray-400">₪{alert.old_price.toFixed(2)}</span>
                      <span>→</span>
                      <span className="font-medium">₪{alert.new_price.toFixed(2)}</span>
                      <span className={`font-bold ${alert.change_pct > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {alert.change_pct > 0 ? '+' : ''}{alert.change_pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22}/>
      </div>
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
}
