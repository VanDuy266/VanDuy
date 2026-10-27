# Kế hoạch kết nối thanh toán

## Trạng thái hiện tại

Website có tiếp nhận đơn, chọn nhu cầu COD/đặt cọc/trả góp và sổ ghi nhận thu/hoàn tiền có kiểm soát. **Chưa có cổng thanh toán online được kích hoạt.** Chủ cửa hàng cho biết chưa có tài khoản merchant VNPAY/ZaloPay. Chưa nhận được thông tin ngân hàng để cấu hình QR chuyển khoản. Không có giao dịch tiền thật hoặc thử cổng live trong công việc này.

## Các phương thức

| Phương thức | Cần chuẩn bị | Khi nào ghi nhận đã thanh toán |
| --- | --- | --- |
| QR ngân hàng/VietQR | Ngân hàng, số tài khoản, tên chủ tài khoản chính xác, loại khoản thu/mức cọc | Đối soát ngân hàng hoặc callback hợp lệ từ dịch vụ đối soát; tạo/quét QR không phải bằng chứng chuyển tiền |
| VNPAY | Merchant, môi trường sandbox/production, mã đơn vị và khóa ký do cổng cấp | IPN/backend xác minh chữ ký, đúng mã đơn, tiền, trạng thái và chống ghi nhận trùng |
| ZaloPay | Merchant và App ID/key thanh toán riêng do ZaloPay cấp | Callback đã xác minh MAC và dữ liệu giao dịch |
| Visa/Mastercard | Cổng thanh toán có bật thanh toán thẻ quốc tế cho merchant | Kết quả xác minh từ cổng, không dựa riêng vào redirect trình duyệt |

Zalo Login App ID/Secret **không phải** thông tin ZaloPay merchant. Không đưa khóa cổng vào Sheet, GitHub, app điện thoại hoặc chat. Visa được nhập trên trang/SDK của cổng đủ điều kiện, không lưu số thẻ/CVV tại website cửa hàng.

## Trình tự tiếp theo

1. Chủ cửa hàng cung cấp dữ liệu ngân hàng nhận tiền, xác nhận trước khi công khai QR. Không cần gửi mật khẩu, OTP hoặc dữ liệu đăng nhập ngân hàng.
2. Tích hợp QR theo đúng số tiền server tính cho đơn đã được xác nhận, kèm nội dung chuyển khoản riêng; giữ trạng thái chờ đối soát.
3. Đăng ký merchant, lấy sandbox và tài liệu đang áp dụng từ từng cổng. Hoàn tất kiểm thử trước khi bật production.
4. Xử lý thanh toán lặp, sai số tiền, đơn hủy, timeout, đối soát và hoàn tiền bằng sổ giao dịch. Không tự đổi trạng thái đã trả tiền chỉ vì khách bấm “đã chuyển” hoặc trang trả về success.
5. Bổ sung thông tin giao dịch vào backup Google Sheets hiện có. File biên nhận/ảnh tải lên vẫn cần kho media bền vững riêng.

Không thêm nút thanh toán giả hoặc thông tin ngân hàng mẫu vào luồng khách. Chưa có thời điểm phát hành thanh toán thật vì còn thiếu cấu hình ngân hàng/merchant.

## Nhánh thử nghiệm payment-integration-preview — chưa kích hoạt trên web live

Đã chuẩn bị mã VietQR chuyển khoản cho thông tin chủ cửa hàng cung cấp: Techcombank (BIN 970407), tài khoản 2606050708, tên người nhận NGUYEN VAN DUY. Chưa xác minh người nhận bằng ứng dụng ngân hàng và chưa thực hiện chuyển tiền thật. Không coi dữ liệu người nhận được cung cấp là xác minh ngân hàng.

QR dùng số tiền do server tính từ đơn đã được cửa hàng xác nhận, trừ khoản đã ghi nhận; không tin số tiền từ client. Mỗi lần cấp mã có intent riêng, 15 phút trong database. **expiryScope=website_only**: đây KHÔNG phải QR ngân hàng tự vô hiệu hóa sau 15 phút. Ảnh QR chuyển khoản cũ vẫn có thể chuyển được. Chuyển đến sau hạn được giữ để đối soát, không vứt bỏ khoản tiền đến. Người dùng đã yêu cầu hết hạn thực phía thanh toán, vì vậy **không đưa nhánh QR thường này lên production như giải pháp đáp ứng yêu cầu đó**.

Đã chuẩn bị adapter nhận sự kiện SePay dưới dạng bank transfer webhook bằng Authorization `Apikey` và biến riêng `SEPAY_WEBHOOK_KEY` (tối thiểu 32 ký tự). Thiếu khóa thì từ chối. Adapter cần được đối chiếu tài liệu/dashboard và thử dữ liệu SePay thật sau khi chủ cửa hàng có tài khoản; tài liệu nhà cung cấp hiện chưa truy cập được từ môi trường này. Chưa liên kết tài khoản Techcombank, chưa cấu hình webhook live, không có cơ sở gọi tính năng tự nhận tiền là hoạt động.

Xử lý thử nghiệm kiểm tra: mã intent, ngân hàng/tài khoản, số tiền, trạng thái đơn, hạn nhận, chứng từ và event ID chống ghi nhận trùng. Giao dịch không khớp hoặc đến muộn ở danh sách review trong admin, không tạo receipt paid. Khách/browser không có endpoint tự đánh dấu đã chuyển tiền. Ghi nhận thành công không tự chuyển đơn sang delivered.

Các bảng intent/sự kiện/review cũng thuộc SQLite và được sao lưu khi Google Sheets đang bật. Khóa đối soát nằm ở Environment, không nằm trong Sheet hay APK. Trên nhánh này có luồng chủ shop xác nhận đã đối soát, chỉ kết thúc review chứ không tự ghi tiền/hoàn tiền.

## Đáp ứng yêu cầu “mã cũ không thanh toán được sau 15 phút”

Phải dùng cổng hoặc ngân hàng có API tạo giao dịch/QR với hạn thật và backend từ chối thanh toán giao dịch quá hạn. Mã hình ảnh vẫn đọc được về mặt kỹ thuật; điều cần bảo đảm là phía thanh toán từ chối sử dụng mã đó. Webhook báo số dư SePay/Casso độc lập không tạo ra khả năng hết hạn này.

Chủ cửa hàng chọn đăng ký SePay: mở https://sepay.vn/, kiểm tra sản phẩm cổng thanh toán và khả năng hỗ trợ tài khoản Techcombank, QR động theo đơn, thời hạn/cancel và phí trước khi đăng ký gói. Không giả định mọi QR SePay hoặc mọi gói miễn phí đều đáp ứng hạn 15 phút. Sau khi có merchant/tài liệu/khóa thử, chọn đúng API checkout thay vì phát hành QR chuyển khoản thường rồi gọi nó là hết hạn.

Bản thử chưa được nhập main. Website live tiếp tục luồng thanh toán hiện có cho đến khi điều kiện cổng và kiểm thử thật hoàn tất. Phần thanh bên admin đã được phát hành riêng lên main.
