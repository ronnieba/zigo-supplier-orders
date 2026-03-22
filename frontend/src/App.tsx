import { Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Package, ShoppingCart, BarChart2, Truck, Menu, X, Sun, Moon } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import NewOrder from './pages/NewOrder'
import OrderHistory from './pages/OrderHistory'
import Analytics from './pages/Analytics'
import Suppliers from './pages/Suppliers'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'לוח בקרה' },
  { to: '/catalog', icon: Package, label: 'קטלוג' },
  { to: '/order/new', icon: ShoppingCart, label: 'הזמנה חדשה' },
  { to: '/orders', icon: ShoppingCart, label: 'היסטוריה' },
  { to: '/analytics', icon: BarChart2, label: 'אנליטיקות' },
  { to: '/suppliers', icon: Truck, label: 'ספקים' },
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
        <header className="bg-zigo-header border-b border-zigo-border px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zigo-green flex items-center justify-center text-white font-bold text-sm">
              ז
            </div>
            <div>
              <div className="font-bold text-zigo-green text-lg leading-tight">ציגו</div>
              <div className="text-xs text-zigo-muted leading-tight">מערכת הזמנות</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop nav */}
            <nav className="hidden md:flex gap-1">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-zigo-green text-white'
                        : 'text-zigo-muted hover:text-zigo-text hover:bg-zigo-card'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Theme toggle */}
            <button
              onClick={() => setIsDark(v => !v)}
              className="p-2 rounded-lg text-zigo-muted hover:text-zigo-green hover:bg-zigo-card transition-colors"
              title={isDark ? 'מצב בהיר' : 'מצב כהה'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-zigo-muted" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden bg-zigo-header border-b border-zigo-border flex flex-col">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b border-zigo-border ${
                    isActive ? 'text-zigo-green bg-zigo-card' : 'text-zigo-muted'
                  }`
                }
              >
                <Icon size={18} />
                {label}
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
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/suppliers" element={<Suppliers />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
