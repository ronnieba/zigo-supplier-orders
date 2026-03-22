import { useState, useEffect } from 'react'
import { login, getAuthStatus, setupFirstAdmin, setToken, setCurrentUser, type AppUser } from '../api'
import ZigoLogo from '../ZigoLogo'
import { UserPlus, Lock } from 'lucide-react'

type Mode = 'open' | 'legacy' | 'multi' | null

export default function LoginPage({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [mode, setMode] = useState<Mode>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSetup, setIsSetup] = useState(false)  // first-admin setup mode

  useEffect(() => {
    getAuthStatus()
      .then(({ mode: m }) => {
        setMode(m)
        if (m === 'open') {
          // Auto-login for open mode
          login('', '').then(res => {
            if (res.ok && res.token && res.user) {
              setToken(res.token)
              setCurrentUser(res.user)
              onLogin(res.user)
            }
          })
        }
      })
      .catch(() => setMode('open'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSetup) {
        // First admin setup
        if (password !== confirmPassword) { setError('הסיסמאות אינן תואמות'); return }
        if (password.length < 4) { setError('סיסמה חייבת להיות לפחות 4 תווים'); return }
        if (!fullName.trim()) { setError('נא להזין שם מלא'); return }
        const user = await setupFirstAdmin({ username: username.trim().toLowerCase(), full_name: fullName.trim(), role: 'admin', password })
        // After setup, login
        const res = await login(username.trim().toLowerCase(), password)
        if (res.ok && res.token && res.user) {
          setToken(res.token)
          setCurrentUser(res.user)
          onLogin(res.user)
        }
        return
      }

      const uname = mode === 'legacy' ? '' : username.trim().toLowerCase()
      const res = await login(uname, password)
      if (res.ok && res.token && res.user) {
        setToken(res.token)
        setCurrentUser(res.user)
        onLogin(res.user)
      } else {
        setError(mode === 'legacy' ? 'סיסמה שגויה' : 'שם משתמש או סיסמה שגויים')
      }
    } catch {
      setError('שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  if (mode === null || mode === 'open') return null  // loading / auto-login

  return (
    <div className="min-h-screen flex items-center justify-center bg-zigo-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><ZigoLogo size={64}/></div>
          <h1 className="text-2xl font-bold text-zigo-text">זיגו קפה</h1>
          <p className="text-zigo-muted text-sm mt-1">מערכת הזמנות ספקים</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zigo-card rounded-2xl shadow-lg border border-zigo-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zigo-text text-center flex items-center justify-center gap-2">
            {isSetup ? <><UserPlus size={18} className="text-zigo-green"/> הגדרת מנהל ראשון</> : <><Lock size={18} className="text-zigo-muted"/> כניסה למערכת</>}
          </h2>

          {/* Username (multi-user or setup) */}
          {(mode === 'multi' || isSetup) && (
            <div>
              <label className="block text-sm text-zigo-muted mb-1.5">שם משתמש</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus
                className="w-full border border-zigo-border rounded-xl px-4 py-3 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green transition-colors"
                placeholder="username"/>
            </div>
          )}

          {/* Full name (setup only) */}
          {isSetup && (
            <div>
              <label className="block text-sm text-zigo-muted mb-1.5">שם מלא</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                className="w-full border border-zigo-border rounded-xl px-4 py-3 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green transition-colors"
                placeholder="ישראל ישראלי"/>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm text-zigo-muted mb-1.5">סיסמה</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              autoFocus={mode === 'legacy'}
              className="w-full border border-zigo-border rounded-xl px-4 py-3 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green transition-colors"
              placeholder="הכנס סיסמה..."/>
          </div>

          {/* Confirm password (setup) */}
          {isSetup && (
            <div>
              <label className="block text-sm text-zigo-muted mb-1.5">אימות סיסמה</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full border border-zigo-border rounded-xl px-4 py-3 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green transition-colors"
                placeholder="הכנס שוב את הסיסמה..."/>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !password}
            className="w-full bg-zigo-green text-white rounded-xl py-3 font-bold hover:opacity-90 disabled:opacity-40 transition">
            {loading ? (isSetup ? 'יוצר חשבון...' : 'מתחבר...') : (isSetup ? 'צור חשבון מנהל' : 'כניסה')}
          </button>

          {/* Toggle to setup mode (only in legacy mode — offer to migrate) */}
          {mode === 'legacy' && !isSetup && (
            <button type="button" onClick={() => { setIsSetup(true); setError('') }}
              className="w-full text-xs text-zigo-muted hover:text-zigo-green transition-colors text-center py-1">
              הגדר ניהול משתמשים (מצב מתקדם)
            </button>
          )}
          {isSetup && (
            <button type="button" onClick={() => { setIsSetup(false); setError('') }}
              className="w-full text-xs text-zigo-muted hover:text-zigo-green transition-colors text-center py-1">
              ← חזור לכניסה רגילה
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
