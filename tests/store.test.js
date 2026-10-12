const {test}=require('node:test');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {once}=require('node:events');const crypto=require('node:crypto');
test('storefront, authentication, publication, validated orders and persistence',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'duc-tu-test-'));const port=32145,base=`http://localhost:${port}`,password=crypto.randomBytes(24).toString('hex');
 let child;function start(){child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),SITE_URL:base,ADMIN_PASSWORD:password,DATA_DIR:dir,STORE_NAME:'Xe Điện Đức Tú'},stdio:['ignore','pipe','pipe']});return new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('exit',code=>reject(Error('Startup exited '+code)));});}
 async function stop(){child.kill('SIGTERM');await once(child,'exit');}
 async function call(route,data,extra={}){return fetch(base+route,{...(data!==undefined?{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...extra},body:JSON.stringify(data)}:{headers:extra})});}
 try{await start();assert.equal((await call('/')).status,200);assert.equal((await(await call('/api/products')).json()).length,6);assert.equal((await call('/api/admin/orders')).status,401);assert.equal((await call('/data/store.sqlite')).status,404);assert.equal((await call('/api/admin/login',{password}, {Origin:'https://evil.invalid'})).status,403);
 const login=await call('/api/admin/login',{password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0],csrf=(await login.json()).csrf,auth={Cookie:cookie,'X-CSRF-Token':csrf};assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
 const image=await call('/api/admin/upload',{data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7V8AAAAASUVORK5CYII='},auth);assert.equal(image.status,201);const imagePath=(await image.json()).image;assert.equal((await call(imagePath)).headers.get('content-type'),'image/png');assert.equal((await call('/api/admin/upload',{data:Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')},auth)).status,400);
 const list=await(await call('/api/admin/products',undefined,auth)).json();const product={...list[0],published:true,image:imagePath,stock:2};assert.equal((await call('/api/admin/products',product,{Cookie:cookie})).status,403);assert.equal((await call('/api/admin/products',product,auth)).status,200);
 const order={name:'Nguyễn An',phone:'0901234567',address:'12 Đường A, TP HCM',note:'Kiểm tra',items:[{id:product.id,quantity:2}],total:1};const key=crypto.randomUUID();assert.equal((await call('/api/orders',order,{'Idempotency-Key':key})).status,503);
 const settings=await(await call('/api/store')).json();Object.assign(settings,{phone:'0901234567',address:'12 Đường A, TP HCM',legalName:'Xe Điện Đức Tú'});assert.equal((await call('/api/admin/settings',settings,auth)).status,200);
 assert.equal((await call('/api/orders',{...order,items:[{id:product.id,quantity:-1}]},{'Idempotency-Key':crypto.randomUUID()})).status,400);
 assert.equal((await call('/api/orders',{...order,items:[{id:product.id,quantity:1,expectedPrice:1}]},{'Idempotency-Key':crypto.randomUUID()})).status,409);
 const result=await call('/api/orders',order,{'Idempotency-Key':key});assert.equal(result.status,201);const saved=await result.json();assert.equal(saved.total,product.price*2);const repeat=await call('/api/orders',order,{'Idempotency-Key':key});assert.equal(repeat.status,200);assert.equal((await repeat.json()).id,saved.id);
 assert.equal((await call('/api/orders',{...order,address:'Địa chỉ khác'},{'Idempotency-Key':key})).status,409);
 assert.equal((await call('/api/consultations',{name:'Khách hàng',phone:'0901234567'})).status,201);
 assert.equal((await call('/api/admin/orders',{id:saved.id,status:'confirmed'},auth)).status,200);const orders=await(await call('/api/admin/orders',undefined,auth)).json();assert.equal(orders.length,1);assert.equal(orders[0].status,'confirmed');assert.equal(orders[0].total,product.price*2);
 const tracked=await call('/api/orders/track',{id:saved.id,phone:'0901234567'});assert.equal(tracked.status,200);const tracking=await tracked.json();assert.equal(tracking.status,'confirmed');assert.equal(tracking.phone,undefined);assert.equal(tracking.address,undefined);assert.equal((await call('/api/orders/track',{id:saved.id,phone:'0900000000'})).status,404);
 assert.equal((await call('/api/orders',order,{'Idempotency-Key':crypto.randomUUID()})).status,409);
 assert.equal((await call('/api/admin/orders',{id:saved.id,status:'cancelled'},auth)).status,200);
 assert.equal((await(await call('/api/admin/products',undefined,auth)).json()).find(p=>p.id===product.id).stock,2);
 assert.equal((await call('/api/admin/orders',{id:saved.id,status:'cancelled'},auth)).status,200);
 assert.equal((await(await call('/api/admin/products',undefined,auth)).json()).find(p=>p.id===product.id).stock,2);
 assert.equal((await call('/api/admin/orders',{id:saved.id,status:'confirmed'},auth)).status,409);
 await stop();await start();assert.equal((await(await call('/api/products')).json()).length,6);const relog=await call('/api/admin/login',{password});const auth2={Cookie:relog.headers.get('set-cookie').split(';')[0]};assert.equal((await(await call('/api/admin/orders',undefined,auth2)).json())[0].id,saved.id);
 assert.match((await call('/')).headers.get('content-security-policy'),/frame-ancestors 'none'/);
 }finally{if(child&&child.exitCode===null)await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
