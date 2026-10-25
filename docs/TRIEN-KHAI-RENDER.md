# Đưa Xe Điện Đức Tú lên Render

## Phạm vi

`render.yaml` triển khai **bản xem thử miễn phí**, không có disk. SQLite, tài khoản, đơn hàng, nội dung admin và media tải lên có thể mất khi restart/redeploy. Không nhận đơn thật hoặc nhập dữ liệu khách thật trên bản này. Website miễn phí có thể ngủ khi không truy cập và mất thời gian mở lại.

Link `onrender.com` do Render cấp sau khi tạo dịch vụ; tên `ductuphuquoc` chỉ là tên đề xuất, có thể có hậu tố. Không dùng địa chỉ dự đoán làm SITE_URL nếu Render cấp địa chỉ khác. Không cần Cloudflare hoặc bật máy cá nhân sau khi Render triển khai thành công.

## Tạo dịch vụ từ GitHub đã kết nối

1. Mở https://dashboard.render.com → **New → Web Service**.
2. Chọn repository `VanDuy266/VanDuy`, branch `main`, Root Directory để trống.
3. Đặt tên `ductuphuquoc`; chọn runtime **Docker**, Dockerfile `./Dockerfile`, gói **Free**. Không cần Build Command/Start Command riêng vì Dockerfile đã có Node 24 và `node server.js`.
4. Trong Environment đặt:
   - `NODE_ENV=production`
   - `DATA_DIR=/tmp/duc-tu-data`
   - `SITE_URL=https://DIA-CHI-THAT.onrender.com` theo địa chỉ Render cấp/hiển thị.
   - `ADMIN_PASSWORD`: tự đặt mật khẩu riêng, không để trong GitHub/chat. Đây là mật khẩu khởi tạo trên database mới; không tự đổi mật khẩu đã lưu trong database.
5. Đặt Health Check Path `/api/health`. Nhấn **Deploy Web Service**. Không chọn gói tính phí nếu chưa muốn trả phí.
6. Nếu chưa biết URL trước khi tạo: dùng địa chỉ dự kiến HTTPS lúc khởi tạo, sau đó sửa **Environment → SITE_URL** thành đúng URL hiển thị và lưu/redeploy. Chưa dùng đăng nhập/đặt đơn trước khi sửa đúng origin.
7. Đợi trạng thái **Live**, kiểm tra `/api/health`, trang chủ, `/api/auth/providers` (callback phải bắt đầu bằng đúng URL Render), `/admin`. Kiểm tra bằng cửa sổ ẩn danh cho giao diện khách. Lỗi origin thường do SITE_URL khác URL đang mở.

Có thể tạo bằng Blueprint: https://render.com/deploy?repo=https://github.com/VanDuy266/VanDuy — đọc cảnh báo dữ liệu tạm ở trên, điền SITE_URL và ADMIN_PASSWORD trên Render. Nếu UI không hỗ trợ Free trong Blueprint, dùng Web Service theo bước trên.

## Dùng bán hàng thật

Cần gói Web Service hỗ trợ persistent disk (có phí; xem giá hiện tại trong Render). Gắn disk tại `/app/data`, đổi `DATA_DIR=/app/data`, chỉ chạy một instance SQLite. Disk này là nơi giữ `store.sqlite`, WAL và media/support. Sao lưu riêng vẫn cần thiết. Chuyển từ filesystem tạm sang disk không tự chuyển dữ liệu.

Website chạy trên Render không tự có dữ liệu từ máy Windows. Trước khi chuyển dữ liệu thật: dừng server nguồn để sao lưu nhất quán, sao chép cả thư mục data riêng tư, rồi khôi phục vào persistent disk theo quyền truy cập của dịch vụ. Không đưa SQLite, file khách hàng, `.env` hoặc mật khẩu lên GitHub. Chưa thực hiện việc chuyển dữ liệu trong cấu hình này.

Google/Facebook/Zalo cần cập nhật callback và domain verification sang URL Render; khóa cấu hình trong Environment. Email khôi phục mật khẩu cần RESEND_API_KEY và MAIL_FROM đã xác minh, xem KHOI-PHUC-MAT-KHAU.md. Online payment vẫn cần merchant của cửa hàng.

## Kết quả xác minh

Đã kiểm tra ứng dụng cục bộ với NODE_ENV=production, origin HTTPS, DATA_DIR tạm, health và cookie admin Secure. Cấu hình không tạo disk hay gói trả phí. Live deploy và URL cuối chỉ được xác nhận sau khi tài khoản Render tạo dịch vụ và hiển thị Live; không coi link Blueprint là link website đã chạy.
