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

### Xem thử nội bộ bằng một lệnh

```sh
pnpm install            # lần đầu
pnpm preview:local
```

Lệnh này tự build, tạo database local, rồi chạy site tại `http://127.0.0.1:8787` với dữ liệu mẫu (không cần tài khoản Cloudflare hay Staydesk). Mở `/vi`, `/en`, và `/admin` (mật khẩu mặc định `preview-admin`). Chỉ máy này truy cập được; nhấn `Ctrl+C` để dừng. Tùy chọn: `--skip-build` (dùng lại bản build trước, nhanh hơn), `--reset` (xóa database local, bắt đầu lại từ đầu), `--port=8800`.

Muốn thử với dữ liệu Staydesk thật thay vì dữ liệu mẫu: tạo file `.dev.vars` ở thư mục gốc (đã được git bỏ qua) chứa các biến cần dùng, ví dụ `ADMIN_PASSWORD=...`, `STAYDESK_CATALOG_URL=...`, `STAYDESK_CATALOG_SECRET=...` và không có `PREVIEW_DEMO`. Lệnh sẽ dùng file đó thay cho giá trị mặc định.

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
| `SITE_URL` | biến | **Bắt buộc** khi deploy | Origin công khai, ví dụ `https://tên-miền` (https, không có đường dẫn, không có `/` cuối). Dùng cho canonical, hreflang, `og:image`, JSON-LD, sitemap. Thiếu thì các thẻ đó bị bỏ; `scripts/deploy-config.mjs` từ chối deploy nếu thiếu (đặt `ALLOW_MISSING_SITE_URL=1` để bỏ qua có chủ đích) và Worker ghi cảnh báo vào log. Chỉ host của `SITE_URL` được phép lập chỉ mục (xem `STAGING`). |
| `STAGING` | biến | Staging: đặt `1` | Đánh dấu bản staging: mọi phản hồi có `X-Robots-Tag: noindex, nofollow`, mọi trang có `<meta name="robots" content="noindex, nofollow">`, `robots.txt` là `Disallow: /`. Địa chỉ `*.workers.dev`, localhost và mọi host khác `SITE_URL` cũng tự bị noindex. **Không** đặt ở production. |
| `GA_MEASUREMENT_ID` | biến | Production: có | Mã đo lường Google Analytics 4 (dạng `G-XXXXXXXXXX`, không phải bí mật). Chỉ chạy trên website thật đã mở cho khách (`indexable`): không chạy ở staging, `COMING_SOON`, bản xem thử hay trang admin. Thiếu hoặc sai dạng thì không có gì chạy. |
| `HERE_API_KEY` | secret | Không | Tính thời gian đi xe máy trên bản đồ. Cần tọa độ tòa chính xác. |
| `OPENAI_API_KEY` | secret | Không | Dịch nội dung CMS Việt → Anh (chỉ admin kích hoạt, `store: false`). |
| `PREVIEW_DEMO` | biến | Không | Xem mục trên. |

Khai báo kiểu ở `cloudflare-env.d.ts`. **Local:** `pnpm start` đọc biến từ `dist/server/.dev.vars` (mỗi dòng `TÊN=giá trị`). **Production:** đặt trong cấu hình deploy của dự án; `DB` và `BUCKET` khai báo ở `.openai/hosting.json`.

## Database và migration

Schema ở `db/schema.ts`, SQL ở `drizzle/` (`0000` → `0021`). Mỗi file chỉ chạy **một lần**, theo thứ tự (một số là `ALTER TABLE`, chạy lại sẽ lỗi). Database mới thì áp đủ các file; database đã có thì chỉ chạy các file còn thiếu.

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

Trang công khai: `/vi/...` và `/en/...` (trang chủ, `stays`, `buildings/[id]`, `rooms/[id]`, `services`, `partners`, `about`, `journal`, `faq`, `contact`). `/` chuyển hướng vĩnh viễn (308) tới `/vi`. Mỗi trang có metadata riêng; canonical và hreflang chỉ xuất khi có `SITE_URL`. `robots.txt` và `sitemap.xml` do route handler sinh ra (sitemap liệt kê từng trang theo cả hai ngôn ngữ).

API công khai:

| Route | Mô tả |
| --- | --- |
| `POST /api/catalog-inquiries` | Form liên hệ/tư vấn. Kiểm tra origin, honeypot `website`, giới hạn 10/giờ/IP và 5/giờ/số điện thoại, body tối đa 10 KB, ngày theo giờ Việt Nam (tối đa 365 đêm). Lưu D1, báo Telegram, redirect `303`. |
| `POST /api/partner-inquiries` | Form chủ tòa/đối tác. Cùng cơ chế bảo vệ như trên. |
| `GET /media/catalog/[id]` | Ảnh từ R2 (nằm ngoài `/api/` để `robots.txt` không chặn Google đọc ảnh). Cache dài + ETag; ảnh của mục chưa publish chỉ admin xem được. |
| `GET /api/catalog-images/[id]` | Địa chỉ cũ: chuyển hướng 301 sang `/media/catalog/[id]`. |
| `GET /api/travel-time` | Thời gian đi xe máy (HERE), cache 24 giờ trong D1. |

API admin (cần cookie đăng nhập và `Origin` cùng site, nếu không `403`; đều là `POST`): `login`, `logout`, `catalog`, `catalog-images`, `catalog-inquiries`, `partner-inquiries`, `content`, `locations`, `contact-channels`.

Mọi yêu cầu từ khách được lưu D1 **trước**, rồi mới báo Telegram. Telegram lỗi không làm mất yêu cầu: trạng thái `telegram_status` ghi `failed` và trang admin hiện cảnh báo để chủ nhà liên hệ khách thủ công.

## Cẩm nang (blog)

Bài blog viết và đăng ở `/admin/journal` (mục "Cẩm nang" trên menu admin). Bài lưu trong `site_content_items` (section `journal`); tác giả ở bảng `authors`, địa chỉ cũ của bài đã đổi ở `journal_redirects` (migration `0019`, `0020`, `0021`).

- **Tiêu chuẩn SEO–GEO** nằm trong code: mọi giới hạn số ở `lib/blog-standard.ts`, 24 quy tắc kiểm tra (R01–R24) ở `lib/blog-check.ts`. Trình soạn chạy các quy tắc này khi gõ; máy chủ chạy lại chính các quy tắc đó khi lưu (`lib/journal-admin.ts`), nên bài còn lỗi chặn không thể sẵn sàng hay lên web, dù gọi API trực tiếp.
- **Quy trình:** Lưu nháp → Đánh dấu sẵn sàng (không còn lỗi chặn) → người duyệt tích đủ 6 ô → Đăng. Bài đang đăng sửa bằng "Cập nhật bài đã đăng"; "Gỡ xuống" trả bài về nháp (trang bài 404, rời sitemap). Địa chỉ bài bị khóa sau khi đăng; đổi cần xác nhận và địa chỉ cũ tự chuyển hướng.
- **Dán cả bài:** khối thông tin giữa hai dòng `---` ở đầu bài (h1, seo_title, meta, slug, keyword, variations, intent, template, level, topic, author, date, cover_alt) rồi nội dung Markdown; đọc bởi `lib/blog-frontmatter.ts`. Ảnh `![mô tả](https://…)` của website khác được tải về kho ảnh khi người dùng bấm xác nhận (chỉ https, website công khai, tối đa 8 MB).
- **Markdown** chỉ vẽ một tập con an toàn (`lib/journal-markdown.ts`): không bao giờ ra HTML từ bài viết; ảnh chỉ nhận `/media/catalog/<id>`.
- **Ô nội dung** là khung có thanh cuộn riêng luôn hiện, thanh công cụ (H2, H3, đậm, nghiêng, danh sách, đánh số, trích dẫn, bảng, link, thêm mục Key takeaways / Hỏi đáp / Mời liên hệ), phím tắt (Ctrl/⌘ + B, I, K, S; Ctrl/⌘ + Z hoàn tác được từng thao tác), thanh trạng thái (số từ so với mục tiêu của mức, ký tự, thời gian đọc), tab "Dàn ý" để nhảy tới từng mục, và bản sao lưu tự động trong trình duyệt (khôi phục khi mở lại bài chưa lưu). Các thao tác văn bản nằm ở `lib/editor-text.ts` (có test). Các mục thêm sẵn có chỗ trống đánh dấu `[NEEDS INPUT: ...]`, nên quy tắc R16 chặn đăng cho tới khi điền hết.
- **Xem trước** trang bài chạy trong khung `/admin/journal/preview` (cùng CSS với website); chỉ hai trang này được nhúng khung (xem `next.config.ts`), mọi trang khác vẫn `frame-ancestors 'none'`.
- Cần ít nhất một tác giả trước khi đăng bài đầu tiên (nhập ở mục "Tác giả" của `/admin/journal`). Tác giả là một người hoặc một đội nhóm (ví dụ "DRM Stays Marketing Team"); đội nhóm được khai với Google là `Organization` thuộc DRM Stays, người là `Person`.

## Bảo mật

`next.config.ts` đặt CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS và `nosniff` (chỉ ở production). CSP cho phép Google Fonts, `tile.openstreetmap.org` (nền bản đồ) và ảnh cùng origin. Nếu thêm tên miền ngoài cho ảnh, font hay bản đồ thì phải thêm vào CSP, nếu không trình duyệt sẽ chặn.

## Test

Vitest (`vitest.config.ts`), test ở `tests/`. Module `cloudflare:workers` được alias sang `tests/stubs/cloudflare-workers.ts`; binding gán qua `tests/helpers/env.ts`; D1 giả lập ở `tests/helpers/d1.ts`; Telegram giả lập bằng cách thay `fetch` toàn cục, không test nào gọi mạng thật. Có test cho tiêu chuẩn blog (`tests/blog-standard.test.ts`, mỗi quy tắc một ca đạt một ca vi phạm), trình soạn và các route của cẩm nang, và cho 2 route form công khai (`catalog-inquiries`, `partner-inquiries`), cho các hàm phụ (`lib/dates.ts`, `lib/request.ts`, `lib/rate-limit.ts`, `lib/room-copy.ts`) và `tests/admin-auth.test.ts`: tự quét **mọi** route trong `app/api/admin/` và kiểm tra chúng từ chối người chưa đăng nhập, cookie giả, phiên hết hạn và nguồn gửi lạ, nên route admin thêm sau này không thể quên khóa.

## Deploy

Hướng dẫn đầy đủ từng bước (Cloudflare, migration, secret, tên miền, kiểm tra sau deploy, vận hành): xem [`docs/DEPLOY.md`](docs/DEPLOY.md). `pnpm deploy:config` sinh cấu hình Worker với tài nguyên Cloudflare thật.

Tóm tắt:

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
