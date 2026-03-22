import { Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Package, ShoppingCart, History, BarChart2, Truck, Menu, X, Sun, Moon, Calendar } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import NewOrder from './pages/NewOrder'
import OrderHistory from './pages/OrderHistory'
import OrderPrint from './pages/OrderPrint'
import Analytics from './pages/Analytics'
import Suppliers from './pages/Suppliers'
import CalendarPage from './pages/CalendarPage'
import ZigoLogo from './ZigoLogo'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'לוח בקרה' },
  { to: '/suppliers', icon: Truck, label: 'ספקים' },
  { to: '/catalog', icon: Package, label: 'קטלוג' },
  { to: '/order/new', icon: ShoppingCart, label: 'הזמנה חדשה' },
  { to: '/orders', icon: History, label: 'היסטוריה' },
  { to: '/analytics', icon: BarChart2, label: 'אנליטיקות' },
  { to: '/calendar', icon: Calendar, label: 'לוח שנה' },
]

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('zigo-theme') !== 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('zigo-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col bg-zigo-bg text-zigo-text transition-colors duration-300">

        {/* Top bar */}
        <header className="bg-zigo-header border-b border-zigo-border px-4 py-3 shadow-sm no-print">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {/* Logo + Name */}
            <div className="flex items-center gap-3">
              <ZigoLogo size={44} />
              <div>
                <div className="font-bold text-zigo-green text-lg leading-tight">זיגו קפה</div>
                <div className="text-xs text-zigo-muted leading-tight">מערכת הזמנות ספקים</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={() => setIsDark(v => !v)}
                className="p-2 rounded-full text-zigo-muted hover:text-zigo-green hover:bg-zigo-card transition-colors"
                title={isDark ? 'מצב בהיר' : 'מצב כהה'}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Mobile menu button */}
              <button className="md:hidden p-2 text-zigo-muted" onClick={() => setMenuOpen(v => !v)}>
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Desktop nav - circle buttons like Instagram highlights */}
          <nav className="hidden md:flex justify-center gap-4 mt-3 pb-1">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={() => `flex flex-col items-center gap-1 group transition-all`}
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                      ${isActive
                        ? 'bg-zigo-green border-zigo-green text-white shadow-md'
                        : 'bg-zigo-card border-zigo-border text-zigo-muted group-hover:border-zigo-green group-hover:text-zigo-green'
                      }`}>
                      <Icon size={20} />
                    </div>
                    <span className={`text-xs font-medium transition-colors
                      ${isActive ? 'text-zigo-green' : 'text-zigo-muted group-hover:text-zigo-green'}`}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden bg-zigo-header border-b border-zigo-border flex flex-col no-print">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-sm font-medium border-b border-zigo-border transition-colors ${
                    isActive ? 'text-zigo-green bg-zigo-card' : 'text-zigo-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all
                      ${isActive ? 'bg-zigo-green border-zigo-green text-white' : 'bg-zigo-card border-zigo-border text-zigo-muted'}`}>
                      <Icon size={16} />
                    </div>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/order/new" element={<NewOrder />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/orders/:orderId/print" element={<OrderPrint />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
