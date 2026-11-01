<div dir="rtl">

# 🗂 MatinDesk — میزکار ماتین

**میزکار شخصی کامل:** وظایف و پروژه‌ها، یادداشت‌ها، نشانک‌ها، مدیریت مالی، تقویم و یادآوری — با **ثبت‌نام و حساب کاربری**، **آمار دقیق سمت سرور**، **پشتیبان‌گیری روی گیتهاب**، **نسخه اندروید** و **نسخه دسکتاپ**.

<div dir="ltr">

![CI](https://img.shields.io/badge/CI-GitHub_Actions-10B981)
![Platform](https://img.shields.io/badge/platform-Web_%7C_Android_%7C_Windows_%7C_macOS_%7C_Linux-10B981)
![i18n](https://img.shields.io/badge/i18n-فا_%7C_en_%7C_ع-10B981)
![License](https://img.shields.io/badge/license-MIT-10B981)

</div>

---

## ✨ امکانات

| ماژول | شرح |
|---|---|
| 📊 **داشبورد و آمار دقیق** | محاسبه کامل روی سرور: روند ۱۴روزه تکمیل وظایف، زنجیره روزهای فعال (streak)، وضعیت بودجه، تفکیک هزینه‌ها بر اساس دسته، تراز ماهانه و کل عمر حساب |
| ✅ **وظایف و پروژه‌ها** | اولویت‌ها (۴ سطح)، وضعیت‌ها، تاریخ سررسید، پروژه‌های رنگی، زبانه‌های امروز/آینده/عقب‌افتاده/انجام‌شده |
| 📝 **یادداشت‌ها** | سنجاق‌کردن، رنگ‌بندی، جست‌وجوی فوری |
| 🔖 **نشانک‌ها** | ذخیره و دسته‌بندی لینک‌ها |
| 💰 **مالی** | درآمد/هزینه، دسته‌بندی، بودجه ماهانه با هشدار ۸۰٪ |
| 📅 **تقویم** | رویدادها + یادآوری (دقیقه) |
| 🔍 **جست‌وجوی سراسری** | همه ماژول‌ها با یک جعبه جست‌وجو + Command Palette (کلید `Ctrl+K`) |
| 🔔 **مرکز اعلان** | عقب‌افتاده‌ها، سررسید امروز، رویدادهای نزدیک، بودجه |
| 👥 **ثبت‌نام و حساب کاربری** | ثبت‌نام با نام/رایانامه/گذرواژه، نشست امن ۳۰روزه (کوکی httpOnly)، رمزنگاری scrypt |
| 🐙 **اتصال گیتهاب** | پشتیبان‌گیری کامل داده‌ها روی **Gist** گیتهاب شما؛ PAT به‌صورت AES-256-GCM رمزنگاری و هرگز برگردانده نمی‌شود |
| 📱 **اندروید** | PWA قابل نصب + **APK بومی** (تولید خودکار در GitHub Actions) |
| 🖥 **دسکتاپ** | Windows / macOS / Linux با Tauri 2 |
| 🌐 **سه‌زبانه + RTL** | فارسی، English، العربية — راست‌به‌چپ کامل |
| 🌗 **پوسته‌ها** | تاریک/روشن + ۵ رنگ تأکیدی + مقیاس فونت |
| 💾 **ذخیره‌سازی** | SQLite با Prisma — بهینه و سبک |
| 📤 **ورود/خبر کردن داده** | Import/Export JSON |
| ⚡ **کار آفلاین** | Service Worker — پوسته آفلاین + آخرین داده‌ها |

## 🚀 شروع سریع (محلی)

<div dir="ltr">

```bash
bun install
cp .env.example .env          # سپس MATIN_SECRET را با `openssl rand -hex 32` بسازید
bun run db:push
bun run dev                   # → http://localhost:3000
```

</div>

سپس در صفحه ورود، زبانه **«ثبت‌نام»** را بزنید و حساب بسازید.

## 🐙 انتشار روی گیتهاب (یک دستور)

<div dir="ltr">

```bash
bash scripts/push-to-github.sh
```

</div>

اسکریپت می‌پرسد: نام کاربری، نام مخزن، و توکن PAT (با دسترسی `repo`) — سپس مخزن را می‌سازد و کد را push می‌کند. **توکن فقط در حافظه استفاده و در هیچ فایلی ذخیره نمی‌شود.**

بعد از push، این‌ها خودکار فعال می‌شوند:
- **CI** — روی هر تغییر: lint و build
- **Android APK** — ساخت فایل نصبی در تب Actions (دانلود از Artifacts)
- **Desktop** — خروجی Windows/macOS/Linux با تگ `v*` در بخش Releases

## 🌐 انتشار سرور (برای ثبت‌نام کاربران)

ثبت‌نام روی **سرور** انجام می‌شود؛ پس کافی است سرور را یک‌بار منتشر کنید:

<div dir="ltr">

```bash
# سریع‌ترین راه — Render/Railway با Dockerfile همین مخزن
# یا روی VPS خودتان:
docker compose up -d
```

</div>

راهنمای کامل: **[docs/DEPLOY-FA.md](docs/DEPLOY-FA.md)**

## 📱 اندروید

سه راه:
1. **PWA** — سایت را با Chrome باز کنید → «Add to Home Screen» (فوری، بدون نصب چیزی)
2. **APK خودکار** — تب Actions → «Android APK» → Run workflow → آدرس سرور را بدهید → APK از Artifacts دانلود کنید
3. **ساخت محلی** — `gradle -p android-shell assembleDebug -PappUrl=https://your-server.com`

## 🖥 دسکتاپ

<div dir="ltr">

```bash
# سرور محلی:  bun run dev
# سپس پوسته دسکتاپ:
cd src-tauri && npx @tauri-apps/cli@^2 dev
```

</div>

## 🔐 امنیت

- گذرواژه‌ها با **scrypt** هش می‌شوند (بدون وابستگی خارجی)
- نشست‌ها در دیتابیس + کوکی `httpOnly / SameSite=Lax / secure`
- PAT گیتهاب کاربران با **AES-256-GCM** رمزنگاری می‌شود (`MATIN_SECRET`)
- توکن‌ها هرگز در کد یا لاگ‌ها ظاهر نمی‌شوند

## 🗂 ساختار

<div dir="ltr">

```
├── src/
│   ├── app/                  # Next.js 16 App Router + API
│   │   ├── api/              # auth، data، entity، stats، search، github/backup…
│   │   └── page.tsx          # تک‌صفحه SPA
│   ├── components/matin/     # داشبورد، وظایف، یادداشت، مالی، تقویم، تنظیمات…
│   └── lib/matin/            # store، i18n (fa/en/ar)، سرور (auth، entities، seed)
├── android-shell/            # پوسته بومی اندروید (WebView + Gradle)
├── src-tauri/                # پوسته دسکتاپ (Tauri 2)
├── .github/workflows/        # CI + Android APK + Desktop
├── scripts/push-to-github.sh # انتشار یک‌دستوری
├── Dockerfile / docker-compose.yml
└── docs/DEPLOY-FA.md         # راهنمای انتشار سرور
```

</div>

## 📄 مجوز

MIT — آزاد برای استفاده شخصی و تجاری.
</div>
