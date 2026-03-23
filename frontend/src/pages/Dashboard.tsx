import { useState, useEffect } from 'react'
import { getSuppliers, getDashboard, setBudget, getAllSuppliersSummary, type Supplier, type Dashboard as DashboardData, type SupplierSummary } from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ShoppingCart, AlertTriangle, DollarSign, Pencil, Check, X, LayoutGrid, User, Bell } from 'lucide-react'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

type Tab = 'single' | 'all'

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('single')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [summary, setSummary] = useState<SupplierSummary[]>([])
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)

  useEffect(() => {
    getSuppliers().then(s => {
      setSuppliers(s)
      if (s.length > 0) setSupplierId(s[0].id)
    })
    getAllSuppliersSummary().then(setSummary)
  }, [])

  useEffect(() => {
    if (supplierId && tab === 'single') {
      getDashboard(supplierId).then(d => {
        setData(d)
        setBudgetInput(d.budget ? String(d.budget.weekly_budget) : '')
      })
    }
  }, [supplierId, tab])

  useEffect(() => {
    if (tab === 'all') getAllSuppliersSummary().then(setSummary)
  }, [tab])

  async function saveBudget() {
    const val = parseFloat(budgetInput)
    if (isNaN(val) || val <= 0) return
    setSavingBudget(true)
    try {
      await setBudget(supplierId, val)
      getDashboard(supplierId).then(setData)
      setEditingBudget(false)
    } finally {
      setSavingBudget(false)
    }
  }

  const totalWeekAll = summary.reduce((s, r) => s + r.week_spent, 0)
  const totalAllTime = summary.reduce((s, r) => s + r.total_spent, 0)

  // Today's reminders
  const todayDay = new Date().getDay()
  const todayReminders = suppliers.filter(s => {
    if (!s.reminder_days) return false
    try { return JSON.parse(s.reminder_days).includes(todayDay) } catch { return false }
  })

  // Tomorrow's reminders
  const tomorrowDay = (todayDay + 1) % 7
  const tomorrowReminders = suppliers.filter(s => {
    if (!s.reminder_days) return false
    try { return JSON.parse(s.reminder_days).includes(tomorrowDay) } catch { return false }
  })

  return (
    <div className="space-y-6">
      {/* Today's reminder banner */}
      {todayReminders.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 flex items-start gap-3">
          <Bell size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"/>
          <div>
            <div className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              היום {DAY_NAMES[todayDay]} — יש להזמין מ:
            </div>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {todayReminders.map(s => (
                <span key={s.id} className="bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 text-xs px-2.5 py-1 rounded-full font-medium">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tomorrow's reminder banner */}
      {tomorrowReminders.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 flex items-start gap-3">
          <Bell size={18} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0"/>
          <div>
            <div className="font-semibold text-blue-800 dark:text-blue-300 text-sm">
              מחר {DAY_NAMES[tomorrowDay]} — יש להזמין מ:
            </div>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {tomorrowReminders.map(s => (
                <span key={s.id} className="bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-zigo-text">לוח בקרה</h2>

        {/* Tabs */}
        <div className="flex rounded-xl border border-zigo-border overflow-hidden bg-zigo-card text-sm">
          <button
            onClick={() => setTab('single')}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${
              tab === 'single' ? 'bg-zigo-green text-white' : 'text-zigo-muted hover:bg-zigo-bg'
            }`}>
            <User size={14}/> ספק בודד
          </button>
          <button
            onClick={() => setTab('all')}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${
              tab === 'all' ? 'bg-zigo-green text-white' : 'text-zigo-muted hover:bg-zigo-bg'
            }`}>
            <LayoutGrid size={14}/> כל הספקים
          </button>
        </div>
      </div>

      {/* ── ALL SUPPLIERS TAB ── */}
      {tab === 'all' && (
        <div className="space-y-4">
          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
              <div className="text-xs text-zigo-muted mb-1">הוצאות השבוע (כולל)</div>
              <div className="text-2xl font-bold text-zigo-text">₪{totalWeekAll.toFixed(0)}</div>
            </div>
            <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
              <div className="text-xs text-zigo-muted mb-1">סה"כ כל הזמנים</div>
              <div className="text-2xl font-bold text-zigo-text">₪{totalAllTime.toFixed(0)}</div>
            </div>
          </div>

          {/* Per-supplier cards */}
          {summary.length === 0 && (
            <p className="text-center text-zigo-muted py-8">אין ספקים עדיין</p>
          )}
          <div className="space-y-3">
            {summary.map(s => (
              <div key={s.supplier_id} className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-zigo-text">{s.supplier_name}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-zigo-muted">{s.total_orders} הזמנות</span>
                    <span className="font-bold text-zigo-text">₪{s.week_spent.toFixed(0)} השבוע</span>
                  </div>
                </div>
                {s.budget ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-zigo-muted">
                      <span>תקציב שבועי: ₪{s.budget.weekly_budget.toFixed(0)}</span>
                      <span className={`font-semibold ${
                        s.budget.pct_used > 100 ? 'text-red-500' :
                        s.budget.pct_used > 75 ? 'text-orange-400' : 'text-zigo-green'
                      }`}>{s.budget.pct_used}%</span>
                    </div>
                    <div className="w-full bg-zigo-bg rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          s.budget.pct_used > 100 ? 'bg-red-500' :
                          s.budget.pct_used > 75 ? 'bg-orange-400' : 'bg-zigo-green'
                        }`}
                        style={{ width: `${Math.min(s.budget.pct_used, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zigo-muted">אין תקציב מוגדר</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SINGLE SUPPLIER TAB ── */}
      {tab === 'single' && (
        <>
          <div className="flex justify-end">
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
              className="border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-card text-zigo-text">
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {!data ? (
            <p className="text-center text-zigo-muted py-12">
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

              {/* Budget card */}
              <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-zigo-text flex items-center gap-2">
                    <DollarSign size={18} className="text-zigo-green"/>
                    תקציב שבועי
                  </h3>
                  {!editingBudget && (
                    <button
                      onClick={() => setEditingBudget(true)}
                      className="text-xs text-zigo-muted hover:text-zigo-green flex items-center gap-1 transition-colors"
                    >
                      <Pencil size={13}/> {data.budget ? 'ערוך' : 'הגדר תקציב'}
                    </button>
                  )}
                </div>

                {editingBudget ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-zigo-muted text-sm">₪</span>
                    <input
                      type="number"
                      value={budgetInput}
                      onChange={e => setBudgetInput(e.target.value)}
                      placeholder="0"
                      className="flex-1 border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && saveBudget()}
                    />
                    <button onClick={saveBudget} disabled={savingBudget}
                      className="bg-zigo-green text-white rounded-lg px-3 py-2 text-sm hover:opacity-90 disabled:opacity-40 flex items-center gap-1">
                      <Check size={14}/> שמור
                    </button>
                    <button onClick={() => setEditingBudget(false)} className="text-zigo-muted hover:text-zigo-text p-2">
                      <X size={16}/>
                    </button>
                  </div>
                ) : data.budget ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zigo-muted">
                        שבוע {data.budget.current_week || 'נוכחי'}: ₪{data.budget.current_week_spent.toFixed(0)}
                      </span>
                      <span className={`font-semibold ${
                        data.budget.pct_used > 100 ? 'text-red-500' :
                        data.budget.pct_used > 75 ? 'text-orange-400' :
                        'text-zigo-green'
                      }`}>
                        {data.budget.pct_used}% מתוך ₪{data.budget.weekly_budget.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full bg-zigo-bg rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          data.budget.pct_used > 100 ? 'bg-red-500' :
                          data.budget.pct_used > 75 ? 'bg-orange-400' :
                          'bg-zigo-green'
                        }`}
                        style={{ width: `${Math.min(data.budget.pct_used, 100)}%` }}
                      />
                    </div>
                    {data.budget.pct_used > 100 && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle size={12}/> חריגה מהתקציב ב-₪{(data.budget.current_week_spent - data.budget.weekly_budget).toFixed(0)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-zigo-muted text-sm">לא הוגדר תקציב לספק זה</p>
                )}
              </div>

              {/* Weekly chart */}
              {data.weekly_chart.length > 0 && (
                <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
                  <h3 className="font-semibold mb-4 text-zigo-text">הוצאות שבועיות</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.weekly_chart}>
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--zigo-muted)' }}/>
                      <YAxis tick={{ fontSize: 11, fill: 'var(--zigo-muted)' }}/>
                      <Tooltip
                        formatter={(v: number) => [`₪${v.toFixed(2)}`, 'סה"כ']}
                        contentStyle={{
                          background: 'var(--zigo-card)',
                          border: '1px solid var(--zigo-border)',
                          color: 'var(--zigo-text)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="total" fill="var(--zigo-green)" radius={[4, 4, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Price alerts */}
              {data.price_alerts.length > 0 && (
                <div className="bg-zigo-card rounded-xl shadow p-4 border border-zigo-border">
                  <h3 className="font-semibold mb-3 text-zigo-text flex items-center gap-2">
                    <AlertTriangle size={18} className="text-orange-500"/>
                    שינויי מחיר
                  </h3>
                  <div className="space-y-2">
                    {data.price_alerts.slice(0, 8).map(alert => (
                      <div key={alert.product_id} className="flex items-center justify-between text-sm py-1 border-b border-zigo-border last:border-0">
                        <span className="font-medium truncate text-zigo-text">{alert.product_name}</span>
                        <div className="flex items-center gap-3 mr-3">
                          <span className="text-zigo-muted">₪{alert.old_price.toFixed(2)}</span>
                          <span className="text-zigo-muted">→</span>
                          <span className="font-medium text-zigo-text">₪{alert.new_price.toFixed(2)}</span>
                          <span className={`font-bold ${alert.change_pct > 0 ? 'text-red-500' : 'text-zigo-green'}`}>
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
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
  }
  return (
    <div className="bg-zigo-card rounded-xl shadow p-4 flex items-center gap-3 border border-zigo-border">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22}/>
      </div>
      <div>
        <div className="text-sm text-zigo-muted">{label}</div>
        <div className="text-2xl font-bold text-zigo-text">{value}</div>
      </div>
    </div>
  )
}
