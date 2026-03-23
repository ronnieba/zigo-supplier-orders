import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, History, BarChart2,
  Truck, Menu, X, Sun, Moon, Calendar, HelpCircle, Database,
  Bell, BellOff, LogOut, Users, Boxes
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import NewOrder from './pages/NewOrder'
import OrderHistory from './pages/OrderHistory'
import OrderPrint from './pages/OrderPrint'
import Analytics from './pages/Analytics'
import Suppliers from './pages/Suppliers'
import CalendarPage from './pages/CalendarPage'
import HelpPage from './pages/HelpPage'
import BackupPage from './pages/BackupPage'
import LoginPage from './pages/LoginPage'
import UsersPage from './pages/UsersPage'
import CartPage from './pages/CartPage'
import InventoryPage from './pages/InventoryPage'
import ZigoLogo from './ZigoLogo'
import { getAuthStatus, getToken, setToken, clearToken, getCurrentUser, setCurrentUser, login, getCart, type AppUser } from './api'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'לוח בקרה' },
  { to: '/suppliers', icon: Truck, label: 'ספקים' },
  { to: '/catalog', icon: Package, label: 'קטלוג' },
  { to: '/order/new', icon: ShoppingCart, label: 'הזמנה חדשה' },
  { to: '/cart', icon: ShoppingCart, label: 'סל קניות', cart: true },
  { to: '/orders', icon: History, label: 'היסטוריה' },
  { to: '/inventory', icon: Boxes, label: 'מלאי' },
  { to: '/analytics', icon: BarChart2, label: 'אנליטיקות' },
  { to: '/calendar', icon: Calendar, label: 'לוח שנה' },
  { to: '/users', icon: Users, label: 'משתמשים', adminOnly: true },
  { to: '/backup', icon: Database, label: 'גיבוי', adminOnly: true },
  { to: '/help', icon: HelpCircle, label: 'עזרה' },
]

// ─── Reminder types ────────────────────────────────────────────────────────────
interface ReminderSettings {
  enabled: boolean
  day: number      // 0=Sun … 6=Sat
  hour: number
  message: string
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const DEFAULT_REMINDER: ReminderSettings = { enabled: false, day: 0, hour: 8, message: 'זמן לבדוק הזמנות לספקים!' }

function loadReminder(): ReminderSettings {
  try { return { ...DEFAULT_REMINDER, ...JSON.parse(localStorage.getItem('zigo-reminder') || '{}') } }
  catch { return DEFAULT_REMINDER }
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('zigo-theme') !== 'light')
  const [authMode, setAuthMode] = useState<'open' | 'legacy' | 'multi' | null>(null)
  const [currentUser, setUser] = useState<AppUser | null>(getCurrentUser)
  const [reminder, setReminder] = useState<ReminderSettings>(loadReminder)
  const [showReminderPanel, setShowReminderPanel] = useState(false)
  const [reminderToast, setReminderToast] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(() => getCart().length)

  const authed = authMode === 'open' || !!currentUser

  // ── Cart badge ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setCartCount(getCart().length)
    window.addEventListener('zigo-cart-change', update)
    return () => window.removeEventListener('zigo-cart-change', update)
  }, [])

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('zigo-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // ── Auth status check ──────────────────────────────────────────────────────
  useEffect(() => {
    getAuthStatus()
      .then(({ mode }) => {
        setAuthMode(mode)
        // In open mode, auto-login so pages know the user is admin
        if (mode === 'open' && !getCurrentUser()) {
          login('', '').then(res => {
            if (res.ok && res.token && res.user) {
              setToken(res.token)
              setCurrentUser(res.user)
              setUser(res.user)
            }
          })
        }
      })
      .catch(() => setAuthMode('open'))
  }, [])

  // ── Reminder check ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!reminder.enabled) return
    const today = new Date()
    const todayDay = today.getDay()
    const todayHour = today.getHours()
    const lastShown = localStorage.getItem('zigo-reminder-last')
    const todayKey = today.toISOString().split('T')[0]
    if (lastShown === todayKey) return
    if (todayDay === reminder.day && todayHour >= reminder.hour) {
      localStorage.setItem('zigo-reminder-last', todayKey)
      setReminderToast(reminder.message)
      setTimeout(() => setReminderToast(null), 8000)
    }
  }, [reminder])

  function saveReminder(r: ReminderSettings) {
    setReminder(r)
    localStorage.setItem('zigo-reminder', JSON.stringify(r))
  }

  function handleLogout() {
    clearToken()
    setCurrentUser(null)
    setUser(null)
  }

  function handleLogin(user: AppUser) {
    setUser(user)
    setCurrentUser(user)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authMode === null) return null

  // ── Login gate ─────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <LoginPage onLogin={(user: AppUser) => handleLogin(user)}/>
      </div>
    )
  }

  const isAdmin = currentUser?.role === 'admin' || authMode === 'open'
  const visibleNav = NAV.filter(n => !('adminOnly' in n && n.adminOnly) || isAdmin)

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col bg-zigo-bg text-zigo-text transition-colors duration-300">

        {/* Top bar */}
        <header className="bg-zigo-header border-b border-zigo-border px-4 py-3 shadow-sm no-print">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZigoLogo size={44}/>
              <div>
                <div className="font-bold text-zigo-green text-lg leading-tight">זיגו קפה</div>
                <div className="text-xs text-zigo-muted leading-tight">מערכת הזמנות ספקים</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Reminder bell */}
              <div className="relative">
                <button
                  onClick={() => setShowReminderPanel(v => !v)}
                  className={`p-2 rounded-full transition-colors hover:bg-zigo-card ${
                    reminder.enabled ? 'text-zigo-green' : 'text-zigo-muted'
                  }`}
                  title="תזכורות הזמנה"
                >
                  {reminder.enabled ? <Bell size={18}/> : <BellOff size={18}/>}
                </button>

                {showReminderPanel && (
                  <div className="absolute left-0 top-10 w-72 bg-zigo-card border border-zigo-border rounded-xl shadow-xl p-4 z-50 space-y-3">
                    <div className="font-semibold text-zigo-text flex items-center gap-2">
                      <Bell size={16} className="text-zigo-green"/> תזכורת הזמנה שבועית
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={reminder.enabled}
                        onChange={e => saveReminder({ ...reminder, enabled: e.target.checked })}
                        className="accent-zigo-green"/>
                      <span className="text-zigo-text">הפעל תזכורת</span>
                    </label>
                    {reminder.enabled && (
                      <>
                        <div>
                          <label className="text-xs text-zigo-muted block mb-1">יום בשבוע</label>
                          <select value={reminder.day}
                            onChange={e => saveReminder({ ...reminder, day: +e.target.value })}
                            className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text">
                            {DAY_NAMES.map((d, i) => <option key={i} value={i}>יום {d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zigo-muted block mb-1">שעה</label>
                          <select value={reminder.hour}
                            onChange={e => saveReminder({ ...reminder, hour: +e.target.value })}
                            className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text">
                            {Array.from({ length: 24 }, (_, h) => (
                              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zigo-muted block mb-1">הודעה</label>
                          <input value={reminder.message}
                            onChange={e => saveReminder({ ...reminder, message: e.target.value })}
                            className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text"
                            placeholder="טקסט ההתראה..."/>
                        </div>
                      </>
                    )}
                    <button onClick={() => setShowReminderPanel(false)}
                      className="w-full bg-zigo-green text-white rounded-lg py-2 text-sm hover:opacity-90 transition">
                      שמור וסגור
                    </button>
                  </div>
                )}
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setIsDark(v => !v)}
                className="p-2 rounded-full text-zigo-muted hover:text-zigo-green hover:bg-zigo-card transition-colors"
                title={isDark ? 'מצב בהיר' : 'מצב כהה'}
              >
                {isDark ? <Sun size={18}/> : <Moon size={18}/>}
              </button>

              {/* Current user chip */}
              {currentUser && authMode !== 'open' && (
                <div className="hidden sm:flex items-center gap-1.5 bg-zigo-card border border-zigo-border rounded-full px-3 py-1 text-xs text-zigo-muted">
                  <span className="w-5 h-5 rounded-full bg-zigo-green/20 text-zigo-green flex items-center justify-center text-[10px] font-bold">
                    {currentUser.full_name.charAt(0)}
                  </span>
                  {currentUser.full_name}
                </div>
              )}

              {/* Logout */}
              {authMode !== 'open' && (
                <button onClick={handleLogout}
                  className="p-2 rounded-full text-zigo-muted hover:text-red-500 hover:bg-zigo-card transition-colors"
                  title="התנתק">
                  <LogOut size={18}/>
                </button>
              )}

              {/* Mobile menu */}
              <button className="md:hidden p-2 text-zigo-muted" onClick={() => setMenuOpen(v => !v)}>
                {menuOpen ? <X size={24}/> : <Menu size={24}/>}
              </button>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex justify-center gap-3 mt-3 pb-1 flex-wrap">
            {visibleNav.map((item) => {
              const { to, icon: Icon, label } = item
              const isCartItem = 'cart' in item && item.cart
              return (
                <NavLink key={to} to={to} end={to === '/'}
                  className={() => `flex flex-col items-center gap-1 group transition-all`}>
                  {({ isActive }) => (
                    <>
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                          ${isActive
                            ? 'bg-zigo-green border-zigo-green text-white shadow-md'
                            : 'bg-zigo-card border-zigo-border text-zigo-muted group-hover:border-zigo-green group-hover:text-zigo-green'
                          }`}>
                          <Icon size={20}/>
                        </div>
                        {isCartItem && cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                            {cartCount > 9 ? '9+' : cartCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-medium transition-colors
                        ${isActive ? 'text-zigo-green' : 'text-zigo-muted group-hover:text-zigo-green'}`}>
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </header>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden bg-zigo-header border-b border-zigo-border flex flex-col no-print">
            {visibleNav.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-sm font-medium border-b border-zigo-border transition-colors ${
                    isActive ? 'text-zigo-green bg-zigo-card' : 'text-zigo-muted'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all
                      ${isActive ? 'bg-zigo-green border-zigo-green text-white' : 'bg-zigo-card border-zigo-border text-zigo-muted'}`}>
                      <Icon size={16}/>
                    </div>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Reminder toast */}
        {reminderToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-zigo-green text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm no-print">
            <Bell size={18}/>
            <span className="text-sm font-medium">{reminderToast}</span>
            <button onClick={() => setReminderToast(null)} className="ml-2 opacity-70 hover:opacity-100">
              <X size={16}/>
            </button>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard/>}/>
            <Route path="/catalog" element={<Catalog/>}/>
            <Route path="/order/new" element={<NewOrder/>}/>
            <Route path="/orders" element={<OrderHistory/>}/>
            <Route path="/orders/:orderId/print" element={<OrderPrint/>}/>
            <Route path="/analytics" element={<Analytics/>}/>
            <Route path="/suppliers" element={<Suppliers/>}/>
            <Route path="/calendar" element={<CalendarPage/>}/>
            <Route path="/cart" element={<CartPage/>}/>
            <Route path="/inventory" element={<InventoryPage/>}/>
            <Route path="/users" element={<UsersPage/>}/>
            <Route path="/backup" element={<BackupPage/>}/>
            <Route path="/help" element={<HelpPage/>}/>
          </Routes>
        </main>
      </div>
    </div>
  )
}
