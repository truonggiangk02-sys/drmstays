# Tải ảnh lên website

## Cách 1: trong admin (chọn nhiều ảnh cùng lúc)
`/admin/catalog` hoặc `/admin/media` → ô chọn ảnh cho tòa/phòng → chọn nhiều ảnh → **Upload**.
Ảnh lớn hơn ~3,5 MB được trình duyệt tự thu nhỏ (cạnh dài 2400 px) trước khi tải. Ảnh đầu tiên là ảnh bìa; mỗi mục tối đa 20 ảnh.

## Cách 2: script tải cả thư mục
Xếp ảnh trên máy theo tên tòa/phòng (không phân biệt hoa thường, dấu, khoảng trắng):

```
anh/
  AnLiu Apartment/                     ảnh của tòa
  AnLiu Apartment/mat-bang/            sơ đồ mặt bằng của tòa (mat-bang, floorplan, layout)
  AnLiu Apartment/301/                 ảnh phòng 301
  AnLiu Apartment/301/mat-bang/        mặt bằng phòng 301
```

Chạy thử (chưa tải gì, chỉ in kế hoạch):

```
node scripts/upload-photos.mjs anh --site=https://TÊN-WEB
```

Tải thật:

```
node scripts/upload-photos.mjs anh --site=https://TÊN-WEB --apply
```

- Mật khẩu admin được hỏi khi chạy (không hiện khi gõ), hoặc đặt biến `ADMIN_PASSWORD`.
- Mục đã có ảnh bị bỏ qua; thêm `--force` để tải thêm.
- Tên tòa/phòng không khớp được báo cảnh báo, không đoán.
- Ảnh trên 5 MB: chạy một lần `npm install sharp --no-save` để script tự nén, hoặc nén trước.
