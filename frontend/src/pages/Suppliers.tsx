import { useState, useEffect } from 'react'
import { getSuppliers, createSupplier, deleteSupplier, updateSupplier, uploadCatalog, getCatalogs, deleteCatalog, setSupplierReminderDays, type Supplier, type Catalog } from '../api'
import { Truck, Plus, Trash2, Upload, FileText, Image, Pencil, Bell } from 'lucide-react'

const DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [newName, setNewName] = useState('')
  const [newContact, setNewContact] = useState('')
  const [newWhatsapp, setNewWhatsapp] = useState('')
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editContact, setEditContact] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadCatalogs(selected.id) }, [selected])

  async function load() {
    const s = await getSuppliers()
    setSuppliers(s)
    if (!selected && s.length > 0) setSelected(s[0])
  }

  async function loadCatalogs(id: string) {
    const c = await getCatalogs(id)
    setCatalogs(c)
  }

  async function addSupplier() {
    if (!newName.trim()) return
    await createSupplier({ name: newName.trim(), contact: newContact.trim() || undefined, whatsapp: newWhatsapp.trim() || undefined })
    setNewName(''); setNewContact(''); setNewWhatsapp('')
    load()
  }

  async function removeSupplier(id: string) {
    if (!confirm('למחוק ספק זה?')) return
    await deleteSupplier(id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditContact(s.contact || '')
    setEditWhatsapp(s.whatsapp || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditContact('')
    setEditWhatsapp('')
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    await updateSupplier(id, { name: editName.trim(), contact: editContact.trim() || undefined, whatsapp: editWhatsapp.trim() || undefined })
    cancelEdit()
    load()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selected || !e.target.files?.[0]) return
    setUploading(true); setMsg('')
    try {
      const result = await uploadCatalog(selected.id, e.target.files[0])
      setMsg(`נטענו ${result.products_saved} מוצרים מתוך ${result.products_found} שנמצאו`)
      loadCatalogs(selected.id)
      load()
    } catch (err: any) {
      setMsg('שגיאה בעיבוד ה-PDF')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text"><Truck size={24}/>ספקים וקטלוגים</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Supplier list */}
        <div className="bg-zigo-card rounded-xl shadow p-4 space-y-4 border border-zigo-border">
          <h3 className="font-semibold text-zigo-muted">רשימת ספקים</h3>
          <div className="space-y-2">
            {suppliers.map(s => (
              <div
                key={s.id}
                onClick={() => { if (editingId !== s.id) setSelected(s) }}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition ${
                  selected?.id === s.id ? 'border-zigo-green bg-zigo-bg' : 'border-zigo-border hover:bg-zigo-bg'
                }`}
              >
                {editingId === s.id ? (
                  <div className="flex-1 space-y-1" onClick={e => e.stopPropagation()}>
                    <input
                      className="w-full border border-zigo-border rounded-lg px-2 py-1 text-sm bg-zigo-bg text-zigo-text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="שם ספק"
                    />
                    <input
                      className="w-full border border-zigo-border rounded-lg px-2 py-1 text-sm bg-zigo-bg text-zigo-text"
                      value={editContact}
                      onChange={e => setEditContact(e.target.value)}
                      placeholder="פרטי קשר (אופציונלי)"
                    />
                    <input
                      className="w-full border border-zigo-border rounded-lg px-2 py-1 text-sm bg-zigo-bg text-zigo-text"
                      value={editWhatsapp}
                      onChange={e => setEditWhatsapp(e.target.value)}
                      placeholder="וואטסאפ (אופציונלי)"
                    />
                    {/* Reminder days */}
                    <div>
                      <div className="flex items-center gap-1 text-xs text-zigo-muted mt-2 mb-1">
                        <Bell size={11}/>ימי הזמנה
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {DAY_LABELS.map((label, idx) => {
                          const activeDays: number[] = (() => { try { return JSON.parse(s.reminder_days || '[]') } catch { return [] } })()
                          const isActive = activeDays.includes(idx)
                          return (
                            <button
                              key={idx}
                              onClick={async () => {
                                const newDays = isActive ? activeDays.filter(d => d !== idx) : [...activeDays, idx]
                                await setSupplierReminderDays(s.id, newDays)
                                load()
                              }}
                              className={`w-8 h-7 rounded text-xs font-medium transition-colors ${
                                isActive ? 'bg-zigo-green text-white' : 'border border-zigo-border text-zigo-muted hover:border-zigo-green hover:text-zigo-green'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => saveEdit(s.id)}
                        className="flex-1 bg-zigo-green text-white rounded-lg py-1 text-xs font-medium hover:opacity-90"
                      >
                        שמור
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 border border-zigo-border text-zigo-muted rounded-lg py-1 text-xs font-medium hover:bg-zigo-bg"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="font-medium text-zigo-text">{s.name}</div>
                      {s.contact && <div className="text-xs text-zigo-muted">{s.contact}</div>}
                      {s.reminder_days && (() => {
                        try {
                          const days: number[] = JSON.parse(s.reminder_days)
                          if (days.length === 0) return null
                          return (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Bell size={10} className="text-amber-500"/>
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                {days.map(d => DAY_LABELS[d]).join(' ')}
                              </span>
                            </div>
                          )
                        } catch { return null }
                      })()}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(s) }}
                        className="text-zigo-muted hover:text-zigo-green p-1 transition-colors"
                      >
                        <Pencil size={15}/>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); removeSupplier(s.id) }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {suppliers.length === 0 && <p className="text-zigo-muted text-sm">אין ספקים עדיין</p>}
          </div>

          {/* Add supplier */}
          <div className="border-t border-zigo-border pt-3 space-y-2">
            <input
              className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
              placeholder="שם ספק"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <input
              className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
              placeholder="פרטי קשר (אופציונלי)"
              value={newContact}
              onChange={e => setNewContact(e.target.value)}
            />
            <input
              className="w-full border border-zigo-border rounded-lg px-3 py-2 text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
              placeholder="וואטסאפ (אופציונלי)"
              value={newWhatsapp}
              onChange={e => setNewWhatsapp(e.target.value)}
            />
            <button
              onClick={addSupplier}
              className="w-full bg-zigo-green text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
            >
              <Plus size={16}/> הוסף ספק
            </button>
          </div>
        </div>

        {/* Catalogs for selected supplier */}
        <div className="bg-zigo-card rounded-xl shadow p-4 space-y-4 border border-zigo-border">
          <h3 className="font-semibold text-zigo-muted">
            קטלוגים {selected ? `— ${selected.name}` : ''}
          </h3>

          {selected ? (
            <>
              {/* Upload */}
              <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl p-4 cursor-pointer transition
                ${uploading ? 'border-zigo-border bg-zigo-bg' : 'border-zigo-green hover:bg-zigo-bg'}`}>
                <div className="flex items-center gap-2">
                  <Upload size={20} className="text-zigo-green"/>
                  <span className="text-sm font-medium text-zigo-green">
                    {uploading ? 'מעבד — אנא המתן...' : 'העלה קטלוג'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zigo-muted mt-1">
                  <span className="flex items-center gap-1"><FileText size={12}/> PDF</span>
                  <span className="flex items-center gap-1"><Image size={12}/> JPG / PNG / WEBP</span>
                </div>
                {uploading && (
                  <p className="text-xs text-orange-500 mt-1">
                    טעינת OCR ראשונה עשויה לקחת כמה דקות
                  </p>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.bmp"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>

              {msg && (
                <div className={`text-sm px-3 py-2 rounded-lg ${msg.includes('שגיאה') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msg}
                </div>
              )}

              <div className="space-y-2">
                {catalogs.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 border border-zigo-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-zigo-muted"/>
                      <div>
                        <div className="text-sm font-medium text-zigo-text">{c.filename}</div>
                        <div className="text-xs text-zigo-muted">
                          {c.products_count} מוצרים · {new Date(c.uploaded_at).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { deleteCatalog(c.id); loadCatalogs(selected.id) }}
                      className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
                {catalogs.length === 0 && <p className="text-zigo-muted text-sm">אין קטלוגים עדיין</p>}
              </div>
            </>
          ) : (
            <p className="text-zigo-muted text-sm">בחר ספק כדי לנהל קטלוגים</p>
          )}
        </div>
      </div>
    </div>
  )
}
