import { useState, useRef } from 'react'
import { downloadBackup, importBackup } from '../api'
import { Download, Upload, CheckCircle, AlertTriangle, Database, ShieldCheck } from 'lucide-react'

export default function BackupPage() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; added?: number; skipped?: number; error?: string } | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    try {
      await downloadBackup()
    } finally {
      setExporting(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setImportResult(null)
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    if (!confirm(`לייבא את הגיבוי "${file.name}"?\nרשומות קיימות לא יימחקו — רק רשומות חדשות יתווספו.`)) return

    setImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = await importBackup(json)
      setImportResult(result)
    } catch {
      setImportResult({ ok: false, error: 'קובץ לא תקין — ודא שמדובר בקובץ גיבוי של ZIGO' })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
      setFileName('')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zigo-green/10 mb-3">
          <Database size={28} className="text-zigo-green"/>
        </div>
        <h1 className="text-xl font-bold text-zigo-text">גיבוי ושחזור</h1>
        <p className="text-sm text-zigo-muted mt-1">ייצוא וייבוא כל נתוני המערכת</p>
      </div>

      {/* Info box */}
      <div className="bg-zigo-green/10 border border-zigo-green/30 rounded-xl p-4 flex gap-3">
        <ShieldCheck size={18} className="text-zigo-green shrink-0 mt-0.5"/>
        <div className="text-sm text-zigo-muted space-y-1">
          <p>הגיבוי כולל את <strong className="text-zigo-text">כל</strong> הנתונים: ספקים, קטלוגים, מוצרים, הזמנות, תבניות ותקציבים.</p>
          <p>קובץ הגיבוי הוא JSON רגיל — ניתן לפתוח ולקרוא בכל עורך טקסט.</p>
        </div>
      </div>

      {/* Export */}
      <div className="bg-zigo-card rounded-xl border border-zigo-border p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-zigo-text">
          <Download size={18} className="text-blue-400"/>
          ייצוא גיבוי
        </div>
        <p className="text-sm text-zigo-muted">
          הורד קובץ JSON עם כל נתוני המערכת. שמור אותו במחשב או בענן לשחזור עתידי.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          <Download size={16}/>
          {exporting ? 'מוריד...' : 'הורד גיבוי עכשיו'}
        </button>
      </div>

      {/* Import */}
      <div className="bg-zigo-card rounded-xl border border-zigo-border p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-zigo-text">
          <Upload size={18} className="text-orange-400"/>
          ייבוא גיבוי
        </div>
        <p className="text-sm text-zigo-muted">
          בחר קובץ גיבוי שיוצא קודם. רשומות קיימות <strong className="text-zigo-text">לא יימחקו</strong> — רק נתונים חדשים יתווספו.
        </p>

        {/* File picker */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-zigo-border rounded-xl p-6 text-center cursor-pointer hover:border-zigo-green transition-colors"
        >
          <Upload size={24} className="mx-auto text-zigo-muted mb-2"/>
          {fileName
            ? <p className="text-sm font-medium text-zigo-green">{fileName}</p>
            : <p className="text-sm text-zigo-muted">לחץ לבחירת קובץ גיבוי (.json)</p>
          }
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={importing || !fileName}
          className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          <Upload size={16}/>
          {importing ? 'מייבא...' : 'ייבא גיבוי'}
        </button>

        {/* Result */}
        {importResult && (
          <div className={`rounded-xl p-4 flex items-start gap-3 ${
            importResult.ok
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {importResult.ok
              ? <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5"/>
              : <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/>
            }
            <div className="text-sm">
              {importResult.ok ? (
                <>
                  <p className="font-semibold text-green-500">הייבוא הצליח!</p>
                  <p className="text-zigo-muted mt-0.5">
                    נוספו {importResult.added} רשומות חדשות · דולגו {importResult.skipped} קיימות
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-red-500">הייבוא נכשל</p>
                  <p className="text-zigo-muted mt-0.5">{importResult.error}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5"/>
        <p className="text-xs text-zigo-muted">
          מומלץ לגבות לפחות פעם בשבוע, ובוודאי לפני כל שינוי גדול במערכת.
          שמור את קובץ הגיבוי בשני מקומות שונים (מחשב + Google Drive / Dropbox).
        </p>
      </div>
    </div>
  )
}
