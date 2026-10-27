'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{renderPage}=require('../pages');
const store={name:'Cửa Hàng Xe Điện Phú Quốc | Xe Điện Đức Tú',phone:'0326262859',secondaryPhone:'0866975540',address:'Khu phố 6, phường Dương Đông, Phú Quốc',email:'contact@example.invalid',zaloUrl:'https://zalo.me/0326262859',facebookUrl:'https://www.facebook.com/example',messengerUrl:'https://m.me/example',tiktokUrl:'https://www.tiktok.com/@example',presentation:{hours:'08:00 – 19:00',mapUrl:'https://maps.app.goo.gl/example'}};
const render=(path,s=store)=>renderPage(new URL('https://example.test'+path),{store:s,products:[],origin:'https://example.test',acceptingOrders:true});
test('customer footer has balanced navigation, real configured contact links, concise version and exact homepage name',()=>{
 const html=render('/'),footer=html.match(/<footer[\s\S]*?<\/footer>/)[0];assert.ok(html.includes('<title>'+store.name+'</title>'));assert.ok(html.includes('property="og:site_name" content="'+store.name+'"'));
 const menus=[...footer.matchAll(/<nav class="footer-menu"[\s\S]*?<\/nav>/g)].map(m=>m[0]);assert.equal(menus.length,4);for(const menu of menus)assert.equal((menu.match(/<li>/g)||[]).length,6);
 for(const value of [store.zaloUrl,store.facebookUrl,store.messengerUrl,store.tiktokUrl,store.presentation.mapUrl,'mailto:'+store.email,'tel:0326262859','tel:0866975540'])assert.ok(footer.includes('href="'+value+'"'),value);
 assert.match(footer,/V3\.1 Beta/);assert.doesNotMatch(footer,/build 2|ChatGPT|cấu hình|tự chỉnh|đối tác chính thức|Yêu cầu xóa dữ liệu/);assert.match(footer,/Google Maps/);assert.match(footer,/Email \/ Gmail/);assert.match(footer,/08:00 – 19:00/);assert.ok(render('/lien-he').includes('id="hop-tac"'));
});
test('footer does not invent social accounts, email or business partnerships and escapes shop text',()=>{
 const footer=render('/',{name:'<script>bad()</script>',phone:'0326262859',address:'Phú Quốc'}).match(/<footer[\s\S]*?<\/footer>/)[0];assert.ok(footer.includes('&lt;script&gt;bad()&lt;/script&gt;'));assert.ok(!footer.includes('<script>bad()'));assert.doesNotMatch(footer,/mailto:|zalo\.me|facebook\.com|m\.me|tiktok\.com|đối tác chính thức/);assert.match(footer,/google\.com\/maps\/search/);
});
