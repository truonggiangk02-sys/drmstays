# Tổng hợp back-end DRM Stays (để bàn giao sang tài khoản mới)

Cập nhật: 20/11/2026. Web đã **mở thật** tại https://drmstays.vn (không còn "Sắp ra mắt"). Kho mã: `truonggiangk02-sys/drmstays`, nhánh `main`. Tài liệu chi tiết hơn: `README.md`, `docs/DEPLOY.md`, `docs/KIEM-TRA.md`, `CLAUDE.md`.

## 1. Kiến trúc

| Thành phần | Dùng để làm gì |
| --- | --- |
| Next.js 16 qua **vinext** | Khung web, chạy trên **Cloudflare Workers** |
| **D1** (`drmstays-db`) | Toàn bộ dữ liệu: nội dung, yêu cầu của khách, ảnh (chỉ thông tin), cài đặt |
| **R2** (`drmstays-prod-media`) | File ảnh và các bản sao lưu `backups/` |
| **Staydesk** (app nội bộ, Vercel/Supabase) | Nguồn tòa, phòng, tên, tình trạng trống, qua `/api/public-catalog` |
| Telegram bot | Báo yêu cầu mới và báo sự cố |
| Google Analytics 4 | Chỉ chạy trên web thật |
| Cloudflare Cron | Sao lưu database hằng ngày |

Staydesk chỉ cung cấp tòa/phòng. Mô tả, giá, ảnh, loại phòng, chữ trang nằm trong D1 của web này.

## 2. Biến môi trường và secret (chỉ ghi tên, không ghi giá trị)

| Tên | Loại | Ghi chú |
| --- | --- | --- |
| `DB`, `BUCKET` | binding | D1 và R2 |
| `ADMIN_PASSWORD` | secret | Mật khẩu `/admin`. Đổi là đăng xuất mọi phiên |
| `STAYDESK_CATALOG_SECRET` | secret | **Phải bằng đúng** `PUBLIC_CATALOG_SECRET` trên Vercel (Staydesk), ít nhất 32 ký tự. Đổi cả hai cùng lúc |
| `STAYDESK_CATALOG_URL` | biến | `https://staydesk-nine.vercel.app` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | secret | Báo yêu cầu và sự cố |
| `SITE_URL` | biến | `https://drmstays.vn` (bắt buộc khi deploy) |
| `GA_MEASUREMENT_ID` | biến | Mã GA4 `G-...` |
| `COMING_SOON` | biến | `1` = màn hình chờ. **Hiện đã tắt** (deploy có `-Live`) |
| `REDIRECT_HOSTS` | biến | `www.drmstays.vn` chuyển về tên chính |
| `STAGING` | biến | `1` chỉ ở staging (noindex) |
| `OPENAI_API_KEY` | secret, chưa đặt | Tự dịch Việt → Anh ở trang Nội dung. Chưa quyết định giữ OpenAI hay đổi Gemini |
| `HERE_API_KEY` | secret, tùy chọn | Thời gian đi xe máy trên bản đồ |

**Không bao giờ dán secret vào chat hay commit.** Đặt bằng `wrangler secret put`, hoặc trên Cloudflare.

## 3. Tài nguyên Cloudflare (đổi theo tài khoản)

Sang tài khoản Cloudflare mới thì phải tạo lại và thay các mã này: D1 (`database_id`), bucket R2, Worker, tên miền `drmstays.vn` và `www`, cùng các secret ở mục 2. Mã D1 hiện tại (`b28245d3-977f-4855-b461-d561256c96dd`) chỉ đúng với tài khoản cũ. Staging: Worker `drmstays-staging`, D1 `ae1342bf-37c0-4167-971a-bf71c2eaa290`, bucket `drmstays-media`.

Gói đang dùng là **Cloudflare miễn phí**: có giới hạn thời gian CPU và số truy vấn D1 mỗi lần chạy. Nếu sao lưu hoặc trang nặng bị lỗi vì giới hạn, cân nhắc gói Workers trả phí.

## 4. Database (D1)

Migration `drizzle/0000` đến `0018`, mỗi file chạy **một lần**. Deploy có `-Migrate` / `--migrate` sẽ tự áp những file còn thiếu. Danh sách mong đợi nằm ở `lib/migrations.ts` (có test đối chiếu với thư mục `drizzle/`).

Các nhóm bảng: tòa/phòng/loại phòng/ảnh (`catalog_*`), nội dung trang (`site_content_items`, `home_texts`), yêu cầu (`catalog_inquiries`, `partner_inquiries`, đều có `telegram_status` và `note`), địa điểm bản đồ (`landmarks`), kênh liên hệ và mạng xã hội, giới hạn tần suất (`inquiry_rate_limits`).

## 5. Route back-end

Công khai: `POST /api/catalog-inquiries`, `POST /api/partner-inquiries` (có ô chống bot, giới hạn theo IP và số điện thoại, kiểm tra nguồn gửi), `GET /api/catalog-images/[id]`, `/media/catalog/[id]` (ảnh), `GET /api/travel-time`.

Admin (đều kiểm tra đăng nhập và nguồn gửi, có test tự động quét): `catalog`, `catalog-images`, `room-types`, `content`, `home`, `locations`, `contact-channels`, `social-links`, `catalog-inquiries`, `partner-inquiries`, `inquiry-alerts` (gửi lại Telegram), `backup` (sao lưu ngay), `login`, `logout`.

## 6. Tính năng back-end đã làm

- **Chống spam:** ô ẩn, giới hạn 10 lượt/giờ/IP và 5 lượt/giờ/số điện thoại, giới hạn đăng nhập admin.
- **Telegram:** báo yêu cầu mới của khách và chủ tòa; nếu gửi lỗi thì admin thấy "FAILED" kèm nút **gửi lại**; báo sự cố khi trang công khai không tải được danh sách tòa (tối đa 1 tin/giờ).
- **Yêu cầu của khách:** trạng thái (Mới / Đã liên hệ / Đã chốt), **ghi chú nội bộ**, lọc theo trạng thái có đếm, ô tìm.
- **Sao lưu:** mỗi ngày 03:00 giờ Việt Nam, xuất toàn bộ D1 ra `backups/db-YYYY-MM-DD.sql` trong R2, giữ 14 bản, báo Telegram nếu lỗi, nút **"Sao lưu database ngay"** ở `/admin/health`. Khôi phục: xem `docs/DEPLOY.md`. Bản sao lưu nằm cùng bucket ảnh nên nên tải về một bản cất riêng. Ảnh không được chép thêm.
- **Admin:** trang đầu "Bạn muốn sửa gì?" theo từng trang web; nút tròn ✎ trên mọi trang công khai khi đã đăng nhập; lưu tại chỗ không tải lại trang (`components/save-in-place.tsx`); bản đồ trang → chỗ sửa ở `lib/admin-map.ts`.
- **Kiểm tra sức khỏe:** `/admin/health` (cấu hình, migration, Staydesk, danh sách tòa, ảnh trong R2, Telegram, sao lưu) và công cụ `scripts/site-check.mjs` (quét toàn site, ảnh, liên kết, header bảo mật; `--password=` và `--browser`).
- **SEO nền:** một H1 mỗi trang, tiêu đề/mô tả ở `lib/page-meta.ts`, sitemap, canonical/hreflang, JSON-LD; staging luôn noindex.
- **Màn hình chờ:** `COMING_SOON` (`lib/coming-soon.ts`), admin có cookie vẫn xem được web thật.

## 7. Deploy

Windows (PowerShell, dùng `.cmd` vì máy chặn `.ps1`): `scripts\deploy-production.cmd -D1Id <id> [-Migrate] [-Live]`. Mac: `scripts/deploy-production.sh --d1-id <id> [--migrate] [--live]`. Script hỏi gõ `DEPLOY`. Staging: `scripts\deploy-staging.cmd -SkipPull -Migrate`. Trên máy Windows của chủ dự án, remote GitHub tên là `github`, còn `origin` là thư mục cục bộ.

Quy trình: làm trên nhánh riêng, chạy `tsc`, `pnpm test`, `pnpm lint`, `pnpm build`, mở PR, chỉ gộp khi chủ dự án nói "đưa vào main" (squash), rồi đưa lệnh deploy và nhắc `-Migrate` nếu có migration mới.

## 8. Rủi ro đã gặp: nhiều phiên Claude ghi đè nhau

Các PR từ nhánh làm trên nền cũ đã hai lần ghi đè mất sửa đổi (lưu tại chỗ, form theo tòa, chữ trang chủ). Đã khôi phục và thêm `tests/admin-regressions.test.ts` để báo khi bị mất lần nữa. **Mỗi phiên mới phải bắt đầu từ `origin/main` mới nhất**, và không gộp cả tệp từ nhánh cũ.

## 9. Việc còn lại

1. **Cloudflare Access cho `/admin`** (hiện chỉ có mật khẩu).
2. **Đổi `STAYDESK_CATALOG_SECRET`** (từng bị dán vào chat), đổi cả bên Vercel.
3. **Google Search Console:** thêm `drmstays.vn`, gửi `sitemap.xml`; thêm `drmstays.com` và chuyển hướng.
4. Bấm **"Sao lưu database ngay"** ở `/admin/health` để xác nhận gói miễn phí đủ dùng; tải về một bản cất riêng.
5. **Lê Thanh Nghị** đang bật hiển thị nhưng chưa có ảnh/phòng: ẩn đi hoặc đặt "Đang hoàn thiện" kèm ảnh tiến độ. Núi Thành đang ẩn.
6. **Chính sách** (bảo mật, hủy phòng, điều khoản) chữ nằm trong `lib/policies.ts`, chưa sửa được trong admin; cần tỷ lệ hủy phòng và tên pháp nhân thật.
7. **Tự dịch:** chọn OpenAI hay Gemini; mô tả tòa/phòng chưa có tự dịch.
8. Xác nhận hai câu "3 năm hoạt động", "hơn 10 dự án" trên trang Giới thiệu.
9. SEO nhóm B: kích thước ảnh, Core Web Vitals, trang chủ đề, schema FAQ/breadcrumb; nhập phòng hàng loạt bằng CSV (tùy chọn).
10. Viết lại chữ trang Dịch vụ, FAQ, Dành cho chủ tòa (đã làm trang chủ và Giới thiệu).

## 9b. Lời nhắn khi mở phiên mới ở tài khoản mới

Dán đoạn này vào phiên đầu tiên: "Đọc `CLAUDE.md`, `AGENTS.md` và `docs/BACKEND-HANDOVER.md` trong kho `truonggiangk02-sys/drmstays`. Bắt đầu từ `origin/main` mới nhất, làm trên nhánh riêng, chạy tsc/test/lint/build trước khi mở PR, chỉ gộp khi tôi nói 'đưa vào main', không đổi `COMING_SOON`, không deploy production khi chưa hỏi, không dán secret vào chat."
