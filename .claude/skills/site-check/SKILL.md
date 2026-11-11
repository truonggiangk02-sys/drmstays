---
name: site-check
description: Check the live DRM Stays site end to end and report what is broken (pages, photos, links, SEO, security headers, admin, database migrations, Staydesk, photo storage). Use before and after every deploy, when the owner says something "does not show", "is lost", "is blank" or "shows an error", or when asked to check/review/test the whole site.
---

# Site check

Goal: find problems the way a visitor and the owner would, before they report them. Never change production data while checking.

## 1. Run the crawler

```bash
node scripts/site-check.mjs https://drmstays.vn --password=$ADMIN_PASSWORD
```

- Without `--password` it only sees what visitors see. While `COMING_SOON=1` that is the waiting page, so always log in to check the real site (the password is read from the owner's shell or typed; never ask for it in chat, never write it into files or commands that are saved).
- Add `--browser` for real-browser checks (console errors, photos that fail to show, sideways scroll on phones). Needs `npm install playwright --no-save`.
- It writes `site-check-report.md` and exits 1 when anything FAILS.

## 2. Read the admin health page

`https://drmstays.vn/admin/health` ("Kiểm tra web"). The crawler copies its failures into the report. It covers what the public pages hide: settings, missing migrations (`lib/migrations.ts` vs `d1_migrations`), Staydesk connection, the real error behind "danh sách chưa sẵn sàng", photos per building, files missing in R2, failed Telegram alerts.

## 3. Explain it plainly

Report in the owner's language (Vietnamese): what is broken, why it matters to a guest, and the exact fix with copy-paste commands (Windows PowerShell: `scripts\deploy-production.cmd ...`; Mac: `scripts/deploy-production.sh ...`). Separate "must fix" (✖) from "worth fixing" (!). Do not guess a cause: say what is confirmed and what is not.

## Known causes worth checking first

- Pages say "chưa sẵn sàng" / "đang được cập nhật" but data exists → a migration was not applied (`-Migrate` forgotten) or Staydesk is unreachable. The page catches the error; `wrangler tail drmstays` prints `Public catalog failed: ...`.
- Photos missing on the home page → photos are on room types, not buildings (`lib/building-media.ts` handles it), or the building/type is not set to "Hiển thị cho khách".
- Visitors see "Sắp ra mắt" → `COMING_SOON=1`; open the site with `--live`/`-Live`.
- A browser "This page couldn't load" with a clean server log → usually a browser extension rewriting the page; try a private window.

## Before launch (all must hold)

1. `site-check` shows 0 ✖ with `--password` and `--browser`.
2. Health page has no ✖ and no unexplained !.
3. Telegram test message arrived; privacy/cancellation/terms texts approved; real contact links set.
4. Deployed with `--live` / `-Live`; run `site-check` once more without a password: pages must be 200.
