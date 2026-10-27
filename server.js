'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {renderPage,productUrl}=require('./pages');
const {initializeAccounts}=require('./accounts');
const {getViewer}=require('./product-viewer');
const {initializeCommerce,paymentSummary,validateSocial,initializeOrderHistory,orderEvent,changeOrderStatus,requestCancellation,rejectCancellation,orderHistory}=require('./commerce');
const port=Number(process.env.PORT||3000);
const production=process.env.NODE_ENV==='production';
const adminPassword=process.env.ADMIN_PASSWORD||'';

const siteUrl=process.env.SITE_URL||(fs.existsSync(path.join(__dirname,'.site-url'))?fs.readFileSync(path.join(__dirname,'.site-url'),'utf8').trim():'')||`http://localhost:${port}`;
const siteOrigin=new URL(siteUrl).origin;
if(production&&!siteUrl.startsWith('https://'))throw Error('Production SITE_URL must use HTTPS');
async function boot(){
const dataDir=process.env.DATA_DIR||path.join(__dirname,'data');
const backupEnabled=process.env.GOOGLE_BACKUP_ENABLED==='true';
const persistence=backupEnabled?require('./sheets-backup').createPersistence({transport:require('./sheets-backup').createGoogleTransport(),secret:process.env.SHEETS_BACKUP_KEY,file:path.join(dataDir,'store.sqlite'),allowEmpty:process.env.GOOGLE_BACKUP_INITIALIZE==='true'}):null;
if(persistence){await persistence.restore();console.log('Đã kiểm tra/khôi phục bản sao lưu Google Sheets.');}
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
const db=new DatabaseSync(path.join(dataDir,'store.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,brand TEXT NOT NULL,name TEXT NOT NULL,price INTEGER NOT NULL,range INTEGER NOT NULL,speed INTEGER NOT NULL,badge TEXT NOT NULL DEFAULT '',hue INTEGER NOT NULL DEFAULT 0,published INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,note TEXT NOT NULL,items TEXT NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consultations(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL);`);
for(const [column,definition] of Object.entries({compare_price:'INTEGER',compatible_ids:"TEXT NOT NULL DEFAULT '[]'",image:"TEXT NOT NULL DEFAULT ''",description:"TEXT NOT NULL DEFAULT ''",category:"TEXT NOT NULL DEFAULT 'city'",price_note:"TEXT NOT NULL DEFAULT ''",stock:'INTEGER',image_source:"TEXT NOT NULL DEFAULT ''",gallery:"TEXT NOT NULL DEFAULT '[]'",specifications:"TEXT NOT NULL DEFAULT '[]'"})){
 if(!db.prepare('PRAGMA table_info(products)').all().some(c=>c.name===column))db.exec(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
}
initializeCommerce(db);
initializeOrderHistory(db);
for(const[column,definition]of Object.entries({kind:"TEXT NOT NULL DEFAULT 'general'",product_id:'INTEGER',months:'INTEGER',down_payment:'INTEGER',note:"TEXT NOT NULL DEFAULT ''"}))if(!db.prepare('PRAGMA table_info(consultations)').all().some(c=>c.name===column))db.exec(`ALTER TABLE consultations ADD COLUMN ${column} ${definition}`);
for(const[column,definition]of Object.entries({status:"TEXT NOT NULL DEFAULT 'new'",internal_note:"TEXT NOT NULL DEFAULT ''",draft:"TEXT NOT NULL DEFAULT ''"}))if(!db.prepare('PRAGMA table_info(consultations)').all().some(c=>c.name===column))db.exec(`ALTER TABLE consultations ADD COLUMN ${column} ${definition}`);
db.exec("CREATE TABLE IF NOT EXISTS consultation_replies(id TEXT PRIMARY KEY,consultation_id TEXT NOT NULL REFERENCES consultations(id),message TEXT NOT NULL,request_key TEXT UNIQUE NOT NULL,created_at TEXT NOT NULL)");
db.exec('CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY)');
if(!db.prepare("SELECT 1 FROM migrations WHERE name='yadea_catalog_v2'").get()){
 db.exec('BEGIN IMMEDIATE');try{
 const originals=[['Evo200',22000000],['Oris',24990000],['Quantum S3',34900000],['Klara S',36900000],['G5',27990000],['Pega S',32900000]];
 // Hide only untouched demo entries; preserve merchant edits, orders and photographs.
 for(const [name,price]of originals)db.prepare("UPDATE products SET published=0 WHERE name=? AND price=? AND badge='Chưa công bố' AND image='' AND description='' AND stock IS NULL AND published=0").run(name,price);
 const insert=db.prepare('INSERT INTO products(brand,name,price,range,speed,badge,hue,published,description,category,price_note) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
 [['Xmen Neo',16000000,'sport',180,'Cá tính mỗi ngày'],['Orla',17000000,'city',0,'Thanh lịch thành thị'],['iGo',13000000,'compact',45,'Nhỏ gọn, dễ di chuyển'],['Ocean',16000000,'city',240,'Hành trình mới'],['Vigor',17000000,'sport',300,'Phong cách năng động'],['M6i',13000000,'compact',100,'Lựa chọn vừa túi tiền']].forEach(([name,price,category,hue,badge])=>{
 if(!db.prepare('SELECT 1 FROM products WHERE brand=? AND name=?').get('Yadea',name))insert.run('Yadea',name,price,0,0,badge,hue,1,'Mẫu xe Yadea được giới thiệu trong danh mục của Xe Điện Đức Tú. Liên hệ cửa hàng để xác nhận phiên bản, màu sắc, thông số và tình trạng cung cấp.',category,'Giá do cửa hàng đề xuất, cần xác nhận trước khi đặt mua.');
 });
 db.prepare('INSERT INTO migrations VALUES(?)').run('yadea_catalog_v2');db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
// Apply verified manufacturer assets once; preserve merchant edits and referenced orders.
if(!db.prepare("SELECT 1 FROM migrations WHERE name='yadea_verified_photos_v4'").get()){
 const verified=require('./catalog/yadea.json');db.exec('BEGIN IMMEDIATE');try{
 for(const item of verified){
  if(!fs.existsSync(path.join(__dirname,item.image.slice(1))))throw Error('Missing verified product asset');
  const existing=db.prepare('SELECT * FROM products WHERE brand=? AND name=?').get('Yadea',item.oldName);
  const untouched=existing&&existing.image===''&&existing.stock===null&&existing.price===item.price&&existing.range===0&&existing.speed===0&&existing.description.startsWith('Mẫu xe Yadea được giới thiệu trong danh mục');
  const referenced=existing&&db.prepare("SELECT 1 FROM orders,json_each(orders.items) WHERE json_extract(json_each.value,'$.id')=? LIMIT 1").get(existing.id);
  if(untouched&&!referenced){db.prepare('UPDATE products SET name=?,image=?,image_source=?,gallery=?,description=?,range=?,speed=?,specifications=? WHERE id=?').run(item.name,item.image,item.source,JSON.stringify(item.gallery),item.description,item.range,item.speed,JSON.stringify(item.specifications),existing.id);}
  else if(!db.prepare('SELECT 1 FROM products WHERE brand=? AND name=?').get('Yadea',item.name)){
   db.prepare('INSERT INTO products(brand,name,price,range,speed,badge,hue,published,description,category,price_note,image,image_source,gallery,specifications) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('Yadea',item.name,item.price,item.range,item.speed,'Ảnh từ YADEA',0,1,item.description,item.category,'Giá do cửa hàng đề xuất, cần xác nhận trước khi đặt mua.',item.image,item.source,JSON.stringify(item.gallery),JSON.stringify(item.specifications));
  }
 }
 db.prepare('INSERT INTO migrations VALUES(?)').run('yadea_verified_photos_v4');db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
const mediaDir=path.join(dataDir,'media');fs.mkdirSync(mediaDir,{recursive:true,mode:0o700});
const defaultSettings={name:process.env.STORE_NAME||'Xe Điện Đức Tú',phone:process.env.STORE_PHONE||'0326262859',secondaryPhone:'0866975540',address:process.env.STORE_ADDRESS||'Khu phố 6, phường Dương Đông, Phú Quốc',email:process.env.STORE_EMAIL||'',legalName:'',registration:'',shipping:'Thời gian và phí giao xe được xác nhận khi cửa hàng liên hệ.',returns:'Điều kiện đổi trả được xác nhận trong hợp đồng mua xe.',warranty:'Bảo hành theo chính sách chính thức của nhà sản xuất và hợp đồng mua xe.'};
db.prepare('INSERT OR IGNORE INTO settings VALUES(1,?)').run(JSON.stringify(defaultSettings));
if(!db.prepare("SELECT 1 FROM migrations WHERE name='duc_tu_contact_v3'").get()){
 const current=JSON.parse(db.prepare('SELECT value FROM settings WHERE id=1').get().value);
 if(!current.phone)current.phone=defaultSettings.phone;
 if(!current.secondaryPhone)current.secondaryPhone=defaultSettings.secondaryPhone;
 if(!current.address)current.address=defaultSettings.address;
 db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(current));db.prepare('INSERT INTO migrations VALUES(?)').run('duc_tu_contact_v3');db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
}
if(!db.prepare("SELECT 1 FROM migrations WHERE name='yadea_extended_v5'").get()){
 const models=require('./catalog/new-models.json');db.exec('BEGIN IMMEDIATE');try{for(const m of models){if(db.prepare('SELECT 1 FROM products WHERE lower(brand)=? AND lower(name)=?').get('yadea',m.name.toLowerCase()))continue;db.prepare('INSERT INTO products(brand,name,price,range,speed,badge,hue,published,image,description,category,price_note,image_source,specifications) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('Yadea',m.name,m.price,m.range,m.speed,'Mẫu mới YADEA',0,1,m.image,m.description,m.category,'Giá tham khảo hãng, shop xác nhận giá bán và phiên bản trước khi nhận mua.',m.source,JSON.stringify(m.specifications));}db.prepare('INSERT INTO migrations VALUES(?)').run('yadea_extended_v5');db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
}
const settings=()=>({zaloUrl:'',facebookUrl:'',messengerUrl:'',tiktokUrl:'',depositAmount:0,depositPolicy:'Mức cọc và điều kiện hoàn/hủy được cửa hàng xác nhận trước khi thu tiền.',installmentPolicy:'Chưa có đơn vị tài chính và chính sách được xác nhận. Tiếp nhận nhu cầu tư vấn trả góp, không duyệt hồ sơ trực tuyến.',...JSON.parse(db.prepare('SELECT value FROM settings WHERE id=1').get().value)});
const ready=()=>{const s=settings();return !!(s.phone&&s.address);};
db.exec('CREATE TABLE IF NOT EXISTS admin_credentials(id INTEGER PRIMARY KEY CHECK(id=1),salt TEXT NOT NULL,hash TEXT NOT NULL)');
let credential=db.prepare('SELECT * FROM admin_credentials WHERE id=1').get();if(!credential){if(!adminPassword||adminPassword.length>256)throw Error('Set a nonempty ADMIN_PASSWORD (maximum 256 characters) for initial setup');const bootstrapSalt=crypto.randomBytes(16).toString('hex');db.prepare('INSERT INTO admin_credentials VALUES(1,?,?)').run(bootstrapSalt,crypto.scryptSync(adminPassword,bootstrapSalt,64).toString('hex'));credential=db.prepare('SELECT * FROM admin_credentials WHERE id=1').get();}
function adminText(value){if(typeof value!=='string'||value.length===0||value.length>256)fail(400,'Mật khẩu không được để trống (tối đa 256 ký tự)');return value;}
const verifyAdmin=value=>crypto.timingSafeEqual(crypto.scryptSync(value,credential.salt,64),Buffer.from(credential.hash,'hex'));

const sessions=new Map(),rateLimits=new Map();
setInterval(()=>{const now=Date.now();for(const[k,v]of sessions)if(v.expires<now)sessions.delete(k);for(const[k,v]of rateLimits)if(v.until<now)rateLimits.delete(k);},60000).unref();
function rate(req,scope,max){const key=scope+':'+req.socket.remoteAddress;let r=rateLimits.get(key);if(!r||r.until<Date.now()){r={n:0,until:Date.now()+60000};rateLimits.set(key,r);}if(++r.n>max)fail(429,'Quá nhiều yêu cầu. Vui lòng thử lại sau.');}
function fail(status,message){throw Object.assign(new Error(message),{status});}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function text(value,min,max,label){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(400,`${label} không hợp lệ`);return value.trim();}
function phone(value){const p=text(value,9,20,'Số điện thoại').replace(/[ ()+.-]/g,'');if(!/^\d{9,15}$/.test(p))fail(400,'Số điện thoại không hợp lệ');return p;}
async function body(req,maxBytes=3000000){if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Yêu cầu JSON');const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>maxBytes)fail(413,'Yêu cầu quá lớn');chunks.push(chunk);}try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{fail(400,'JSON không hợp lệ');}}
function session(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('volt_session='))?.slice(13);const s=sessions.get(token);if(!s||s.expires<Date.now())fail(401,'Vui lòng đăng nhập');if(s.username){const staffAccount=db.prepare('SELECT enabled,role FROM staff_accounts WHERE username=?').get(s.username);if(!staffAccount?.enabled)fail(401,'Tài khoản nhân viên đã ngừng hoạt động');s.role=staffAccount.role;}staff.authorize(req,s);return{token,...s};}
const accounts=initializeAccounts(db,{origin:siteOrigin,production,json,body,fail,text,phone,rate,paymentSummary});
const staff=require('./staff').initializeStaff(db,{json,body,fail,text,session,invalidate:username=>{for(const[token,s]of sessions)if(s.username===username)sessions.delete(token);}});
const v31=require('./v31').initializeV31(db,{accounts,session,json,body,fail,text,phone,rate,settings,origin:siteOrigin});
const sepay=require('./sepay-payments').initializeSePay(db,{siteUrl:siteOrigin,onPaid:(order,attempt)=>{v31.notice(order.customer_id,'Đơn '+order.id+': SePay xác nhận đã thanh toán '+attempt.amount.toLocaleString('vi-VN')+'đ','/tai-khoan');v31.audit('sepay-payment',attempt.invoice+':'+attempt.amount,'sepay');}});
function paymentOrder(req,b,id=b.id){const order=db.prepare('SELECT * FROM orders WHERE id=?').get(text(id,1,40,'Mã đơn'));if(!order)fail(404,'Không tìm thấy đơn');const customer=accounts.current(req);if(!(customer&&customer.customer_id===order.customer_id)&&order.phone!==phone(b.phone))fail(404,'Không tìm thấy đơn với thông tin này');return order;}
const reviews=require('./reviews').initializeReviews(db,{accounts,json,body,fail,text,rate});
const videos=require('./video-media').initializeVideo({session,fail,rate,json,mediaDir,audit:v31.audit});
const files={'/sepay-client.js':'sepay-client.js','/v31.css':'v31.css','/v31-client.js':'v31-client.js','/v31-admin.js':'v31-admin.js','/admin/v3-1':'admin-pages/v3-1.html','/v3.css':'v3.css','/v3.js':'v3.js','/':'index.html','/index.html':'index.html','/style.css':'style.css','/retail.css':'retail.css','/brand.css':'brand.css','/v2.css':'v2.css','/shop.js':'shop.js','/assets/scooter.svg':'assets/scooter.svg','/admin':'admin.html','/admin/san-pham':'admin-pages/san-pham.html','/admin/don-hang':'admin-pages/don-hang.html','/admin/tu-van':'admin-pages/tu-van.html','/admin/khach-hang':'admin-pages/khach-hang.html','/admin/cai-dat':'admin-pages/cai-dat.html','/admin/thanh-toan':'admin-pages/thanh-toan.html','/admin-sidebar.js':'admin-sidebar.js','/admin-sidebar.css':'admin-sidebar.css','/admin.js':'admin.js','/admin.css':'admin.css','/viewer.js':'viewer.js','/viewer.css':'viewer.css','/icons.js':'icons.js','/experience.css':'experience.css'};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'};
const verifySheetButton=require('./sheets-button').createSheetButtonVerifier({secret:process.env.SHEETS_UPDATE_TOKEN,sheetId:process.env.GOOGLE_SHEET_ID});
const sheetImporter=persistence?require('./sheets-import').createImporter({db,read:()=>persistence.readProductInput(),onChanged:(before,after)=>v31.productChanged(before,after)}):null;
if(persistence)await persistence.flush(db);
const server=http.createServer(async(req,res)=>{
 // Finalize JSON/redirect responses only after committed database changes have a remote backup.
 if(persistence)persistence.attach(res,db);
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://pay-sandbox.sepay.vn https://pay.sepay.vn");
 if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
 try{
 const url=new URL(req.url,'http://localhost');const route=url.pathname;
 if(route==='/api/sheets/products/update'&&req.method==='POST'){
  rate(req,'signed-sheet-update',10);const signed=await body(req);verifySheetButton(signed,req.headers['x-sheets-signature']);if(!sheetImporter)fail(503,'Chưa bật kết nối Google Sheets.');return json(res,200,await sheetImporter.update());
 }

 if(route==='/api/payments/sepay/ipn'&&req.method==='POST'){
  sepay.verifyToken(url.searchParams.get('token'));rate(req,'sepay-ipn',120);const b=await body(req,65536);const invoice=sepay.notificationInvoice(b),result=await sepay.verify(invoice);
  if(result.status==='pending')fail(503,'Giao dịch chưa được SePay xác nhận.');
  return json(res,200,{success:true});
 }
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==siteOrigin)fail(403,'Nguồn yêu cầu không hợp lệ. Website đang dùng '+siteOrigin+'. Mở đúng địa chỉ này hoặc cập nhật cấu hình link rồi khởi động lại website.');
 if(persistence&&req.method==='POST'&&['/api/admin/upload','/api/admin/upload-video','/api/v31/member/attachment'].includes(route))fail(409,'Chế độ sao lưu Sheet không lưu tệp ảnh/video tải lên. Dùng ảnh có sẵn trong kho mã hoặc kho lưu trữ ảnh bền vững.');
 if(await videos.handle(req,res,url))return;
 if(await staff.handle(req,res,url))return;
 if(await v31.handle(req,res,url))return;
 if(await accounts.handle(req,res,url))return;
 if(await reviews.handle(req,res,url))return;
 if(route==='/api/health'&&req.method==='GET')return json(res,200,{ok:db.prepare('SELECT 1 n').get().n===1,version:require('./package.json').version});
 if(route==='/api/store'&&req.method==='GET')return json(res,200,{...settings(),acceptingOrders:ready(),onlinePaymentAvailable:sepay.publicConfig().onlineAvailable});
 if(route==='/api/products'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM products WHERE published=1 ORDER BY id').all().map(p=>({...p,viewer:getViewer(p),variants:db.prepare('SELECT color,price,stock FROM v31_variants WHERE product_id=?').all(p.id)})));
 if(/^\/api\/products\/\d+$/.test(route)&&req.method==='GET'){const product=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(Number(route.split('/').pop()));if(!product)fail(404,'Không tìm thấy xe');return json(res,200,{...product,viewer:getViewer(product),variants:db.prepare('SELECT color,price,stock FROM v31_variants WHERE product_id=?').all(product.id)});}
 if(route==='/api/payments/config'&&req.method==='GET')return json(res,200,{...sepay.publicConfig(),depositAmount:settings().depositAmount});
 if(route==='/api/payments/sepay/checkout'&&req.method==='POST'){rate(req,'sepay-checkout',10);const b=await body(req);const order=paymentOrder(req,b);return json(res,200,sepay.start(order.id,b.purpose||'balance'));}
 if(route==='/api/payments/sepay/status'&&req.method==='POST'){rate(req,'sepay-status',30);const b=await body(req),attempt=sepay.current(b.invoice);paymentOrder(req,b,attempt.order_id);return json(res,200,await sepay.verify(attempt.invoice));}
 if(route==='/api/orders'&&req.method==='POST'){
  rate(req,'orders',10);if(!ready())fail(503,'Cửa hàng đang hoàn thiện thông tin. Chưa nhận đơn hàng.');
  const b=await body(req);if(b.consent!==true)fail(400,'Cần đồng ý sử dụng thông tin để xử lý yêu cầu');const plan=b.paymentPlan||'cod';if(!['cod','deposit','installment'].includes(plan))fail(400,'Phương án thanh toán chưa được hỗ trợ');const months=plan==='installment'?(b.financeMonths??12):null;if(months!==null&&![6,9,12,18,24].includes(months))fail(400,'Kỳ hạn không hợp lệ');const name=text(b.name,2,80,'Họ tên'),p=phone(b.phone),address=text(b.address,5,300,'Địa chỉ'),note=text(b.note||'',0,1000,'Ghi chú');
  const customerId=accounts.current(req)?.customer_id||null;const key=text(req.headers['idempotency-key'],16,80,'Mã yêu cầu');
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>30)fail(400,'Giỏ hàng không hợp lệ');
  let total=0;const seen=new Set();const items=b.items.map(i=>{if(!i||typeof i!=='object'||!Number.isInteger(i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>10||seen.has(i.id))fail(400,'Số lượng không hợp lệ');seen.add(i.id);const p=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(i.id);if(!p)fail(409,'Sản phẩm không còn được bán. Vui lòng tải lại trang.');const variant=i.color?db.prepare('SELECT * FROM v31_variants WHERE product_id=? AND color=?').get(p.id,i.color):null;const unitPrice=variant?.price||p.price;if(i.expectedPrice!==undefined&&i.expectedPrice!==unitPrice)fail(409,'Giá sản phẩm đã thay đổi. Vui lòng tải lại trang và kiểm tra giá.');total+=unitPrice*i.quantity;const v=getViewer(p),color=i.color===undefined||i.color===''?null:text(i.color,1,80,'Màu xe');if(color&&(!v||!v.colors.some(c=>c.name===color)))fail(400,'Màu xe chưa được hỗ trợ cho mẫu này');return{id:p.id,name:`${p.brand} ${p.name}`,price:unitPrice,quantity:i.quantity,reserved:p.stock!==null,...(color?{color}:{})};});
  const old=db.prepare('SELECT * FROM orders WHERE request_key=?').get(key);
  if(old){const oldItems=JSON.parse(old.items).map(({variantReserved,...item})=>item);if(old.customer_id!==customerId||old.name!==name||old.phone!==p||old.address!==address||old.note!==note||JSON.stringify(oldItems)!==JSON.stringify(items)||old.payment_plan!==plan||old.finance_months!==months||old.fulfillment!==(b.fulfillment||'delivery')||old.delivery_time!==(b.deliveryTime||'').trim()||old.coupon_code!==(b.couponCode||'').trim().toUpperCase())fail(409,'Mã yêu cầu đã dùng cho đơn khác');return json(res,200,{id:old.id,total:old.total,paymentPlan:old.payment_plan,depositDue:old.deposit_due,payment:paymentSummary(db,old)});}
  const subtotal=total,extra=v31.orderExtras(b,items,subtotal);total-=extra.discount;
  const depositDue=plan==='deposit'&&settings().depositAmount>0?Math.min(settings().depositAmount,total):null;
  for(const i of items){const product=db.prepare('SELECT stock FROM products WHERE id=?').get(i.id);if(product.stock!==null&&product.stock<i.quantity)fail(409,'Số lượng xe không đủ. Vui lòng điều chỉnh giỏ hàng.');}
  const id='V-'+crypto.randomBytes(8).toString('hex').toUpperCase();db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO orders(id,request_key,name,phone,address,note,items,total,created_at,payment_plan,deposit_due,finance_months,customer_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,key,name,p,address,note,JSON.stringify(items),total,new Date().toISOString(),plan,depositDue,months,customerId);v31.recordOrder(id,extra,items,subtotal);orderEvent(db,id,'new','customer');for(const item of items)if(item.reserved)db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock IS NOT NULL').run(item.quantity,item.id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return json(res,201,{id,total,paymentPlan:plan,depositDue,payment:{received:0,remaining:total,status:'unpaid',source:'none'}});
 }
 if(route==='/api/orders/track'&&req.method==='POST'){rate(req,'tracking',10);const b=await body(req);const order=db.prepare('SELECT id,status,items,total,created_at,payment_plan,deposit_due,finance_months,fulfillment,delivery_time,delivery_scheduled,delivery_note,subtotal,discount,coupon_code,received_at,cancellation_requested,cancellation_reason,cancellation_requested_at,cancellation_response FROM orders WHERE id=? AND phone=?').get(text(b.id,1,40,'Mã đơn').toUpperCase(),phone(b.phone));if(!order)fail(404,'Không tìm thấy yêu cầu với mã đơn và số điện thoại này');return json(res,200,{...order,items:JSON.parse(order.items),payment:paymentSummary(db,order),history:orderHistory(db,order.id)});}
 if(route==='/api/orders/cancel'&&req.method==='POST'){rate(req,'cancel-order',10);const b=await body(req),id=text(b.id,1,40,'Mã đơn'),number=phone(b.phone);if(!db.prepare('SELECT 1 FROM orders WHERE id=? AND phone=?').get(id,number))fail(404,'Không tìm thấy đơn với thông tin này');return json(res,200,requestCancellation(db,id,text(b.reason||'Khách yêu cầu hủy',2,500,'Lý do hủy')));}
 if(route==='/api/consultations'&&req.method==='POST'){
  rate(req,'consult',5);if(!ready())fail(503,'Cửa hàng chưa nhận yêu cầu tư vấn');const b=await body(req);if(b.consent!==true)fail(400,'Cần đồng ý sử dụng thông tin tư vấn');const kind=b.kind||'general';if(!['general','installment'].includes(kind))fail(400,'Loại yêu cầu không hợp lệ');const productId=b.productId??null;if(productId!==null&&(!Number.isInteger(productId)||!db.prepare('SELECT 1 FROM products WHERE id=? AND published=1').get(productId)))fail(400,'Mẫu xe không hợp lệ');const months=kind==='installment'?(b.months??12):null;if(months!==null&&![6,9,12,18,24].includes(months))fail(400,'Kỳ hạn không hợp lệ');const down=b.downPayment??null;if(down!==null&&(!Number.isInteger(down)||down<0||down>1000000000))fail(400,'Số tiền trả trước không hợp lệ');if(productId&&down!==null&&down>db.prepare('SELECT price FROM products WHERE id=?').get(productId).price)fail(400,'Tiền trả trước vượt giá xe');const id=crypto.randomUUID();db.prepare('INSERT INTO consultations(id,name,phone,created_at,kind,product_id,months,down_payment,note) VALUES(?,?,?,?,?,?,?,?,?)').run(id,text(b.name,2,80,'Họ tên'),phone(b.phone),new Date().toISOString(),kind,productId,months,down,text(b.note||'',0,1000,'Nội dung'));return json(res,201,{id});
 }
 if(route==='/api/consultations/track'&&req.method==='POST'){
  rate(req,'consult-track',20);const b=await body(req),id=text(b.id,1,40,'Mã tư vấn'),number=phone(b.phone);const c=db.prepare('SELECT * FROM consultations WHERE id=? AND phone=?').get(id,number);if(!c)fail(404,'Không tìm thấy yêu cầu với thông tin này');return json(res,200,{id:c.id,status:c.status,created_at:c.created_at,replies:db.prepare('SELECT message,created_at FROM consultation_replies WHERE consultation_id=? ORDER BY created_at,id').all(id)});
 }
 if(route==='/api/admin/login'&&req.method==='POST'){rate(req,'login',5);const b=await body(req);const value=adminText(b.password);const username=typeof b.username==='string'?b.username.trim().toLowerCase():'';const staffAccount=username&&username!=='admin'?staff.verify(username,value):null;if(username&&username!=='admin'?!staffAccount:!verifyAdmin(value))fail(401,'Tài khoản hoặc mật khẩu không đúng');const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');sessions.set(token,{csrf,role:staffAccount?.role||'owner',username:staffAccount?.username||'',expires:Date.now()+8*3600000});res.setHeader('Set-Cookie',`volt_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);return json(res,200,{csrf});}
 if(route.startsWith('/api/admin/')){
  const s=session(req);if(req.method!=='GET'&&req.headers['x-csrf-token']!==s.csrf)fail(403,'Phiên yêu cầu không hợp lệ');
  if(route==='/api/admin/sepay'&&req.method==='GET')return json(res,200,sepay.adminStatus());
  if(route==='/api/admin/sepay/checkout'&&req.method==='POST'){const b=await body(req);return json(res,200,sepay.start(text(b.id,1,40,'Mã đơn'),b.purpose||'balance',{owner:true}));}
  if(route==='/api/admin/sepay/check'&&req.method==='POST'){const b=await body(req);return json(res,200,await sepay.verify(b.invoice));}
  if(route==='/api/admin/password'&&req.method==='POST'){rate(req,'admin-password',5);const b=await body(req);if(!verifyAdmin(adminText(b.currentPassword)))fail(400,'Mật khẩu hiện tại không đúng');const value=adminText(b.password);const salt=crypto.randomBytes(16).toString('hex');db.prepare('UPDATE admin_credentials SET salt=?,hash=? WHERE id=1').run(salt,crypto.scryptSync(value,salt,64).toString('hex'));credential=db.prepare('SELECT * FROM admin_credentials WHERE id=1').get();for(const token of sessions.keys())if(token!==s.token)sessions.delete(token);return json(res,200,{ok:true});}
  if(route==='/api/admin/notifications'&&req.method==='GET')return json(res,200,{supportItems:db.prepare("SELECT id,updated_at FROM v31_tickets WHERE status='new' ORDER BY updated_at DESC LIMIT 100").all(),support:db.prepare("SELECT COUNT(*) n FROM v31_tickets WHERE status='new'").get().n,orders:db.prepare("SELECT id,name,created_at FROM orders WHERE status='new' ORDER BY created_at DESC LIMIT 100").all(),consultations:db.prepare("SELECT id,name,created_at FROM consultations WHERE status='new' ORDER BY created_at DESC LIMIT 100").all(),cancellations:db.prepare('SELECT id,name FROM orders WHERE cancellation_requested=1').all()});
  if(route==='/api/admin/reviews'&&req.method==='GET')return json(res,200,reviews.listAdmin());
  if(route==='/api/admin/reviews'&&req.method==='POST')return json(res,200,reviews.moderate(await body(req)));
  if(route.startsWith('/api/admin/sheets-products/')&&req.method==='POST'){
   if(s.role!=='owner')fail(403,'Chỉ chủ cửa hàng được nhập dữ liệu từ Sheet.');if(!sheetImporter)fail(503,'Chưa bật kết nối Google Sheets.');rate(req,'sheets-products',10);const action=route.split('/').pop(),b=await body(req);
   if(action==='update')return json(res,200,await sheetImporter.update());
   if(action==='preview')return json(res,200,await sheetImporter.preview(s.token));
   if(action==='apply')return json(res,200,await sheetImporter.apply(s.token,text(b.token,1,100,'Mã xem trước')));
   if(action==='reset'){if(b.confirm!==true)fail(400,'Cần xác nhận thay thế sửa nháp trong bảng nhập.');await persistence.resetProductInput(db);return json(res,200,{ok:true});}
   fail(404,'Không có thao tác nhập Sheet này.');
  }
  if(route==='/api/admin/storage'&&req.method==='GET')return json(res,200,persistence?persistence.status():{enabled:false,synced:false});
  if(route==='/api/admin/session'&&req.method==='GET')return json(res,200,{csrf:s.csrf,role:s.role||'owner',username:s.username||''});
  if(route==='/api/admin/logout'&&req.method==='POST'){sessions.delete(s.token);res.setHeader('Set-Cookie','volt_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
  if(route==='/api/admin/products'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM products ORDER BY id').all());
  if(route==='/api/admin/products'&&req.method==='POST'){
   const b=await body(req);if(b.compatibleIds!==undefined&&(!Array.isArray(b.compatibleIds)||b.compatibleIds.length>100||b.compatibleIds.some(id=>!Number.isInteger(id)||!db.prepare("SELECT 1 FROM products WHERE id=? AND category<>'accessory'").get(id))))fail(400,'Danh sách xe tương thích không hợp lệ');if(b.comparePrice!==undefined&&b.comparePrice!==null&&(!Number.isInteger(b.comparePrice)||b.comparePrice<=b.price||b.comparePrice>1000000000))fail(400,'Giá trước giảm phải lớn hơn giá hiện tại');const previousProduct=b.id?db.prepare('SELECT * FROM products WHERE id=?').get(b.id):null;for(const[k,max]of[['price',1000000000],['range',1000],['speed',300],['hue',360]])if(!Number.isInteger(b[k])||b[k]<0||b[k]>max)fail(400,`${k} không hợp lệ`);
   if(b.price<1)fail(400,'Giá phải lớn hơn 0');if(typeof b.published!=='boolean')fail(400,'Trạng thái không hợp lệ');
   const description=text(b.description||'',0,3000,'Mô tả'),category=text(b.category||'city',1,30,'Danh mục'),priceNote=text(b.price_note||'',0,300,'Ghi chú giá');if(!['city','sport','compact','accessory'].includes(category))fail(400,'Danh mục không hợp lệ');const stock=b.stock===undefined||b.stock===null||b.stock===''?null:b.stock;if(stock!==null&&(!Number.isInteger(stock)||stock<0||stock>10000))fail(400,'Tồn kho không hợp lệ');
   const validImage=value=>/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(value)&&fs.existsSync(path.join(mediaDir,path.basename(value)))||/^\/assets\/yadea-[a-z0-9-]+\.(png|jpg|webp)$/.test(value)&&fs.existsSync(path.join(__dirname,value.slice(1)));const image=text(b.image||'',0,100,'Ảnh');if(image&&!validImage(image))fail(400,'Ảnh không hợp lệ hoặc không tồn tại');
   let gallery=b.gallery??[];if(!Array.isArray(gallery)||gallery.length>8||gallery.some(src=>typeof src!=='string'||!validImage(src)))fail(400,'Bộ ảnh không hợp lệ');const source=text(b.image_source||'',0,1000,'Nguồn ảnh');if(source){try{const u=new URL(source);if(u.protocol!=='https:'||u.username||u.password)throw Error();}catch{fail(400,'Nguồn ảnh phải là URL HTTPS');}}
   let specifications=b.specifications;if(specifications===undefined){const current=b.id?db.prepare('SELECT specifications FROM products WHERE id=?').get(b.id):null;specifications=current?JSON.parse(current.specifications):[];}if(!Array.isArray(specifications)||specifications.length>25||specifications.some(row=>!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||typeof row[1]!=='string'||!row[0].trim()||!row[1].trim()||row[0].length>60||row[1].length>300))fail(400,'Mỗi thông số cần tên và giá trị hợp lệ');
   const values=[text(b.brand,1,60,'Hãng'),text(b.name,1,100,'Tên xe'),b.price,b.range,b.speed,text(b.badge||'',0,60,'Nhãn'),b.hue,Number(b.published),image,description,category,priceNote,stock,source,JSON.stringify(gallery),JSON.stringify(specifications)];
   if(b.id!==undefined){if(!Number.isInteger(b.id))fail(400,'ID không hợp lệ');const r=db.prepare('UPDATE products SET brand=?,name=?,price=?,range=?,speed=?,badge=?,hue=?,published=?,image=?,description=?,category=?,price_note=?,stock=?,image_source=?,gallery=?,specifications=? WHERE id=?').run(...values,b.id);if(!r.changes)fail(404,'Không tìm thấy sản phẩm');}else b.id=Number(db.prepare('INSERT INTO products(brand,name,price,range,speed,badge,hue,published,image,description,category,price_note,stock,image_source,gallery,specifications) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(...values).lastInsertRowid);
   if(b.comparePrice!==undefined)db.prepare('UPDATE products SET compare_price=? WHERE id=?').run(b.comparePrice,b.id);if(b.compatibleIds!==undefined){if(!Array.isArray(b.compatibleIds)||b.compatibleIds.length>100||b.compatibleIds.some(id=>!Number.isInteger(id)||!db.prepare("SELECT 1 FROM products WHERE id=? AND category<>'accessory'").get(id)))fail(400,'Danh sách xe tương thích không hợp lệ');db.prepare('UPDATE products SET compatible_ids=? WHERE id=?').run(JSON.stringify([...new Set(b.compatibleIds)]),b.id);}v31.productChanged(previousProduct,db.prepare('SELECT * FROM products WHERE id=?').get(b.id));return json(res,200,{ok:true,id:b.id});
  }
  if(route==='/api/admin/upload'&&req.method==='POST'){
   rate(req,'upload',10);const b=await body(req);if(typeof b.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(b.data))fail(400,'Dữ liệu ảnh không hợp lệ');const bytes=Buffer.from(b.data,'base64');if(bytes.length>2000000||bytes.length<12)fail(400,'Ảnh phải nhỏ hơn 2 MB');let ext='';if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)ext='jpg';else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')ext='webp';if(!ext)fail(400,'Chỉ nhận ảnh PNG, JPEG hoặc WebP');const filename=crypto.randomBytes(16).toString('hex')+'.'+ext;fs.writeFileSync(path.join(mediaDir,filename),bytes,{mode:0o600,flag:'wx'});return json(res,201,{image:'/media/'+filename});
  }
  if(route==='/api/admin/settings'&&req.method==='POST'){
   const b=await body(req),next={...settings()};for(const[k,max]of Object.entries({name:80,phone:20,secondaryPhone:20,address:300,email:120,legalName:200,registration:100,shipping:3000,returns:3000,warranty:3000,depositPolicy:3000,installmentPolicy:3000}))if(b[k]!==undefined)next[k]=text(b[k],k==='name'?1:0,max,k);if(next.phone)phone(next.phone);if(next.secondaryPhone)phone(next.secondaryPhone);
   for(const key of ['zaloUrl','facebookUrl','messengerUrl','tiktokUrl'])if(b[key]!==undefined){try{next[key]=validateSocial(key,text(b[key],0,500,key));}catch(error){fail(400,error.message);}}
   if(b.depositAmount!==undefined){if(!Number.isInteger(b.depositAmount)||b.depositAmount<0||b.depositAmount>1000000000)fail(400,'Mức cọc không hợp lệ');next.depositAmount=b.depositAmount;}
   delete next.acceptingOrders;delete next.onlinePaymentAvailable;db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(next));return json(res,200,{ok:true});
  }
  if(route==='/api/admin/payments'&&req.method==='GET')return json(res,200,db.prepare("SELECT *, CASE WHEN request_key LIKE 'sepay-pg:%' THEN 1 ELSE 0 END AS sepay_verified FROM payment_records ORDER BY created_at DESC LIMIT 500").all());
  if(route==='/api/admin/payments'&&req.method==='POST'){
   const b=await body(req),key=text(req.headers['idempotency-key'],16,80,'Mã ghi nhận');const id=text(b.orderId,1,40,'Mã đơn'),reference=text(b.reference,3,120,'Số chứng từ'),note=text(b.note||'',0,1000,'Ghi chú');if(!Number.isInteger(b.amount)||b.amount<=0||b.amount>1000000000||!['receipt','refund'].includes(b.kind))fail(400,'Khoản thanh toán không hợp lệ');const old=db.prepare('SELECT * FROM payment_records WHERE request_key=?').get(key);if(old){if(old.order_id!==id||old.reference!==reference||old.amount!==b.amount||old.kind!==b.kind||old.note!==note)fail(409,'Mã ghi nhận đã dùng cho khoản khác');return json(res,200,{id:old.id});}
   const order=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!order)fail(404,'Không tìm thấy đơn');const summary=paymentSummary(db,order);if(b.kind==='receipt'&&(order.status==='cancelled'||b.amount>summary.remaining))fail(409,'Không thể ghi nhận khoản thu này');if(b.kind==='refund'&&b.amount>summary.received)fail(409,'Số tiền hoàn vượt khoản đã ghi nhận');const recordId=crypto.randomUUID();db.prepare('INSERT INTO payment_records VALUES(?,?,?,?,?,?,?,?)').run(recordId,id,b.amount,b.kind,reference,note,key,new Date().toISOString());v31.notice(order.customer_id,'Đơn '+id+': shop ghi nhận '+(b.kind==='receipt'?'thu ':'hoàn ')+b.amount.toLocaleString('vi-VN')+'đ','/tai-khoan');v31.audit('payment-'+b.kind,id+':'+b.amount);return json(res,201,{id:recordId});
  }
  if(route==='/api/admin/orders'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500').all().map(o=>({...o,items:JSON.parse(o.items),payment:paymentSummary(db,o),history:orderHistory(db,o.id)})));
  if(route==='/api/admin/consultations'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM consultations ORDER BY created_at DESC LIMIT 500').all().map(c=>({...c,replies:db.prepare('SELECT message,created_at FROM consultation_replies WHERE consultation_id=? ORDER BY created_at,id').all(c.id)})));
  if(route==='/api/admin/consultations'&&req.method==='POST'){
   const b=await body(req),id=text(b.id,1,40,'Mã tư vấn');if(!db.prepare('SELECT 1 FROM consultations WHERE id=?').get(id))fail(404,'Không tìm thấy yêu cầu');if(!['new','in_progress','replied','closed'].includes(b.status))fail(400,'Trạng thái không hợp lệ');const note=text(b.internalNote||'',0,3000,'Ghi chú nội bộ'),draft=text(b.draft||'',0,3000,'Bản nháp');let message='',key='';if(b.publish===true){message=text(b.message,2,3000,'Phản hồi');key=text(req.headers['idempotency-key'],16,100,'Khóa gửi');const old=db.prepare('SELECT * FROM consultation_replies WHERE request_key=?').get(key);if(old){if(old.consultation_id!==id||old.message!==message)fail(409,'Khóa gửi đã sử dụng');return json(res,200,{ok:true});}}
   db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE consultations SET status=?,internal_note=?,draft=? WHERE id=?').run(b.publish===true?'replied':b.status,note,b.publish===true?'':draft,id);if(b.publish===true)db.prepare('INSERT INTO consultation_replies VALUES(?,?,?,?,?)').run(crypto.randomUUID(),id,message,key,new Date().toISOString());db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return json(res,200,{ok:true});
  }
  if(route==='/api/admin/orders'&&req.method==='POST'){const b=await body(req),id=text(b.id,1,40,'Mã đơn');if(b.rejectCancellation===true)return json(res,200,rejectCancellation(db,id,text(b.response,2,500,'Phản hồi hủy')));if(!['new','confirmed','delivered','cancelled'].includes(b.status))fail(400,'Trạng thái không hợp lệ');const result=changeOrderStatus(db,id,b.status);v31.audit('order-status',id+':'+b.status,s.username||'owner');v31.notice(db.prepare('SELECT customer_id FROM orders WHERE id=?').get(id).customer_id,'Đơn '+id+': '+({confirmed:'shop đã xác nhận',delivered:'đã giao xe',cancelled:'đã hủy'}[b.status]||b.status),'/tai-khoan');return json(res,200,result);}
  if(route==='/api/admin/customers'&&req.method==='GET')return json(res,200,db.prepare('SELECT id,name,email,phone,created_at FROM customers ORDER BY created_at DESC LIMIT 500').all().map(c=>({...c,providers:db.prepare('SELECT provider FROM customer_identities WHERE customer_id=?').all(c.id).map(i=>i.provider),events:db.prepare('SELECT event,provider,created_at FROM customer_events WHERE customer_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20').all(c.id),activeSessions:db.prepare('SELECT COUNT(*) n FROM customer_sessions WHERE customer_id=? AND expires>?').get(c.id,Date.now()).n})));

 }
 if(route.startsWith('/api/'))fail(404,'Không tìm thấy API');
 if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'Phương thức không hỗ trợ');
 if((route==='/'||route==='/index.html')&&url.searchParams.has('product')){const p=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(Number(url.searchParams.get('product')));if(p){res.writeHead(302,{Location:productUrl(p)});return res.end();}}
 if(/^\/xe\/\d+(?:\/[a-z0-9-]+)?$/.test(route)){const p=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(Number(route.split('/')[2]));if(!p)fail(404,'Không tìm thấy xe');if(route!==productUrl(p)){res.writeHead(301,{Location:productUrl(p)});return res.end();}}
 if(route==='/policies'){res.writeHead(301,{Location:'/chinh-sach'});return res.end();}
 if(route==='/dat-hang/hoan-tat'){const id=url.searchParams.get('order')||'';if(!/^V-[A-F0-9]{16}$/.test(id)||!db.prepare('SELECT 1 FROM orders WHERE id=?').get(id))fail(404,'Không tìm thấy mã yêu cầu');}
 let adminActive=false;try{session(req);adminActive=true;}catch{}
 const page=renderPage(url,{store:{...settings(),adminActive,onlinePaymentAvailable:sepay.publicConfig().onlineAvailable,presentation:v31.presentation()},products:db.prepare('SELECT * FROM products WHERE published=1 ORDER BY id').all(),origin:siteOrigin,acceptingOrders:ready()});if(page){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-cache'});return res.end(req.method==='HEAD'?'':page);}
 if(route==='/index.html'){res.writeHead(301,{Location:'/'});return res.end();}
 if(route==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${siteOrigin}/sitemap.xml\n`);}
 if(route==='/sitemap.xml'){const paths=['/','/xe-dien','/dat-coc','/tra-gop','/thanh-toan','/lien-he','/cam-nang','/chinh-sach','/chinh-sach/bao-mat','/chinh-sach/dieu-khoan','/chinh-sach/xoa-du-lieu',...db.prepare('SELECT * FROM products WHERE published=1').all().map(productUrl)];res.writeHead(200,{'Content-Type':'application/xml'});return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${siteOrigin+p}</loc></url>`).join('')}</urlset>`);}
 if((/^\/media\/[a-f0-9]{32}\.mp4$/.test(route)||/^\/assets\/[a-z0-9-]+\.mp4$/.test(route))){const file=route.startsWith('/media/')?path.join(mediaDir,path.basename(route)):path.join(__dirname,route.slice(1));if(!fs.existsSync(file))fail(404,'Không tìm thấy video');return require('./video-media').serveVideo(req,res,file);}
 if(/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(route)){const full=path.join(mediaDir,path.basename(route));if(!fs.existsSync(full))fail(404,'Không tìm thấy ảnh');res.writeHead(200,{'Content-Type':{'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(full)],'Cache-Control':'public, max-age=31536000, immutable'});if(req.method==='HEAD')return res.end();return fs.createReadStream(full).pipe(res);}
 if(/^\/assets\/[a-z0-9-]+\.(png|webp|svg|jpg|mp4)$/.test(route)){const f=path.join(__dirname,route.slice(1));if(!fs.existsSync(f))fail(404,'Không tìm thấy ảnh');res.writeHead(200,{'Content-Type':mime[path.extname(f)],'Cache-Control':'public,max-age=3600'});if(req.method==='HEAD')return res.end();return fs.createReadStream(f).pipe(res);}
 const file=files[route];if(!file)fail(404,'Không tìm thấy trang');res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':['.html','.js','.css'].includes(path.extname(file))?'no-cache':'public, max-age=3600'});if(req.method==='HEAD')return res.end();fs.createReadStream(path.join(__dirname,file)).pipe(res);
 }catch(error){if(!error.status)console.error('Request failed:',error.message);json(res,error.status||500,{error:error.status?error.message:'Lỗi máy chủ. Vui lòng thử lại.'});}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Cổng ${port} đang được dùng. Hãy dừng cửa sổ website cũ hoặc chọn PORT khác.`:'Không thể khởi động máy chủ: '+error.code);db.close();process.exitCode=1;});
server.requestTimeout=120000;server.headersTimeout=10000;
server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Xe Dien Duc Tu listening on port ${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));

}
boot().catch(error=>{console.error('Không khởi động được: '+error.message);process.exitCode=1;});
