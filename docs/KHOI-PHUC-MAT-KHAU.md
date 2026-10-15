# Khôi phục mật khẩu khách hàng

Trang `/quen-mat-khau` gửi yêu cầu, `/dat-lai-mat-khau` nhận liên kết qua email. Chỉ áp dụng tài khoản email/mật khẩu; tài khoản mạng xã hội dùng nút đăng nhập tương ứng.

## Kết nối email thật

1. Tạo tài khoản tại https://resend.com và xác minh domain gửi email bằng các bản ghi DNS do Resend cung cấp. Link trycloudflare.com không cấp quyền quản lý DNS để xác minh domain gửi thư.
2. Tạo API key có quyền gửi thư; lưu bí mật trên máy chạy server, không gửi vào chat hoặc đưa lên GitHub.
3. Cấu hình `RESEND_API_KEY` và `MAIL_FROM` (ví dụ `Xe Điện Đức Tú <taikhoan@tenmien-cua-ban.store>` với domain đã xác minh). Windows CMD dùng `set "TEN_BIEN=gia_tri"` trong cùng cửa sổ trước khi chạy server. Docker Compose nhận hai biến từ `.env`.
4. Đặt `SITE_URL` đúng địa chỉ công khai đang chạy và khởi động lại website. Mở Quên mật khẩu và thử với email bạn sở hữu, kiểm tra cả thư rác. Nếu đổi link Cloudflare, phải cập nhật SITE_URL và yêu cầu thư mới.

Chưa cấu hình: API báo 503 chờ kết nối; không báo đã gửi thư. Resend có giới hạn/chính sách theo gói; kiểm tra nhà cung cấp trước khi dùng thật. Domain người gửi khác với domain mở website cũng được nếu thuộc quyền kiểm soát của shop và đã xác minh.

## Bảo vệ tài khoản

Token ngẫu nhiên 256 bit, chỉ lưu SHA-256 trong SQLite, hết hạn sau 15 phút, chỉ dùng một lần; sau khi đặt lại sẽ thu hồi các token và phiên khách cũ. Token ở URL fragment, không nằm trong URL HTTP/referrer. Không trả liên kết qua API/admin hoặc ghi ra log. Yêu cầu email tồn tại/không tồn tại trả cùng thông báo. Lỗi nhà cung cấp không tiết lộ tài khoản; cần kiểm tra nhật ký gửi thư tại Resend khi thử tích hợp. Giới hạn tần suất theo cơ chế rate của server. Đây là luồng khôi phục khách hàng, không áp dụng mật khẩu admin.

Kiểm thử tự động dùng thư giả lập; chưa xác nhận thư thật khi chưa cung cấp cấu hình và xác minh domain.
