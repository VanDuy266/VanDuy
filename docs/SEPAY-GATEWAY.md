# Kết nối Cổng thanh toán SePay

## Đã có trong mã web

- Tạo form thanh toán BANK_TRANSFER, số tiền tính từ đơn trong SQLite. Khách chỉ thanh toán khi shop xác nhận đơn, chưa có yêu cầu hủy, còn tiền phải trả.
- Chế độ sandbox chỉ chủ shop được tạo phiên; kết quả thử KHÔNG cộng vào sổ thu tiền thật.
- IPN có token riêng trong URL. Thông báo chỉ cung cấp mã hóa đơn để tra cứu; server gọi API SePay bằng thông tin merchant riêng, kiểm tra lại hóa đơn, VND, số tiền và trạng thái CAPTURED rồi mới ghi khoản thu.
- Chống ghi nhận trùng bằng hóa đơn, mã đơn SePay, khóa sổ thu duy nhất và giao dịch SQLite; yêu cầu lặp đồng thời được gộp. Khởi động lại vẫn giữ kết quả.
- Đơn bị hủy, có yêu cầu hủy hoặc số tiền đã thay đổi trong lúc chờ được đưa vào mục cần đối soát, không tự cộng tiền. Chủ shop kiểm tra khoản thực nhận rồi xử lý sổ thu/hoàn theo chứng từ.
- Phiên và khoản thu nằm trong SQLite nên được backup bằng Google Sheets hiện có. Chỉ trả IPN thành công sau khi hook sao lưu hiện có xác nhận lưu thành công.
- Có nút thanh toán ở Tra cứu đơn/Tài khoản khi bật production; trang kết quả không dựa vào query success để ghi tiền.
- Không có hạn QR 15 phút; yêu cầu này đã được chủ shop bỏ. Không có thanh toán VNPAY, ZaloPay hoặc thẻ trong luồng hiện tại. Không tự hoàn tiền qua cổng.

## Bước 1 — Render sandbox

Trên service `ductuphuquoc`, mở Environment → Edit và thêm:

| Biến | Giá trị |
| --- | --- |
| SEPAY_PG_ENABLED | true |
| SEPAY_PG_ENV | sandbox |
| SEPAY_PG_MERCHANT_ID | Sao chép mã SP-TEST của chính tài khoản trong Cổng thanh toán SePay |
| SEPAY_PG_SECRET_KEY | Sao chép Secret Key sandbox, nhập trực tiếp vào Render |
| SEPAY_IPN_TOKEN | Tạo một chuỗi ngẫu nhiên bí mật dài ít nhất 32 ký tự, chỉ chữ/số hoặc `_` và `-` |

Nếu Render có nút Generate thì dùng nút này cho SEPAY_IPN_TOKEN. Có thể tạo bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` trên máy riêng. Không dùng Secret Key merchant hay SHEETS_BACKUP_KEY làm token. Không đưa khóa vào chat, Sheet hoặc GitHub. Không thay đổi các biến sao lưu Google hiện có.

SITE_URL phải là `https://ductuphuquoc.onrender.com`. Giữ Docker Command trống. Lưu và triển khai lại.

## Bước 2 — lấy URL IPN

1. Khi Render báo Live, đăng nhập chủ shop tại `/admin/thanh-toan`.
2. Tìm khung **Thanh toán SePay · Môi trường thử**.
3. Nhấn **Sao chép URL IPN**. URL có token riêng; giữ kín toàn bộ dòng.
4. Dán nguyên dòng vào ô **Cấu hình IPN nhận thông báo** trong Cổng thanh toán SePay, nhấn Lưu lại.

URL dạng `https://ductuphuquoc.onrender.com/api/payments/sepay/ipn?token=...`. Không nhập dấu `...`, địa chỉ IP máy chủ hay `/api/health`.

## Bước 3 — thử qua SePay thật

1. Tạo một đơn kiểm tra và shop xác nhận đơn. Đừng dùng đơn khách để giả lập tiền.
2. Trong khung SePay của admin, chọn đơn và nhấn **Tạo thanh toán thử**. Số tiền lấy từ đơn, không từ trình duyệt.
3. Thực hiện luồng giả lập sandbox theo giao diện SePay.
4. SePay gọi IPN; nếu chưa thấy kết quả có thể nhấn **Đối soát lại** trong admin. Nút này cũng luôn tra cứu server-to-server, không tự đánh dấu đã trả.
5. Kết quả đúng: **Thử thành công — không thu tiền**; sổ thu tiền thật không tăng.
6. Kiểm tra nhật ký IPN trong SePay. Endpoint hiện nhận JSON với `order.order_invoice_number` hoặc `order_invoice_number`. Trường khác, mã lạ, hai mã mâu thuẫn bị từ chối; không đoán mã từ nội dung tự do.

Trạng thái phản hồi: token sai 401, thiếu mã 400, mã chưa tạo tại web 404, lỗi tra cứu 503, kết quả không khớp 502. Trả HTTP 200 với `{"success":true}` khi đã đối soát paid/test_paid/review. PENDING trả 503 để tránh xác nhận khi chưa có kết quả cuối. Nếu nút Gửi test sử dụng dữ liệu mẫu không thuộc đơn đã tạo, nó có thể bị từ chối; cần xem payload/response trong nhật ký để kiểm tra hợp đồng IPN thực tế.

## Bước 4 — production

Chỉ sau khi thử kết nối thực tế thành công, làm bước kích hoạt môi trường thật trên SePay. Kiểm tra tài khoản nhận tiền và điều kiện/chi phí trên SePay; thông tin Techcombank đã cung cấp không tự cấu hình đích nhận tiền của cổng.

Đổi SEPAY_PG_ENV thành production, nhập Merchant ID/Secret Key chính thức của chính merchant, giữ token IPN, lưu và triển khai lại. Kiểm tra URL IPN được lưu trong môi trường chính thức của SePay. Mã SP-TEST bị từ chối nếu dùng ở production.

Thử một khoản thật có kiểm soát sau khi chủ shop xác nhận môi trường và tài khoản nhận; đối chiếu tiền thực nhận trên ngân hàng/cổng. Chỉ lúc đó mới xác nhận dịch vụ hoạt động thực tế. Không có giao dịch thật trong kiểm thử mã nguồn.

Muốn tắt tạo thanh toán: cần lưu ý SEPAY_PG_ENABLED=false cũng tắt xử lý IPN; phải đối soát những phiên còn chờ và xử lý chúng trên SePay trước. Không bật/tắt tùy ý khi có giao dịch đang diễn ra.

## Kiểm chứng và nguồn

- SDK chính thức: https://github.com/sepayvn/sepay-pg-node (1.0.0). Cách ký và endpoint đối chiếu trực tiếp với mã nguồn SDK; so sánh chữ ký chạy thành công với bản npm.
- Trường dữ liệu tra cứu và CAPTURED: https://github.com/sepayvn/sepay-pg-php/blob/main/examples/02-orders-management.php .
- PDF người dùng cung cấp là webhook ngân hàng, không phải hợp đồng IPN Cổng thanh toán. Không dùng payload này để tự ghi nhận tiền qua gateway.
- Tài liệu docs.sepay.vn bị chặn 403 trong môi trường làm việc. Cách đóng gói thông báo/ack IPN hiện là phần cần kiểm chứng bằng nhật ký sandbox thực tế; nguồn tin cậy để cộng tiền là kết quả API có xác thực, không phải payload IPN.
- `npm test`: kiểm tra logic, giả mạo, lặp, sai tiền/tài khoản merchant, sandbox và đơn hủy.
- `PLAYWRIGHT_MODULE=<đường dẫn playwright> node scripts/qa/sepay.cjs`: HTTPS cục bộ + API SePay giả lập, kiểm tra giao diện admin/khách, gửi form, nhận IPN và khởi động lại. Không kết nối hay chuyển tiền qua SePay thật.
