# Doraemon Land – Serviced Apartments Đà Nẵng

Website đặt phòng cho các căn hộ dịch vụ Doraemon Land tại Đà Nẵng. Khách xem danh sách phòng, chọn ngày và gửi yêu cầu đặt phòng qua email hoặc WhatsApp; chủ nhà nhận thông báo qua Telegram và quản lý phòng, giá, ảnh, yêu cầu của khách trong trang admin.

- **Framework:** Next.js 16 chạy bằng [vinext](https://github.com/cloudflare/vinext) (Vite 8) trên Cloudflare Workers
- **Database:** Cloudflare D1 (qua Drizzle ORM / SQL migration)
- **Ảnh phòng:** Cloudflare R2 nếu có binding `BUCKET`, nếu không thì lưu base64 trong D1
- **Package manager:** pnpm, Node.js `>=22.13.0`

## Chức năng chính

- Trang chủ và trang chi tiết từng phòng (SEO đầy đủ: canonical, Open Graph, JSON-LD, `robots.txt`, `sitemap.xml`).
- Hai form gửi yêu cầu: email (`/api/inquiries`) và WhatsApp (`/api/whatsapp-inquiries`), đều có honeypot, kiểm tra ngày lưu trú theo giờ Việt Nam, giới hạn dung lượng body và rate limit theo IP/email/số điện thoại.
- Mọi yêu cầu được lưu vào D1 trước, sau đó mới báo Telegram; lỗi Telegram không làm mất yêu cầu của khách.
- Trang admin (`/admin`) bảo vệ bằng mật khẩu: quản lý phòng và giá, ảnh phòng, trạng thái yêu cầu.
- Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy...) chỉ bật ở production, cấu hình trong `next.config.ts`.

## Chạy local

```sh
pnpm install

pnpm dev      # dev server (vinext + HMR) tại http://localhost:5173
pnpm build    # build ra dist/ (gồm dist/server/wrangler.json)
pnpm start    # chạy bản build bằng wrangler dev (D1/R2 local) trên 127.0.0.1
pnpm lint     # ESLint
pnpm test     # Vitest (chạy một lần)
```

Kiểm tra kiểu: `npx tsc --noEmit`.

`pnpm start` đọc cấu hình ở `dist/server/wrangler.json`, nên phải chạy `pnpm build` trước. Thêm `-- --port <port>` để đổi cổng.

> Máy không có `pnpm` trên PATH có thể dùng `corepack pnpm <lệnh>`.

## Biến môi trường và binding

| Tên | Loại | Bắt buộc | Mô tả |
| --- | --- | --- | --- |
| `DB` | D1 binding | Có | Database chính. Không có `DB` thì form đặt phòng trả 503 và trang công khai không lấy được dữ liệu. |
| `BUCKET` | R2 binding | Không | Nơi lưu ảnh phòng. Chưa gắn thì ảnh mới được lưu base64 trong D1 (tốn dung lượng D1, nên gắn R2 khi chạy thật). |
| `ADMIN_PASSWORD` | secret | Có, để dùng admin | Mật khẩu đăng nhập `/admin`. Cookie phiên được ký HMAC từ giá trị này, nên đổi mật khẩu sẽ đăng xuất mọi phiên. |
| `TELEGRAM_BOT_TOKEN` | secret | Khuyến nghị | Token bot Telegram (dạng `123456:ABC...`). |
| `TELEGRAM_CHAT_ID` | secret | Khuyến nghị | ID chat nhận thông báo. Thiếu một trong hai biến Telegram: form email vẫn lưu yêu cầu (không báo), còn form WhatsApp trả 503 vì không có cách báo chủ nhà. |
| `SITE_URL` | biến | Khuyến nghị | Origin công khai, ví dụ `https://doraemonland.example` (không có `/` cuối). Dùng cho canonical, Open Graph, JSON-LD. `robots.txt` và `sitemap.xml` tự dùng origin của request khi chưa đặt. |
| `WHATSAPP_NUMBER` | biến | Không | Số WhatsApp của chủ nhà. Hiện đã khai báo kiểu trong `cloudflare-env.d.ts` nhưng chưa có đoạn code nào đọc biến này. |

Khai báo kiểu của các biến nằm ở `cloudflare-env.d.ts`.

**Local:** `pnpm start` đọc biến từ `dist/server/.dev.vars`:

```
ADMIN_PASSWORD=dat-mat-khau-o-day
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-100123456789
SITE_URL=http://127.0.0.1:8787
```

**Production:** đặt secret/biến và binding trong cấu hình deploy của dự án (hoặc `wrangler secret put <TÊN>` nếu deploy bằng Wrangler). `DB` được khai báo ở `.openai/hosting.json`; thêm `"r2"` ở đó nếu cần binding `BUCKET`.

## Database và migration

Schema nằm ở `db/schema.ts`, các file SQL ở `drizzle/` (`0000` → `0006`). Khi đổi schema: `pnpm db:generate` để sinh migration mới.

**Chạy migration trên D1 local** (sau khi `pnpm build`), lần lượt từng file theo thứ tự, mỗi file một lần:

```sh
for f in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js \
    d1 execute DB --local --persist-to .wrangler/state \
    --config dist/server/wrangler.json --file "$f"
done
```

Dùng `.wrangler/state`, không dùng `.wrangler/state/v3`. Không chạy lại file đã áp dụng (một số file là `ALTER TABLE`, chạy lại sẽ lỗi). Khi chỉ có migration mới, chạy riêng file đó, ví dụ `drizzle/0006_room_images_r2.sql` (thêm cột `r2_key` cho `room_images`).

**Production:** khi publish qua Sites, platform áp migration production riêng từ `drizzle/`. Nếu deploy bằng Wrangler thì phải tự áp các file còn thiếu lên D1 thật theo thứ tự, ví dụ:

```sh
npx wrangler d1 execute <tên-database> --remote --file drizzle/0006_room_images_r2.sql
```

Bảng `inquiry_rate_limits` được dọn định kỳ ngay trong request (xác suất nhỏ mỗi lần), không cần cron.

## API routes

Route công khai:

| Route | Mô tả |
| --- | --- |
| `POST /api/inquiries` | Form email (form-urlencoded/multipart). Kiểm tra origin, honeypot `website`, giới hạn 10 yêu cầu/giờ/IP và 3/giờ/email, body tối đa 12 KB. Lưu D1, báo Telegram, redirect `303` tới `/thanks`. |
| `POST /api/whatsapp-inquiries` | Form WhatsApp (JSON). Giới hạn 10/giờ/IP và 5/giờ/số điện thoại, body tối đa 4 KB, idempotent theo `requestId` (UUID). Trả `{ ok: true }`; `502` nếu Telegram lỗi (yêu cầu vẫn được lưu, khách có thể gửi lại). |
| `GET /api/room-images/[id]` | Trả ảnh phòng từ R2 hoặc D1, kèm `Cache-Control` và `nosniff`. |
| `GET /robots.txt`, `GET /sitemap.xml` | Do route handler sinh ra. |

Route admin (cần cookie đăng nhập và `Origin` cùng site, nếu không trả `403`; đều là `POST`):

| Route | Mô tả |
| --- | --- |
| `/api/admin/login`, `/api/admin/logout` | Đăng nhập/đăng xuất bằng `ADMIN_PASSWORD`. |
| `/api/admin/rooms` | Tạo phòng mới. |
| `/api/admin/listings` | Cập nhật thông tin, giá, số căn trống của phòng. |
| `/api/admin/images` | Tải ảnh lên (JPG/PNG/WebP ≤ 900 KB, tối đa 12 ảnh/phòng) hoặc `delete`/`up`/`down`/`cover`. |
| `/api/admin/inquiries` | Đổi trạng thái yêu cầu của khách. |

## Test

Vitest chạy độc lập với cấu hình Cloudflare (`vitest.config.ts`), các file test nằm ở `tests/`.

- Module `cloudflare:workers` được alias sang `tests/stubs/cloudflare-workers.ts`; test gán binding/biến qua `tests/helpers/env.ts`.
- D1 được giả lập bằng `tests/helpers/d1.ts` (đăng ký handler theo regex SQL, ghi lại mọi câu lệnh đã chạy).
- Telegram được giả lập bằng cách thay `fetch` toàn cục; không test nào gọi mạng thật.
- Có test cho 4 API route (`/api/inquiries`, `/api/whatsapp-inquiries`, `/api/room-images/[id]`, `/api/admin/images`) và cho `lib/dates.ts`, `lib/request.ts`, `lib/rate-limit.ts`.

## Deploy

1. `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`.
2. Áp dụng các migration còn thiếu lên D1 production (xem phần trên).
3. Đặt `ADMIN_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SITE_URL`; gắn binding `BUCKET` nếu dùng R2.
4. Publish theo quy trình Sites của dự án (hoặc deploy `dist/` bằng Wrangler với `--config dist/server/wrangler.json` nếu tự quản lý Cloudflare).
5. Kiểm tra sau deploy: `/robots.txt`, `/sitemap.xml`, gửi thử một yêu cầu qua mỗi form, đăng nhập `/admin`, tải thử một ảnh.

## Cấu trúc thư mục

- `app/` – trang và API route (App Router)
- `components/` – component giao diện (`components/ui/` là shadcn)
- `lib/` – logic dùng chung: dữ liệu phòng, ngày tháng, rate limit, đọc body, Telegram, phiên admin
- `db/`, `drizzle/` – schema và migration SQL
- `tests/` – test Vitest
- `build/`, `scripts/` – hạ tầng build/preview của vinext và Sites
