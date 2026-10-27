# Kiểm tra giao diện V3.1

`npm test` chạy kiểm thử Node/SQLite, không cần gói bên ngoài.

`npm run test:browser` là kiểm tra trình duyệt tùy chọn cho người phát triển. Cần Playwright 1.62.1 và Chromium; không bắt buộc cài để chạy website.

Có thể cài Playwright vào môi trường phát triển riêng, hoặc đặt `PLAYWRIGHT_MODULE` trỏ tới module đã cài sẵn. Nếu không dùng Chromium do Playwright tải, đặt `CHROMIUM_PATH` tới trình duyệt phù hợp. Script dùng Chromium hệ thống `/usr/bin/chromium` khi có.

Bốn script tạo database tạm riêng, dùng dữ liệu giả có nhãn kiểm thử và dọn tiến trình/data sau khi xong. Không chạy trên database cửa hàng. Các cổng thử: 32162, 32164, 32166, 32168.

- workflows: chức năng khách/admin, responsive, tạo coupon và checkout.
- seasonal: mặc định, preset theo mùa, tắt/bật LED và banner.
- carousel: tự chuyển ảnh, tự phát video không tiếng, phát xong chuyển tiếp, xem thủ công, reduced motion, upload/phát video admin.
- regressions: sắp xếp trang chủ/xe nổi bật, giá trước giảm, câu chuyện có quyền sử dụng, giỏ lưu với danh mục tải chậm.

Ảnh kiểm chứng được cập nhật vào `docs/screenshots/`. Không gửi email, gọi điện, nhắn mạng xã hội hoặc giao dịch tiền thật trong các script này.

## Thanh điều hướng admin

```sh
PLAYWRIGHT_MODULE=/duong-dan/toi/playwright CHROMIUM_PATH=/usr/bin/chromium node scripts/qa/sidebar.cjs
```

Dùng dữ liệu và mật khẩu thử tạm, không chạm website live. Kiểm tra đăng nhập/đăng xuất, số đơn/tư vấn thực từ API, tìm mục, thu gọn có lưu tùy chọn, drawer mobile, lớp nền, Escape, vòng focus, điều hướng, trạng thái mất kết nối và reduced motion. Ảnh kết quả ở `docs/screenshots/admin-sidebar-desktop.png` và `admin-sidebar-mobile.png`.
