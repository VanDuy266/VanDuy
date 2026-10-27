'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {renderPage}=require('../pages');
const store={name:'Xe Điện Đức Tú',phone:'0326262859',secondaryPhone:'0866975540',address:'Phú Quốc',email:'support@example.test',shipping:'Liên hệ cửa hàng',returns:'Theo thỏa thuận',warranty:'Theo hãng'};
test('privacy, terms and deletion instructions render public policy routes with real shop contact',()=>{
 for(const route of ['/chinh-sach/bao-mat','/chinh-sach/dieu-khoan','/chinh-sach/xoa-du-lieu']){const html=renderPage(new URL('https://example.test'+route),{store,products:[],origin:'https://example.test',acceptingOrders:true});assert.ok(html);assert.match(html,/0326262859/);assert.match(html,/support@example.test/);if(route!=='/chinh-sach/xoa-du-lieu')assert.ok(html.includes('href="'+route+'"'));assert.ok(!html.includes('undefined'));}
 const privacy=renderPage(new URL('https://example.test/chinh-sach/bao-mat'),{store,products:[],origin:'https://example.test',acceptingOrders:true});assert.match(privacy,/Mục đích sử dụng thông tin/);assert.match(privacy,/Quyền của bạn/);assert.doesNotMatch(privacy,/database|AppBackup|access token|Render|Google Sheets|Thông tin được quản trị/);
 const deletion=renderPage(new URL('https://example.test/chinh-sach/xoa-du-lieu'),{store,products:[],origin:'https://example.test',acceptingOrders:true});assert.match(deletion,/Việc gửi yêu cầu chưa đồng nghĩa với dữ liệu đã được xóa/);assert.match(deletion,/Không gửi mật khẩu/);
});
test('policy content escapes merchant settings instead of executing embedded markup',()=>{const html=renderPage(new URL('https://example.test/chinh-sach/xoa-du-lieu'),{store:{...store,address:'<script>bad()</script>'},products:[],origin:'https://example.test',acceptingOrders:true});assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));assert.ok(!html.includes('<script>bad()</script>'));});
