# حزمة الإنتاج على Nginx بدون Docker

## المتطلبات

Nginx وحده لا ينفذ PHP. يلزم وجود:

- Nginx.
- PHP-FPM 8.4 أو أحدث.
- PHP extensions: `pdo`, `pdo_mysql`, `mbstring`, `json`.
- MySQL 8 أو MariaDB متوافق.
- HTTPS عبر شهادة TLS.

## الملفات التي تُنشر

انشر فقط الملفات التالية:

```text
index.html
projects.html
clients.html
settings.html
guide.html
manifest.json
sw.js
icons/
css/
js/
api/
```

ولا تنشر:

```text
.env
.git/
.vscode/
node_modules/
dist/           # إلا إذا كان هو ناتج النشر المعتمد لديك
docker/
docker-compose.yml
docker-compose.prod.yml
tests/
docs/
package.json
package-lock.json
README.md
```

## ملاحظة مهمة عن Build

شغّل `npm run build` في بيئة البناء، ثم راجع الملفات الناتجة. لأن الـ API PHP ليس جزءًا من Webpack، يجب أن تكون مجلدات الواجهة و`api/` معًا في Document Root، أو تُفصل الواجهة في Root مستقل مع تمرير `/api/` إلى PHP-FPM.

## إعداد Nginx المقترح

```nginx
server {
    listen 443 ssl http2;
    server_name planner.example.com;
    root /var/www/studio-planner;
    index index.html;

    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\.(?!well-known) { deny all; }
    location ~* \.(env|sql|bak|backup|log|map)$ { deny all; }
}
```

## إعدادات الخادم

- ضع `.env` خارج Document Root أو احمه بصلاحيات الخادم.
- استخدم `APP_ENV=production`.
- استخدم أسرارًا عشوائية طويلة.
- لا تفتح منفذ MySQL للإنترنت.
- اجعل PHP-FPM يعمل بمستخدم محدود الصلاحيات.
- فعّل نسخًا احتياطية يومية واختبر الاستعادة.
