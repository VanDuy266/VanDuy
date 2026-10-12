'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {renderPage,productUrl}=require('./pages');
const {initializeCommerce,paymentSummary,validateSocial}=require('./commerce');
const port=Number(process.env.PORT||3000);
const production=process.env.NODE_ENV==='production';
const adminPassword=process.env.ADMIN_PASSWORD||'';
if(adminPassword.length<16)throw Error('Set ADMIN_PASSWORD to at least 16 characters. Never commit this secret.');
const siteUrl=process.env.SITE_URL||`http://localhost:${port}`;
const siteOrigin=new URL(siteUrl).origin;
if(production&&!siteUrl.startsWith('https://'))throw Error('Production SITE_URL must use HTTPS');
const dataDir=process.env.DATA_DIR||path.join(__dirname,'data');
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
const db=new DatabaseSync(path.join(dataDir,'store.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,brand TEXT NOT NULL,name TEXT NOT NULL,price INTEGER NOT NULL,range INTEGER NOT NULL,speed INTEGER NOT NULL,badge TEXT NOT NULL DEFAULT '',hue INTEGER NOT NULL DEFAULT 0,published INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,note TEXT NOT NULL,items TEXT NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consultations(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL);`);
for(const [column,definition] of Object.entries({image:"TEXT NOT NULL DEFAULT ''",description:"TEXT NOT NULL DEFAULT ''",category:"TEXT NOT NULL DEFAULT 'city'",price_note:"TEXT NOT NULL DEFAULT ''",stock:'INTEGER',image_source:"TEXT NOT NULL DEFAULT ''",gallery:"TEXT NOT NULL DEFAULT '[]'",specifications:"TEXT NOT NULL DEFAULT '[]'"})){
 if(!db.prepare('PRAGMA table_info(products)').all().some(c=>c.name===column))db.exec(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
}
initializeCommerce(db);
for(const[column,definition]of Object.entries({kind:"TEXT NOT NULL DEFAULT 'general'",product_id:'INTEGER',months:'INTEGER',down_payment:'INTEGER',note:"TEXT NOT NULL DEFAULT ''"}))if(!db.prepare('PRAGMA table_info(consultations)').all().some(c=>c.name===column))db.exec(`ALTER TABLE consultations ADD COLUMN ${column} ${definition}`);
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
const settings=()=>({zaloUrl:'',facebookUrl:'',messengerUrl:'',tiktokUrl:'',depositAmount:0,depositPolicy:'Mức cọc và điều kiện hoàn/hủy được cửa hàng xác nhận trước khi thu tiền.',installmentPolicy:'Chưa có đơn vị tài chính và chính sách được xác nhận. Tiếp nhận nhu cầu tư vấn trả góp, không duyệt hồ sơ trực tuyến.',...JSON.parse(db.prepare('SELECT value FROM settings WHERE id=1').get().value)});
const ready=()=>{const s=settings();return !!(s.phone&&s.address);};
const salt=crypto.randomBytes(16),passwordHash=crypto.scryptSync(adminPassword,salt,64);
const sessions=new Map(),rateLimits=new Map();
setInterval(()=>{const now=Date.now();for(const[k,v]of sessions)if(v.expires<now)sessions.delete(k);for(const[k,v]of rateLimits)if(v.until<now)rateLimits.delete(k);},60000).unref();
function rate(req,scope,max){const key=scope+':'+req.socket.remoteAddress;let r=rateLimits.get(key);if(!r||r.until<Date.now()){r={n:0,until:Date.now()+60000};rateLimits.set(key,r);}if(++r.n>max)fail(429,'Quá nhiều yêu cầu. Vui lòng thử lại sau.');}
function fail(status,message){throw Object.assign(new Error(message),{status});}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function text(value,min,max,label){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(400,`${label} không hợp lệ`);return value.trim();}
function phone(value){const p=text(value,9,20,'Số điện thoại').replace(/[ ()+.-]/g,'');if(!/^\d{9,15}$/.test(p))fail(400,'Số điện thoại không hợp lệ');return p;}
async function body(req){if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Yêu cầu JSON');const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>3000000)fail(413,'Yêu cầu quá lớn');chunks.push(chunk);}try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{fail(400,'JSON không hợp lệ');}}
function session(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('volt_session='))?.slice(13);const s=sessions.get(token);if(!s||s.expires<Date.now())fail(401,'Vui lòng đăng nhập');return{token,...s};}
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/retail.css':'retail.css','/brand.css':'brand.css','/v2.css':'v2.css','/shop.js':'shop.js','/assets/scooter.svg':'assets/scooter.svg','/admin':'admin.html','/admin/san-pham':'admin-pages/san-pham.html','/admin/don-hang':'admin-pages/don-hang.html','/admin/tu-van':'admin-pages/tu-van.html','/admin/cai-dat':'admin-pages/cai-dat.html','/admin/thanh-toan':'admin-pages/thanh-toan.html','/admin.js':'admin.js'};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
 try{
 const url=new URL(req.url,'http://localhost');const route=url.pathname;
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==siteOrigin)fail(403,'Nguồn yêu cầu không hợp lệ');
 if(route==='/api/health'&&req.method==='GET')return json(res,200,{ok:db.prepare('SELECT 1 n').get().n===1});
 if(route==='/api/store'&&req.method==='GET')return json(res,200,{...settings(),acceptingOrders:ready(),onlinePaymentAvailable:false});
 if(route==='/api/products'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM products WHERE published=1 ORDER BY id').all());
 if(/^\/api\/products\/\d+$/.test(route)&&req.method==='GET'){const product=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(Number(route.split('/').pop()));if(!product)fail(404,'Không tìm thấy xe');return json(res,200,product);}
 if(route==='/api/payments/config'&&req.method==='GET')return json(res,200,{onlineAvailable:false,provider:null,reason:'merchant_not_configured',depositAmount:settings().depositAmount});
 if(route==='/api/orders'&&req.method==='POST'){
  rate(req,'orders',10);if(!ready())fail(503,'Cửa hàng đang hoàn thiện thông tin. Chưa nhận đơn hàng.');
  const b=await body(req);if(b.consent!==true)fail(400,'Cần đồng ý sử dụng thông tin để xử lý yêu cầu');const plan=b.paymentPlan||'cod';if(!['cod','deposit','installment'].includes(plan))fail(400,'Phương án thanh toán chưa được hỗ trợ');const months=plan==='installment'?(b.financeMonths??12):null;if(months!==null&&![6,9,12,18,24].includes(months))fail(400,'Kỳ hạn không hợp lệ');const name=text(b.name,2,80,'Họ tên'),p=phone(b.phone),address=text(b.address,5,300,'Địa chỉ'),note=text(b.note||'',0,1000,'Ghi chú');
  const key=text(req.headers['idempotency-key'],16,80,'Mã yêu cầu');
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>30)fail(400,'Giỏ hàng không hợp lệ');
  let total=0;const seen=new Set();const items=b.items.map(i=>{if(!i||typeof i!=='object'||!Number.isInteger(i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>10||seen.has(i.id))fail(400,'Số lượng không hợp lệ');seen.add(i.id);const p=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(i.id);if(!p)fail(409,'Sản phẩm không còn được bán. Vui lòng tải lại trang.');if(i.expectedPrice!==undefined&&i.expectedPrice!==p.price)fail(409,'Giá sản phẩm đã thay đổi. Vui lòng tải lại trang và kiểm tra giá.');total+=p.price*i.quantity;return{id:p.id,name:`${p.brand} ${p.name}`,price:p.price,quantity:i.quantity,reserved:p.stock!==null};});
  const depositDue=plan==='deposit'&&settings().depositAmount>0?Math.min(settings().depositAmount,total):null;
  const old=db.prepare('SELECT * FROM orders WHERE request_key=?').get(key);
  if(old){if(old.name!==name||old.phone!==p||old.address!==address||old.note!==note||old.items!==JSON.stringify(items)||old.payment_plan!==plan||old.finance_months!==months)fail(409,'Mã yêu cầu đã dùng cho đơn khác');return json(res,200,{id:old.id,total:old.total,paymentPlan:old.payment_plan,depositDue:old.deposit_due,payment:paymentSummary(db,old)});}
  for(const i of items){const product=db.prepare('SELECT stock FROM products WHERE id=?').get(i.id);if(product.stock!==null&&product.stock<i.quantity)fail(409,'Số lượng xe không đủ. Vui lòng điều chỉnh giỏ hàng.');}
  const id='V-'+crypto.randomBytes(8).toString('hex').toUpperCase();db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO orders(id,request_key,name,phone,address,note,items,total,created_at,payment_plan,deposit_due,finance_months) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,key,name,p,address,note,JSON.stringify(items),total,new Date().toISOString(),plan,depositDue,months);for(const item of items)if(item.reserved)db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock IS NOT NULL').run(item.quantity,item.id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return json(res,201,{id,total,paymentPlan:plan,depositDue,payment:{received:0,remaining:total,status:'unpaid',source:'none'}});
 }
 if(route==='/api/orders/track'&&req.method==='POST'){rate(req,'tracking',10);const b=await body(req);const order=db.prepare('SELECT id,status,items,total,created_at,payment_plan,deposit_due,finance_months FROM orders WHERE id=? AND phone=?').get(text(b.id,1,40,'Mã đơn').toUpperCase(),phone(b.phone));if(!order)fail(404,'Không tìm thấy yêu cầu với mã đơn và số điện thoại này');return json(res,200,{...order,items:JSON.parse(order.items),payment:paymentSummary(db,order)});}
 if(route==='/api/consultations'&&req.method==='POST'){
  rate(req,'consult',5);if(!ready())fail(503,'Cửa hàng chưa nhận yêu cầu tư vấn');const b=await body(req);if(b.consent!==true)fail(400,'Cần đồng ý sử dụng thông tin tư vấn');const kind=b.kind||'general';if(!['general','installment'].includes(kind))fail(400,'Loại yêu cầu không hợp lệ');const productId=b.productId??null;if(productId!==null&&(!Number.isInteger(productId)||!db.prepare('SELECT 1 FROM products WHERE id=? AND published=1').get(productId)))fail(400,'Mẫu xe không hợp lệ');const months=kind==='installment'?(b.months??12):null;if(months!==null&&![6,9,12,18,24].includes(months))fail(400,'Kỳ hạn không hợp lệ');const down=b.downPayment??null;if(down!==null&&(!Number.isInteger(down)||down<0||down>1000000000))fail(400,'Số tiền trả trước không hợp lệ');if(productId&&down!==null&&down>db.prepare('SELECT price FROM products WHERE id=?').get(productId).price)fail(400,'Tiền trả trước vượt giá xe');const id=crypto.randomUUID();db.prepare('INSERT INTO consultations(id,name,phone,created_at,kind,product_id,months,down_payment,note) VALUES(?,?,?,?,?,?,?,?,?)').run(id,text(b.name,2,80,'Họ tên'),phone(b.phone),new Date().toISOString(),kind,productId,months,down,text(b.note||'',0,1000,'Nội dung'));return json(res,201,{id});
 }
 if(route==='/api/admin/login'&&req.method==='POST'){rate(req,'login',5);const b=await body(req);const value=text(b.password,1,256,'Mật khẩu');if(!crypto.timingSafeEqual(crypto.scryptSync(value,salt,64),passwordHash))fail(401,'Mật khẩu không đúng');const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');sessions.set(token,{csrf,expires:Date.now()+8*3600000});res.setHeader('Set-Cookie',`volt_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);return json(res,200,{csrf});}
 if(route.startsWith('/api/admin/')){
  const s=session(req);if(req.method!=='GET'&&req.headers['x-csrf-token']!==s.csrf)fail(403,'Phiên yêu cầu không hợp lệ');
  if(route==='/api/admin/session'&&req.method==='GET')return json(res,200,{csrf:s.csrf});
  if(route==='/api/admin/logout'&&req.method==='POST'){sessions.delete(s.token);res.setHeader('Set-Cookie','volt_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
  if(route==='/api/admin/products'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM products ORDER BY id').all());
  if(route==='/api/admin/products'&&req.method==='POST'){
   const b=await body(req);for(const[k,max]of[['price',1000000000],['range',1000],['speed',300],['hue',360]])if(!Number.isInteger(b[k])||b[k]<0||b[k]>max)fail(400,`${k} không hợp lệ`);
   if(b.price<1)fail(400,'Giá phải lớn hơn 0');if(typeof b.published!=='boolean')fail(400,'Trạng thái không hợp lệ');
   const description=text(b.description||'',0,3000,'Mô tả'),category=text(b.category||'city',1,30,'Danh mục'),priceNote=text(b.price_note||'',0,300,'Ghi chú giá');if(!['city','sport','compact'].includes(category))fail(400,'Danh mục không hợp lệ');const stock=b.stock===undefined||b.stock===null||b.stock===''?null:b.stock;if(stock!==null&&(!Number.isInteger(stock)||stock<0||stock>10000))fail(400,'Tồn kho không hợp lệ');
   const validImage=value=>/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(value)&&fs.existsSync(path.join(mediaDir,path.basename(value)))||/^\/assets\/yadea-[a-z0-9-]+\.(png|jpg|webp)$/.test(value)&&fs.existsSync(path.join(__dirname,value.slice(1)));const image=text(b.image||'',0,100,'Ảnh');if(image&&!validImage(image))fail(400,'Ảnh không hợp lệ hoặc không tồn tại');
   let gallery=b.gallery??[];if(!Array.isArray(gallery)||gallery.length>8||gallery.some(src=>typeof src!=='string'||!validImage(src)))fail(400,'Bộ ảnh không hợp lệ');const source=text(b.image_source||'',0,1000,'Nguồn ảnh');if(source){try{const u=new URL(source);if(u.protocol!=='https:'||u.username||u.password)throw Error();}catch{fail(400,'Nguồn ảnh phải là URL HTTPS');}}
   let specifications=b.specifications;if(specifications===undefined){const current=b.id?db.prepare('SELECT specifications FROM products WHERE id=?').get(b.id):null;specifications=current?JSON.parse(current.specifications):[];}if(!Array.isArray(specifications)||specifications.length>25||specifications.some(row=>!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||typeof row[1]!=='string'||!row[0].trim()||!row[1].trim()||row[0].length>60||row[1].length>300))fail(400,'Mỗi thông số cần tên và giá trị hợp lệ');
   const values=[text(b.brand,1,60,'Hãng'),text(b.name,1,100,'Tên xe'),b.price,b.range,b.speed,text(b.badge||'',0,60,'Nhãn'),b.hue,Number(b.published),image,description,category,priceNote,stock,source,JSON.stringify(gallery),JSON.stringify(specifications)];
   if(b.id!==undefined){if(!Number.isInteger(b.id))fail(400,'ID không hợp lệ');const r=db.prepare('UPDATE products SET brand=?,name=?,price=?,range=?,speed=?,badge=?,hue=?,published=?,image=?,description=?,category=?,price_note=?,stock=?,image_source=?,gallery=?,specifications=? WHERE id=?').run(...values,b.id);if(!r.changes)fail(404,'Không tìm thấy sản phẩm');}else db.prepare('INSERT INTO products(brand,name,price,range,speed,badge,hue,published,image,description,category,price_note,stock,image_source,gallery,specifications) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(...values);
   return json(res,200,{ok:true});
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
  if(route==='/api/admin/payments'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM payment_records ORDER BY created_at DESC LIMIT 500').all());
  if(route==='/api/admin/payments'&&req.method==='POST'){
   const b=await body(req),key=text(req.headers['idempotency-key'],16,80,'Mã ghi nhận');const id=text(b.orderId,1,40,'Mã đơn'),reference=text(b.reference,3,120,'Số chứng từ'),note=text(b.note||'',0,1000,'Ghi chú');if(!Number.isInteger(b.amount)||b.amount<=0||b.amount>1000000000||!['receipt','refund'].includes(b.kind))fail(400,'Khoản thanh toán không hợp lệ');const old=db.prepare('SELECT * FROM payment_records WHERE request_key=?').get(key);if(old){if(old.order_id!==id||old.reference!==reference||old.amount!==b.amount||old.kind!==b.kind||old.note!==note)fail(409,'Mã ghi nhận đã dùng cho khoản khác');return json(res,200,{id:old.id});}
   const order=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!order)fail(404,'Không tìm thấy đơn');const summary=paymentSummary(db,order);if(b.kind==='receipt'&&(order.status==='cancelled'||b.amount>summary.remaining))fail(409,'Không thể ghi nhận khoản thu này');if(b.kind==='refund'&&b.amount>summary.received)fail(409,'Số tiền hoàn vượt khoản đã ghi nhận');const recordId=crypto.randomUUID();db.prepare('INSERT INTO payment_records VALUES(?,?,?,?,?,?,?,?)').run(recordId,id,b.amount,b.kind,reference,note,key,new Date().toISOString());return json(res,201,{id:recordId});
  }
  if(route==='/api/admin/orders'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500').all().map(o=>({...o,items:JSON.parse(o.items),payment:paymentSummary(db,o)})));
  if(route==='/api/admin/consultations'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM consultations ORDER BY created_at DESC LIMIT 500').all());
  if(route==='/api/admin/orders'&&req.method==='POST'){const b=await body(req);if(!['new','confirmed','delivered','cancelled'].includes(b.status))fail(400,'Trạng thái không hợp lệ');const id=text(b.id,1,40,'Mã đơn');const old=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!old)fail(404,'Không tìm thấy đơn');if(b.status==='cancelled'&&paymentSummary(db,old).received>0)fail(409,'Cần ghi nhận hoàn tiền trước khi hủy đơn');if(old.status===b.status)return json(res,200,{ok:true});const transitions={new:['confirmed','cancelled'],confirmed:['delivered','cancelled'],delivered:[],cancelled:[]};if(!transitions[old.status].includes(b.status))fail(409,'Không thể đổi trạng thái này');db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE orders SET status=? WHERE id=?').run(b.status,id);if(b.status==='cancelled')for(const item of JSON.parse(old.items))if(item.reserved)db.prepare('UPDATE products SET stock=stock+? WHERE id=? AND stock IS NOT NULL').run(item.quantity,item.id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return json(res,200,{ok:true});}
 }
 if(route.startsWith('/api/'))fail(404,'Không tìm thấy API');
 if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'Phương thức không hỗ trợ');
 if((route==='/'||route==='/index.html')&&url.searchParams.has('product')){const p=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(Number(url.searchParams.get('product')));if(p){res.writeHead(302,{Location:productUrl(p)});return res.end();}}
 if(/^\/xe\/\d+(?:\/[a-z0-9-]+)?$/.test(route)){const p=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(Number(route.split('/')[2]));if(!p)fail(404,'Không tìm thấy xe');if(route!==productUrl(p)){res.writeHead(301,{Location:productUrl(p)});return res.end();}}
 if(route==='/policies'){res.writeHead(301,{Location:'/chinh-sach'});return res.end();}
 if(route==='/dat-hang/hoan-tat'){const id=url.searchParams.get('order')||'';if(!/^V-[A-F0-9]{16}$/.test(id)||!db.prepare('SELECT 1 FROM orders WHERE id=?').get(id))fail(404,'Không tìm thấy mã yêu cầu');}
 const page=renderPage(url,{store:settings(),products:db.prepare('SELECT * FROM products WHERE published=1 ORDER BY id').all(),origin:siteOrigin,acceptingOrders:ready()});if(page){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?'':page);}
 if(route==='/index.html'){res.writeHead(301,{Location:'/'});return res.end();}
 if(route==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${siteOrigin}/sitemap.xml\n`);}
 if(route==='/sitemap.xml'){const paths=['/','/xe-dien','/dat-coc','/tra-gop','/thanh-toan','/lien-he','/cam-nang','/chinh-sach',...db.prepare('SELECT * FROM products WHERE published=1').all().map(productUrl)];res.writeHead(200,{'Content-Type':'application/xml'});return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${siteOrigin+p}</loc></url>`).join('')}</urlset>`);}
 if(/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(route)){const full=path.join(mediaDir,path.basename(route));if(!fs.existsSync(full))fail(404,'Không tìm thấy ảnh');res.writeHead(200,{'Content-Type':{'.png':'image/png','.jpg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(full)],'Cache-Control':'public, max-age=31536000, immutable'});if(req.method==='HEAD')return res.end();return fs.createReadStream(full).pipe(res);}
 if(/^\/assets\/[a-z0-9-]+\.(png|webp|svg|jpg)$/.test(route)){const f=path.join(__dirname,route.slice(1));if(!fs.existsSync(f))fail(404,'Không tìm thấy ảnh');res.writeHead(200,{'Content-Type':mime[path.extname(f)],'Cache-Control':'public,max-age=3600'});if(req.method==='HEAD')return res.end();return fs.createReadStream(f).pipe(res);}
 const file=files[route];if(!file)fail(404,'Không tìm thấy trang');res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':['.html','.js','.css'].includes(path.extname(file))?'no-cache':'public, max-age=3600'});if(req.method==='HEAD')return res.end();fs.createReadStream(path.join(__dirname,file)).pipe(res);
 }catch(error){if(!error.status)console.error('Request failed:',error.message);json(res,error.status||500,{error:error.status?error.message:'Lỗi máy chủ. Vui lòng thử lại.'});}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Cổng ${port} đang được dùng. Hãy dừng cửa sổ website cũ hoặc chọn PORT khác.`:'Không thể khởi động máy chủ: '+error.code);db.close();process.exitCode=1;});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Xe Dien Duc Tu listening on port ${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
