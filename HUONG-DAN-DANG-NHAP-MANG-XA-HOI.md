# Kết nối đăng nhập Google, Facebook và Zalo cho Đức Tú

Phần xử lý OAuth đã có trong website. Chưa thể bật đăng nhập thật nếu chưa tạo ứng dụng của cửa hàng và cấp ID/Secret. Không gửi khóa bí mật trong chat hoặc nhập vào các ô thông tin cửa hàng công khai.

## 1. Chuẩn bị tên miền

Triển khai website bằng Docker/Caddy theo README. Tên miền phải trỏ đến máy chủ và HTTPS hoạt động. Đặt DOMAIN trong .env; SITE_URL của app phải khớp tên miền đang mở. Vào Admin → Cài đặt → Kết nối đăng nhập để xem callback chính xác của từng dịch vụ.

## 2. Google / Gmail

1. Mở https://console.cloud.google.com/ bằng tài khoản Google của chủ cửa hàng; tạo/chọn project.
2. Thiết lập màn hình đồng ý OAuth với tên cửa hàng, email hỗ trợ thực tế và tên miền. Trong giai đoạn thử, thêm tài khoản thử vào danh sách test users.
3. Tạo OAuth Client loại Web application ở https://console.cloud.google.com/apis/credentials.
4. Đăng ký redirect URI: `https://TEN-MIEN/api/auth/social/google/callback`.
5. Lưu Client ID vào GOOGLE_CLIENT_ID; Client Secret vào GOOGLE_CLIENT_SECRET trên máy chủ/môi trường bảo mật.

## 3. Facebook

1. Mở https://developers.facebook.com/apps/; tạo ứng dụng với trường hợp sử dụng Facebook Login.
2. Điền tên miền website và thông tin cửa hàng theo yêu cầu của Meta.
3. Đăng ký Valid OAuth Redirect URI: `https://TEN-MIEN/api/auth/social/facebook/callback`.
4. Lấy App ID và App Secret, cấu hình FACEBOOK_CLIENT_ID và FACEBOOK_CLIENT_SECRET.
5. Thử với tài khoản có vai trò trong app trước. Hoàn tất yêu cầu xét duyệt/chuyển công khai mà Meta yêu cầu cho ứng dụng của bạn.

## 4. Zalo

1. Mở https://developers.zalo.me/ bằng tài khoản của chủ cửa hàng; tạo/chọn ứng dụng hỗ trợ Zalo Login/Social OAuth.
2. Điền tên miền và callback: `https://TEN-MIEN/api/auth/social/zalo/callback`.
3. Lấy App ID và Secret Key, cấu hình ZALO_APP_ID và ZALO_APP_SECRET.
4. Thực hiện yêu cầu cấp quyền/xét duyệt theo ứng dụng của Zalo. Link OA/Zalo của cửa hàng không thay thế App ID/Secret đăng nhập.

## 5. Nhập cấu hình và bật

Trên VPS: nhập các biến trong .env riêng của máy chủ; .env được Git bỏ qua. Docker Compose đã truyền sáu biến này vào app. Khởi động lại bằng `docker compose up -d --force-recreate app`.

Trong môi trường Codex cloud: các tên biến và yêu cầu Secret đã được lưu. Nhập Client/App ID và Secret qua Environment Settings, Review/Save rồi Publish; không đưa giá trị vào chat. Dùng tuyến proxy Node được hướng dẫn trong cấu hình môi trường khi gửi Secret qua proxy.

Vào Admin → Cài đặt để xem trạng thái. Nút chỉ bật khi có đủ ID và Secret. Thử đăng nhập, từ chối/hủy cấp quyền, đăng xuất và đăng nhập lại trên đúng tên miền. Có cấu hình chưa chứng minh ứng dụng đã được nhà cung cấp cho phép dùng công khai.

Tài khoản mạng xã hội được nhận diện bằng ID do nhà cung cấp xác thực; không tự gộp với tài khoản email cùng tên. Website không giữ access token nhà cung cấp hoặc yêu cầu mật khẩu Google/Facebook/Zalo.
