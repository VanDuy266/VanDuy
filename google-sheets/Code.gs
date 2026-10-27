/** Paste this into a script bound to the store's private Google Sheet. No secrets in cells/code. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Đức Tú').addItem('Cập nhật lên web', 'capNhatLenWeb').addToUi();
}
function capNhatLenWeb() {
  var ui = SpreadsheetApp.getUi();
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(1000)) { ui.alert('Đang cập nhật. Vui lòng đợi lần trước hoàn tất.'); return; }
  try {
    var properties = PropertiesService.getScriptProperties();
    var origin = properties.getProperty('WEB_APP_URL');
    var secret = properties.getProperty('SHEETS_UPDATE_TOKEN');
    if (!origin || !/^https:\/\/[A-Za-z0-9.-]+\/?$/.test(origin) || !secret || secret.length < 32) {
      ui.alert('Cần đặt WEB_APP_URL và SHEETS_UPDATE_TOKEN trong Project Settings → Script Properties.'); return;
    }
    origin = origin.replace(/\/$/, '');
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!sheet.getSheetByName('Nhap_SanPham')) { ui.alert('Chưa có tab Nhap_SanPham. Hãy tạo bảng nhập từ Admin → Cài đặt trước.'); return; }
    SpreadsheetApp.flush();
    var payload = { action: 'products.update', timestamp: Date.now(), nonce: Utilities.getUuid().replace(/-/g, ''), sheetId: sheet.getId() };
    var canonical = ['products.update', String(payload.timestamp), payload.nonce, payload.sheetId].join('\n');
    var signature = Utilities.computeHmacSha256Signature(canonical, secret, Utilities.Charset.UTF_8)
      .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
    var response = UrlFetchApp.fetch(origin + '/api/sheets/products/update', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(payload),
      headers: { 'X-Sheets-Signature': signature }, followRedirects: false, muteHttpExceptions: true
    });
    var result;
    try { result = JSON.parse(response.getContentText()); } catch (e) { throw new Error('Máy chủ chưa trả kết quả. Render Free có thể đang khởi động; kiểm tra website trước khi thử lại.'); }
    if (response.getResponseCode() !== 200) { throw new Error(result.error || 'Cập nhật chưa thành công.'); }
    ui.alert(result.updated > 0
      ? 'Đã cập nhật ' + result.updated + ' xe lên website và xác nhận sao lưu. Khách tải lại trang để xem thông tin mới.'
      : 'Không có thay đổi cần áp dụng. Hãy sửa Nhap_SanPham và đặt Hành động = Cập nhật cho dòng cần đổi.');
  } catch (e) {
    ui.alert('Chưa xác nhận cập nhật: ' + e.message);
  } finally { lock.releaseLock(); }
}
