import { useState } from 'react'
import { login, setToken } from '../api'
import ZigoLogo from '../ZigoLogo'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(password)
      if (res.ok && res.token) {
        setToken(res.token)
        onLogin()
      } else {
        setError('סיסמה שגויה')
      }
    } catch {
      setError('שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zigo-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <ZigoLogo size={64}/>
          </div>
          <h1 className="text-2xl font-bold text-zigo-text">זיגו קפה</h1>
          <p className="text-zigo-muted text-sm mt-1">מערכת הזמנות ספקים</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zigo-card rounded-2xl shadow-lg border border-zigo-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zigo-text text-center">כניסה למערכת</h2>

          <div>
            <label className="block text-sm text-zigo-muted mb-1.5">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-zigo-border rounded-xl px-4 py-3 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted focus:outline-none focus:border-zigo-green transition-colors"
              placeholder="הכנס סיסמה..."
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-zigo-green text-white rounded-xl py-3 font-bold hover:opacity-90 disabled:opacity-40 transition"
          >
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  )
}
