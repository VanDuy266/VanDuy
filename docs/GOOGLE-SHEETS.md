# Sao lưu Google Sheets cho website VanDuy trên Render Free

## Phạm vi và tình trạng

Đúng repository: **VanDuy266/VanDuy**, website `ductuphuquoc.onrender.com`.
Đã thêm cơ chế snapshot SQLite mã hóa AES-256-GCM vào Google Sheets. Đây là **sao lưu/khôi phục**, không thay đổi toàn bộ database thành các hàng Sheet chỉnh sửa trực tiếp. Dữ liệu được chỉnh trong trang quản trị website. Không dùng hướng dẫn `DATA_STORE=sheets` của repository Build-App cho website này.

Chưa cấu hình hay thử quyền truy cập Google thật; các test dùng transport mô phỏng. Không tuyên bố dữ liệu live đang được sao lưu trước khi kích hoạt và kiểm tra.

Bản sao lưu chứa toàn bộ SQLite: sản phẩm, tồn kho, đơn hàng, tài khoản, mật khẩu đã băm, cấu hình, phiên khách hàng, đánh giá, bảo hành và dữ liệu nghiệp vụ. Nội dung được nén rồi mã hóa trước khi ghi vào tab riêng `AppBackup`; Sheet không hiển thị mật khẩu hoặc hồ sơ khách hàng dạng đọc được. Không sửa/xóa các ô trong AppBackup. Các tab người dùng đã có không bị ghi đè.

## Trước triển khai: bảo vệ dữ liệu đang có

Render Free có filesystem tạm. **Việc deploy mã mới có thể làm mất SQLite hiện tại trước khi mã sao lưu có cơ hội chạy.** Cơ chế này không tự lấy lại dữ liệu đã mất và không tự chuyển dữ liệu đang nằm trong máy Render cũ.

Nếu đã có dữ liệu thật: xuất đơn CSV trong quản trị, lưu danh mục/cấu hình và lập phương án chuyển SQLite nhất quán trước khi deploy. CSV đơn không phải bản sao lưu đầy đủ tài khoản và lịch sử. Không triển khai thử nếu dữ liệu cũ quan trọng mà chưa có bản sao lưu đầy đủ. Render Free có thể không cung cấp Shell/SCP; cần cơ chế xuất có xác thực hoặc hỗ trợ nhà cung cấp cho chuyển dữ liệu đầy đủ. Không đưa database/private key lên GitHub.

Vì lý do này, thay đổi được chuẩn bị ở nhánh riêng, chưa tự thay main hoặc kích hoạt triển khai live.

## Chuẩn bị Google

1. Dùng bảng riêng tư chủ cửa hàng đã cung cấp: https://docs.google.com/spreadsheets/d/1V-RKyXsLHUDKpIXOaP2vvjcntO2EU5r9y7eB1522wfU/edit
2. Trong Google Cloud Console, tạo project và bật **Google Sheets API**. Không cần bật billing chỉ để sử dụng API trong hạn mức miễn phí hiện hành.
3. Tạo **Service account**, tạo khóa JSON. Không cần cấp role Editor toàn project.
4. Chia sẻ bảng quyền **Editor** cho `client_email` của service account. Không bật Anyone with the link. Không gửi khóa JSON/private key vào chat.
5. Giữ một bản khóa Google an toàn. Service account chỉ được dùng ở backend Render, không trong app điện thoại hoặc JavaScript frontend.

## Biến môi trường Render

Thêm trong Environment của dịch vụ đang có; chưa cần tạo dịch vụ hay gói trả phí mới:

| KEY | VALUE |
| --- | --- |
| GOOGLE_BACKUP_ENABLED | true |
| GOOGLE_BACKUP_INITIALIZE | true **chỉ cho lần khởi tạo đầu tiên** |
| GOOGLE_SHEET_ID | 1V-RKyXsLHUDKpIXOaP2vvjcntO2EU5r9y7eB1522wfU |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | client_email trong khóa JSON |
| GOOGLE_PRIVATE_KEY | private_key, giữ nguyên xuống dòng; chuỗi `\n` cũng được hỗ trợ |
| SHEETS_BACKUP_KEY | Chuỗi ngẫu nhiên tối thiểu 32 ký tự, dùng Generate trên Render hoặc trình quản lý mật khẩu |

Giữ các biến website cũ: NODE_ENV=production, DATA_DIR=/tmp/duc-tu-data, SITE_URL=https://ductuphuquoc.onrender.com, ADMIN_PASSWORD do chủ cửa hàng đặt.

**SHEETS_BACKUP_KEY không được thay đổi/mất.** Đây là khóa giải mã bản sao lưu, khác khóa service account. Lưu bản sao ở nơi bảo mật. Đổi khóa này mà không có kế hoạch chuyển sẽ không khôi phục được dữ liệu. Không gửi nó qua chat, đưa vào repo, hoặc đổi nó khi muốn đổi mật khẩu admin.

Giữ Docker Command trống; Dockerfile có `node server.js`. Health Check Path `/api/health`.

## Luồng hoạt động

- Khi bật, trước khi mở website: truy cập Sheet, khôi phục SQLite từ snapshot đã mã hóa và kiểm tra toàn vẹn. Nếu Sheet/key lỗi, **dừng khởi động** thay vì tạo dữ liệu trắng.
- Lần đầu chưa có snapshot chỉ được khởi tạo nếu GOOGLE_BACKUP_INITIALIZE=true. Code tạo tab AppBackup nếu thiếu, không ghi đè các tab khác.
- Sau khi khởi động thành công, đổi GOOGLE_BACKUP_INITIALIZE=false và giữ nguyên từ đó. Nếu tab bị xóa, server sẽ dừng thay vì âm thầm dựng database mới. Chỉ bật lại sau khi xác nhận cần một database mới.
- Mọi phản hồi JSON/redirect sẽ chờ sao lưu nếu SQLite đã thay đổi. Bản sao lưu được chụp bằng SQLite backup API (bao gồm WAL), không sao chép riêng file SQLite đang ghi.
- Nếu Google không xác nhận lưu, API trả 503 thay vì báo đơn/tài khoản đã lưu bền vững. Thay đổi có thể đã ở SQLite cục bộ hoặc Google nhận rồi nhưng response bị mất: kiểm tra mã đơn/lịch sử trước khi gửi lại. API đơn hiện có idempotency key; giữ cùng khóa khi thử lại một đơn.
- Khôi phục cả tài khoản băm và UUID hiện có, không bắt khách đăng ký Supabase hay thêm database có phí. Phiên quản trị RAM vẫn yêu cầu đăng nhập lại sau restart.
- Một tiến trình/instance duy nhất; không chạy hai dịch vụ cùng ghi một Sheet, tránh bản sao lưu ghi đè nhau.

## Kiểm chứng thật sau khi kích hoạt

1. Render log có `Đã kiểm tra/khôi phục bản sao lưu Google Sheets.` rồi thông báo listening.
2. `/api/health` trả ok. Startup đã phải xác nhận ghi snapshot ban đầu mới mở port.
3. Đăng nhập quản trị → Cài đặt → phần Google Sheets hiển thị đã sao lưu và thời gian gần nhất. API `/api/admin/storage` chỉ hoạt động khi có phiên quản trị.
4. Tạo một đơn và tài khoản **thử**, ghi lại mã đơn và thông tin đăng nhập.
5. Kiểm tra tab AppBackup có manifest/chunks (nội dung mã hóa, không chỉnh sửa).
6. Đổi GOOGLE_BACKUP_INITIALIZE=false, restart/redeploy. Đăng nhập lại, xác nhận tài khoản, đơn và cấu hình vẫn còn trước khi nhận dữ liệu thật.

## Ảnh và video

Ảnh YADEA/logo trong thư mục `assets/` đã được Git quản lý vẫn có sau deploy. Bản sao lưu lưu đường dẫn ảnh trong database, **không chứa file media/support tải lên ổ Render**. Để tránh hiểu nhầm là ảnh upload đã an toàn, chế độ backup từ chối upload ảnh/video/ảnh hỗ trợ cục bộ mới. Nếu dữ liệu cũ có đường dẫn `/media` hoặc support attachments, phải bảo toàn các file riêng trước khi chuyển.

Google Sheets không thay thế kho file ảnh/video. Cần kho lưu ảnh bền vững riêng nếu muốn upload tự do; UI xác thực URL ảnh ngoài hiện chưa tích hợp trong tính năng backup này. Không hứa ảnh upload còn nguyên chỉ vì database đã backup.

## Hạn mức và giới hạn

Giải pháp dành cho cửa hàng thử nghiệm nhỏ, không phải database production thay thế toàn diện. Giới hạn bản sao lưu: SQLite tối đa 32 MB, dữ liệu gzip tối đa 1 MB. Có giới hạn tốc độ Google API và số ô. Nếu vượt, ghi sẽ bị chặn 503 và cần di chuyển sang kho dữ liệu bền vững phù hợp trước khi tiếp tục. Google lỗi/hết quota có thể ảnh hưởng cả đăng nhập và đặt hàng. Sao lưu sau thay đổi làm tăng độ trễ.

Render Free vẫn có cold start. Không cần bật máy tính người bán. Sao lưu này không bảo đảm uptime, không tránh quota, không biến các gói miễn phí thành miễn phí vô hạn. Chưa có lịch sử nhiều phiên snapshot: giữ bản sao độc lập/Version history của Sheet, và giữ khóa mã hóa an toàn. Cần kế hoạch phục hồi riêng khi tài khoản Google/Sheet bị xóa.

## Kiểm thử mã

```sh
node --test tests/sheets-backup.test.js
npm test
```

Có test website thật chạy child process với Google transport giả: tạo tài khoản và đơn, xóa toàn bộ thư mục data, restart và kiểm tra đăng nhập + đơn + catalog. Có test khóa sai/ảnh snapshot hỏng không ghi đè file cũ, lưu thất bại trả 503, streaming static bình thường và Google RAW API. Các test này không thay cho việc cấp quyền và thử Google Sheet live.

## Các tab dễ đọc tự cập nhật

Sau khi bật sao lưu, phiên bản mới tự tạo các tab riêng:

- **Web_SanPham**: tên xe, giá, tồn kho, trạng thái hiển thị, đường dẫn ảnh, mô tả.
- **Web_DonHang**: mã đơn, tên khách, điện thoại, địa chỉ, sản phẩm, tổng tiền, trạng thái.
- **Web_TuVan**: khách, nội dung, thông tin tư vấn, ghi chú và phản hồi cửa hàng.
- **Web_CaiDat**: các thông tin công khai của cửa hàng và chính sách.

**Đây là bản xuất một chiều từ admin ra Sheet.** Sửa giá/nội dung trong admin và bấm lưu, không sửa ô Sheet để cập nhật website. Những sửa đổi tay trong các tab do website quản lý sẽ bị ghi đè ở lần đồng bộ tiếp theo. `AppBackup` vẫn là nguồn khôi phục; các tab dễ đọc không được dùng để khôi phục hoặc nhập dữ liệu.

**Quyền riêng tư:** các tab đơn/tư vấn chứa dữ liệu khách hàng dạng đọc được, khác bản sao lưu mã hóa. Chỉ chia sẻ Sheet cho chủ cửa hàng, người được phép và service account; không bật công khai. Không xuất mật khẩu, hash mật khẩu, token phiên, mã reset hoặc khóa bí mật vào tab dễ đọc.

Sau khi khôi phục bản sao lưu hoặc ghi dữ liệu mới, backend chụp SQLite rồi tạo bảng dễ đọc từ chính snapshot đó. Bản sao lưu được xác nhận trước; việc xuất bảng thất bại không biến đơn đã sao lưu thành lỗi lưu. Xem `/api/admin/storage`:

- `synced:true`: bản mã hóa đã lưu thành công.
- `viewsSynced:true`: các tab dễ đọc cũng cập nhật thành công.
- `viewsError`: thông báo riêng nếu bảng dễ đọc chưa cập nhật; thử lại bằng lần lưu tiếp theo hoặc restart sau khi xử lý quyền/quota.

Code kiểm tra dấu quản lý ở A1 trước khi sửa tab đã có. Nếu tab cùng tên chứa dữ liệu khác, **không ghi đè**; đổi tên tab thủ công đó để giữ dữ liệu, rồi lưu lại nội dung trong admin. Không xóa/sửa hàng đánh dấu trong tab hệ thống. Dòng 2 là tiêu đề, dữ liệu từ dòng 3.

Các bảng được cập nhật bằng `stringValue`/`numberValue`, nên tên hoặc ghi chú khách bắt đầu bằng `=` được giữ là văn bản, không thực thi công thức. Cập nhật toàn vùng xóa các dòng cũ dư thừa. Không cắt im lặng bản xuất; vượt 2 MB thì báo `viewsError`, bản sao lưu vẫn có giới hạn riêng 1 MB nén. Chỉ hiện đường dẫn ảnh, không lưu file ảnh trong ô.

## Nhập thay đổi từ Sheet về website

Đã có luồng nhập sản phẩm riêng với xem trước và xác nhận của **chủ cửa hàng**. Không tự lấy mọi thay đổi trong Sheet để chạy lên web.

### Cách dùng

1. Chờ triển khai phiên bản mới. Khi sao lưu/xuất bảng hoạt động, code tự tạo **Nhap_SanPham** từ dữ liệu hiện tại nếu tab này chưa có. Những lần lưu tiếp theo **không tự ghi đè tab nhập**, nhằm giữ sửa nháp.
2. Trong admin → **Cài đặt**, phần **Nhập sản phẩm từ Google Sheets**, bấm **Tạo lại bảng nhập từ website** trước một đợt sửa mới. Nút yêu cầu xác nhận vì thay thế sửa nháp của tab Nhap_SanPham. Dữ liệu website không đổi ở bước này.
3. Mở Nhap_SanPham: hàng 1 là dấu quản lý/hướng dẫn, hàng 2 là tiêu đề, từ hàng 3 là xe. Sửa ô cần thay, rồi đặt cột **Hành động** thành **Cập nhật** cho đúng dòng. Dòng **Giữ nguyên** không được nhập.
4. Quay lại admin Cài đặt → **Xem trước thay đổi**. Kiểm tra giá/tồn kho trước và sau của từng xe.
5. Bấm **Áp dụng vào website**. API cập nhật trong transaction, chụp và sao lưu database trước khi báo thành công. Web_SanPham sẽ phản ánh dữ liệu mới ở lần xuất tương ứng.
6. Sau khi dùng xong, tạo lại bảng nhập từ website trước đợt chỉnh sửa khác để lấy mốc giá/tồn kho mới nhất. Thao tác import không tự xóa các sửa nháp còn lại.

### Cột được sửa

Hãng, tên xe, danh mục (`city`, `sport`, `compact`, `accessory`), giá bán nguyên VND, giá so sánh nguyên/để trống, tồn kho nguyên/để trống nếu cần xác nhận, hiển thị (`Đang bán` hoặc `Ẩn`), mô tả, ghi chú giá.

Giá tối đa 1 tỷ VND, tồn tối đa 10.000; không nhập công thức, dấu tiền tệ hoặc số tiền dạng văn bản có dấu phân cách. Ô số thực sự của Sheet vẫn được đọc đúng dù Sheets đang định dạng hiển thị tiền tệ.

**Không sửa Mã xe, hàng tiêu đề hoặc Mốc dữ liệu.** Chỉ sửa xe có sẵn, không thêm/xóa xe, không đổi ảnh/bộ ảnh, giá theo màu/phiên bản, tài khoản, đơn hàng, cấu hình thanh toán hay tư vấn bằng chức năng này. Những dữ liệu đó tiếp tục quản lý theo nghiệp vụ trong admin. Bỏ một dòng trong Sheet không xóa sản phẩm trên web. Giá gốc đổi không làm đổi giá đã chốt trong đơn cũ.

### Chống ghi đè dữ liệu mới

Mỗi dòng có mốc SHA-256 của các trường sản phẩm lúc lấy mẫu. Nếu giá/tồn kho đã đổi trong admin hoặc có đơn đặt làm thay đổi tồn kho, bản nhập cũ bị từ chối; tạo lại bảng nhập rồi sửa trên dữ liệu mới. Nếu Sheet hoặc database đổi sau bước xem trước, lúc xác nhận cũng bị từ chối để bạn xem trước lại.

Bản xem trước gắn với phiên chủ cửa hàng, hết hạn sau 10 phút, tối đa 200 xe/thao tác và bảng nhập tối đa 1000 dòng sản phẩm. Toàn bộ thay đổi được kiểm tra trước và áp dụng cùng transaction. Nhấn lại cùng mã xác nhận trong phiên không áp dụng lần hai. Có kiểm tra Origin, session, vai trò owner và CSRF như các thao tác quản trị khác.

Các endpoint POST: `/api/admin/sheets-products/preview`, `/apply`, `/reset`. Không cần thêm secret hoặc biến môi trường mới; dùng quyền Sheet hiện tại. Chưa kiểm thử với dữ liệu Google live, đã kiểm thử luồng HTTP bằng transport giả, gồm sửa Sheet → xem trước → áp dụng → xóa data → khôi phục giá đã nhập.
