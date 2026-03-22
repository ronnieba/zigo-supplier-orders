import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Package, ShoppingCart, BarChart2, Truck, Menu, X } from 'lucide-react'
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <h1 className="text-lg font-bold">הזמנות ספקים</h1>
        <button className="md:hidden" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/20' : 'hover:bg-white/10'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden bg-blue-800 text-white flex flex-col">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b border-blue-700 ${
                  isActive ? 'bg-white/20' : ''
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
  )
}
