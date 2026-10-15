# Đối chiếu yêu cầu — Xe Điện Đức Tú V3.1 Beta, build 2

Bảng này phân biệt chức năng đã triển khai trong mã nguồn với dịch vụ chưa thể vận hành khi chưa có tài khoản/quyền API hoặc dữ liệu gốc. Không dùng chữ “100%” để che các phần còn phụ thuộc bên ngoài.

| Yêu cầu | Đã triển khai / nơi sử dụng |
| --- | --- |
| Chọn xe theo giá, kiểu dáng, quãng đường, tốc độ | `/xe-dien`: bộ lọc, sắp xếp, phân trang; gợi ý nhu cầu tại `/tu-van-chon-xe` |
| Chọn màu, ảnh lớn, quay lại | Trang từng xe, bộ màu thật, bộ góc nguồn có sẵn, khung xem lớn, quay về danh mục |
| So sánh, yêu thích | Trang riêng, tối đa 3 xe so sánh; yêu thích lưu theo trình duyệt/tài khoản |
| Giá trước giảm, nhãn và tình trạng kho | Admin nhập giá trước giảm lớn hơn giá hiện tại; số tiết kiệm tính từ dữ liệu thật; tồn thấp dựa số lượng |
| Giỏ hàng, mã ưu đãi | Chỉnh số lượng/xóa; kiểm tra mã ở máy chủ; trần giảm, đơn tối thiểu, ngày, lượt dùng; không nhân đôi khi khôi phục |
| Giao tận nơi / nhận tại shop | Lựa chọn tại checkout, địa chỉ lưu và lịch mong muốn; phí giao chờ shop xác nhận |
| Lịch nhận xe | Mục Lịch nhận xe trong admin xác nhận ngày giờ và ghi chú; khách nhận thông báo và xem trong đơn |
| Đặt cọc, trả góp | Yêu cầu được lưu và theo dõi; không tự thu tiền hoặc ký/duyệt hợp đồng tín dụng |
| Lịch sử đơn, xác nhận, giao và hủy | Theo tài khoản hoặc tra cứu mã + số điện thoại; hủy theo trạng thái/tiền thực thu, hoàn kho đúng một lần |
| Bình luận / đánh giá sao sau mua | Tài khoản có đơn đã giao đúng xe; chống đánh giá trùng, admin trả lời/ẩn/hiện |
| Hỏi đáp trước mua | Câu hỏi riêng theo xe, admin trả lời; tách khỏi đánh giá sau mua |
| Tài khoản, sổ địa chỉ, đổi mật khẩu | Email/mật khẩu, thông tin cá nhân, thêm/xóa/chọn địa chỉ, đổi mật khẩu, đăng xuất các phiên khác |
| Lưu giỏ và yêu thích giữa thiết bị | Lưu tài khoản; khôi phục chủ động khi hai giỏ cùng có dữ liệu; chờ danh mục tải xong trước khi đồng bộ |
| Trung tâm thông báo | Đơn, thu/hoàn, hỗ trợ, hỏi đáp, bàn giao, lịch giao; đã đọc/chưa đọc |
| Tư vấn và liên hệ | Hotline di động, các link chính thức cấu hình được, bản đồ Google, giờ mở cửa, ảnh mặt tiền, hộp chọn liên hệ trên điện thoại |
| Yêu cầu gọi lại / hỗ trợ theo đơn | `/ho-tro`, loại yêu cầu và khung giờ, mã đơn thuộc tài khoản, lịch sử đối thoại, ảnh đính kèm riêng tư |
| Bảo hành, bảo dưỡng, hoàn tiền, hóa đơn | Tiếp nhận, phân công, ghi chú nội bộ, phản hồi, trạng thái; quyền lợi/lịch/chứng từ do shop xác nhận |
| Hồ sơ bàn giao và hướng dẫn theo xe | `/xe-cua-toi`: số khung/hồ sơ, phụ kiện, hướng dẫn và điều kiện bảo hành do shop nhập |
| Xác nhận đề xuất thay đổi đơn | Shop gửi nội dung, khách đồng ý/từ chối; giữ lịch sử, không tự đổi giá/thu tiền |
| Theo dõi có hàng / giảm giá | Đăng ký theo mẫu và màu; thông báo trong tài khoản khi shop cập nhật giá/kho |
| Phụ kiện tương thích | Shop thêm phụ kiện, giá/kho, khai báo mẫu tương thích; hiển thị liên quan và dùng giỏ hàng hiện có |
| Ước tính tiền điện | Số km, mức tiêu thụ, giá điện và ngày sử dụng do khách nhập; ghi rõ giả định |
| QR chia sẻ xe | Tạo QR thật tại máy chủ, không gửi URL sang dịch vụ QR ngoài |
| Banner có ngay sau cập nhật | Bộ giới thiệu mặc định tự hiện, không cần tạo khuyến mãi; tôn trọng cấu hình tắt có chủ đích |
| Banner nhiều ảnh tự đổi | 4 slide mặc định, trước/sau, chọn slide, vuốt, bàn phím, dừng/tiếp tục; pause khi rê chuột/focus/tab ẩn |
| Video trong banner | Video giới thiệu dựng từ ảnh gốc; tự phát không tiếng khi đến slide tự chuyển; phát xong tiếp tục; người chủ động xem thì giữ slide |
| Tải ảnh và video trong admin | PNG/JPEG/WebP; MP4 tối đa 40 MB, khuyến nghị H.264; riêng ảnh banner và ảnh quà; phục vụ byte range để tua video |
| LED | Mặc định chỉ “Xe Điện Đức Tú • Hotline: 0326 262 859 – 0866 975 540”; nút dừng/chạy; giảm chuyển động theo thiết bị |
| Theo mùa | Bộ sưu tập Đức Tú, Tựu trường, Sắc xuân, Sắc hè; tự động theo tháng Việt Nam hoặc chọn bằng nút trong admin |
| Chiến dịch, đếm ngược, quà, popup | Nội dung thật do shop tạo, ngày bắt đầu/kết thúc, ảnh/video/link, thứ tự; popup dễ đóng và giới hạn phiên; không tự reset đồng hồ |
| Câu chuyện cửa hàng | Ảnh/nội dung có quyền sử dụng, xác nhận đồng ý khi đăng; trang riêng và nhóm trang chủ; không dùng đếm ngược khuyến mãi cho câu chuyện |
| Đo quảng cáo | Lượt xem/bấm tham khảo, yêu cầu đặt hàng và đã giao tách riêng; không giả số mua hay giả số người online |
| Admin sắp xếp trang chủ | Chọn mẫu xe nổi bật, nút đưa lên/xuống cho các nhóm, lưu thật vào dữ liệu |
| Admin lọc đơn và chăm sóc | Mã/tên/điện thoại/trạng thái; yêu cầu hỗ trợ tìm/lọc, người phụ trách, mẫu trả lời, ghi chú riêng |
| Admin kho theo màu | Giá/tồn từng màu, lý do kiểm kê, giữ/hoàn kho và lịch sử; tồn tổng vẫn là giới hạn chung nếu shop cấu hình |
| Nhân viên và nhật ký | Chủ shop, bán hàng, chăm sóc; quyền chặn ở máy chủ; khóa/đổi nhân viên thu hồi phiên; nhật ký các thay đổi có người thực hiện |
| Báo cáo | Thu/hoàn/thu ròng theo sổ tiền đã ghi nhận, lọc khoảng ngày UTC; CSV đơn/thu-hoàn; hướng dẫn sao lưu nguyên data khi dừng server |
| Thông báo admin | Đơn, tư vấn, hủy và hỗ trợ mới; cập nhật số việc/title, nhận biết cả tin khách trả lời lại |
| Điện thoại | Bố cục riêng, thanh điều hướng dưới, danh mục và nhóm chức năng riêng; kiểm tra 360/390/768/1440 px |
| Windows / Cloudflare | Lưu link công khai qua công cụ, thông báo khi mở sai địa chỉ; phát hiện bộ file chưa giải nén; phiên bản chính xác ở `/api/health` |
| Đăng ký lái thử | Đã bỏ theo yêu cầu, không có trong bản phát hành |

## Các phần cần điều kiện bên ngoài

| Phần | Điều kiện còn thiếu / giới hạn thực tế |
| --- | --- |
| Thanh toán online / tự xác nhận chuyển khoản / tự hoàn tiền | Tài khoản merchant, hợp đồng, khóa, webhook và kiểm thử nhà cung cấp; chưa có dữ liệu này nên không tự đánh dấu đã thanh toán |
| Google/Facebook/Zalo login thật | Adapter OAuth đã có; cần ID/secret/callback/quyền hợp lệ. Đã có App ID Zalo nhưng chưa có secret an toàn được cấu hình ở môi trường này. Không dùng khóa từng lộ trong chat |
| Hộp thư Zalo/Messenger trực tiếp, email/SMS/OA, thông báo khi đóng trình duyệt | Cần quyền API, nhà cung cấp và cấu hình gửi; hiện trả lời/thông báo trong website, nút ngoài mở kênh chính thức |
| Khôi phục mật khẩu qua email | Cần dịch vụ gửi thư và xác minh email; không reset tài khoản chỉ bằng số điện thoại/email chưa xác minh |
| Hóa đơn điện tử / hợp đồng trả góp | Cần đơn vị phát hành/tài chính, chính sách và tích hợp hợp lệ; website đang tiếp nhận yêu cầu |
| 360 cho mọi màu của mọi xe | 12 mẫu có ảnh màu; chỉ 5 mẫu có bộ góc nguồn thật. 7 mẫu còn lại và các màu không có chuỗi góc cần ảnh/3D đúng mẫu từ nguồn có quyền sử dụng |
| Website chạy 24/7 và tên miền | Cần hosting/VPS + domain/HTTPS. Quick Tunnel trên máy cá nhân là xem thử; phải giữ máy/tiến trình/mạng hoạt động |

## Kiểm chứng bản phát hành

- 19 bài kiểm thử tự động đạt: quyền truy cập, tồn kho/hoàn kho, tiền/ưu đãi, dữ liệu cũ qua restart, nguồn ảnh, mùa, upload video và HTTP Range.
- Trình duyệt: checkout chọn màu/giá/địa chỉ/nhận tại shop/áp mã, hỗ trợ hai chiều, hỏi đáp, theo dõi, tính điện, gợi ý xe, chọn/sắp xếp trang chủ và giá trước giảm.
- Banner/video: tự chuyển qua các ảnh, tự phát video không tiếng, phát xong chuyển tiếp; khi người xem thao tác thì giữ slide; reduced motion; tải/phát video từ admin.
- Các thử nghiệm dùng database tạm và dữ liệu tổng hợp, không tạo đơn hay gửi tin cho khách thật.
