# legal-library-api

خادم API صغير مستقل (Flask) يستقبل مراجع قانونية من موقع Static خارجي عبر
`POST /api/submit-reference`، ويضيفها بأمان إلى `data/library.json` في
مستودع GitHub. لا توجد قاعدة بيانات ولا لوحة تحكم ولا واجهة مستخدم.

## التشغيل محليًا

```bash
pip install -r requirements.txt
cp .env.example .env   # ثم املأ القيم
python run.py
```

الخادم يعمل افتراضيًا على:

```
http://127.0.0.1:5000
```

تحقق من عمله عبر:

```
GET /api/health
```

## Environment Variables

| المتغير | الوصف |
|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token بصلاحية الكتابة على المستودع |
| `GITHUB_OWNER` | اسم المستخدم/المنظمة صاحبة المستودع |
| `GITHUB_REPO` | اسم المستودع |
| `GITHUB_BRANCH` | الفرع المستهدف (افتراضي: `main`) |
| `LIBRARY_PATH` | مسار ملف `library.json` داخل المستودع |
| `ALLOWED_ORIGIN` | دومين الموقع الرئيسي المسموح له بالنداء (CORS)، افصل عدة دومينات بفاصلة |

متغيرات اختيارية إضافية: `MAX_PDF_SIZE_MB`، `MAX_COVER_SIZE_MB`،
`BOOKS_DIR` (افتراضي `books`)، `COVERS_DIR` (افتراضي `covers`)، `PORT`،
`PUBLIC_BASE_URL` (انظر أدناه).

### PUBLIC_BASE_URL (اختياري تمامًا — القيمة الافتراضية مسار نسبي)

`PUBLIC_BASE_URL` **غير مطلوب**. إن لم يُحدَّد، يخزّن الخادم مسارًا نسبيًا
فقط، وهذا هو السلوك الافتراضي والموصى به لموقع مستضاف عبر GitHub Pages من
نفس المستودع:

```
books/REF-2026-00001.pdf
```

**التحقق من عمل هذا مع GitHub Pages (البند المطلوب تحديدًا):**
GitHub Pages يخدم محتوى المستودع كموقع Static من جذره مباشرة (أو من
الفرع/المجلد المُعرَّف في إعدادات Pages). عندما تفتح صفحة على
`https://USERNAME.github.io/REPOSITORY/`، فإن أي مسار نسبي مثل
`books/file.pdf` يُحل من المتصفح تلقائيًا بالنسبة لمسار الصفحة الحالية،
أي إلى `https://USERNAME.github.io/REPOSITORY/books/file.pdf` — هذه قاعدة
حتمية في HTML/المتصفحات (resolution قياسي للروابط النسبية)، وليست شيئًا
يحتاج اختبارًا حيًا. الشرطان الوحيدان لعملها فعليًا:
1. مجلدا `books/` و`covers/` منشوران فعلًا ضمن نفس نطاق نشر Pages (لن
   يُستبعدا افتراضيًا حتى مع معالجة Jekyll، لأن استبعاد Jekyll الافتراضي
   يطال فقط الملفات/المجلدات التي تبدأ بـ `_`).
2. الصفحة التي تستهلك `ref.pdf` تبني الرابط كمسار نسبي كما هو مخزّن (لا
   تضيف `/` بادئة تحوّله لمسار مطلق من جذر دومين مختلف).

إذا كان الموقع مستضافًا خارج GitHub Pages (Netlify, Vercel, استضافة
مخصصة)، فالمسار النسبي **لن يعمل** كما هو، ويجب حينها تحديد
`PUBLIC_BASE_URL` صراحة.

**إن احتجت `PUBLIC_BASE_URL` لاحقًا** — تجنّب `raw.githubusercontent.com`:
تحققت مباشرة (live test على ملف PDF حقيقي الآن) أنه يرجع HTTP 200 لكن
`Content-Type: application/octet-stream` وليس `application/pdf` (يُنزّل
الملف بدل عرضه في المتصفح؛ مؤكد أيضًا بتقرير علة موثّق من Mozilla لنفس
السلوك). البديل الموثّق لهذه المشكلة تحديدًا هو
`https://cdn.jsdelivr.net/gh/OWNER/REPO@BRANCH` (لم أتمكن من اختبار
Content-Type له مباشرة بأدواتي في هذه الجلسة، لكنه الحل القياسي المعروف).
لكن هذا كله اختياري بالكامل — **القيمة الافتراضية بدون أي إعداد تبقى
المسار النسبي أعلاه.**

## النشر على Render

1. أنشئ **New Web Service** في Render واربطه بهذا المستودع.
2. Render سيقرأ `render.yaml` تلقائيًا (Build/Start command جاهزة).
   - Build command: `pip install -r requirements.txt`
   - Start command: `python run.py`
3. من تبويب **Environment**، أضف القيم الحقيقية للمتغيرات المذكورة أعلاه
   (`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `ALLOWED_ORIGIN`, ...).
4. لا حاجة لتحديد `PORT` يدويًا؛ Render يوفره تلقائيًا ويقرأه الكود.

⚠️ **مهم — عامل واحد فقط (single worker):** الحماية من تعارض الطلبات
المتزامنة تعتمد جزئيًا على قفل (`lock`) داخل نفس العملية، بالإضافة إلى
آلية `sha` من GitHub. إذا شغّلت المشروع بأكثر من عملية (مثلًا
`gunicorn -w 4` أو أكثر من Render Instance)، فإن القفل الداخلي يحمي فقط
الطلبات التي تصل لنفس العملية؛ الحماية من التعارض بين عمليات مختلفة تبقى
معتمدة فقط على إعادة المحاولة عبر `sha`. للحجم الحالي من الاستخدام، يُنصح
بالتشغيل بعملية واحدة (`python run.py`، أو `gunicorn run:app -w 1`) لأبسط
ضمان ممكن.

## نقاط النهاية (Endpoints)

- `GET /api/health` → `{"success": true, "status": "ok"}`
- `POST /api/submit-reference` → `multipart/form-data`:
  - جميع الحقول النصية تُحفظ كما أرسلها الموقع دون أي تغيير في الأسماء.
  - حقل الملف `pdf` (اختياري) → يُرفع إلى `books/<reference-id>.pdf`.
  - حقل الملف `cover` (اختياري) → يُرفع إلى `covers/<reference-id>.<ext>`.
  - الاستجابة عند النجاح: `{"success": true, "message": "...", "id": "REF-2026-00001"}`
  - الاستجابة عند الفشل: `{"success": false, "message": "..."}`

### شكل عنصر المرجع داخل library.json

شكل مسطّح فقط — بلا `files.pdf` / `files.cover` متداخلة، بناءً على تحديد
صريح مني:

```json
{
  "title": "...",
  "id": "REF-2026-00001",
  "status": "pending",
  "submitted_at": "2026-09-03T20:55:27+00:00",
  "pdf": "books/REF-2026-00001.pdf",
  "cover": null
}
```

ملاحظة: لم يتم فحص هذا الشكل ضد كود `js/library.js` أو `js/library-common.js`
الفعلي لأن هذين الملفين غير موجودين في هذه البيئة ولم يُرفعا في أي وقت —
لو رفعتهما يمكن التأكد من هذا الشكل ضد الاستخدام الفعلي في الكود.

## الاختبار

```bash
python -m unittest discover -s tests
```

### اختبار رفع PDF يدويًا (محليًا)

```bash
curl -X POST http://127.0.0.1:5000/api/submit-reference \
  -F "title=عنوان تجريبي" \
  -F "author=اسم المؤلف" \
  -F "pdf=@/path/to/file.pdf;type=application/pdf" \
  -F "cover=@/path/to/cover.jpg;type=image/jpeg"
```

يتطلب هذا الاختبار متغيرات `GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO` فعلية
وصلاحية كتابة على المستودع المستهدف حتى ينجح فعليًا في الرفع؛ بدونها
سترجع استجابة فشل عامة (وهذا هو السلوك المطلوب أمنيًا).
