# Bàn giao DRM Stays: giao diện bản đồ, ảnh tòa và tuyến đường

Bản này chỉ nói về bản đồ website khách. Toàn bộ website khách ở `C:\Users\Admin\Documents\ChatGPT\OTA web nội bộ\docs\CLAUDE_HANDOFF_CUSTOMER_WEB_2026-10-27.md`. Web quản lý nội bộ Staydesk có tài liệu **riêng** ở `docs\CLAUDE_HANDOFF_INTERNAL_APP_2026-10-27.md`.

## Đúng dự án

- Checkout cần tiếp tục: `C:\Users\Admin\Documents\ChatGPT\OTA web nội bộ\sites\doraemon-preview`. Checkout này hiện **không có Git remote**; không giả định rằng có thể push trực tiếp từ đây. Repo `C:\Users\Admin\Documents\ChatGPT\OTA web nội bộ\sites\drmstays` mới có remote `github` trỏ đến `truonggiangk02-sys/drmstays` và nhánh `codex/public-catalog-preview`. Đối chiếu lịch sử/diff trước khi chuyển thay đổi sang repo có remote.
- Website tại `http://127.0.0.1:8787` thuộc dự án **khác**: `C:\Users\Admin\Documents\ChatGPT\Web apartment\doraemon-land-danang`. Đừng tìm bản đồ mới trong dự án đó hoặc chép mã giữa hai dự án khi chưa đối chiếu yêu cầu.
- Bản xem thử đúng hiện chạy ở `http://127.0.0.1:8788/vi/stays` và `/en/stays` bằng `node scripts/run-framework.mjs dev --port 8788`.
- `.env.local` (bị Git ignore) đang có `PREVIEW_DEMO=1`. Đã áp dụng 10 migration `drizzle/0000`–`0009` vào D1 **local** để xem UI; không thay đổi D1 production. Dữ liệu, giá và ảnh hiện là mẫu.

## Đã làm trong giao diện, chưa commit/push

- `/vi/stays` và `/en/stays`: danh sách tòa bên trái, bản đồ Leaflet bên phải, ghim 2 tòa mẫu và 25 địa điểm; chọn thẻ/ghim đồng bộ. Điện thoại có nút đổi danh sách/bản đồ.
- Ghim tòa và thẻ đều ghi rõ tọa độ mẫu **tham khảo**, không phải cửa tòa chính xác.
- Chọn tòa mở thẻ ảnh ngay trên bản đồ, kèm tên, địa chỉ, loại phòng, giá tháng và liên kết đến chi tiết. Nếu có nhiều ảnh tòa sẽ có nút chuyển ảnh. Ảnh mẫu có nhãn **Ảnh minh họa**.
- Chọn địa điểm mở thẻ tuyến đường. Nút Google Maps dùng `travelmode=two-wheeler`; khi tọa độ tòa chưa xác nhận, URL cố ý không truyền `origin` để khách tự chọn điểm xuất phát. Không bịa số phút/km.
- Frontend đã sẵn sàng nhận `minutes`, `distanceMeters` và `path: Array<[latitude, longitude]>` từ `/api/travel-time`; nếu có `path` hợp lệ và vị trí tòa đã xác nhận, Leaflet sẽ vẽ polyline. Hiện API chỉ trả `minutes` và `distanceMeters`, nên trang **chưa có đường vẽ trên bản đồ**.
- `/admin/locations` là nơi chủ website quản lý tọa độ tòa và 25 địa điểm; không phải giao diện khách.
- Mã chính: `components/map-explorer.tsx`, `app/map-explorer.css`, `app/map-explorer-polish.css`, `app/[lang]/[[...path]]/page.tsx`, `app/admin/locations/page.tsx`.

## Để có tuyến đường thật ngay trên website

1. Chủ website xác nhận tọa độ **cửa từng tòa** trong `/admin/locations`; khi còn `coordinateApproximate`, không vẽ tuyến từ ghim mẫu và không hiển thị thời gian/km như số liệu chính xác.
2. Kiểm tra dịch vụ định tuyến. `/api/travel-time` hiện dùng HERE `transportMode=scooter`, `return=summary` và cần `HERE_API_KEY`. Nó chưa trả hình tuyến. Cần nguồn dữ liệu hình tuyến thực, trả `path` là mảng `[latitude, longitude]` theo đúng thứ tự đường đi, cùng số phút/km. Kiểm tra quyền sử dụng dữ liệu bản đồ/tuyến trước khi ghép hai nhà cung cấp.
3. Giữ xử lý lỗi rõ ràng, cache phù hợp, kiểm tra trên đường đi thực tế; không vẽ đường thẳng giữa hai ghim. Nếu provider không trả tuyến, giữ nút mở Google Maps.
4. [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) hỗ trợ `two-wheeler`, nhưng [Maps Embed API `directions`](https://developers.google.com/maps/documentation/embed/embedding-map) không liệt kê chế độ này và cần API key. Đừng nhúng URL `/maps/dir/` bằng iframe hoặc tuyên bố đó là bản đồ Google được nhúng.

## Kiểm tra và Git

- `pnpm exec tsc --noEmit` và `pnpm build` đã pass sau thay đổi ảnh/tuyến. ESLint các file sửa: 0 lỗi, còn cảnh báo `<img>`.
- Đã kiểm tra trực tiếp ảnh tòa và thẻ tuyến trên desktop/điện thoại ở `8788`. Ảnh kiểm tra: `C:\Users\Admin\.codex\visualizations\2026\10\27\01a17b37-4407-7f53-9ef7-16153e31dfb0\drmstays-building-photo-map.png`.
- Checkout `doraemon-preview` hiện ở nhánh `main` và có thay đổi UI chưa commit. Người dùng muốn phần giao diện ở nhánh riêng, không gộp nhánh Telegram; kiểm tra `git status`, so sánh với `sites/drmstays` và tạo nhánh thích hợp trước khi commit. Không push/deploy khi chưa kiểm tra lại trạng thái và yêu cầu của người dùng.
- Đọc hướng dẫn Next.js trong `node_modules/next/dist/docs/` trước khi viết thêm mã, theo AGENTS.md.
