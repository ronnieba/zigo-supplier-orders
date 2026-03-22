import { useState, useEffect } from 'react'
import { getSuppliers, createSupplier, deleteSupplier, uploadCatalog, getCatalogs, deleteCatalog, type Supplier, type Catalog } from '../api'
import { Truck, Plus, Trash2, Upload, FileText, Image } from 'lucide-react'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [newName, setNewName] = useState('')
  const [newContact, setNewContact] = useState('')
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

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
    await createSupplier({ name: newName.trim(), contact: newContact.trim() || undefined })
    setNewName(''); setNewContact('')
    load()
  }

  async function removeSupplier(id: string) {
    if (!confirm('למחוק ספק זה?')) return
    await deleteSupplier(id)
    if (selected?.id === id) setSelected(null)
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
      <h2 className="text-2xl font-bold flex items-center gap-2"><Truck size={24}/>ספקים וקטלוגים</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Supplier list */}
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <h3 className="font-semibold text-gray-700">רשימת ספקים</h3>
          <div className="space-y-2">
            {suppliers.map(s => (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition ${
                  selected?.id === s.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  {s.contact && <div className="text-xs text-gray-500">{s.contact}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); removeSupplier(s.id) }}
                  className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
            {suppliers.length === 0 && <p className="text-gray-400 text-sm">אין ספקים עדיין</p>}
          </div>

          {/* Add supplier */}
          <div className="border-t pt-3 space-y-2">
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="שם ספק" value={newName} onChange={e => setNewName(e.target.value)}/>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="פרטי קשר (אופציונלי)" value={newContact} onChange={e => setNewContact(e.target.value)}/>
            <button onClick={addSupplier}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1 hover:bg-blue-700">
              <Plus size={16}/> הוסף ספק
            </button>
          </div>
        </div>

        {/* Catalogs for selected supplier */}
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <h3 className="font-semibold text-gray-700">
            קטלוגים {selected ? `— ${selected.name}` : ''}
          </h3>

          {selected ? (
            <>
              {/* Upload */}
              <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl p-4 cursor-pointer transition
                ${uploading ? 'border-gray-300 bg-gray-50' : 'border-blue-300 hover:bg-blue-50'}`}>
                <div className="flex items-center gap-2">
                  <Upload size={20} className="text-blue-500"/>
                  <span className="text-sm font-medium text-blue-600">
                    {uploading ? 'מעבד — אנא המתן...' : 'העלה קטלוג'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
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
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400"/>
                      <div>
                        <div className="text-sm font-medium">{c.filename}</div>
                        <div className="text-xs text-gray-500">
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
                {catalogs.length === 0 && <p className="text-gray-400 text-sm">אין קטלוגים עדיין</p>}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm">בחר ספק כדי לנהל קטלוגים</p>
          )}
        </div>
      </div>
    </div>
  )
}
