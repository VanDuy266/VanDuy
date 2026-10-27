'use strict';
function contact(store){return [store.name||'Xe Điện Đức Tú',store.address,store.phone?'Điện thoại: '+store.phone:'',store.secondaryPhone?'Điện thoại bổ sung: '+store.secondaryPhone:'',store.email?'Email hỗ trợ: '+store.email:''].filter(Boolean).join('\n');}
function privacy(store){return `CHÍNH SÁCH QUYỀN RIÊNG TƯ
Đơn vị vận hành và tiếp nhận yêu cầu:\n${contact(store)}

1. Dữ liệu website xử lý
Khi đăng ký bằng email: họ tên, email, mật khẩu đã băm và thời điểm tạo tài khoản. Website không lưu mật khẩu dạng rõ. Khi đăng nhập Google, Facebook hoặc Zalo: tên hiển thị và định danh do nhà cung cấp trả về để tạo/nhận diện tài khoản. Website không yêu cầu mật khẩu mạng xã hội của bạn và không lưu access token mạng xã hội trong database. Tài khoản email tự đăng ký hiện chưa có quy trình xác minh email.
Khi đặt xe hoặc tư vấn: họ tên, số điện thoại, địa chỉ nhận xe, mẫu xe, số lượng, nội dung yêu cầu, trạng thái và lịch sử xử lý. Các chức năng hỗ trợ, đánh giá và bảo hành có thể lưu nội dung do bạn gửi cùng liên kết với tài khoản/đơn hàng. Website không có cổng thu tiền trực tuyến tự động và không yêu cầu số thẻ thanh toán.

2. Mục đích sử dụng
Dữ liệu phục vụ đăng nhập, bảo vệ phiên truy cập, xử lý yêu cầu đặt xe/tư vấn, theo dõi đơn, hỗ trợ và bảo hành. Khi dùng email khôi phục mật khẩu, hệ thống tạo liên kết dùng một lần nếu cửa hàng đã cấu hình dịch vụ email. Không nhập mật khẩu hoặc thông tin thanh toán vào ô tư vấn/ghi chú.

3. Cookie và dữ liệu trên thiết bị
Cookie cần thiết giữ phiên khách hàng, quản trị và xác thực đăng nhập. Giỏ hàng, yêu thích và một số lựa chọn được lưu trong bộ nhớ trình duyệt. Đăng xuất kết thúc phiên tương ứng, không tự xóa tài khoản hoặc đơn hàng đã lưu. Xóa dữ liệu trình duyệt chỉ xóa dữ liệu trên thiết bị đó.

4. Lưu trữ và quyền truy cập
Ứng dụng chạy trên Render. Khi bật sao lưu Google Sheets, database được nén và mã hóa bằng khóa do cửa hàng giữ trước khi ghi vào AppBackup. Các tab xuất dễ đọc của sản phẩm/đơn/tư vấn có thể chứa thông tin khách hàng dạng đọc được để chủ cửa hàng quản lý. Bảng phải được giới hạn chia sẻ cho người được phép và tài khoản dịch vụ. File ảnh/video tải lên ổ tạm Render không nằm trong bản sao lưu database này.
Nhân sự được chủ cửa hàng phân quyền có thể tiếp cận dữ liệu để thực hiện công việc. Các nhà cung cấp đăng nhập, hạ tầng và email (nếu bật) có chính sách riêng. Khách được chuyển sang trang của nhà cung cấp để đồng ý đăng nhập. Thời gian lưu giữ tùy mục đích xử lý, giao dịch, bảo hành và nghĩa vụ liên quan; liên hệ cửa hàng để biết thời hạn áp dụng cho dữ liệu của bạn.

5. Yêu cầu truy cập, sửa hoặc xóa
Liên hệ theo thông tin đầu trang hoặc xem /chinh-sach/xoa-du-lieu. Cửa hàng cần xác minh quyền sở hữu tài khoản trước khi cung cấp hoặc xử lý dữ liệu. Không gửi mật khẩu, mã OTP hoặc access token. Việc gỡ kết nối ứng dụng trong Facebook/Google/Zalo không tự xóa bản dữ liệu đã được cửa hàng lưu.

6. Cập nhật
Chính sách được đăng công khai trên website. Chủ cửa hàng chịu trách nhiệm duy trì thông tin liên hệ và cập nhật nội dung khi thay đổi cách xử lý dữ liệu.`;}
function terms(store){return `ĐIỀU KHOẢN SỬ DỤNG WEBSITE
Thông tin liên hệ:\n${contact(store)}

1. Phạm vi
Website giới thiệu xe điện, phụ kiện và tiếp nhận yêu cầu tư vấn/đặt xe. Người dùng cần cung cấp thông tin chính xác và chỉ sử dụng tài khoản thuộc quyền kiểm soát của mình.

2. Giá, sản phẩm và đặt xe
Giá hiển thị, cấu hình, phiên bản, màu và khả năng cung cấp cần được đối chiếu với cửa hàng trước khi xác nhận giao dịch. Gửi yêu cầu trên website không tự tạo hợp đồng mua bán hoặc xác nhận đã thanh toán. Giá tại thời điểm đặt được ghi lại trong đơn; việc đổi giá danh mục sau đó không tự đổi giá đơn cũ. Chương trình khuyến mãi áp dụng theo điều kiện và thời hạn được cửa hàng xác nhận.

3. Thanh toán và giao nhận
Website hiện chưa thu tiền trực tuyến tự động. Đặt cọc, trả góp, thanh toán và giao xe phải được cửa hàng xác nhận riêng; không chuyển tiền theo hướng dẫn từ bên mạo danh. Chính sách giao xe, đổi trả và bảo hành được công bố tại các trang tương ứng và cần đối chiếu với thỏa thuận mua bán thực tế.

4. Tài khoản và nội dung
Bảo vệ mật khẩu và phiên đăng nhập; không dùng website để truy cập dữ liệu người khác, gửi yêu cầu giả, mã độc hoặc nội dung vi phạm quyền của bên khác. Đánh giá và phản hồi cần phản ánh trải nghiệm thực tế. Thông báo cho cửa hàng nếu phát hiện truy cập tài khoản bất thường.

5. Khả dụng và hỗ trợ
Hạ tầng miễn phí có thể khởi động chậm hoặc gián đoạn. Nếu yêu cầu bị lỗi, kiểm tra lịch sử/mã đơn trước khi gửi lại để tránh trùng. Liên hệ cửa hàng để được đối chiếu giao dịch. Khi có bất đồng, cung cấp mã đơn và thông tin liên hệ để cửa hàng tiếp nhận, không đăng công khai thông tin riêng tư của người khác.

6. Quyền riêng tư
Cách xử lý dữ liệu và yêu cầu xóa được trình bày tại /chinh-sach/bao-mat và /chinh-sach/xoa-du-lieu.`;}
function deletion(store){return `HƯỚNG DẪN YÊU CẦU XÓA DỮ LIỆU
Đầu mối tiếp nhận:\n${contact(store)}

1. Gửi yêu cầu
Liên hệ cửa hàng qua số điện thoại/email hỗ trợ công bố phía trên, hoặc vào trang /lien-he. Nêu rõ: “Yêu cầu xóa dữ liệu tài khoản”, kênh đăng nhập đã sử dụng (Facebook, Google, Zalo hoặc email), tên tài khoản và thông tin liên hệ để cửa hàng phản hồi. Có thể cung cấp mã đơn liên quan để đối chiếu. Không gửi mật khẩu, OTP, App Secret hoặc access token.

2. Xác minh và xử lý
Cửa hàng tiếp nhận và cần xác minh bạn là người có quyền yêu cầu. Cửa hàng xem xét dữ liệu tài khoản, định danh đăng nhập và nội dung liên quan để xóa/ẩn danh khi phù hợp. Dữ liệu cần cho giao dịch, bảo hành, tranh chấp hoặc nghĩa vụ lưu trữ có thể phải giữ lại; cửa hàng sẽ trao đổi phạm vi xử lý và cách theo dõi kết quả qua kênh liên hệ đã xác minh. Website hiện chưa có nút xóa tài khoản tự động; không coi việc gửi yêu cầu là xác nhận dữ liệu đã bị xóa.

3. Bản sao lưu và bản xuất
Yêu cầu cần bao gồm dữ liệu trong hệ thống hoạt động, bảng xuất dễ đọc và bản sao lưu Google Sheets nếu đang bật. Sau khi xử lý, cửa hàng cần cập nhật bản sao lưu để tránh khôi phục lại dữ liệu đã xóa. Các bản sao, lịch sử phiên bản, ảnh/file được lưu ở nơi khác cần được xem xét riêng, không được khẳng định đã xóa chỉ vì tài khoản không còn hiển thị.

4. Gỡ quyền mạng xã hội
Bạn có thể gỡ ứng dụng trong phần Ứng dụng và trang web của Facebook, kết nối bên thứ ba của Google hoặc mục ứng dụng được cấp quyền của Zalo. Thao tác đó thu hồi quyền tại nhà cung cấp; để xử lý dữ liệu đã lưu tại cửa hàng, vẫn cần gửi yêu cầu theo hướng dẫn trên.

5. Theo dõi
Giữ thông tin trao đổi và mã đơn/yêu cầu (nếu được cấp). Nếu chưa nhận phản hồi, liên hệ lại đầu mối công bố. Không đăng công khai thông tin xác minh tài khoản.`;}
module.exports={privacy,terms,deletion};
