'use strict';
function contact(store){return [store.name||'Xe Điện Đức Tú',store.address,store.phone?'Hotline: '+store.phone:'',store.secondaryPhone?'Hotline bổ sung: '+store.secondaryPhone:'',store.email?'Email hỗ trợ: '+store.email:''].filter(Boolean).join('\n');}
function privacy(store){return `Xe Điện Đức Tú tôn trọng quyền riêng tư của bạn. Chính sách này giúp bạn hiểu những thông tin được thu thập khi sử dụng dịch vụ và cách liên hệ để quản lý thông tin của mình.

1. Thông tin chúng tôi thu thập
Khi bạn tạo tài khoản, đặt xe hoặc yêu cầu tư vấn, chúng tôi tiếp nhận các thông tin bạn cung cấp như họ tên, email, số điện thoại, địa chỉ nhận xe và nội dung yêu cầu.
Thông tin về mẫu xe, đơn hàng, thanh toán, giao nhận, bảo hành, đánh giá và trao đổi hỗ trợ được lưu để phục vụ bạn trong quá trình mua và sử dụng xe.
Nếu chọn đăng nhập bằng Google, Facebook hoặc Zalo, chúng tôi nhận thông tin tài khoản được nhà cung cấp cho phép chia sẻ để nhận diện bạn. Đức Tú không yêu cầu bạn cung cấp mật khẩu của các tài khoản mạng xã hội này.

2. Mục đích sử dụng thông tin
Thông tin của bạn được sử dụng để quản lý tài khoản; liên hệ xác nhận và xử lý đơn hàng; tư vấn sản phẩm; hỗ trợ thanh toán, giao nhận, bảo hành và giải quyết yêu cầu sau mua.
Chúng tôi cũng sử dụng thông tin cần thiết để bảo vệ tài khoản, kiểm tra giao dịch và xử lý các trường hợp sử dụng dịch vụ không hợp lệ.

3. Chia sẻ và bảo vệ thông tin
Thông tin chỉ được cung cấp cho nhân sự có trách nhiệm và các bên cung cấp dịch vụ liên quan trong phạm vi cần thiết để phục vụ bạn, như đăng nhập, thanh toán, giao nhận hoặc lưu trữ dữ liệu; hoặc khi có yêu cầu hợp pháp của cơ quan có thẩm quyền.
Khi sử dụng dịch vụ của Google, Facebook, Zalo hoặc cổng thanh toán, bạn nên tham khảo thêm chính sách quyền riêng tư của nhà cung cấp đó.
Hãy giữ kín mật khẩu và mã OTP. Không nhập thông tin thẻ, mật khẩu ngân hàng hoặc mã OTP vào nội dung tư vấn, ghi chú đơn hàng hay đánh giá sản phẩm.

4. Cookie và thông tin trên thiết bị
Website sử dụng cookie để duy trì đăng nhập và hỗ trợ bảo vệ tài khoản. Giỏ hàng, danh sách yêu thích và một số lựa chọn của bạn có thể được ghi nhớ trên trình duyệt để thuận tiện khi mua sắm.
Bạn có thể quản lý hoặc xóa các dữ liệu này trong cài đặt trình duyệt. Việc xóa có thể khiến bạn cần đăng nhập và chọn lại giỏ hàng. Đăng xuất không làm mất đơn hàng hoặc các yêu cầu đã gửi tới cửa hàng.

5. Thời gian lưu giữ
Thông tin được lưu trong thời gian cần thiết để xử lý đơn hàng, hỗ trợ khách hàng, bảo hành, giải quyết khiếu nại và thực hiện nghĩa vụ lưu trữ liên quan. Bạn có thể liên hệ để được giải thích về việc lưu giữ thông tin của mình.

6. Quyền của bạn
Bạn có thể yêu cầu kiểm tra, chỉnh sửa, bổ sung hoặc xóa thông tin cá nhân; đề nghị ngừng việc sử dụng thông tin dựa trên sự đồng ý của mình; và phản ánh các vấn đề về quyền riêng tư.
Để bảo vệ bạn, cửa hàng có thể cần xác minh người gửi yêu cầu trước khi cung cấp hoặc thay đổi thông tin. Một số dữ liệu liên quan đến giao dịch, bảo hành hoặc nghĩa vụ lưu trữ có thể cần được giữ lại; chúng tôi sẽ trao đổi với bạn về phạm vi xử lý.
Để yêu cầu xóa tài khoản và thông tin liên quan, vui lòng xem mục Yêu cầu xóa dữ liệu trong phần chính sách hoặc liên hệ trực tiếp với cửa hàng.

7. Liên hệ về quyền riêng tư
${contact(store)}
Khi liên hệ, bạn chỉ cần cung cấp thông tin cần thiết để chúng tôi xác định tài khoản hoặc đơn hàng. Không gửi mật khẩu hay mã OTP.

8. Cập nhật chính sách
Các thay đổi về chính sách được công bố tại trang này để bạn thuận tiện theo dõi.`;}
function terms(store){return `Chào mừng bạn đến với Xe Điện Đức Tú. Vui lòng tham khảo các điều khoản dưới đây khi tìm hiểu sản phẩm, đặt xe và sử dụng dịch vụ của cửa hàng.

1. Thông tin sản phẩm và giá bán
Thông tin trên website giúp bạn tham khảo và lựa chọn xe, phụ kiện phù hợp. Phiên bản, màu sắc, thông số, tình trạng cung cấp, giá bán và ưu đãi cụ thể được cửa hàng xác nhận trước khi giao dịch.
Nếu có thông tin chưa rõ hoặc sai lệch, chúng tôi sẽ trao đổi lại với bạn trước khi xác nhận việc mua bán. Chi phí giao nhận và dịch vụ bổ sung, nếu có, được thông báo riêng.

2. Đặt xe và xác nhận đơn hàng
Bạn vui lòng cung cấp đúng họ tên, số điện thoại, địa chỉ và nhu cầu mua xe để cửa hàng liên hệ. Sau khi gửi yêu cầu, hãy giữ mã đơn để theo dõi và nhận hỗ trợ.
Việc gửi yêu cầu trên website chưa đồng nghĩa với việc đơn đã được cửa hàng xác nhận hoặc đã thanh toán. Cửa hàng sẽ xác nhận sản phẩm, giá, phương án thanh toán và giao nhận với bạn trước khi thực hiện.

3. Thanh toán và đặt cọc
Chỉ thanh toán theo phương thức và thông tin chính thức đã được cửa hàng xác nhận. Mức cọc, điều kiện hoàn hoặc hủy cọc cần được thống nhất trước khi bạn chuyển tiền.
Nếu thanh toán trực tuyến, hãy làm theo hướng dẫn trên trang thanh toán được mở từ website. Trạng thái thanh toán được cập nhật sau khi giao dịch được kiểm tra, đối soát. Nếu đã chuyển tiền nhưng chưa thấy cập nhật, vui lòng giữ chứng từ và liên hệ cửa hàng trước khi thanh toán thêm.
Nhu cầu mua trả góp cần được tư vấn và xác nhận điều kiện riêng; yêu cầu tư vấn không phải là hợp đồng tín dụng hay cam kết được duyệt hồ sơ.

4. Giao nhận, đổi trả và bảo hành
Thời gian, địa điểm và phí giao xe được xác nhận với bạn khi xử lý đơn. Khi nhận xe, vui lòng kiểm tra sản phẩm, phụ kiện và giấy tờ theo thỏa thuận.
Điều kiện đổi trả và bảo hành áp dụng theo chính sách được công bố, chính sách của nhà sản xuất và thỏa thuận mua bán. Bạn có thể liên hệ cửa hàng để được hướng dẫn theo tình trạng xe và chứng từ liên quan.

5. Tài khoản và sử dụng dịch vụ
Bạn có trách nhiệm giữ kín thông tin đăng nhập và cập nhật thông tin liên hệ chính xác. Hãy báo cửa hàng nếu nghi ngờ tài khoản bị người khác sử dụng.
Vui lòng không gửi yêu cầu giả mạo, truy cập thông tin của người khác hoặc đăng nội dung vi phạm quyền riêng tư và quyền hợp pháp của bên khác. Đánh giá, phản hồi nên phản ánh trải nghiệm thực tế và sử dụng ngôn từ phù hợp.

6. Hỗ trợ và giải quyết yêu cầu
Nếu cần sửa thông tin, thay đổi nhu cầu hoặc hủy đơn, bạn có thể sử dụng chức năng tương ứng trong tài khoản, tra cứu đơn hoặc liên hệ cửa hàng. Việc xử lý phụ thuộc trạng thái đơn và các khoản thanh toán đã thực hiện.
Khi có lỗi hoặc chưa rõ kết quả gửi yêu cầu, hãy kiểm tra mã đơn và lịch sử trước khi gửi lại để tránh trùng đơn. Nếu cần đối chiếu, vui lòng cung cấp mã đơn, thông tin liên hệ và chứng từ liên quan.
${contact(store)}

7. Quyền riêng tư và chính sách liên quan
Vui lòng tham khảo Chính sách quyền riêng tư, Yêu cầu xóa dữ liệu, chính sách giao xe, đổi trả và bảo hành để biết thêm thông tin áp dụng cho dịch vụ của bạn.`;}
function deletion(store){return `Bạn có thể liên hệ Xe Điện Đức Tú để yêu cầu xóa tài khoản hoặc thông tin cá nhân đã cung cấp. Cửa hàng sẽ tiếp nhận, xác minh và trao đổi với bạn về phạm vi có thể xử lý.

1. Cách gửi yêu cầu
Liên hệ qua hotline, email hỗ trợ bên dưới hoặc kênh liên hệ chính thức của cửa hàng. Vui lòng nêu rõ “Yêu cầu xóa dữ liệu tài khoản”.
${contact(store)}

2. Thông tin cần cung cấp
Cho biết tên tài khoản, email hoặc số điện thoại đã sử dụng, hình thức đăng nhập (email, Google, Facebook hoặc Zalo) và cách liên hệ để nhận phản hồi. Nếu yêu cầu liên quan đến giao dịch, bạn có thể cung cấp thêm mã đơn.
Không gửi mật khẩu, mã OTP hoặc thông tin đăng nhập ngân hàng. Chỉ cung cấp các thông tin cần thiết khi trao đổi với kênh hỗ trợ chính thức.

3. Xác minh và xử lý
Cửa hàng có thể liên hệ để xác minh bạn là chủ tài khoản hoặc là người có quyền yêu cầu. Sau khi xác minh, chúng tôi sẽ xem xét việc xóa hoặc loại bỏ thông tin nhận diện cá nhân trong phạm vi phù hợp và trao đổi kết quả với bạn.
Một số thông tin cần thiết cho đơn hàng đang xử lý, bảo hành, khiếu nại hoặc nghĩa vụ lưu trữ có thể cần được giữ lại. Nếu có trường hợp này, chúng tôi sẽ giải thích phạm vi và lý do liên quan.
Việc gửi yêu cầu chưa đồng nghĩa với dữ liệu đã được xóa. Vui lòng theo dõi phản hồi từ cửa hàng để biết kết quả xử lý.

4. Ngừng kết nối tài khoản mạng xã hội
Bạn có thể thu hồi quyền truy cập của ứng dụng trong phần quản lý ứng dụng hoặc kết nối của Google, Facebook hoặc Zalo.
Thu hồi quyền đăng nhập không tự xóa đơn hàng và thông tin đã cung cấp cho Đức Tú. Nếu muốn xử lý những thông tin này, vui lòng gửi yêu cầu tới cửa hàng theo hướng dẫn trên.

5. Theo dõi yêu cầu
Giữ lại nội dung trao đổi và mã yêu cầu nếu được cung cấp. Bạn có thể liên hệ lại hotline hoặc email hỗ trợ để hỏi về tiến độ; không đăng công khai thông tin xác minh tài khoản.`;}
module.exports={privacy,terms,deletion};
