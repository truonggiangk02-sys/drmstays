# Kiểm tra web tự động

Ba lớp, dùng theo thứ tự:

## 1. Trang "Kiểm tra web" trong admin (`/admin/health`)
Bấm là có kết quả ngay. Cho biết:
- Cấu hình: `SITE_URL`, chế độ "Sắp ra mắt" đang bật/tắt, mật khẩu admin, secret Staydesk, Telegram.
- **Migration chưa áp dụng** (kèm lệnh sửa), đúng lỗi từng làm trang tòa báo "chưa sẵn sàng".
- Kết nối Staydesk; **lỗi thật** khi lấy danh sách tòa cho khách (trang công khai chỉ hiện thông báo chung).
- Từng tòa: số ảnh, địa chỉ, toạ độ, số phòng và giá.
- Ảnh có trong danh sách nhưng **thiếu file** trong kho R2.
- Yêu cầu khách gửi Telegram thất bại trong 30 ngày qua.

## 2. Công cụ quét toàn bộ (`scripts/site-check.mjs`)
Quét như khách và như chủ web, không sửa gì trên web:

```
node scripts/site-check.mjs https://drmstays.vn --password=MẬT-KHẨU-ADMIN
```
(Mật khẩu gõ trên máy bạn, không gửi vào chat.) Thêm `--browser` để mở bằng trình duyệt thật (cần `npm install playwright --no-save`).

Kiểm: mọi trang trả 200 và không có thông báo lỗi ẩn; ảnh tải được; liên kết nội bộ không hỏng; tiêu đề, mô tả, canonical, `lang`, một `h1`, `<main>`, alt ảnh; robots.txt và sitemap; header bảo mật; các trang admin; gom các lỗi của trang "Kiểm tra web"; (trình duyệt) lỗi console, ảnh không hiện, tràn ngang trên điện thoại. Kết quả in ra màn hình và lưu `site-check-report.md`. Mã thoát 1 nếu có lỗi.

## 3. Skill cho Claude (`.claude/skills/site-check`)
Khi làm việc trong thư mục dự án, nói "kiểm tra toàn bộ web" hoặc gõ `/site-check`: Claude chạy hai lớp trên, đọc kết quả, giải thích bằng tiếng Việt và đưa lệnh sửa.

## Trước khi mở web thật
1. `site-check --password=... --browser`: 0 lỗi.
2. `/admin/health`: không có ✖.
3. Telegram nhận được tin thử; nội dung chính sách đã duyệt; link liên hệ nhanh đã cài.
4. Deploy với `--live` / `-Live`, chạy lại `site-check` không mật khẩu: mọi trang 200.
