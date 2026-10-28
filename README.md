# DRM Stays – website khách (Đà Nẵng)

Website song ngữ (`/vi`, `/en`) giới thiệu các tòa nhà và từng phòng của DRM Stays: ảnh, diện tích, tiện ích, giá tháng, bản đồ và thời gian di chuyển tới các địa điểm. Khách gửi yêu cầu tư vấn hoặc chủ tòa gửi thông tin hợp tác; chủ nhà nhận thông báo qua Telegram và quản lý nội dung, ảnh, yêu cầu trong `/admin`.

- **Framework:** Next.js 16 chạy bằng [vinext](https://github.com/cloudflare/vinext) (Vite 8) trên Cloudflare Workers
- **Database:** Cloudflare D1 (SQL migration trong `drizzle/`)
- **Ảnh:** Cloudflare R2 (binding `BUCKET`)
- **Nguồn danh mục tòa/phòng và tình trạng trống:** API công khai của Staydesk (`STAYDESK_CATALOG_URL`)
- **Package manager:** pnpm, Node.js `>=22.13.0`

## Chạy local

```sh
pnpm install
pnpm dev      # dev server (vinext + HMR) tại http://localhost:5173
pnpm build    # build ra dist/ (gồm dist/server/wrangler.json)
pnpm start    # chạy bản build bằng wrangler dev (D1/R2 local) trên 127.0.0.1:8787
pnpm lint
pnpm test     # Vitest
```

Kiểm tra kiểu: `npx tsc --noEmit`. `pnpm start` đọc cấu hình ở `dist/server/wrangler.json` nên phải `pnpm build` trước.

Chế độ xem thử không cần Staydesk: đặt `PREVIEW_DEMO=1`. Nó hiển thị phòng mẫu, nên site tự gửi `noindex`, `robots.txt` chặn toàn bộ và sitemap rỗng. **Tuyệt đối không bật ở production.**

## Biến môi trường và binding

| Tên | Loại | Bắt buộc | Mô tả |
| --- | --- | --- | --- |
| `DB` | D1 binding | Có | Database chính. Thiếu thì các form trả 503. |
| `BUCKET` | R2 binding | Có (ảnh) | Ảnh tòa/phòng/bài viết. Thiếu thì ảnh không hiển thị. |
| `ADMIN_PASSWORD` | secret | Có, để dùng admin | Mật khẩu `/admin`. Cookie phiên ký HMAC từ giá trị này; đổi mật khẩu sẽ đăng xuất mọi phiên. Dùng chuỗi dài, ngẫu nhiên. |
| `STAYDESK_CATALOG_SECRET` | secret | Có (trừ demo) | Phải khớp `PUBLIC_CATALOG_SECRET` bên Staydesk, tối thiểu 32 ký tự. |
| `STAYDESK_CATALOG_URL` | biến | Nên đặt | Địa chỉ HTTPS của Staydesk. Mặc định trong code là `https://staydesk-nine.vercel.app`. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | secret | Khuyến nghị | Nhận thông báo yêu cầu mới. Thiếu thì yêu cầu vẫn được lưu nhưng không có thông báo (admin hiện "No Telegram alert"). |
| `SITE_URL` | biến | Khuyến nghị | Origin công khai, ví dụ `https://tên-miền` (không có `/` cuối). Dùng cho canonical, hreflang, Open Graph. Thiếu thì các thẻ đó bị bỏ; `robots.txt` và `sitemap.xml` dùng origin của request. |
| `HERE_API_KEY` | secret | Không | Tính thời gian đi xe máy trên bản đồ. Cần tọa độ tòa chính xác. |
| `OPENAI_API_KEY` | secret | Không | Dịch nội dung CMS Việt → Anh (chỉ admin kích hoạt, `store: false`). |
| `PREVIEW_DEMO` | biến | Không | Xem mục trên. |

Khai báo kiểu ở `cloudflare-env.d.ts`. **Local:** `pnpm start` đọc biến từ `dist/server/.dev.vars` (mỗi dòng `TÊN=giá trị`). **Production:** đặt trong cấu hình deploy của dự án; `DB` và `BUCKET` khai báo ở `.openai/hosting.json`.

## Database và migration

Schema ở `db/schema.ts`, SQL ở `drizzle/` (`0000` → `0012`). Mỗi file chỉ chạy **một lần**, theo thứ tự (một số là `ALTER TABLE`, chạy lại sẽ lỗi). Database mới thì áp đủ các file; database đã có thì chỉ chạy các file còn thiếu.

Chạy trên D1 local (sau `pnpm build`):

```sh
for f in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js \
    d1 execute DB --local --persist-to .wrangler/state \
    --config dist/server/wrangler.json --file "$f"
done
```

Production: nếu deploy bằng Wrangler, áp từng file còn thiếu, ví dụ `npx wrangler d1 execute <tên-database> --remote --file drizzle/0012_inquiry_alerts.sql`.

Bảng `inquiry_rate_limits` được dọn ngay trong request (xác suất nhỏ mỗi lần), không cần cron.

## Route chính

Trang công khai: `/vi/...` và `/en/...` (trang chủ, `stays`, `buildings/[id]`, `rooms/[id]`, `services`, `partners`, `about`, `journal`, `faq`, `contact`). `/` chuyển hướng tới `/vi`. Mỗi trang có metadata riêng; canonical và hreflang chỉ xuất khi có `SITE_URL`. `robots.txt` và `sitemap.xml` do route handler sinh ra (sitemap liệt kê từng trang theo cả hai ngôn ngữ).

API công khai:

| Route | Mô tả |
| --- | --- |
| `POST /api/catalog-inquiries` | Form liên hệ/tư vấn. Kiểm tra origin, honeypot `website`, giới hạn 10/giờ/IP và 5/giờ/số điện thoại, body tối đa 10 KB, ngày theo giờ Việt Nam (tối đa 365 đêm). Lưu D1, báo Telegram, redirect `303`. |
| `POST /api/partner-inquiries` | Form chủ tòa/đối tác. Cùng cơ chế bảo vệ như trên. |
| `GET /api/catalog-images/[id]` | Ảnh từ R2; ảnh của mục chưa publish chỉ admin xem được. |
| `GET /api/travel-time` | Thời gian đi xe máy (HERE), cache 24 giờ trong D1. |
| `POST /api/inquiries`, `POST /api/whatsapp-inquiries` | Form đặt phòng của site Doraemon Land cũ (còn lại trong mã, giữ lại cùng cơ chế bảo vệ). |

API admin (cần cookie đăng nhập và `Origin` cùng site, nếu không `403`; đều là `POST`): `login`, `logout`, `catalog`, `catalog-images`, `catalog-inquiries`, `partner-inquiries`, `content`, `locations`, và các route phòng cũ `rooms`, `listings`, `images`, `inquiries`.

Mọi yêu cầu từ khách được lưu D1 **trước**, rồi mới báo Telegram. Telegram lỗi không làm mất yêu cầu: trạng thái `telegram_status` ghi `failed` và trang admin hiện cảnh báo để chủ nhà liên hệ khách thủ công.

## Bảo mật

`next.config.ts` đặt CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS và `nosniff` (chỉ ở production). CSP cho phép Google Fonts, `tile.openstreetmap.org` (nền bản đồ) và ảnh cùng origin. Nếu thêm tên miền ngoài cho ảnh, font hay bản đồ thì phải thêm vào CSP, nếu không trình duyệt sẽ chặn.

## Test

Vitest (`vitest.config.ts`), test ở `tests/`. Module `cloudflare:workers` được alias sang `tests/stubs/cloudflare-workers.ts`; binding gán qua `tests/helpers/env.ts`; D1 giả lập ở `tests/helpers/d1.ts`; Telegram giả lập bằng cách thay `fetch` toàn cục, không test nào gọi mạng thật. Có test cho 4 route form công khai và cho `lib/dates.ts`, `lib/request.ts`, `lib/rate-limit.ts`.

## Deploy

1. `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`.
2. Áp các migration còn thiếu lên D1 production.
3. Đặt biến/secret và binding như bảng trên; **không** đặt `PREVIEW_DEMO`.
4. Deploy, rồi kiểm tra: `/robots.txt`, `/sitemap.xml`, mở một trang phòng và xem nguồn trang (canonical, hreflang), bản đồ có tải nền, gửi thử mỗi form và xác nhận Telegram nhận được tin, đăng nhập `/admin`.

## Cấu trúc thư mục

- `app/` – trang và API route (App Router); `app/[lang]/[[...path]]/page.tsx` là trang khách song ngữ
- `components/` – giao diện (`components/ui/` là shadcn, `map-explorer.tsx` là bản đồ)
- `lib/` – dữ liệu danh mục, Staydesk, ngày tháng, rate limit, đọc body, Telegram, phiên admin, SEO
- `db/`, `drizzle/` – schema và migration SQL
- `tests/` – test Vitest
- `build/`, `scripts/` – hạ tầng build/preview của vinext
