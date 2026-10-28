# Hướng dẫn deploy DRM Stays lên Cloudflare

Tài liệu này dành cho lần deploy đầu tiên lên Cloudflare Workers do chính chủ dự án quản lý. Mọi lệnh chạy ở thư mục gốc của repo. Ví dụ trong PowerShell dùng cú pháp `$env:TÊN="giá trị"`; trong bash dùng `TÊN=giá trị lệnh`.

Những bước đã được thử ở máy phát triển: build, sinh cấu hình, áp migration (trên D1 local) và `wrangler deploy --dry-run`. **Chưa thử lần nào lên Cloudflare thật** (cần tài khoản của chủ dự án), nên các bước tạo tài nguyên, secret và tên miền bên dưới là hướng dẫn, chưa được kiểm chứng đầu-cuối.

## Tổng quan

```
Khách ──► Cloudflare Worker (website này) ──► D1 (nội dung, yêu cầu của khách)
                │                        ──► R2 (ảnh)
                └──► Staydesk trên Vercel  (chỉ đọc: ID/tên tòa, phòng, tình trạng trống)
```

Website chỉ đọc danh mục từ Staydesk qua `GET /api/public-catalog` (bearer token). Không có dữ liệu khách, tài chính hay dashboard nội bộ nào đi qua đường này.

## 0. Chuẩn bị

- Tài khoản Cloudflare (gói miễn phí đủ để bắt đầu), và tên miền nếu muốn dùng địa chỉ riêng (tên miền cần quản lý DNS ở Cloudflare để gắn trực tiếp vào Worker).
- Node.js `>=22.13` và `pnpm`. Chạy `pnpm install` một lần.
- Bot Telegram và ID chat nhận thông báo (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).
- Một mật khẩu admin dài, ngẫu nhiên.
- Đăng nhập wrangler bằng tài khoản Cloudflare (mở trình duyệt):

```bash
pnpm exec wrangler login
```

## 1. Kiểm tra phía Staydesk

Website cần `PUBLIC_CATALOG_SECRET` (từ 32 ký tự) đã đặt trên Staydesk, và API `/api/public-catalog` đã chạy trên bản deploy của Staydesk.

Tạo secret ngẫu nhiên (PowerShell):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Hoặc bash:

```bash
openssl rand -base64 48
```

Đặt chuỗi đó vào biến môi trường `PUBLIC_CATALOG_SECRET` của Staydesk trên Vercel, rồi deploy lại Staydesk nếu cần. **Dùng cùng chuỗi này cho `STAYDESK_CATALOG_SECRET` ở bước 5 bên dưới.** Đừng dán nó vào chat hay commit vào Git.

Kiểm tra API (thay địa chỉ Staydesk và secret thật):

```bash
curl -s -H "Authorization: Bearer <SECRET>" "https://<địa-chỉ-staydesk>/api/public-catalog"
```

Kết quả đúng là JSON dạng `{"checkIn":null,"checkOut":null,"buildings":[{"id":"...","name":"...","rooms":[...]}]}`. Lỗi `401` là sai secret, `503` là Staydesk chưa đặt `PUBLIC_CATALOG_SECRET` (hoặc ngắn hơn 32 ký tự).

## 2. Tạo tài nguyên Cloudflare

```bash
pnpm exec wrangler d1 create drmstays-db
```

Lệnh in ra `database_id` (một chuỗi UUID). Ghi lại để dùng ở bước 3.

```bash
pnpm exec wrangler r2 bucket create drmstays-media
```

Đặt tên khác cũng được; khi đó nhớ đặt `D1_DATABASE_NAME` và `R2_BUCKET_NAME` tương ứng ở bước 3.

## 3. Build và sinh cấu hình deploy

Bản build chỉ sinh cấu hình với ID giả (`dist/server/wrangler.json`). Script `scripts/deploy-config.mjs` thay bằng tài nguyên thật và ghi `dist/server/wrangler.deploy.json`:

```bash
pnpm build
```

PowerShell:

```powershell
$env:D1_DATABASE_ID = "<database_id ở bước 2>"
$env:SITE_URL = "https://<tên-miền-chính-thức>"
$env:STAYDESK_CATALOG_URL = "https://<địa-chỉ-staydesk>"
pnpm deploy:config
```

Bash:

```bash
D1_DATABASE_ID=<database_id> SITE_URL=https://<tên-miền> STAYDESK_CATALOG_URL=https://<địa-chỉ-staydesk> pnpm deploy:config
```

Biến tùy chọn: `WORKER_NAME` (mặc định `drmstays`), `D1_DATABASE_NAME` (mặc định `drmstays-db`), `R2_BUCKET_NAME` (mặc định `drmstays-media`).

`SITE_URL` và `STAYDESK_CATALOG_URL` không phải bí mật nên được ghi thẳng vào cấu hình. Mọi giá trị bí mật ở bước 5.

## 4. Áp migration lên database thật

Database mới nên cần áp **toàn bộ** các file trong `drizzle/` (`0000` đến `0012`). Dùng lệnh migration của wrangler: nó ghi lại file nào đã chạy nên chạy lại không áp trùng.

```bash
pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.deploy.json
```

Có thể thử trước trên bản local (không đụng database thật):

```bash
pnpm exec wrangler d1 migrations apply DB --local --config dist/server/wrangler.deploy.json
```

Mỗi lần có migration mới sau này, chạy lại đúng lệnh `--remote` này trước khi deploy.

## 5. Đặt secret

Mỗi lệnh sẽ hỏi giá trị (gõ hoặc dán rồi Enter, giá trị không hiện ra):

```bash
pnpm exec wrangler secret put ADMIN_PASSWORD --config dist/server/wrangler.deploy.json
pnpm exec wrangler secret put STAYDESK_CATALOG_SECRET --config dist/server/wrangler.deploy.json
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN --config dist/server/wrangler.deploy.json
pnpm exec wrangler secret put TELEGRAM_CHAT_ID --config dist/server/wrangler.deploy.json
```

Tùy chọn: `HERE_API_KEY` (thời gian đi xe máy) và `OPENAI_API_KEY` (dịch nội dung CMS).

**Không đặt `PREVIEW_DEMO`.** Biến này làm site hiện phòng mẫu như thật.

Lưu ý: lệnh `secret put` có thể yêu cầu Worker đã tồn tại. Nếu wrangler báo chưa có Worker, chạy bước 6 trước (site sẽ báo lỗi cho tới khi đủ secret), rồi đặt secret và deploy lại.

## 6. Deploy

```bash
pnpm exec wrangler deploy --config dist/server/wrangler.deploy.json
```

Kết quả in ra địa chỉ dạng `https://drmstays.<tài-khoản>.workers.dev`. Mở địa chỉ đó để thử trước khi gắn tên miền.

Muốn xem trước mà không đẩy lên: thêm `--dry-run` (đã thử, chạy được).

## 7. Gắn tên miền

Trong dashboard Cloudflare: Workers & Pages → chọn Worker `drmstays` → Settings → Domains & Routes → thêm Custom Domain. Sau đó đảm bảo `SITE_URL` (bước 3) đúng bằng tên miền này; sửa rồi chạy lại bước 3 và 6 nếu khác.

## 8. Đưa nội dung thật vào (trước khi mở cho khách)

Đăng nhập `https://<tên-miền>/admin` bằng `ADMIN_PASSWORD`.

1. `/admin/catalog`: bật "published" cho tòa và phòng sẽ hiển thị; nhập mô tả, giá, tiện ích.
2. Tải ảnh thật của từng tòa và phòng (không dùng ảnh minh họa).
3. `/admin/locations`, mục "Vị trí tòa nhà": nhập địa chỉ đầy đủ và vĩ độ/kinh độ của **cửa tòa** cho từng tòa, rồi bỏ tích ô "vị trí ghim chỉ mang tính tham khảo". Khi ô này còn tích, website không hiển thị thời gian đi từ tòa. Cùng trang này quản lý các địa điểm trên bản đồ.
4. `/admin/content`: nội dung giới thiệu, dịch vụ, cẩm nang, câu hỏi thường gặp bằng cả tiếng Việt và tiếng Anh.
5. `/admin/contact-channels`: kênh liên hệ nhanh (WhatsApp, Telegram, Facebook, Zalo).

## 9. Kiểm tra sau deploy

- [ ] `https://<tên-miền>/robots.txt` có `Allow: /` và dòng `Sitemap:` (không phải `Disallow: /` toàn bộ; nếu là toàn bộ thì `PREVIEW_DEMO` đang bật).
- [ ] `/sitemap.xml` liệt kê trang theo cả `/vi` và `/en`, có tòa và phòng.
- [ ] `/vi`, `/en`, `/vi/stays`: mở được; bản đồ có nền (nếu trống, kiểm tra tab Console của trình duyệt xem CSP có chặn gì không); chọn ngày thì hiện tình trạng trống từ Staydesk.
- [ ] Một trang phòng: xem nguồn trang, có canonical, hreflang, title riêng.
- [ ] Gửi thử **một** form liên hệ thật: kiểm tra Telegram nhận tin, và bản ghi hiện trong `/admin/catalog-inquiries` với trạng thái "Telegram alert sent". Gửi thử form đối tác tương tự.
- [ ] Gửi form với số điện thoại sai: phải báo lỗi chứ không lưu.
- [ ] Đăng nhập `/admin` được, đăng xuất được; mở `/admin` khi chưa đăng nhập phải chuyển về trang đăng nhập.
- [ ] Mở site bằng điện thoại (iPhone và Android): menu, bản đồ, form.
- [ ] Trang không có phòng mẫu hay chữ "PREVIEW".

## 10. Vận hành

**Cập nhật lên bản mới:** gộp code vào `main`, rồi `pnpm install`, `pnpm build`, bước 3 (sinh cấu hình), bước 4 (nếu có migration mới), bước 6.

**Hoàn tác bản deploy lỗi:**

```bash
pnpm exec wrangler rollback --config dist/server/wrangler.deploy.json
```

**Sao lưu database:** xuất định kỳ ra file SQL và cất ở nơi an toàn. Yêu cầu của khách chỉ nằm trong D1 nên đây là dữ liệu cần bảo vệ.

```bash
pnpm exec wrangler d1 export DB --remote --output backup.sql --config dist/server/wrangler.deploy.json
```

D1 cũng có tính năng khôi phục theo thời điểm (Time Travel); thời hạn lưu phụ thuộc gói, xem tài liệu Cloudflare.

**Đổi mật khẩu admin:** `wrangler secret put ADMIN_PASSWORD ...`. Mọi phiên đăng nhập hiện có sẽ hết hiệu lực.

**Đổi secret Staydesk:** đổi `PUBLIC_CATALOG_SECRET` trên Staydesk và `STAYDESK_CATALOG_SECRET` ở đây **cùng một lúc**; lệch nhau thì danh mục tòa/phòng sẽ không tải được.

**Yêu cầu bị `failed` Telegram:** vào `/admin/catalog-inquiries` hoặc `/admin/partner-inquiries`, dòng có chữ đỏ "Telegram alert FAILED" cần liên hệ khách thủ công. Kiểm tra token và chat ID nếu lỗi lặp lại.

## 11. Lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp |
| --- | --- |
| Trang `/vi/stays` báo "danh sách chưa sẵn sàng" | Staydesk không trả lời: sai `STAYDESK_CATALOG_URL`, sai/thiếu `STAYDESK_CATALOG_SECRET`, hoặc Staydesk chưa đặt `PUBLIC_CATALOG_SECRET`. Thử lệnh `curl` ở bước 1. |
| Ảnh không hiện | Chưa gắn R2 (`BUCKET`), hoặc tòa/phòng chưa bật published. |
| Bản đồ xám, không có nền | CSP chặn tile hoặc mạng chặn `tile.openstreetmap.org`. Xem Console. |
| Gửi form báo 503 | Thiếu binding `DB`, hoặc Staydesk lỗi khi chọn phòng cụ thể. |
| Gửi form báo 429 | Gửi quá nhiều lần (giới hạn theo IP và theo số điện thoại mỗi giờ). |
| `robots.txt` là `Disallow: /` | `PREVIEW_DEMO=1` đang bật. Xóa biến này và deploy lại. |
| Không đăng nhập được admin | Chưa đặt `ADMIN_PASSWORD`, hoặc nhập sai quá 10 lần trong 15 phút (bị khóa tạm). |
| Wrangler báo thiếu quyền | Chạy lại `wrangler login`, hoặc đặt `CLOUDFLARE_API_TOKEN` (mẫu "Edit Cloudflare Workers") khi chạy tự động. |

## 12. Còn chưa kiểm chứng

- Toàn bộ quy trình trên Cloudflare thật (tạo D1/R2, secret, deploy, tên miền).
- Lệnh `secret put` trước khi Worker tồn tại (xem lưu ý ở bước 5).
- Nền bản đồ và ảnh trên trình duyệt thật, và kết nối Staydesk, HERE, Telegram thật.
- Quy trình publish qua nền tảng Sites của ChatGPT (file `.openai/hosting.json`); tài liệu này chỉ mô tả cách tự deploy bằng wrangler.
