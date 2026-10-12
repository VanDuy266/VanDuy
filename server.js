'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
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
if(!db.prepare('SELECT COUNT(*) n FROM products').get().n){
 const insert=db.prepare('INSERT INTO products(brand,name,price,range,speed,badge,hue) VALUES(?,?,?,?,?,?,?)');
 [['VinFast','Evo200',22000000,120,70,'Chưa công bố',0],['Yadea','Oris',24990000,90,50,'Chưa công bố',155],['Dat Bike','Quantum S3',34900000,120,90,'Chưa công bố',275],['VinFast','Klara S',36900000,100,78,'Chưa công bố',320],['Yadea','G5',27990000,80,50,'Chưa công bố',70],['Pega','Pega S',32900000,100,65,'Chưa công bố',190]].forEach(p=>insert.run(...p));
}
if(!db.prepare('PRAGMA table_info(products)').all().some(c=>c.name==='image'))db.exec("ALTER TABLE products ADD COLUMN image TEXT NOT NULL DEFAULT ''");
const mediaDir=path.join(dataDir,'media');fs.mkdirSync(mediaDir,{recursive:true,mode:0o700});
const defaultSettings={name:process.env.STORE_NAME||'Xe Điện Đức Tú',phone:process.env.STORE_PHONE||'',address:process.env.STORE_ADDRESS||'',email:process.env.STORE_EMAIL||'',legalName:'',registration:'',shipping:'Thời gian và phí giao xe được xác nhận khi cửa hàng liên hệ.',returns:'Điều kiện đổi trả được xác nhận trong hợp đồng mua xe.',warranty:'Bảo hành theo chính sách chính thức của nhà sản xuất và hợp đồng mua xe.'};
db.prepare('INSERT OR IGNORE INTO settings VALUES(1,?)').run(JSON.stringify(defaultSettings));
const settings=()=>JSON.parse(db.prepare('SELECT value FROM settings WHERE id=1').get().value);
const ready=()=>{const s=settings();return !!(s.phone&&s.address&&s.legalName);};
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
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/assets/scooter.svg':'assets/scooter.svg','/admin':'admin.html','/admin.js':'admin.js','/policies':'policies.html','/policies.js':'policies.js'};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
 try{
 const url=new URL(req.url,'http://localhost');const route=url.pathname;
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==siteOrigin)fail(403,'Nguồn yêu cầu không hợp lệ');
 if(route==='/api/health'&&req.method==='GET')return json(res,200,{ok:db.prepare('SELECT 1 n').get().n===1});
 if(route==='/api/store'&&req.method==='GET')return json(res,200,{...settings(),acceptingOrders:ready()});
 if(route==='/api/products'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM products WHERE published=1 ORDER BY id').all());
 if(route==='/api/orders'&&req.method==='POST'){
  rate(req,'orders',10);if(!ready())fail(503,'Cửa hàng đang hoàn thiện thông tin. Chưa nhận đơn hàng.');
  const b=await body(req);const name=text(b.name,2,80,'Họ tên'),p=phone(b.phone),address=text(b.address,5,300,'Địa chỉ'),note=text(b.note||'',0,1000,'Ghi chú');
  const key=text(req.headers['idempotency-key'],16,80,'Mã yêu cầu');
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>30)fail(400,'Giỏ hàng không hợp lệ');
  let total=0;const seen=new Set();const items=b.items.map(i=>{if(!Number.isInteger(i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>10||seen.has(i.id))fail(400,'Số lượng không hợp lệ');seen.add(i.id);const p=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(i.id);if(!p)fail(409,'Sản phẩm không còn được bán. Vui lòng tải lại trang.');if(i.expectedPrice!==undefined&&i.expectedPrice!==p.price)fail(409,'Giá sản phẩm đã thay đổi. Vui lòng tải lại trang và kiểm tra giá.');total+=p.price*i.quantity;return{id:p.id,name:`${p.brand} ${p.name}`,price:p.price,quantity:i.quantity};});
  const old=db.prepare('SELECT * FROM orders WHERE request_key=?').get(key);
  if(old){if(old.name!==name||old.phone!==p||old.address!==address||old.note!==note||old.items!==JSON.stringify(items))fail(409,'Mã yêu cầu đã dùng cho đơn khác');return json(res,200,{id:old.id,total:old.total});}
  const id='V-'+crypto.randomBytes(8).toString('hex').toUpperCase();db.prepare('INSERT INTO orders(id,request_key,name,phone,address,note,items,total,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,key,name,p,address,note,JSON.stringify(items),total,new Date().toISOString());return json(res,201,{id,total});
 }
 if(route==='/api/consultations'&&req.method==='POST'){rate(req,'consult',5);if(!ready())fail(503,'Cửa hàng chưa nhận yêu cầu tư vấn.');const b=await body(req);const id=crypto.randomUUID();db.prepare('INSERT INTO consultations VALUES(?,?,?,?)').run(id,text(b.name,2,80,'Họ tên'),phone(b.phone),new Date().toISOString());return json(res,201,{id});}
 if(route==='/api/admin/login'&&req.method==='POST'){rate(req,'login',5);const b=await body(req);const value=text(b.password,1,256,'Mật khẩu');if(!crypto.timingSafeEqual(crypto.scryptSync(value,salt,64),passwordHash))fail(401,'Mật khẩu không đúng');const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');sessions.set(token,{csrf,expires:Date.now()+8*3600000});res.setHeader('Set-Cookie',`volt_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);return json(res,200,{csrf});}
 if(route.startsWith('/api/admin/')){
  const s=session(req);if(req.method!=='GET'&&req.headers['x-csrf-token']!==s.csrf)fail(403,'Phiên yêu cầu không hợp lệ');
  if(route==='/api/admin/session'&&req.method==='GET')return json(res,200,{csrf:s.csrf});
  if(route==='/api/admin/logout'&&req.method==='POST'){sessions.delete(s.token);res.setHeader('Set-Cookie','volt_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
  if(route==='/api/admin/products'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM products ORDER BY id').all());
  if(route==='/api/admin/products'&&req.method==='POST'){
   const b=await body(req);for(const[k,max]of[['price',1000000000],['range',1000],['speed',300],['hue',360]])if(!Number.isInteger(b[k])||b[k]<0||b[k]>max)fail(400,`${k} không hợp lệ`);
   if(b.price<1)fail(400,'Giá phải lớn hơn 0');if(typeof b.published!=='boolean')fail(400,'Trạng thái không hợp lệ');
   const image=text(b.image||'',0,100,'Ảnh');if(image&&!/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(image))fail(400,'Ảnh không hợp lệ');if(image&&!fs.existsSync(path.join(mediaDir,path.basename(image))))fail(400,'Ảnh không tồn tại');
   const values=[text(b.brand,1,60,'Hãng'),text(b.name,1,100,'Tên xe'),b.price,b.range,b.speed,text(b.badge||'',0,60,'Nhãn'),b.hue,Number(b.published),image];
   if(b.id!==undefined){if(!Number.isInteger(b.id))fail(400,'ID không hợp lệ');const r=db.prepare('UPDATE products SET brand=?,name=?,price=?,range=?,speed=?,badge=?,hue=?,published=?,image=? WHERE id=?').run(...values,b.id);if(!r.changes)fail(404,'Không tìm thấy sản phẩm');}else db.prepare('INSERT INTO products(brand,name,price,range,speed,badge,hue,published,image) VALUES(?,?,?,?,?,?,?,?,?)').run(...values);
   return json(res,200,{ok:true});
  }
  if(route==='/api/admin/upload'&&req.method==='POST'){
   rate(req,'upload',10);const b=await body(req);if(typeof b.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(b.data))fail(400,'Dữ liệu ảnh không hợp lệ');const bytes=Buffer.from(b.data,'base64');if(bytes.length>2000000||bytes.length<12)fail(400,'Ảnh phải nhỏ hơn 2 MB');let ext='';if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)ext='jpg';else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')ext='webp';if(!ext)fail(400,'Chỉ nhận ảnh PNG, JPEG hoặc WebP');const filename=crypto.randomBytes(16).toString('hex')+'.'+ext;fs.writeFileSync(path.join(mediaDir,filename),bytes,{mode:0o600,flag:'wx'});return json(res,201,{image:'/media/'+filename});
  }
  if(route==='/api/admin/settings'&&req.method==='POST'){const b=await body(req),next={};for(const[k,max]of Object.entries({name:80,phone:20,address:300,email:120,legalName:200,registration:100,shipping:3000,returns:3000,warranty:3000}))next[k]=text(b[k]||'',k==='name'?1:0,max,k);if(next.phone)phone(next.phone);db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(next));return json(res,200,{ok:true});}
  if(route==='/api/admin/orders'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500').all().map(o=>({...o,items:JSON.parse(o.items)})));
  if(route==='/api/admin/consultations'&&req.method==='GET')return json(res,200,db.prepare('SELECT * FROM consultations ORDER BY created_at DESC LIMIT 500').all());
  if(route==='/api/admin/orders'&&req.method==='POST'){const b=await body(req);if(!['new','confirmed','delivered','cancelled'].includes(b.status))fail(400,'Trạng thái không hợp lệ');const r=db.prepare('UPDATE orders SET status=? WHERE id=?').run(b.status,text(b.id,1,40,'Mã đơn'));if(!r.changes)fail(404,'Không tìm thấy đơn');return json(res,200,{ok:true});}
 }
 if(route.startsWith('/api/'))fail(404,'Không tìm thấy API');
 if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'Phương thức không hỗ trợ');
 if(route==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${siteOrigin}/sitemap.xml\n`);}
 if(route==='/sitemap.xml'){res.writeHead(200,{'Content-Type':'application/xml'});return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteOrigin}/</loc></url><url><loc>${siteOrigin}/policies</loc></url></urlset>`);}
 if(/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(route)){const full=path.join(mediaDir,path.basename(route));if(!fs.existsSync(full))fail(404,'Không tìm thấy ảnh');res.writeHead(200,{'Content-Type':{'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(full)],'Cache-Control':'public, max-age=31536000, immutable'});if(req.method==='HEAD')return res.end();return fs.createReadStream(full).pipe(res);}
 const file=files[route];if(!file)fail(404,'Không tìm thấy trang');res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':file.endsWith('.html')?'no-cache':'public, max-age=3600'});if(req.method==='HEAD')return res.end();fs.createReadStream(path.join(__dirname,file)).pipe(res);
 }catch(error){if(!error.status)console.error('Request failed:',error.message);json(res,error.status||500,{error:error.status?error.message:'Lỗi máy chủ. Vui lòng thử lại.'});}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`VOLT listening on port ${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
