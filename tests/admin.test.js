'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),{once}=require('node:events');
test('consultation drafts stay private, authenticated replies are idempotent and survive restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'duc-tu-inbox-')),base='http://localhost:32150',password=crypto.randomBytes(24).toString('hex');let child;
 const start=async()=>{child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'32150',SITE_URL:base,ADMIN_PASSWORD:password,DATA_DIR:dir},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('startup failed');})]);};
 const call=(route,data,headers={})=>fetch(base+route,data===undefined?{headers}:{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...headers},body:JSON.stringify(data)});
 try{await start();const lead=await(await call('/api/consultations',{name:'Khách kiểm thử',phone:'0901234567',note:'Tư vấn đi học',consent:true})).json();const login=await call('/api/admin/login',{password}),cookie=login.headers.get('set-cookie').split(';')[0],csrf=(await login.json()).csrf,auth={Cookie:cookie,'X-CSRF-Token':csrf};
 const edit={id:lead.id,status:'in_progress',internalNote:'private staff note',draft:'private unsent draft'};
 assert.equal((await call('/api/admin/consultations',edit)).status,401);assert.equal((await call('/api/admin/consultations',edit,{Cookie:cookie})).status,403);assert.equal((await call('/api/admin/consultations',edit,auth)).status,200);
 let track=await(await call('/api/consultations/track',{id:lead.id,phone:'0901234567'})).json();assert.equal(track.status,'in_progress');assert.deepEqual(track.replies,[]);for(const field of ['phone','name','internal_note','draft','note'])assert.equal(track[field],undefined);
 assert.equal((await call('/api/consultations/track',{id:lead.id,phone:'0900000000'})).status,404);
 const publish={...edit,publish:true,message:'Phản hồi kiểm thử <script>alert(1)</script>'},key=crypto.randomUUID();assert.equal((await call('/api/admin/consultations',{...publish,message:''},{...auth,'Idempotency-Key':key})).status,400);for(let i=0;i<2;i++)assert.equal((await call('/api/admin/consultations',publish,{...auth,'Idempotency-Key':key})).status,200);assert.equal((await call('/api/admin/consultations',{...publish,message:'different message'},{...auth,'Idempotency-Key':key})).status,409);
 child.kill();await once(child,'exit');await start();track=await(await call('/api/consultations/track',{id:lead.id,phone:'0901234567'})).json();assert.equal(track.status,'replied');assert.equal(track.replies.length,1);assert.equal(track.replies[0].message,publish.message);assert.ok(!JSON.stringify(track).includes('private'));
 assert.equal((await call('/tra-cuu-tu-van')).status,200);
 }finally{if(child&&child.exitCode===null){child.kill();await once(child,'exit');}fs.rmSync(dir,{recursive:true,force:true});}
});
