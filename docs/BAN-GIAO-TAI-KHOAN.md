# Bàn giao giao diện website DRM Stays cho tài khoản Claude mới

Tài liệu này giúp một phiên Claude mới (tài khoản khác) làm tiếp phần **giao diện website khách** `drmstays.vn` mà không phải hỏi lại từ đầu. Không chứa mật khẩu hay khóa bí mật.

## 1. Cách tiếp tục ở tài khoản mới

1. Trong tài khoản Claude mới, kết nối GitHub (đã làm) và chọn đúng kho **`truonggiangk02-sys/drmstays`** khi mở phiên. Nếu tài khoản GitHub của tài khoản Claude mới **khác** `truonggiangk02-sys`, tài khoản đó phải được cấp quyền đọc/ghi vào kho này (Settings → Collaborators), hoặc chủ kho chuyển kho cho tài khoản mới (Settings → Transfer ownership). Chuyển quyền giữ nguyên lịch sử commit.
2. Môi trường đám mây mặc định **chặn mạng** ra ngoài. Để Claude xem được website thật, thêm `drmstays.vn` và `www.drmstays.vn` vào danh sách host được phép của môi trường (môi trường "DRM Stays" đã tạo ở tài khoản cũ không chuyển sang tài khoản mới).
3. Cuộc hội thoại cũ **không** chuyển sang. Mọi thứ cần thiết nằm trong kho: `CLAUDE.md`, `AGENTS.md`, thư mục `docs/` và tài liệu này.
4. Nhánh làm việc cuối của phiên cũ: `claude/upbeat-cori-fcnvfa`. Mọi công việc đã được gộp vào `main` bằng squash, trừ vài commit nhỏ nếu còn nằm trên nhánh này (xem `git log origin/main..origin/claude/upbeat-cori-fcnvfa`).

## 2. Cách làm việc đã thống nhất với chủ dự án

- Chủ dự án nói tiếng Việt, khách hàng của website chủ yếu là người nước ngoài (có cả người Nhật). Trả lời bằng tiếng Việt, ngắn gọn, nói rõ việc nào đã kiểm tra và việc nào chưa.
- Quy trình: làm trên nhánh, tự kiểm tra (`tsc`, `vitest`, `pnpm build`, xem thử), đẩy nhánh, báo kết quả. Chủ dự án xem rồi nhắn **"đưa vào main"** thì mới tạo PR và squash-merge. Sau đó đưa lệnh deploy.
- Không bao giờ force push. Nếu nhánh có xung đột chỉ vì `main` giữ bản squash của chính nhánh, dùng `git merge -s ours origin/main` rồi push thường (sau khi kiểm tra không mất thay đổi của người khác).
- Không ghi đè file test có sẵn. Thêm test mới vào file mới hoặc nối thêm vào cuối.
- Mọi thay đổi CSS phải qua `tests/css-integrity.test.ts` (bắt lỗi selector bị cắt dòng).
- Không bịa nội dung: lời khen khách hàng, số liệu, doanh thu, ảnh. Doanh thu chi tiết không đăng công khai (chỉ qua liên kết riêng cho chủ nhà).

## 3. Quy tắc giao diện của chủ dự án (đã bị nhắc nhiều lần)

- Chữ **tuyệt đối không chồng lên nhau** hay chồng lên ảnh. Kiểm tra bằng khung bao (bounding box) ở nhiều cỡ màn hình, cả tiếng Việt lẫn tiếng Anh.
- **Không cắt ảnh** nếu tránh được: dùng khung theo tỷ lệ ảnh, hàng ảnh cân bằng (`lib/justified.ts`, `components/justified-photos.tsx`).
- **Ảnh 3D (render) và ảnh tiến độ của tòa đang hoàn thiện** chỉ dùng làm ảnh bìa của chính tòa đó. Không đưa vào review, dịch vụ, bộ sưu tập ảnh, trang phòng (xem `lib/building-media.ts`: `buildingPhotos` và `buildingCover`).
- Nội dung phải trải đủ chiều rộng, không thừa khoảng trắng hai bên. Tiêu đề phải có cá tính, không chung chung. Văn bản không lặp.
- Phong cách chung: biên tập (editorial), chữ serif Playfair cho tiêu đề, nền kem, xanh đậm `#17372d`, vàng đồng `#ae815d`.
- Hiệu ứng mượt, tôn trọng `prefers-reduced-motion`. Hiệu ứng xuất hiện gắn **từng phần tử** (`data-reveal`), không gắn cho cả khối quá cao.

## 4. Cấu trúc nhanh

- Nền tảng: Cloudflare Workers + D1 + R2, dựng bằng vinext (tương thích Next). Danh mục phòng lấy từ Staydesk (Vercel). Xem `AGENTS.md` về khác biệt của Next ở bản này.
- Trang theo ngôn ngữ: `app/[lang]/[[...path]]/page.tsx`. CSS nạp trong `app/[lang]/layout.tsx`.
- Trang chủ: `components/public-home.tsx`, `components/home-bento.tsx` (khối các tòa), `components/home-motion.tsx` (review tự lướt, FAQ). Chữ mặc định ở `lib/home-content.ts`, sửa được ở `/admin/home`.
- Trang Stays (tìm phòng): `components/stays-hero.tsx`, `components/stays-search.tsx` (danh sách phòng, nút Bộ lọc mở menu, chế độ bản đồ), `components/stays-map.tsx`.
- Trang phòng/loại phòng/tòa: `components/detail-gallery.tsx` (toàn bộ ảnh một khối, chia theo khu vực khi đã gắn), `app/detail.css`.
- Giới thiệu, Dịch vụ, Dành cho chủ đầu tư: `components/about-page.tsx`, `components/services-showcase.tsx`, `components/investor-page.tsx`, `app/about.css`.
- Nội dung chỉnh sửa trong admin: bảng `site_content_items`, mặc định ở `lib/site-content.ts` (`sampleContent`). Ảnh tải ở `/admin/media`, khu vực ảnh ở cột `catalog_images.area` (migration `0017`).
- Chạy thử trên máy: `node scripts/local-preview.mjs` (chế độ demo, mật khẩu admin chỉ dùng thử cục bộ, tự tắt sau khoảng 5 phút). Dữ liệu demo không có loại phòng và ảnh demo không tải được.

## 5. Triển khai (deploy)

Chủ dự án tự deploy production. Mac:

```bash
cd ~/drmstays && git checkout main && git pull origin main
scripts/deploy-production.sh --d1-id b28245d3-977f-4855-b461-d561256c96dd --skip-pull --live
```

Windows (PowerShell, thư mục dự án): `git pull github main` rồi `scripts\deploy-production.cmd -D1Id b28245d3-977f-4855-b461-d561256c96dd -SkipPull -Live`. Gõ `DEPLOY` (chữ hoa) khi được hỏi. Thêm `--migrate` / `-Migrate` **chỉ khi** có file mới trong `drizzle/`. Bỏ `--live` thì web về trang "Sắp ra mắt". Chi tiết ở `docs/DEPLOY.md`, kiểm tra ở `docs/KIEM-TRA.md`.

## 6. Tình trạng đã biết (cập nhật 20/11/2026)

- Web đã mở cho khách. Cloudflare đã nâng **Workers Paid**; trước đó gói Free gây lỗi 1102 khi tải đồng thời, sau khi nâng thì các lượt thử không còn lỗi.
- Các trang chính đã đủ kích thước ảnh. Nếu thêm ảnh mới, dùng nút bổ sung kích thước ở `/admin/media`.
- Chờ chủ dự án: gắn khu vực cho ảnh phòng; tải ảnh dịch vụ và ảnh báo cáo cho chủ nhà (mục "Ảnh báo cáo cho chủ nhà", tối đa 4 ảnh); duyệt nội dung Giới thiệu do Claude soạn; xác nhận số "75%" và "10+ dự án"; địa chỉ Doraemonland; tọa độ bản đồ ở `/admin/locations`.
