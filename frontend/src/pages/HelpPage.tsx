import { useState } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, History, BarChart2,
  Truck, Calendar, ChevronDown, ChevronUp, MessageCircle,
  Printer, AlertTriangle, DollarSign, Search,
  Smartphone, HelpCircle, Lightbulb, CheckCircle2,
  Download, Bell, Database, ShieldCheck
} from 'lucide-react'

interface Section {
  id: string
  icon: React.ElementType
  iconColor: string
  title: string
  subtitle: string
  items: HelpItem[]
}

interface HelpItem {
  q: string
  a: string | React.ReactNode
  tip?: string
}

const SECTIONS: Section[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    iconColor: 'text-blue-500',
    title: 'לוח בקרה',
    subtitle: 'סיכום הוצאות, גרפים ותקציב שבועי',
    items: [
      {
        q: 'מה רואים בלוח הבקרה?',
        a: 'בחר ספק מהרשימה ותראה: סך הוצאות השבוע, סך הוצאות החודש, כמות הזמנות, וגרף עמודות של ההוצאות השבועיות לאורך הזמן.'
      },
      {
        q: 'איך מגדירים תקציב שבועי לספק?',
        a: 'בכרטיס "תקציב שבועי" לחץ על אייקון עריכה (עיפרון), הקלד את הסכום הרצוי ולחץ ✓ לשמירה. פס ההתקדמות יצבע ירוק עד 75%, כתום עד 100%, ואדום אם עוברים את התקציב.'
      },
      {
        q: 'מה המשמעות של הצבעים בפס התקציב?',
        a: (
          <ul className="space-y-1 mt-1">
            <li><span className="text-green-500 font-medium">ירוק</span> — פחות מ-75% מהתקציב נוצל, הכל תקין</li>
            <li><span className="text-orange-500 font-medium">כתום</span> — בין 75% ל-100%, קרוב למגבלה</li>
            <li><span className="text-red-500 font-medium">אדום</span> — חרגת מהתקציב השבועי</li>
          </ul>
        ),
      },
    ]
  },
  {
    id: 'suppliers',
    icon: Truck,
    iconColor: 'text-purple-500',
    title: 'ספקים',
    subtitle: 'ניהול פרטי ספקים ואנשי קשר',
    items: [
      {
        q: 'איך מוסיפים ספק חדש?',
        a: 'לחץ על כפתור "+ ספק חדש" בראש הדף. מלא שם ספק, שם איש קשר, טלפון ואי-מייל. לאחר שמירה, הספק יופיע בכל הדפים.'
      },
      {
        q: 'איך עורכים פרטי ספק?',
        a: 'לחץ על כפתור "עריכה" בכרטיס הספק, ערוך את הפרטים ולחץ "שמור".'
      },
      {
        q: 'מה מספר הטלפון משמש לו?',
        a: 'מספר הטלפון משמש לשליחת WhatsApp — כשתשלח הזמנה דרך WhatsApp, ההודעה תיפתח ישירות לאיש הקשר של הספק.',
        tip: 'הכנס מספר בפורמט בינלאומי כולל קידומת מדינה, ללא + (לדוגמה: 972501234567)'
      },
    ]
  },
  {
    id: 'catalog',
    icon: Package,
    iconColor: 'text-yellow-500',
    title: 'קטלוג',
    subtitle: 'ניהול מוצרים ומחירים, השוואת ספקים',
    items: [
      {
        q: 'איך מוסיפים מוצר לקטלוג?',
        a: 'בחר ספק, לאחר מכן לחץ "+ מוצר חדש". הכנס שם מוצר, יחידת מידה (ק"ג, ל, יח׳...) ומחיר. המוצר יופיע ברשימה ויהיה זמין בהזמנה חדשה.'
      },
      {
        q: 'איך מעדכנים מחיר של מוצר?',
        a: 'לחץ "עריכה" על המוצר ועדכן את המחיר. המערכת שומרת היסטוריית מחירים כדי לזהות חריגות בהזמנות עתידיות.'
      },
      {
        q: 'מה זה "השווה מחירים"?',
        a: 'לחץ "השווה" בראש הדף, הקלד שם מוצר (כל חלק שלו) וראה את המחיר של אותו מוצר אצל כל הספקים שיש לו בקטלוג. המחיר הזול ביותר מוצג בירוק.',
        tip: 'שימושי לזהות אם ספק אחד זול משמעותית ממשנהו עבור אותו מוצר'
      },
    ]
  },
  {
    id: 'neworder',
    icon: ShoppingCart,
    iconColor: 'text-zigo-green',
    title: 'הזמנה חדשה',
    subtitle: 'יצירת הזמנות, תבניות והתראות',
    items: [
      {
        q: 'איך יוצרים הזמנה חדשה?',
        a: (
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>בחר ספק מהתפריט</li>
            <li>מוצרי הקטלוג שלו יופיעו ברשימה</li>
            <li>הקלד כמות ליד כל מוצר שרוצים להזמין</li>
            <li>לחץ "שלח הזמנה" לסיום</li>
          </ol>
        )
      },
      {
        q: 'מה הפירוש של אזהרת הסטייה (⚠️)?',
        a: 'אם כמות שהזנת גבוהה או נמוכה ב-50% ומעלה מהממוצע שהזמנת בעבר, תופיע הודעת אזהרה. זה מגן מפני טעויות כמו הזנת 100 במקום 10.',
        tip: 'אפשר להתעלם מהאזהרה ולהמשיך — היא רק תזכורת, לא חסימה'
      },
      {
        q: 'מה זה תבניות הזמנה?',
        a: 'תבנית היא הזמנה שמורה שאפשר לטעון בלחיצה. לדוגמה: "הזמנה שבועית רגילה" עם כל הכמויות הנפוצות. כך חוסכים זמן בהזמנות חוזרות.'
      },
      {
        q: 'איך שומרים תבנית?',
        a: 'מלא הזמנה כרגיל, לאחר מכן לחץ "שמור כתבנית", תן לה שם ולחץ "שמור". התבנית תישמר לשימוש חוזר.'
      },
      {
        q: 'איך טוענים תבנית קיימת?',
        a: 'לחץ "טען תבנית", בחר מהרשימה — הכמויות ימולאו אוטומטית. ניתן לשנות כמויות לפני שליחת ההזמנה.'
      },
    ]
  },
  {
    id: 'history',
    icon: History,
    iconColor: 'text-indigo-500',
    title: 'היסטוריית הזמנות',
    subtitle: 'צפייה, שליחה בWhatsApp והדפסה',
    items: [
      {
        q: 'איך מסננים הזמנות?',
        a: 'ניתן לסנן לפי ספק ולפי תאריך (מ... עד...). לחץ "חפש" לאחר בחירת הפילטרים.'
      },
      {
        q: 'איך שולחים הזמנה בWhatsApp?',
        a: 'לחץ על אייקון WhatsApp (ירוק) בהזמנה. ייפתח WhatsApp Web עם טקסט ההזמנה מוכן — כולל שם הספק, רשימת המוצרים, כמויות ומחירים. אם הטלפון של הספק מוגדר, ההודעה תיפתח ישירות אליו.',
        tip: 'וודא שהטלפון של הספק מוגדר בדף "ספקים" לקבלת תוצאה מיטבית'
      },
      {
        q: 'איך מדפיסים הזמנה?',
        a: 'לחץ על אייקון המדפסת בהזמנה. ייפתח דף הדפסה נקי ללא תפריטים. בחר "הדפסה" מהדפדפן, או "שמור כ-PDF" ממנהל המדפסות.'
      },
      {
        q: 'מה מציינים סטטוסי ההזמנה?',
        a: (
          <ul className="space-y-1 mt-1">
            <li><span className="text-yellow-500 font-medium">ממתין</span> — הזמנה נוצרה, טרם אושרה</li>
            <li><span className="text-blue-500 font-medium">אושר</span> — הספק אישר את ההזמנה</li>
            <li><span className="text-green-500 font-medium">סופק</span> — הסחורה הגיעה</li>
            <li><span className="text-red-500 font-medium">בוטל</span> — ההזמנה בוטלה</li>
          </ul>
        )
      },
    ]
  },
  {
    id: 'analytics',
    icon: BarChart2,
    iconColor: 'text-orange-500',
    title: 'אנליטיקות',
    subtitle: 'גרפים מפורטים ומגמות',
    items: [
      {
        q: 'מה רואים בדף האנליטיקות?',
        a: 'גרפים של הוצאות לאורך זמן לפי ספק: גרף עמודות שבועי, גרף קווי חודשי, ופירוט המוצרים שהוזמנו הכי הרבה.'
      },
      {
        q: 'איך לזהות מגמות?',
        a: 'בגרף החודשי ניתן לראות אם ההוצאות על ספק מסוים עולות או יורדות לאורך החודשים. גרף השבועי מאפשר להשוות שבוע לשבוע.'
      },
    ]
  },
  {
    id: 'calendar',
    icon: Calendar,
    iconColor: 'text-pink-500',
    title: 'לוח שנה',
    subtitle: 'תצוגה חודשית של ימי הזמנות',
    items: [
      {
        q: 'מה מראה לוח השנה?',
        a: 'תצוגה חודשית שמדגישה ימים שבוצעו בהם הזמנות (נקודה ירוקה). לחיצה על שבוע מציגה את ההזמנות שבוצעו באותו שבוע עם סיכום עלויות.'
      },
      {
        q: 'איך מנווטים בין חודשים?',
        a: 'השתמש בחצים < > משני צדי שם החודש כדי לעבור חודש קדימה או אחורה.'
      },
    ]
  },
  {
    id: 'overview',
    icon: LayoutDashboard,
    iconColor: 'text-indigo-400',
    title: 'סקירה כללית — כל הספקים',
    subtitle: 'תצוגת כל הספקים במקביל',
    items: [
      {
        q: 'מה ההבדל בין "ספק בודד" ל"כל הספקים"?',
        a: 'בלוח הבקרה, לחץ על הכרטיסייה "כל הספקים" כדי לראות בכרטיסייה אחת את הוצאות השבוע של כל הספקים, כולל פס תקציב לכל אחד וסה"כ כולל.',
        tip: 'שימושי לראייה מהירה של מצב כלל ההוצאות לפני תחילת השבוע'
      },
    ]
  },
  {
    id: 'search-history',
    icon: Search,
    iconColor: 'text-cyan-500',
    title: 'חיפוש מוצר בהיסטוריה',
    subtitle: 'מצא מתי ובאיזה מחיר הוזמן מוצר',
    items: [
      {
        q: 'איך מחפשים מוצר ספציפי בהיסטוריה?',
        a: 'בדף "היסטוריה", בשדה "חיפוש מוצר" הקלד חלק משם המוצר ולחץ "חפש". תראה רק הזמנות שכוללות אותו מוצר.',
        tip: 'לדוגמה: חפש "חלב" לראות את כל ההזמנות שכללו מוצרי חלב, בכל ספק'
      },
    ]
  },
  {
    id: 'export',
    icon: Download,
    iconColor: 'text-green-500',
    title: 'ייצוא לExcel',
    subtitle: 'הורדת הזמנות כקובץ גיליון',
    items: [
      {
        q: 'איך מייצאים הזמנות לExcel?',
        a: 'בדף "היסטוריה", לחץ "ייצוא Excel". יורד קובץ .xlsx עם כל ההזמנות שמסוננות כרגע — כולל שם ספק, שבוע, פריטים, כמויות ומחירים.',
        tip: 'ניתן לסנן לפי ספק ו/או מוצר לפני הייצוא כדי לקבל Excel ממוקד'
      },
    ]
  },
  {
    id: 'reminders',
    icon: Bell,
    iconColor: 'text-yellow-500',
    title: 'תזכורות שבועיות',
    subtitle: 'קבל תזכורת ביום ובשעה קבועים',
    items: [
      {
        q: 'איך מגדירים תזכורת להזמנה?',
        a: (
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>לחץ על אייקון הפעמון בפינה הימנית העליונה</li>
            <li>סמן "הפעל תזכורת"</li>
            <li>בחר יום בשבוע ושעה</li>
            <li>ניתן לערוך את טקסט ההתראה</li>
            <li>לחץ "שמור וסגור"</li>
          </ol>
        ),
        tip: 'התזכורת מופיעה כ-toast בתחתית המסך כשפותחים את האפליקציה ביום ובשעה שנקבעו'
      },
    ]
  },
  {
    id: 'backup',
    icon: Database,
    iconColor: 'text-blue-500',
    title: 'גיבוי ושחזור',
    subtitle: 'שמירה ושחזור כל נתוני המערכת',
    items: [
      {
        q: 'איך מגבים את המערכת?',
        a: 'עבור לדף "גיבוי" בניווט, לחץ "הורד גיבוי עכשיו". יורד קובץ JSON עם כל הנתונים — ספקים, מוצרים, הזמנות, תבניות ותקציבים.',
        tip: 'מומלץ לגבות לפחות פעם בשבוע. שמור בשני מקומות: מחשב + Google Drive'
      },
      {
        q: 'איך משחזרים גיבוי?',
        a: 'בדף "גיבוי", לחץ על אזור הייבוא ובחר קובץ .json שיוצא קודם. לחץ "ייבא גיבוי". רשומות קיימות לא יימחקו — רק נתונים חדשים יתווספו.',
      },
      {
        q: 'האם הגיבוי מחליף את הנתונים הקיימים?',
        a: 'לא. הייבוא פועל בצורה "בטוחה" — רק נתונים שלא קיימים עדיין מתווספים. ניתן לייבא את אותו גיבוי כמה פעמים ללא חשש.'
      },
    ]
  },
  {
    id: 'auth',
    icon: ShieldCheck,
    iconColor: 'text-red-400',
    title: 'הגנת סיסמה',
    subtitle: 'אבטחת גישה למערכת',
    items: [
      {
        q: 'איך מגדירים סיסמה למערכת?',
        a: 'ב-Render.com, הוסף משתנה סביבה בשם APP_PASSWORD עם הסיסמה הרצויה. לאחר הפריסה, כל גישה למערכת תדרוש כניסה עם הסיסמה.',
        tip: 'אם APP_PASSWORD לא מוגדר, המערכת פתוחה ללא סיסמה (מתאים לרשת מקומית פרטית)'
      },
      {
        q: 'איך מתנתקים?',
        a: 'לחץ על אייקון ה-LogOut (חץ יציאה) בפינה הימנית העליונה.'
      },
    ]
  },
  {
    id: 'pwa',
    icon: Smartphone,
    iconColor: 'text-teal-500',
    title: 'התקנה כאפליקציה',
    subtitle: 'הוסף את המערכת למסך הבית',
    items: [
      {
        q: 'איך מתקינים על Android?',
        a: (
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>פתח את האתר ב-Chrome</li>
            <li>לחץ על שלוש הנקודות ⋮ בפינה העליונה</li>
            <li>בחר "הוסף למסך הבית"</li>
            <li>לחץ "הוסף" — האפליקציה תופיע על המסך</li>
          </ol>
        )
      },
      {
        q: 'איך מתקינים על iPhone?',
        a: (
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>פתח את האתר ב-Safari</li>
            <li>לחץ על כפתור השיתוף (ריבוע עם חץ)</li>
            <li>גלול ובחר "הוסף למסך הבית"</li>
            <li>לחץ "הוסף"</li>
          </ol>
        )
      },
      {
        q: 'איך מתקינים על דסקטופ (Chrome)?',
        a: 'לחץ על אייקון ההתקנה שמופיע בשורת הכתובת (מחשב עם חץ), לאחר מכן לחץ "התקן". האפליקציה תיפתח בחלון נפרד.'
      },
    ]
  },
]

function AccordionItem({ item }: { item: HelpItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zigo-border last:border-0">
      <button
        className="w-full text-right py-3 px-1 flex items-start justify-between gap-3 hover:text-zigo-green transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-sm font-medium leading-snug">{item.q}</span>
        {open
          ? <ChevronUp size={16} className="text-zigo-muted shrink-0 mt-0.5" />
          : <ChevronDown size={16} className="text-zigo-muted shrink-0 mt-0.5" />
        }
      </button>
      {open && (
        <div className="pb-4 px-1 space-y-2">
          <div className="text-sm text-zigo-muted leading-relaxed">{item.a}</div>
          {item.tip && (
            <div className="flex gap-2 bg-zigo-green/10 rounded-lg p-2.5">
              <Lightbulb size={14} className="text-zigo-green shrink-0 mt-0.5" />
              <span className="text-xs text-zigo-green">{item.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false)
  const Icon = section.icon
  return (
    <div className="bg-zigo-card border border-zigo-border rounded-xl overflow-hidden">
      <button
        className="w-full text-right p-4 flex items-center gap-3 hover:bg-zigo-border/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className={`w-10 h-10 rounded-full bg-zigo-bg flex items-center justify-center shrink-0 ${section.iconColor}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 text-right">
          <div className="font-semibold text-zigo-text">{section.title}</div>
          <div className="text-xs text-zigo-muted">{section.subtitle}</div>
        </div>
        <div className="text-zigo-muted">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {open && (
        <div className="px-4 border-t border-zigo-border">
          {section.items.map((item, i) => (
            <AccordionItem key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zigo-green/10 mb-3">
          <HelpCircle size={28} className="text-zigo-green" />
        </div>
        <h1 className="text-xl font-bold text-zigo-text">מרכז עזרה</h1>
        <p className="text-sm text-zigo-muted mt-1">הסבר על כל חלקי המערכת</p>
      </div>

      {/* Quick tips bar */}
      <div className="bg-zigo-green/10 border border-zigo-green/30 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-zigo-green font-semibold text-sm">
          <CheckCircle2 size={16} />
          <span>טיפים מהירים</span>
        </div>
        <ul className="text-xs text-zigo-muted space-y-1.5 pr-1">
          <li>• לחץ על כל נושא כדי להרחיב את ההסבר</li>
          <li>• בהזמנה חדשה — שמור תבנית לחיסכון בזמן בהזמנות חוזרות</li>
          <li>• הוסף את המספר הבינלאומי של הספק כדי שWhatsApp יפתח ישירות אליו</li>
          <li>• ניתן להתקין את המערכת כאפליקציה על הנייד — ראה סעיף "התקנה כאפליקציה"</li>
        </ul>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map(s => (
          <SectionCard key={s.id} section={s} />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zigo-muted pt-2">
        ZIGO Cafe — מערכת הזמנות ספקים
      </div>
    </div>
  )
}
