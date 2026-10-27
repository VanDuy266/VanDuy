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
