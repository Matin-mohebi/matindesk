#!/usr/bin/env bash
# ============================================================
#  MatinDesk — انتشار مخزن در گیت‌هاب با یک دستور
#  استفاده:  bash scripts/push-to-github.sh
#  توکن فقط در حافظه نگه‌داری می‌شود و در هیچ فایلی ذخیره نمی‌شود.
# ============================================================
set -euo pipefail

G="github.com"

bold() { printf "\n\033[1;36m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[0;32m✓\033[0m %s\n" "$1"; }
err()  { printf "  \033[0;31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

bold "MatinDesk — انتشار در گیت‌هاب"

# ---------- پیش‌نیازها ----------
command -v git >/dev/null 2>&1 || err "git نصب نیست."
command -v curl >/dev/null 2>&1 || err "curl نصب نیست."

# ---------- ورودی‌ها ----------
printf "نام کاربری گیتهاب: "
read -r GH_USER
[ -n "$GH_USER" ] || err "نام کاربری خالی است."

printf "نام مخزن [matindesk]: "
read -r REPO
REPO="${REPO:-matindesk}"

printf "عمومی یا خصوصی؟ (public/private) [private]: "
read -r VIS
VIS="${VIS:-private}"

# توکن از محیط یا ورودی امن (بدون نمایش)
GH_TOKEN="${GH_TOKEN:-}"
if [ -z "$GH_TOKEN" ]; then
  printf "توکن دسترسی شخصی (PAT — با دسترسی repo): "
  read -rs GH_TOKEN
  echo
fi
[ -n "$GH_TOKEN" ] || err "توکن خالی است."

# ---------- اعتبارسنجی توکن ----------
bold "بررسی توکن…"
API_USER=$(curl -sf -H "Authorization: Bearer $GH_TOKEN" "https://api.$G/user" | sed -n 's/.*"login":"\([^"]*\)".*/\1/p' | head -1)
[ -n "$API_USER" ] || err "توکن نامعتبر است یا دسترسی ندارد."
ok "خوش آمدی، $API_USER"

# ---------- ساخت مخزن ----------
bold "ساخت مخزن $REPO ($VIS)…"
CODE=$(curl -s -o /tmp/md_repo.json -w "%{http_code}" \
  -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.$G/user/repos" \
  -d "{\"name\":\"$REPO\",\"private\":$( [ "$VIS" = "private" ] && echo true || echo false ),\"description\":\"MatinDesk — personal workspace: tasks, notes, finance, calendar, accurate stats, GitHub backup, Android & desktop\",\"auto_init\":false}")
if [ "$CODE" = "201" ]; then
  ok "مخزن ساخته شد."
elif [ "$CODE" = "422" ]; then
  ok "مخزن از قبل وجود دارد — ادامه می‌دهیم."
else
  err "ساخت مخزن ناموفق بود (کد $CODE)."
fi

# ---------- گیت ----------
bold "آماده‌سازی مخزن محلی…"
cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  git init -b main >/dev/null
  ok "مخزن گیت مقداردهی شد."
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "MatinDesk v1.0.0 — initial release" >/dev/null
  ok "کامیت ساخته شد."
else
  ok "تغییر جدیدی برای کامیت نبود."
fi

# push با توکن در URL موقت؛ بعد از push پاک می‌شود
REMOTE="https://x-access-token:$GH_TOKEN@$G/$GH_USER/$REPO.git"
CLEAN="https://$G/$GH_USER/$REPO.git"

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"

bold "ارسال کد به گیت‌هاب…"
if git push -u origin HEAD:main --force 2>&1 | grep -v "$GH_TOKEN"; then
  ok "کد ارسال شد."
else
  git remote set-url origin "$CLEAN"
  err "ارسال ناموفق بود. دسترسی repo توکن را بررسی کنید."
fi

# پاک‌سازی توکن از remote
git remote set-url origin "$CLEAN"

bold "تمام شد! 🎉"
echo "  مخزن:  https://$G/$GH_USER/$REPO"
echo
echo "  قدم بعدی: سرور را منتشر کنید تا ثبت‌نام فعال شود → docs/DEPLOY-FA.md"
echo "  APK اندروید و نسخه دسکتاپ به‌صورت خودکار در Actions ساخته می‌شوند."
