# Thanh toán

Website có sổ thu/hoàn tiền thủ công và kết nối Cổng thanh toán SePay có thể bật bằng cấu hình. Xem [hướng dẫn SePay](SEPAY-GATEWAY.md) để thiết lập sandbox, sao chép URL IPN và kiểm tra trước khi dùng môi trường thật.

Khách thanh toán chuyển khoản qua SePay sau khi đơn được shop xác nhận. Mã đơn và số tiền do server tính. IPN được bảo vệ bằng token và phải tra cứu lại SePay thành công trước khi ghi khoản thu. Trang chuyển về từ cổng và nút kiểm tra không phải bằng chứng đã nhận tiền. Giao dịch sandbox không thay đổi tiền thật.

Đơn thay đổi/hủy hoặc có khoản thu thủ công trong lúc chờ thanh toán phải được chủ shop đối soát. Khoản thu không tự đánh dấu đã giao xe. Hoàn tiền vẫn do shop thực hiện, kiểm tra và ghi sổ theo chứng từ; web không tự hoàn qua cổng. Không có hạn QR 15 phút theo yêu cầu hiện tại.

VNPAY, ZaloPay và thẻ Visa/Mastercard chưa tích hợp. Zalo Login App ID/Secret không phải khóa thanh toán ZaloPay. Không nhập thông tin thẻ/CVV tại website cửa hàng.

Đích nhận tiền của cổng được cấu hình và kiểm tra trong tài khoản SePay. Không đưa khóa bí mật vào Sheet, GitHub, ứng dụng điện thoại hoặc chat. SQLite chứa đơn, phiên SePay và sổ thu vẫn được sao lưu qua Google Sheets nếu đã bật và hoạt động. Tệp ảnh/biên nhận cần kho media bền vững riêng.
