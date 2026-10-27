# Bật đăng nhập Google, Facebook và Zalo

Website: https://ductuphuquoc.onrender.com. Mã adapter đã có trong accounts.js, nhưng muốn sử dụng cần ứng dụng OAuth thuộc tài khoản của chủ cửa hàng, đúng callback, ID và secret được cấu hình ở Render. Có thông tin cấu hình không đồng nghĩa đã thử đăng nhập thật.

Đây là chức năng khác Google Sheets service account. Không dùng file JSON/private_key của service account làm OAuth client secret. Không đặt khóa trong Sheet, mã frontend, GitHub hoặc trường thông tin cửa hàng.

## Biến Render và callback chính xác

| Nhà cung cấp | ID trong Render | Secret trong Render | Redirect/Callback URL |
| --- | --- | --- | --- |
| Google | GOOGLE_CLIENT_ID | GOOGLE_CLIENT_SECRET | https://ductuphuquoc.onrender.com/api/auth/social/google/callback |
| Facebook | FACEBOOK_CLIENT_ID | FACEBOOK_CLIENT_SECRET | https://ductuphuquoc.onrender.com/api/auth/social/facebook/callback |
| Zalo | ZALO_APP_ID | ZALO_APP_SECRET | https://ductuphuquoc.onrender.com/api/auth/social/zalo/callback |

Giữ SITE_URL=https://ductuphuquoc.onrender.com. Không thêm dấu chấm, khoảng trắng hoặc dấu / cuối callback. Chỉ thêm biến khi đã có thông tin thật của nhà cung cấp; không tạo giá trị giả để đổi trạng thái UI.

## Google — làm trước

1. Mở https://console.cloud.google.com/auth/overview trong project Google Cloud đã có của cửa hàng.
2. Nếu chưa có Google Auth Platform: chọn Get started/Bắt đầu và hoàn thành Branding. Tên app Xe Điện Đức Tú, email hỗ trợ và email liên hệ là email do chủ cửa hàng kiểm soát.
3. Audience/Đối tượng: chọn External/Bên ngoài nếu phục vụ tài khoản Gmail công khai. Nếu còn Testing/Thử nghiệm và Google giới hạn đối tượng, thêm email tài khoản thử vào Test users.
4. Clients/Ứng dụng → Create client/Tạo ứng dụng OAuth → Application type: **Web application**. Tên client ví dụ duc-tu-web.
5. Authorized JavaScript origins: https://ductuphuquoc.onrender.com
6. Authorized redirect URIs: https://ductuphuquoc.onrender.com/api/auth/social/google/callback
7. Lưu và lấy Client ID, Client secret. Nhập riêng vào Environment của Render theo bảng phía trên. Không gửi secret qua chat. Nếu tải file OAuth JSON, đây là file khác service account JSON.
8. Lưu/redeploy Render, đợi Live, mở cửa sổ riêng tư → trang đăng nhập website → Google. Thử bằng tài khoản được phép, kiểm tra quay về /tai-khoan và xem đơn hàng của chính mình.
9. Trước khi cho mọi khách dùng, kiểm tra trạng thái Audience/Publishing và yêu cầu xác minh hiện ra trong console. Mã chỉ yêu cầu openid/profile/email; không cần quyền Google Drive/Sheets cho chức năng đăng nhập này.

Nếu Google báo redirect_uri_mismatch: so sánh URI callback trong Clients với URI trong bảng. Không khắc phục bằng cách đổi callback bất kỳ hoặc bỏ kiểm tra state. Nếu báo người dùng chưa được phép: kiểm tra Audience/Testing/Test users và app đang dùng đúng project/client.

## Facebook

1. Mở https://developers.facebook.com/apps/ bằng tài khoản chủ cửa hàng, hoàn tất yêu cầu tài khoản Developer nếu có.
2. Tạo/chọn ứng dụng có use case Facebook Login cho website. Tên nhãn UI có thể khác theo tài khoản; làm theo dashboard chính thức.
3. Đặt URL website đúng https://ductuphuquoc.onrender.com. Trong Facebook Login settings bật luồng web và đặt Valid OAuth Redirect URIs đúng callback Facebook trong bảng.
4. Lấy App ID và App Secret ở phần Basic settings; nhập FACEBOOK_CLIENT_ID và FACEBOOK_CLIENT_SECRET riêng trên Render.
5. Thử với tài khoản có role/test phù hợp trong giai đoạn development. Chuyển sang chế độ phục vụ khách thật theo yêu cầu của Meta, hoàn thiện URL privacy/data-deletion và xác minh/review nếu dashboard yêu cầu.
6. Lưu/redeploy, thử luồng thực tế và quay về /tai-khoan. Mã hiện chỉ dùng public_profile, không yêu cầu quyền đăng bài/tin nhắn.

## Zalo

1. Mở https://developers.zalo.me/ bằng tài khoản của cửa hàng.
2. Tạo/chọn ứng dụng hỗ trợ đăng nhập Zalo, cấu hình domain và callback theo đúng bảng.
3. Lấy App ID và App Secret từ dashboard ứng dụng, nhập ZALO_APP_ID và ZALO_APP_SECRET trên Render.
4. Hoàn thành các yêu cầu phê duyệt/xác minh và quyền truy cập do dashboard Zalo hiện ra; không giả định ứng dụng tạo xong đã dùng công khai được.
5. Lưu/redeploy, thử đăng nhập thật. Adapter dùng authorization code + PKCE với secret_key ở server; không đưa token vào trình duyệt.

## Xác nhận sẵn sàng

- Admin Cài đặt hiển thị Đã cấu hình chỉ phản ánh có biến ID/secret; vẫn cần kiểm thử từng nhà cung cấp.
- GET /api/auth/providers cho biết enabled/callback, không tiết lộ secret.
- Chưa thực hiện kiểm thử OAuth live do chưa có client/app credentials của chủ cửa hàng trong môi trường này. Test hiện có chỉ kiểm tra adapter bằng dịch vụ giả: state gắn với trình duyệt, code đổi token ở server, chống replay và tạo phiên.
- Bản hiện tại liên kết theo provider + subject. Đăng nhập Google/Facebook/Zalo có thể tạo tài khoản khác tài khoản email cũ; chưa có luồng tự gộp tài khoản. Không tự gộp bằng email không được xác minh.
- Dữ liệu tài khoản nằm trong SQLite và bản sao lưu mã hóa Google Sheets khi synced=true. Secret OAuth vẫn chỉ ở Render, không được đưa vào bản xuất Sheet dễ đọc.
