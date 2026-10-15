# Xe Điện Đức Tú — V3.1 Beta

## Cập nhật trên Windows, giữ dữ liệu cũ

1. Dừng website cũ bằng Ctrl+C; không xóa thư mục data. Sao lưu nguyên data khi server đã dừng (gồm cả SQLite, ảnh sản phẩm và ảnh hỗ trợ).
2. Tải ZIP GitHub, nhấp phải **Giải nén tất cả**. Không chạy XEM-WEBSITE.cmd trực tiếp trong ZIP. Mở thư mục có package.json, server.js và launch.js cùng nhau.
3. Chép nguyên data cũ vào cạnh server.js trong bản mới. Đừng mở đồng thời hai bản server ở cổng 3000.
4. Để xem thử qua Internet: mở CHAY-CLOUDFLARE.cmd, lấy URL HTTPS thực tế. Mở CAU-HINH-LINK-WEB.cmd, dán URL đó. Chương trình chỉ lưu địa chỉ công khai vào .site-url, không lưu mật khẩu/khóa OAuth.
5. Mở XEM-WEBSITE.cmd. Thông báo đầu phải là địa chỉ bạn vừa lưu. Biến SITE_URL trong CMD có ưu tiên cao hơn .site-url; nếu còn giá trị cũ, dùng `set SITE_URL=` rồi chạy lại trong chính cửa sổ đó.
6. Mở URL trong trình duyệt và nhấn Ctrl+F5. Admin: thêm /admin; trung tâm chức năng mới: /admin/v3-1.
7. Quick Tunnel là thử nghiệm, cần máy và hai tiến trình đang chạy. Đổi URL thì cập nhật lại .site-url và callback/domain/xác thực ở Zalo/Google/Facebook. Giữ lại thẻ xác thực Zalo đã thêm riêng trên máy; mã nguồn chung không chứa mã riêng của cửa hàng. Chưa có hosting/VPS hoặc miền ổn định được triển khai từ việc tải bản cập nhật này.

## Chức năng khách hàng

- Danh mục: ngân sách/giá trần, kiểu xe, quãng đường tối thiểu, tốc độ tối thiểu, sắp xếp và phân trang. Thông số theo dữ liệu hãng, không tự khẳng định phù hợp độ tuổi/chiều cao/điều kiện pháp lý.
- Trang xe: chọn màu/ảnh gốc/bộ góc sẵn có, ảnh lớn, quay lại danh mục, so sánh, yêu thích, hỏi đáp, đánh giá sau mua, sao chép link và QR thực tạo tại máy chủ. QR chỉ mở được khi URL website hoạt động.
- /tu-van-chon-xe: gợi ý từ ngân sách, kiểu dáng, quãng đường tham khảo; /chi-phi-su-dung: tính điện theo dữ liệu khách nhập, không đưa mức điện mặc định thành cam kết xe thực tế.
- Giỏ hàng và yêu thích: khách chưa đăng nhập dùng localStorage; đăng nhập có thể lưu/khôi phục theo tài khoản. Khi hai giỏ đều có sản phẩm, khách chủ động chọn khôi phục, không tự gộp hoặc nhân đôi số lượng. Giỏ là một màu/mẫu; muốn mua hai màu cùng mẫu cần shop hỗ trợ tách đơn.
- Đặt hàng: địa chỉ lưu, nhận tại shop/giao tận nơi, lịch mong muốn, mã giảm giá, yêu cầu cọc/trả góp cũ. Tổng ở server, kiểm tra giá/tồn kho màu, ưu đãi có thời hạn và giới hạn lượt. Phí giao ngoài tổng sản phẩm, chờ shop xác nhận.
- /so-dia-chi: tối đa 10 địa chỉ, thêm/xóa, chọn tại checkout. /thong-bao: đơn, khoản thu/hoàn, hỗ trợ, hỏi đáp và theo dõi giá/kho, có trạng thái đã đọc.
- /ho-tro: tư vấn/gọi lại/đơn hàng/bảo hành/bảo dưỡng/hóa đơn/hoàn tiền/phản ánh. Lịch là đề xuất cần shop xác nhận; không có đăng ký lái thử. Cần tài khoản để theo dõi hộp thư riêng. Khách vãng lai vẫn có hotline, kênh chính thức và biểu mẫu tư vấn cũ.
- Ảnh hỗ trợ: tối đa 3 PNG/JPEG/WebP, mỗi ảnh 2 MB; yêu cầu đăng nhập, chỉ chủ ảnh và nhân viên có quyền truy cập, không phục vụ công khai từ /media. Không gửi CCCD/OTP/thông tin thanh toán vào ảnh.
- Hội thoại theo yêu cầu, gắn mã đơn, phản hồi riêng; đơn/tài liệu sau mua chỉ thuộc customer_id đã đặt, không tự ghép bằng số điện thoại chưa xác minh.
- /xe-cua-toi: đơn đã giao, bàn giao/số khung/phụ kiện/hướng dẫn/điều kiện bảo hành shop nhập. Bảo hành/bảo dưỡng là yêu cầu xử lý, không tự suy ra thời hạn hoặc duyệt quyền lợi.
- Đề xuất thay đổi đơn: khách đồng ý/từ chối được ghi nhận; không tự chỉnh xe/giá/thu tiền. Shop tiếp tục thực hiện và xác nhận theo thỏa thuận.
- Theo dõi giá/có hàng: thông báo trong tài khoản khi shop cập nhật sản phẩm/kho màu. Không có email/SMS/Zalo tự gửi khi chưa kết nối nhà cung cấp.
- /phu-kien: danh mục phụ kiện do shop thêm; ID xe tương thích được shop khai báo trong admin. Không có phụ kiện hoặc ưu đãi giả được tạo sẵn.
- Tài khoản có thể đăng xuất các phiên khác. Khôi phục mật khẩu qua email vẫn cần dịch vụ gửi thư và quy trình xác minh; không cung cấp reset không xác thực.

## Admin /admin/v3-1

- **Điều hành:** số yêu cầu đang chờ, đơn chờ, lịch nhận mong muốn, màu xe còn ít, khoản thu/hoàn nhân viên ghi nhận.
- **Banner & quảng cáo:** thêm/sửa/tắt, lịch hiệu lực, ảnh tải lên, link nội bộ, thứ tự, nội dung/quà tặng và điều kiện; xem trước, banner chuyển có dừng, khu ưu đãi, popup một lần/phiên. Có thể tải MP4 lên trong admin (tối đa 40 MB) hoặc dùng tệp đã triển khai trong assets; không tự tải video mạng xã hội.
- **Liên hệ & LED:** giờ mở cửa, Google Maps HTTPS, ảnh mặt tiền, chữ chạy có nút dừng, chủ đề Navy/Tựu trường/Tết, mẫu trả lời. Hotline và các link mạng xã hội nằm trong Cài đặt cũ.
- **Quảng cáo thực:** không có giảm giá giả, lượt mua giả, đồng hồ tự reset hoặc chớp nháy nhanh. Giảm chuyển động theo cài đặt thiết bị. Lượt xem/bấm là sự kiện tham khảo, không phải người duy nhất; đơn gắn chiến dịch gần nhất trong phiên, tách số yêu cầu khỏi đã giao, không phải hệ thống attribution quảng cáo đa kênh.
- **Mã ưu đãi:** cố định/%; đơn tối thiểu, trần giảm, số lượt, ngày bắt đầu/kết thúc. Tắt mã hoặc cập nhật theo cùng mã. Hủy đơn hoàn lại lượt; không sửa ưu đãi trên đơn đã lưu.
- **Kho theo màu:** giá và tồn kho hiện tại, lý do điều chỉnh, nhật ký giữ/hoàn/kiểm kê. Khi mẫu đã có kho màu, phải cấu hình mọi màu muốn bán; màu chưa cấu hình không nhận đặt. Tồn kho tổng sản phẩm nếu có vẫn là giới hạn chung, cần giữ nhất quán. Đây chưa phải module mua hàng/nhà cung cấp hoặc kế toán kho đầy đủ.
- **Hỗ trợ & bảo hành:** tìm/lọc trạng thái, người phụ trách (ghi nhãn nội bộ), ghi chú nội bộ, mẫu trả lời, ảnh riêng và hội thoại. Không phải hộp thư gom trực tiếp từ Zalo/Messenger; nút mạng xã hội chỉ mở kênh chính thức đã cấu hình.
- **Hỏi đáp:** trả lời/ẩn/hiện; đánh giá sau mua vẫn ở Tổng quan admin cũ, bảo toàn chức năng V3.0.
- **Bàn giao xe:** chỉ đơn đã giao; cập nhật số khung/hồ sơ, phụ kiện, hướng dẫn, bảo hành và thời gian giao thật. Chưa phải hóa đơn điện tử hoặc biên bản ký số.
- **Báo cáo:** thu, hoàn, thu ròng từ payment_records, nhóm theo ngày UTC; CSV thu/hoàn và tối đa 1.000 đơn gần nhất, nhật ký 200 bản ghi. Số liệu là sổ nhân viên nhập, chưa có xác nhận gateway/ngân hàng tự động.
- **Nhân viên:** chủ shop để trống tên đăng nhập; nhân viên dùng tên và mật khẩu riêng. Bán hàng: đơn/tư vấn/đánh giá/hỗ trợ/hỏi đáp/bàn giao/đề xuất. Chăm sóc: hỗ trợ/hỏi đáp/bàn giao; có dữ liệu tổng quan phục vụ công việc. Chỉ chủ shop cấu hình giá/kho, quảng cáo, mã giảm, tài chính, cài đặt, mật khẩu chủ shop và tài khoản nhân viên. Mật khẩu nhân viên từ 10 ký tự, hash scrypt; khóa/đổi tài khoản thu hồi phiên. Mật khẩu chủ shop giữ chính sách không để trống của V2.6.

## Kết nối ngoài và giới hạn

Không tạo merchant, thu tiền, phát hành hóa đơn, hoàn tiền qua ngân hàng, gửi email/SMS/OA hoặc tự liên kết tài khoản mạng xã hội. Các dịch vụ này cần đăng ký, quyền API và cấu hình riêng. Nút thanh toán online chỉ mở khi có tích hợp đã kiểm chứng; hiện chưa kích hoạt. Bộ màu/360 vẫn dùng dữ liệu ảnh thật đã có: 12 mẫu có màu, 5 mẫu có chuỗi góc, không giả mô hình 3D cho mẫu thiếu ảnh.

Bản Beta cần shop nhập các dữ liệu thật trước khi bán: giá/stock/phiên bản, ưu đãi, chính sách, lịch giờ và kênh liên hệ. Dữ liệu minh họa trong ảnh kiểm thử nằm trong database tạm riêng, không đưa vào database khách.

## Kiểm tra và triển khai

`npm test` kiểm tra các luồng cũ và V3.1: quyền tài khoản, coupon, tồn màu/hoàn kho, ticket riêng, thông báo, QR, file riêng, nhân viên, báo cáo tiền và bàn giao. Dockerfile đã bổ sung đủ module V3/V3.1 và thư viện QR cục bộ (MIT), không cần npm install khi chạy. Bản Docker chạy non-root, SQLite và ảnh phải ở volume data.


Kết quả kiểm chứng build 2: 19 bài `npm test` đạt. Bộ kiểm tra trình duyệt có thể chạy lại bằng `npm run test:browser` với Playwright/Chromium (xem scripts/qa/README.md). Đã thử 12 mục trung tâm admin, khách đặt xe có màu/giá/địa chỉ/nhận tại shop/ưu đãi, hỗ trợ hai chiều, hỏi đáp, theo dõi, sắp xếp trang chủ và khôi phục giỏ khi danh mục tải chậm. Banner/video đã kiểm tra tự chuyển, phát không tiếng, phát xong chuyển tiếp, giữ slide khi xem thủ công và reduced motion. Kiểm tra 360/390/768/1440px không tràn ngang. Docker chạy root filesystem read-only, user node, volume dữ liệu và upload video đạt.

## Build 2 — không còn phải tạo banner từ đầu

- Cập nhật là có sẵn bộ banner giới thiệu, LED tên shop và hotline, 4 slide và video thiết kế. Nội dung là giới thiệu, không tạo giảm giá/quà tặng giả.
- LED theo yêu cầu: **Xe Điện Đức Tú • Hotline: 0326 262 859 – 0866 975 540**. Các preset mùa không chèn slogan vào LED. Chủ shop vẫn chỉnh/tắt được trong admin; tắt có chủ đích được giữ qua restart.
- Liên hệ & LED: chọn bộ mùa bằng nút; bật/tắt banner mặc định, tự phát video không tiếng; chọn xe nổi bật và đổi thứ tự các nhóm bằng nút lên/xuống.
- Banner & quảng cáo: tải riêng ảnh banner, ảnh quà, video MP4 H.264 tối đa 40 MB. Đường dẫn được điền sau upload; phải nhấn Lưu để áp dụng. Tệp lưu dưới data/media, cần sao lưu cùng database.
- Câu chuyện cửa hàng: chọn loại Câu chuyện, nhập nội dung/ảnh và xác nhận quyền sử dụng/đồng ý của người xuất hiện. Hiện tại `/cau-chuyen-duc-tu` và trang chủ. Không có đồng hồ khuyến mãi trong câu chuyện.
- Lịch nhận xe: shop chọn đơn đang xử lý và xác nhận ngày giờ, khách nhận thông báo; ngày giờ mong muốn và xác nhận được phân biệt.
- Giá trước giảm: nhập tại editor sản phẩm, phải lớn hơn giá hiện tại. Không tự tạo giá gạch ngang từ số bịa đặt.
- Thông báo admin nhận biết cả khách trả lời lại cùng một yêu cầu hỗ trợ.
- `/api/health` trả đúng phiên bản `3.1.0-beta.2`. Footer hiện build 2 để kiểm tra đang chạy đúng bản. Nếu vẫn thấy bản cũ, dừng server cũ và chạy từ thư mục mới đã giải nén.

Xem [bảng đối chiếu đầy đủ](docs/DOI-CHIEU-V3.1.md) và [ảnh xem trước](docs/XEM-TRUOC-V3.1.md). Những mục cần merchant, API mạng xã hội, dịch vụ email/hóa đơn, domain hoặc bộ ảnh 360 gốc được nêu riêng; không coi là đã kết nối khi chưa có điều kiện thật.
