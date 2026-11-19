# تشغيل Studio Planner في الإنتاج

## المتطلبات

- Docker Compose v2
- نطاق HTTPS وشهادة TLS أمام Nginx أو Reverse Proxy
- أسرار عشوائية طويلة وغير محفوظة داخل Git

## إعداد الأسرار

انسخ `.env.example` إلى `.env` في الخادم، ثم غيّر القيم التالية:

- `APP_ENV=production`
- `DB_PASSWORD`
- `DB_ROOT_PASSWORD`
- `AUTH_SECRET` بطول 32 حرفًا على الأقل
- `ALLOWED_ORIGINS` عند استخدام نطاق مختلف للواجهة

لن يقبل الـ API الأسرار الافتراضية في الإنتاج.

## التشغيل

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

phpMyAdmin غير مفعّل في الإنتاج، ومنفذ MySQL غير منشور خارج شبكة Docker.

## فحوصات قبل الإطلاق

```bash
npm ci
npm test
npm run test:php
npm run test:auth
npm run test:permissions
npm run build
docker compose config --quiet
```

على Windows يمكن تشغيل الفحص الموحد:

```powershell
npm run preflight
```

## النسخ الاحتياطي

يجب أخذ نسخة دورية من قاعدة البيانات وحفظها خارج الخادم. لا تعتمد على Volume واحد كنسخة احتياطية.
