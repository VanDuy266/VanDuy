'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),{once}=require('node:events');
test('private delivery photos require delivered order, admin CSRF and customer ownership; lookup respects phone; delete and no photo count cap',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'delivery-photo-')),base='http://localhost:32406',password=crypto.randomBytes(24).toString('hex'),child=spawn(process.execPath,['server.js'],{env:{...process.env,DATA_DIR:dir,PORT:'32406',SITE_URL:base,ADMIN_PASSWORD:password},stdio:['ignore','pipe','pipe']});
 const call=(route,data,headers={})=>fetch(base+route,data===undefined?{headers}:{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(data)}),ok=async(route,data,headers)=>{const r=await call(route,data,headers);const b=await r.json();assert.ok(r.ok,JSON.stringify(b));return b;};
 try{await once(child.stdout,'data');const login=await call('/api/admin/login',{password}),admin={Cookie:login.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await login.json()).csrf};async function register(email){const r=await call('/api/auth/register',{name:'Khách thử ảnh',email,password:'test-long-password',consent:true});return{Cookie:r.headers.get('set-cookie').split(';')[0]};}const customer=await register('photos@example.invalid'),other=await register('otherphotos@example.invalid'),p=(await ok('/api/products'))[0];
 const order=await ok('/api/orders',{name:'Khách thử ảnh',phone:'0901234567',address:'Địa chỉ thử Phú Quốc',consent:true,items:[{id:p.id,quantity:1,expectedPrice:p.price}]},{...customer,'Idempotency-Key':crypto.randomUUID()});
 const photoData='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhSkAAAAASUVORK5CYII=',payload={orderId:order.id,photoData};
 assert.equal((await call('/api/admin/v31/handover',payload,admin)).status,409);
 await ok('/api/admin/orders',{id:order.id,status:'confirmed'},admin);await ok('/api/admin/orders',{id:order.id,status:'delivered'},admin);
 assert.equal((await call('/api/admin/v31/handover',payload,customer)).status,401);assert.equal((await call('/api/admin/v31/handover',payload,{Cookie:admin.Cookie})).status,403);
 assert.equal((await call('/api/admin/v31/handover',{...payload,photoData:Buffer.from('<svg>unsafe image</svg>').toString('base64')},admin)).status,400);
 const photo=await ok('/api/admin/v31/handover',payload,admin),url='/api/v31/delivery-photo/'+photo.id;
 assert.equal((await call(url)).status,401);assert.equal((await call(url,undefined,other)).status,401);const image=await call(url,undefined,customer);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.match(image.headers.get('cache-control'),/no-store/);assert.deepEqual(Buffer.from(await image.arrayBuffer()),Buffer.from(photoData,'base64'));
 assert.equal((await ok('/api/account/orders',undefined,customer))[0].delivery_photos[0].url,url);assert.equal((await ok('/api/account/orders',undefined,other)).length,0);
 assert.equal((await call('/api/orders/track',{id:order.id,phone:'0909999999'})).status,404);const tracking=await ok('/api/orders/track',{id:order.id,phone:'0901234567'});assert.equal(tracking.delivery_photos[0].url,'data:image/png;base64,'+photoData);
 for(let i=0;i<14;i++)await ok('/api/admin/v31/handover',payload,admin);
 const list=await ok('/api/admin/v31/handover?photos='+order.id,undefined,admin);assert.equal(list.length,15);await ok('/api/admin/v31/handover',{orderId:order.id,removePhoto:photo.id},admin);assert.equal((await call(url,undefined,customer)).status,404);assert.equal((await ok('/api/account/orders',undefined,customer))[0].delivery_photos.length,14);
 }finally{child.kill();await once(child,'exit');fs.rmSync(dir,{recursive:true,force:true});}
});
