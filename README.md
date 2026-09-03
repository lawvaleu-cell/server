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

### PUBLIC_BASE_URL (اختياري)

الخادم يخزّن مسار الملف كمسار نسبي داخل المستودع، مثل:

```
books/REF-2026-00001.pdf
```

وهذا يعمل مباشرة إذا كان الموقع يُقرأ من جذر نفس المستودع (مثل GitHub
Pages). إذا كان الموقع يحتاج رابطًا كاملًا بدل المسار النسبي، عرّف
`PUBLIC_BASE_URL` (مثلًا `https://raw.githubusercontent.com/OWNER/REPO/main`)
وسيقوم الخادم بدمجه مع المسار تلقائيًا. إن لم يُعرَّف، يبقى السلوك كما هو
(مسار نسبي فقط) دون أي افتراض إضافي عن بنية الموقع.

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
