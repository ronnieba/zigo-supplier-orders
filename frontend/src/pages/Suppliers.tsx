import { useState, useEffect } from 'react'
import { getSuppliers, createSupplier, deleteSupplier, updateSupplier, uploadCatalog, getCatalogs, deleteCatalog, setSupplierReminderDays, type Supplier, type Catalog } from '../api'
import { Truck, Plus, Trash2, Upload, FileText, Image, Pencil, Bell, Phone, Mail, MapPin, StickyNote, MessageCircle, X, Check, ChevronDown, ChevronUp } from 'lucide-react'

const DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

interface SupplierForm {
  name: string; contact: string; whatsapp: string; email: string; address: string; notes: string
}
const emptyForm = (): SupplierForm => ({ name: '', contact: '', whatsapp: '', email: '', address: '', notes: '' })
const fromSupplier = (s: Supplier): SupplierForm => ({
  name: s.name, contact: s.contact || '', whatsapp: s.whatsapp || '',
  email: s.email || '', address: s.address || '', notes: s.notes || ''
})

function ReminderDays({ supplier, onUpdate }: { supplier: Supplier; onUpdate: () => void }) {
  const activeDays: number[] = (() => {
    try { return JSON.parse(supplier.reminder_days || '[]') } catch { return [] }
  })()
  return (
    <div className="flex flex-wrap gap-1">
      {DAY_LABELS.map((label, idx) => {
        const isActive = activeDays.includes(idx)
        return (
          <button key={idx}
            onClick={async () => {
              const nd = isActive ? activeDays.filter(d => d !== idx) : [...activeDays, idx]
              await setSupplierReminderDays(supplier.id, nd)
              onUpdate()
            }}
            className={`w-8 h-7 rounded text-xs font-medium transition-colors ${
              isActive
                ? 'bg-amber-400 dark:bg-amber-500 text-white'
                : 'border border-zigo-border text-zigo-muted hover:border-amber-400 hover:text-amber-500'
            }`}
          >{label}</button>
        )
      })}
    </div>
  )
}

function SupplierCard({ supplier, selected, onSelect, onEdit, onDelete, onUpdate }: {
  supplier: Supplier; selected: boolean; onSelect: () => void
  onEdit: () => void; onDelete: () => void; onUpdate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const activeDays: number[] = (() => {
    try { return JSON.parse(supplier.reminder_days || '[]') } catch { return [] }
  })()
  return (
    <div className={`rounded-xl border transition-all ${
      selected ? 'border-zigo-green bg-zigo-bg' : 'border-zigo-border bg-zigo-card hover:border-zigo-green/50'
    }`}>
      <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={onSelect}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-zigo-text truncate">{supplier.name}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {supplier.contact && (
              <span className="flex items-center gap-1 text-xs text-zigo-muted">
                <Phone size={10} className="text-blue-400 shrink-0"/>{supplier.contact}
              </span>
            )}
            {supplier.whatsapp && (
              <span className="flex items-center gap-1 text-xs text-zigo-muted">
                <MessageCircle size={10} className="text-green-500 shrink-0"/>{supplier.whatsapp}
              </span>
            )}
            {supplier.email && (
              <span className="flex items-center gap-1 text-xs text-zigo-muted">
                <Mail size={10} className="text-purple-400 shrink-0"/>{supplier.email}
              </span>
            )}
          </div>
          {activeDays.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Bell size={10} className="text-amber-500"/>
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {activeDays.map(d => DAY_LABELS[d]).join(' ')}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => setExpanded(v => !v)}
            className="text-zigo-muted hover:text-zigo-green p-1.5 rounded-lg hover:bg-zigo-bg transition-colors">
            {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
          </button>
          <button onClick={onEdit}
            className="text-zigo-muted hover:text-zigo-green p-1.5 rounded-lg hover:bg-zigo-bg transition-colors">
            <Pencil size={15}/>
          </button>
          <button onClick={onDelete}
            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={15}/>
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-zigo-border space-y-2 pt-2">
          {supplier.address && (
            <div className="flex items-start gap-2 text-xs text-zigo-muted">
              <MapPin size={12} className="text-orange-400 mt-0.5 shrink-0"/>
              <span>{supplier.address}</span>
            </div>
          )}
          {supplier.notes && (
            <div className="flex items-start gap-2 text-xs text-zigo-muted">
              <StickyNote size={12} className="text-yellow-500 mt-0.5 shrink-0"/>
              <span className="whitespace-pre-wrap">{supplier.notes}</span>
            </div>
          )}
          {!supplier.address && !supplier.notes && (
            <p className="text-xs text-zigo-muted italic">אין פרטים נוספים</p>
          )}
          <div>
            <div className="flex items-center gap-1 text-xs text-zigo-muted mb-1.5">
              <Bell size={11} className="text-amber-500"/>ימי הזמנה:
            </div>
            <ReminderDays supplier={supplier} onUpdate={onUpdate}/>
          </div>
        </div>
      )}
    </div>
  )
}

function FormPanel({ title, form, onChange, onSubmit, onCancel, submitLabel, supplier, onUpdate }: {
  title: string; form: SupplierForm; onChange: (f: SupplierForm) => void
  onSubmit: () => void; onCancel?: () => void; submitLabel: string
  supplier?: Supplier; onUpdate?: () => void
}) {
  return (
    <div className="bg-zigo-card rounded-xl border border-zigo-border p-4 space-y-3">
      <div className="font-semibold text-zigo-text text-sm">{title}</div>

      {/* Name */}
      <div className="relative">
        <div className="absolute right-3 top-2.5 text-zigo-muted pointer-events-none"><Truck size={14}/></div>
        <input className="w-full pr-8 pl-3 py-2 border border-zigo-border rounded-lg text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
          placeholder="שם ספק *" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })}/>
      </div>

      {/* Phone + WhatsApp */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <div className="absolute right-3 top-2.5 text-zigo-muted pointer-events-none"><Phone size={14}/></div>
          <input className="w-full pr-8 pl-3 py-2 border border-zigo-border rounded-lg text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
            placeholder="טלפון" value={form.contact} onChange={e => onChange({ ...form, contact: e.target.value })}/>
        </div>
        <div className="relative">
          <div className="absolute right-3 top-2.5 text-zigo-muted pointer-events-none"><MessageCircle size={14}/></div>
          <input className="w-full pr-8 pl-3 py-2 border border-zigo-border rounded-lg text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
            placeholder="וואטסאפ" value={form.whatsapp} onChange={e => onChange({ ...form, whatsapp: e.target.value })}/>
        </div>
      </div>

      {/* Email */}
      <div className="relative">
        <div className="absolute right-3 top-2.5 text-zigo-muted pointer-events-none"><Mail size={14}/></div>
        <input type="email" className="w-full pr-8 pl-3 py-2 border border-zigo-border rounded-lg text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
          placeholder='דוא"ל' value={form.email} onChange={e => onChange({ ...form, email: e.target.value })}/>
      </div>

      {/* Address */}
      <div className="relative">
        <div className="absolute right-3 top-2.5 text-zigo-muted pointer-events-none"><MapPin size={14}/></div>
        <input className="w-full pr-8 pl-3 py-2 border border-zigo-border rounded-lg text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted"
          placeholder="כתובת" value={form.address} onChange={e => onChange({ ...form, address: e.target.value })}/>
      </div>

      {/* Notes */}
      <div className="relative">
        <div className="absolute right-3 top-2.5 text-zigo-muted pointer-events-none"><StickyNote size={14}/></div>
        <textarea rows={3}
          className="w-full pr-8 pl-3 py-2 border border-zigo-border rounded-lg text-sm bg-zigo-bg text-zigo-text placeholder:text-zigo-muted resize-none"
          placeholder="הערות חופשיות..." value={form.notes}
          onChange={e => onChange({ ...form, notes: e.target.value })}/>
      </div>

      {/* Reminder days (edit mode only) */}
      {supplier && onUpdate && (
        <div>
          <div className="flex items-center gap-1 text-xs text-zigo-muted mb-1.5">
            <Bell size={11} className="text-amber-500"/>ימי הזמנה שבועיים:
          </div>
          <ReminderDays supplier={supplier} onUpdate={onUpdate}/>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onSubmit} disabled={!form.name.trim()}
          className="flex-1 bg-zigo-green text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1">
          <Check size={14}/>{submitLabel}
        </button>
        {onCancel && (
          <button onClick={onCancel}
            className="px-4 border border-zigo-border text-zigo-muted rounded-lg py-2 text-sm hover:bg-zigo-bg flex items-center gap-1">
            <X size={14}/>ביטול
          </button>
        )}
      </div>
    </div>
  )
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [newForm, setNewForm] = useState<SupplierForm>(emptyForm())
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<SupplierForm>(emptyForm())

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadCatalogs(selected.id) }, [selected])

  async function load() {
    const s = await getSuppliers()
    setSuppliers(s)
    if (!selected && s.length > 0) setSelected(s[0])
    if (selected) {
      const found = s.find(x => x.id === selected.id)
      if (found) setSelected(found)
    }
  }

  async function loadCatalogs(id: string) {
    setCatalogs(await getCatalogs(id))
  }

  async function addSupplier() {
    if (!newForm.name.trim()) return
    await createSupplier({
      name: newForm.name.trim(),
      contact: newForm.contact.trim() || undefined,
      whatsapp: newForm.whatsapp.trim() || undefined,
      email: newForm.email.trim() || undefined,
      address: newForm.address.trim() || undefined,
      notes: newForm.notes.trim() || undefined,
    })
    setNewForm(emptyForm())
    setShowAdd(false)
    load()
  }

  async function removeSupplier(id: string) {
    if (!confirm('למחוק ספק זה וכל הנתונים שלו?')) return
    await deleteSupplier(id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function saveEdit() {
    if (!editingId || !editForm.name.trim()) return
    await updateSupplier(editingId, {
      name: editForm.name.trim(),
      contact: editForm.contact.trim() || undefined,
      whatsapp: editForm.whatsapp.trim() || undefined,
      email: editForm.email.trim() || undefined,
      address: editForm.address.trim() || undefined,
      notes: editForm.notes.trim() || undefined,
    })
    setEditingId(null)
    load()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selected || !e.target.files?.[0]) return
    setUploading(true); setMsg('')
    try {
      const r = await uploadCatalog(selected.id, e.target.files[0])
      setMsg(`נטענו ${r.products_saved} מוצרים מתוך ${r.products_found} שנמצאו`)
      loadCatalogs(selected.id)
      load()
    } catch {
      setMsg('שגיאה בעיבוד הקובץ')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const editingSupplier = suppliers.find(s => s.id === editingId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-zigo-text">
          <Truck size={24}/>ספקים וקטלוגים
        </h2>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 bg-zigo-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16}/>{showAdd ? 'סגור' : 'ספק חדש'}
        </button>
      </div>

      {showAdd && (
        <FormPanel title="הוספת ספק חדש" form={newForm} onChange={setNewForm}
          onSubmit={addSupplier}
          onCancel={() => { setShowAdd(false); setNewForm(emptyForm()) }}
          submitLabel="הוסף ספק"/>
      )}

      {editingId && editingSupplier && (
        <FormPanel
          title={`עריכת ספק — ${editingSupplier.name}`}
          form={editForm} onChange={setEditForm}
          onSubmit={saveEdit} onCancel={() => setEditingId(null)}
          submitLabel="שמור שינויים"
          supplier={editingSupplier} onUpdate={load}/>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Supplier list */}
        <div className="space-y-3">
          <h3 className="font-semibold text-zigo-muted text-sm px-1">
            רשימת ספקים ({suppliers.length})
          </h3>
          {suppliers.length === 0 ? (
            <div className="bg-zigo-card rounded-xl border border-zigo-border p-6 text-center text-zigo-muted text-sm">
              אין ספקים עדיין. לחץ "ספק חדש" כדי להתחיל.
            </div>
          ) : (
            suppliers.map(s =>
              editingId === s.id ? null :
              <SupplierCard key={s.id} supplier={s} selected={selected?.id === s.id}
                onSelect={() => setSelected(s)}
                onEdit={() => { setEditForm(fromSupplier(s)); setEditingId(s.id) }}
                onDelete={() => removeSupplier(s.id)}
                onUpdate={load}/>
            )
          )}
        </div>

        {/* Catalogs */}
        <div className="bg-zigo-card rounded-xl shadow p-4 space-y-4 border border-zigo-border">
          <h3 className="font-semibold text-zigo-muted">
            קטלוגים {selected ? `— ${selected.name}` : ''}
          </h3>
          {selected ? (
            <>
              <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl p-4 cursor-pointer transition ${
                uploading ? 'border-zigo-border bg-zigo-bg' : 'border-zigo-green hover:bg-zigo-bg'
              }`}>
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
                {uploading && <p className="text-xs text-orange-500 mt-1">טעינת OCR ראשונה עשויה לקחת כמה דקות</p>}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.bmp"
                  className="hidden" onChange={handleUpload} disabled={uploading}/>
              </label>

              {msg && (
                <div className={`text-sm px-3 py-2 rounded-lg ${
                  msg.includes('שגיאה')
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                }`}>{msg}</div>
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
                      className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
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
