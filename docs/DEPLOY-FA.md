<div dir="rtl">

# 🌐 راهنمای انتشار سرور MatinDesk

ثبت‌نام و آمار روی **سرور** کار می‌کند؛ پس برای اینکه کاربران بتوانند حساب بسازند، سرور را با یکی از روش‌های زیر منتشر کنید.

---

## گزینه ۱ — Render (سریع‌ترین راه، پلن رایگان)

1. کد را با `scripts/push-to-github.sh` روی گیتهاب منتشر کنید
2. وارد [render.com](https://render.com) شوید → **New → Web Service**
3. مخزن `matindesk` را انتخاب کنید
4. تنظیمات:
   - **Runtime:** Docker (خودکار از Dockerfile)
   - **Instance Type:** Free
5. در بخش **Environment** این متغیر را اضافه کنید:
   - `MATIN_SECRET` = خروجی `openssl rand -hex 32`
6. **Create Web Service** — چند دقیقه بعد سرور روی `https://matindesk-xxxx.onrender.com` بالاست ✅

> ⚠️ پلن رایگان Render دیتابیس SQLite را روی دیسک موقت نگه می‌دارد؛ برای داده‌های واقعی از گزینه Docker/VPS یا Disk (پولی) استفاده کنید.

## گزینه ۲ — Railway

1. [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo**
2. مخزن را انتخاب کنید — Railway خودش Dockerfile را می‌شناسد
3. Variables → `MATIN_SECRET` را اضافه کنید
4. Settings → Networking → **Generate Domain**

## گزینه ۳ — VPS شخصی (Docker)

<div dir="ltr">

```bash
# روی سرور:
git clone https://github.com/YOUR_USER/matindesk.git
cd matindesk
echo "MATIN_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d --build
```

</div>

سپس با Nginx/Caddy دامنه را به پورت 3000 وصل کنید و SSL بگیرید:

<div dir="ltr">

```nginx
# Caddyfile — با SSL خودکار
matindesk.example.com {
    reverse_proxy localhost:3000
}
```

</div>

داده‌ها در volume ی `matindesk-data` ذخیره می‌شوند و با `docker compose down` از بین نمی‌روند.

---

## ⚙️ متغیرهای محیطی

| متغیر | الزامی | توضیح |
|---|---|---|
| `DATABASE_URL` | ✅ (پیش‌فرض Docker) | `file:/app/db/custom.db` |
| `MATIN_SECRET` | ✅ در تولید | کلید رمزنگاری PAT گیتهاب — حتماً ۶۴ کاراکتر هگز تصادفی |
| `PORT` | — | پیش‌فرض 3000 |

## 📱 بعد از انتشار: APK اندروید بسازید

1. در گیتهاب: **Settings → Secrets and variables → Actions → Variables**
2. متغیر `APP_URL` بسازید = آدرس سرور منتشرشده (مثلاً `https://matindesk-xxxx.onrender.com`)
3. تب **Actions → Android APK → Run workflow**
4. بعد از اتمام، از Artifacts فایل `matindesk-apk` را دانلود کنید
5. فایل APK را به گوشی بدهید و نصب کنید («نصب از منابع ناشناس» را موقتاً فعال کنید)

برای انتشار رسمی در Releases: یک تگ بزنید:

<div dir="ltr">

```bash
git tag v1.0.0 && git push origin v1.0.0
```

</div>

APK در همان نسخه Release پیوست می‌شود.

## 🖥 خروجی دسکتاپ (Windows/macOS/Linux)

تگ بزنید یا **Actions → Desktop (Tauri) → Run workflow** — خروجی‌ها (`msi/exe`، `dmg`، `deb/AppImage`) در Artifacts/Releases قرار می‌گیرند. آدرس سرور را هم می‌توانید در همان اجرا وارد کنید تا اپ دسکتاپ مستقیم به سرور شما وصل شود.

## 🐙 اتصال حساب گیتهاب کاربران (پشتیبان‌گیری)

داخل اپ: **تنظیمات → گیتهاب** → توکن PAT (دسترسی `gist`) را وارد کنید.
- یک Gist خصوصی ساخته می‌شود و کل داده‌های کاربر (وظایف، یادداشت‌ها، مالی…) در آن پشتیبان‌گیری می‌شود
- توکن با AES-256-GCM رمزنگاری و فقط رمزنگاری‌شده ذخیره می‌شود
- هر زمان که خواستید، بازگردانی یک‌کلیکی انجام می‌شود

## 🩺 عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| خطای 500 هنگام ثبت‌نام | `MATIN_SECRET` تنظیم نشده — اضافه کنید و ری‌استارت کنید |
| دیتابیس خطا می‌دهد | `DATABASE_URL` را بررسی کنید؛ در Docker مسیر `/app/db/custom.db` |
| APK باز نمی‌شود | آدرس سرور در ساخت APK باید درست باشد؛ دوباره با `-PappUrl=...` بسازید |
| کوکی ذخیره نمی‌شود | سایت باید HTTPS باشد (کوکی `secure` است) |

</div>
