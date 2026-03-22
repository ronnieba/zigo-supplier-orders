import { useState, useEffect } from 'react'
import {
  getUsers, createUser, updateUser, deleteUser, resetPassword, getCurrentUser,
  type AppUser
} from '../api'
import {
  Users, UserPlus, Pencil, Trash2, KeyRound, Check, X,
  ShieldCheck, Eye, UserCheck, UserX, AlertTriangle
} from 'lucide-react'

const ROLE_LABEL: Record<string, string> = { admin: 'מנהל', viewer: 'צפייה בלבד' }
const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-zigo-green/20 text-zigo-green',
  viewer: 'bg-blue-500/20 text-blue-400',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[role] || 'bg-zigo-bg text-zigo-muted'}`}>
      {role === 'admin' ? <ShieldCheck size={11}/> : <Eye size={11}/>}
      {ROLE_LABEL[role] || role}
    </span>
  )
}

interface EditState {
  full_name: string
  role: string
}

interface PasswordState {
  newPw: string
  confirmPw: string
  currentPw: string
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function UsersPage() {
  const me = getCurrentUser()
  const isAdmin = me?.role === 'admin'

  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ full_name: '', role: 'viewer' })
  const [pwId, setPwId] = useState<string | null>(null)
  const [pwState, setPwState] = useState<PasswordState>({ newPw: '', confirmPw: '', currentPw: '' })
  const [pwError, setPwError] = useState('')
  const [saving, setSaving] = useState(false)

  // Add form state
  const [newUser, setNewUser] = useState({ username: '', full_name: '', role: 'viewer', password: '', confirmPassword: '' })
  const [addError, setAddError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setUsers(await getUsers()) }
    finally { setLoading(false) }
  }

  // ── Add user ──────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (newUser.password !== newUser.confirmPassword) { setAddError('הסיסמאות אינן תואמות'); return }
    if (newUser.password.length < 4) { setAddError('סיסמה חייבת להיות לפחות 4 תווים'); return }
    setSaving(true)
    try {
      await createUser({
        username: newUser.username.trim().toLowerCase(),
        full_name: newUser.full_name.trim(),
        role: newUser.role,
        password: newUser.password,
      })
      setNewUser({ username: '', full_name: '', role: 'viewer', password: '', confirmPassword: '' })
      setShowAddForm(false)
      load()
    } catch (e: any) {
      setAddError(e.message || 'שגיאה ביצירת משתמש')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit(u: AppUser) {
    setEditId(u.id)
    setEditState({ full_name: u.full_name, role: u.role })
    setPwId(null)
  }

  async function saveEdit(userId: string) {
    setSaving(true)
    try {
      await updateUser(userId, { full_name: editState.full_name, role: editState.role })
      setEditId(null)
      load()
    } finally { setSaving(false) }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function toggleActive(u: AppUser) {
    if (u.id === me?.id) return
    await updateUser(u.id, { active: !u.active })
    load()
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(u: AppUser) {
    if (!confirm(`למחוק את המשתמש "${u.full_name}" (${u.username})?\nפעולה זו אינה ניתנת לביטול.`)) return
    try {
      await deleteUser(u.id)
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────

  async function handleResetPw(userId: string) {
    setPwError('')
    if (pwState.newPw !== pwState.confirmPw) { setPwError('הסיסמאות אינן תואמות'); return }
    if (pwState.newPw.length < 4) { setPwError('סיסמה חייבת להיות לפחות 4 תווים'); return }
    setSaving(true)
    try {
      const isSelf = userId === me?.id
      await resetPassword(userId, {
        new_password: pwState.newPw,
        ...(isSelf && !isAdmin ? { current_password: pwState.currentPw } : {}),
      })
      setPwId(null)
      setPwState({ newPw: '', confirmPw: '', currentPw: '' })
    } catch (e: any) {
      setPwError(e.message || 'שגיאה בשינוי סיסמה')
    } finally { setSaving(false) }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-zigo-muted">
        <AlertTriangle size={40} className="text-orange-400"/>
        <p>דף זה מיועד למנהלים בלבד</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zigo-text flex items-center gap-2">
          <Users size={24}/> ניהול משתמשים
        </h2>
        <button
          onClick={() => { setShowAddForm(v => !v); setAddError('') }}
          className="flex items-center gap-2 bg-zigo-green text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
        >
          <UserPlus size={16}/> הוסף משתמש
        </button>
      </div>

      {/* ── Add user form ────────────────────────────────────────────────── */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-zigo-card rounded-xl border border-zigo-green/40 p-5 space-y-3">
          <h3 className="font-semibold text-zigo-text flex items-center gap-2">
            <UserPlus size={16} className="text-zigo-green"/> משתמש חדש
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zigo-muted block mb-1">שם משתמש (לכניסה)</label>
              <input required value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
                placeholder="username" autoFocus/>
            </div>
            <div>
              <label className="text-xs text-zigo-muted block mb-1">שם מלא</label>
              <input required value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
                placeholder="ישראל ישראלי"/>
            </div>
            <div>
              <label className="text-xs text-zigo-muted block mb-1">תפקיד</label>
              <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text">
                <option value="viewer">צפייה בלבד</option>
                <option value="admin">מנהל</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zigo-muted block mb-1">סיסמה</label>
              <input required type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
                placeholder="לפחות 4 תווים"/>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zigo-muted block mb-1">אימות סיסמה</label>
              <input required type="password" value={newUser.confirmPassword} onChange={e => setNewUser(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
                placeholder="הכנס שוב"/>
            </div>
          </div>
          {addError && <p className="text-red-500 text-sm">{addError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-zigo-green text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 flex items-center gap-1">
              <Check size={14}/> {saving ? 'שומר...' : 'צור משתמש'}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)}
              className="border border-zigo-border text-zigo-muted px-4 py-2 rounded-lg text-sm hover:bg-zigo-bg">
              ביטול
            </button>
          </div>
        </form>
      )}

      {/* ── Role legend ──────────────────────────────────────────────────── */}
      <div className="flex gap-4 text-xs text-zigo-muted">
        <div className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-zigo-green"/> מנהל — גישה מלאה</div>
        <div className="flex items-center gap-1.5"><Eye size={13} className="text-blue-400"/> צפייה בלבד — קריאה ללא עריכה</div>
      </div>

      {/* ── Users list ───────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-center text-zigo-muted py-8">טוען...</p>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className={`bg-zigo-card rounded-xl border p-4 space-y-3 transition-all ${
              !u.active ? 'opacity-50 border-zigo-border' : 'border-zigo-border'
            } ${u.id === me?.id ? 'border-zigo-green/40' : ''}`}>

              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    u.role === 'admin' ? 'bg-zigo-green/20 text-zigo-green' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {u.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-zigo-text flex items-center gap-2">
                      {u.full_name}
                      {u.id === me?.id && <span className="text-xs text-zigo-muted">(אתה)</span>}
                    </div>
                    <div className="text-xs text-zigo-muted">@{u.username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RoleBadge role={u.role}/>
                  {!u.active && <span className="text-xs text-red-500 font-medium">מושבת</span>}
                </div>
              </div>

              {/* Edit row */}
              {editId === u.id ? (
                <div className="border-t border-zigo-border pt-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zigo-muted block mb-1">שם מלא</label>
                      <input value={editState.full_name} onChange={e => setEditState(s => ({ ...s, full_name: e.target.value }))}
                        className="w-full border border-zigo-border rounded-lg px-3 py-1.5 text-sm bg-zigo-bg text-zigo-text" autoFocus/>
                    </div>
                    <div>
                      <label className="text-xs text-zigo-muted block mb-1">תפקיד</label>
                      <select value={editState.role} onChange={e => setEditState(s => ({ ...s, role: e.target.value }))}
                        className="w-full border border-zigo-border rounded-lg px-3 py-1.5 text-sm bg-zigo-bg text-zigo-text">
                        <option value="viewer">צפייה בלבד</option>
                        <option value="admin">מנהל</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(u.id)} disabled={saving}
                      className="bg-zigo-green text-white px-3 py-1.5 rounded-lg text-xs hover:opacity-90 disabled:opacity-40 flex items-center gap-1">
                      <Check size={12}/> שמור
                    </button>
                    <button onClick={() => setEditId(null)} className="border border-zigo-border text-zigo-muted px-3 py-1.5 rounded-lg text-xs hover:bg-zigo-bg">
                      ביטול
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Password reset row */}
              {pwId === u.id ? (
                <div className="border-t border-zigo-border pt-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zigo-muted block mb-1">סיסמה חדשה</label>
                      <input type="password" value={pwState.newPw} onChange={e => setPwState(s => ({ ...s, newPw: e.target.value }))}
                        className="w-full border border-zigo-border rounded-lg px-3 py-1.5 text-sm bg-zigo-bg text-zigo-text" autoFocus/>
                    </div>
                    <div>
                      <label className="text-xs text-zigo-muted block mb-1">אימות</label>
                      <input type="password" value={pwState.confirmPw} onChange={e => setPwState(s => ({ ...s, confirmPw: e.target.value }))}
                        className="w-full border border-zigo-border rounded-lg px-3 py-1.5 text-sm bg-zigo-bg text-zigo-text"/>
                    </div>
                  </div>
                  {pwError && <p className="text-red-500 text-xs">{pwError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => handleResetPw(u.id)} disabled={saving}
                      className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs hover:opacity-90 disabled:opacity-40 flex items-center gap-1">
                      <KeyRound size={12}/> {saving ? 'שומר...' : 'שנה סיסמה'}
                    </button>
                    <button onClick={() => { setPwId(null); setPwError('') }}
                      className="border border-zigo-border text-zigo-muted px-3 py-1.5 rounded-lg text-xs hover:bg-zigo-bg">
                      ביטול
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Action buttons */}
              {editId !== u.id && pwId !== u.id && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-zigo-border">
                  <button onClick={() => { startEdit(u); setPwId(null) }}
                    className="flex items-center gap-1 text-xs text-zigo-muted border border-zigo-border px-2.5 py-1.5 rounded-lg hover:bg-zigo-bg transition-colors">
                    <Pencil size={12}/> ערוך
                  </button>
                  <button onClick={() => { setPwId(u.id); setPwState({ newPw: '', confirmPw: '', currentPw: '' }); setPwError(''); setEditId(null) }}
                    className="flex items-center gap-1 text-xs text-zigo-muted border border-zigo-border px-2.5 py-1.5 rounded-lg hover:bg-zigo-bg transition-colors">
                    <KeyRound size={12}/> שנה סיסמה
                  </button>
                  {u.id !== me?.id && (
                    <>
                      <button onClick={() => toggleActive(u)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          u.active
                            ? 'text-orange-400 border-orange-400/40 hover:bg-orange-400/10'
                            : 'text-zigo-green border-zigo-green/40 hover:bg-zigo-green/10'
                        }`}>
                        {u.active ? <><UserX size={12}/> השבת</> : <><UserCheck size={12}/> הפעל</>}
                      </button>
                      <button onClick={() => handleDelete(u)}
                        className="flex items-center gap-1 text-xs text-red-500 border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                        <Trash2 size={12}/> מחק
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
