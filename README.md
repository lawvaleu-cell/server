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
`REFERENCES_DIR`، `COVERS_DIR`، `PORT`.

## النشر على Render

1. أنشئ **New Web Service** في Render واربطه بهذا المستودع.
2. Render سيقرأ `render.yaml` تلقائيًا (Build/Start command جاهزة).
   - Build command: `pip install -r requirements.txt`
   - Start command: `python run.py`
3. من تبويب **Environment**، أضف القيم الحقيقية للمتغيرات المذكورة أعلاه
   (`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `ALLOWED_ORIGIN`, ...).
4. لا حاجة لتحديد `PORT` يدويًا؛ Render يوفره تلقائيًا ويقرأه الكود.

## نقاط النهاية (Endpoints)

- `GET /api/health` → `{"success": true, "status": "ok"}`
- `POST /api/submit-reference` → `multipart/form-data` بنفس الحقول التي
  يرسلها `submit.html` حاليًا (نصوص + PDF + صورة غلاف اختياريين).

## الاختبار

```bash
python -m unittest discover -s tests
```
