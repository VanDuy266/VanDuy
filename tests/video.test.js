'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
test('video upload requires owner session and CSRF, validates MP4 and supports byte ranges',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'duc-tu-video-')),base='http://localhost:32165',child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'32165',SITE_URL:base,ADMIN_PASSWORD:'video-test',DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
 try{await once(child.stdout,'data');const mp4=fs.readFileSync(path.join(__dirname,'../assets/duc-tu-design-showcase.mp4'));assert.ok(mp4.length>1000);assert.equal(mp4.toString('ascii',4,8),'ftyp');const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({password:'video-test'})}),cookie=login.headers.get('set-cookie').split(';')[0],csrf=(await login.json()).csrf;
 const upload=(bytes,headers={})=>fetch(base+'/api/admin/upload-video',{method:'POST',headers:{Origin:base,'Content-Type':'video/mp4',...headers},body:bytes});
 assert.equal((await upload(mp4)).status,401);assert.equal((await upload(mp4,{Cookie:cookie})).status,403);assert.equal((await upload(mp4,{Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'image/png'})).status,415);
 const bad=await upload(Buffer.from('not a real MP4'.repeat(4)),{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(bad.status,400);
 // Upload throttling is intentional; use a fresh server rate scope for this one successful upload.
 const r=await upload(mp4,{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(r.status,201);const result=await r.json();assert.match(result.video,/^\/media\/[a-f0-9]{32}\.mp4$/);assert.equal(fs.readdirSync(path.join(dir,'media')).filter(n=>n.endsWith('.upload')).length,0);
 const head=await fetch(base+result.video,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'video/mp4');assert.equal(Number(head.headers.get('content-length')),mp4.length);assert.equal((await head.arrayBuffer()).byteLength,0);
 const first=await fetch(base+result.video,{headers:{Range:'bytes=0-127'}});assert.equal(first.status,206);assert.equal(first.headers.get('content-range'),`bytes 0-127/${mp4.length}`);assert.deepEqual(Buffer.from(await first.arrayBuffer()),mp4.subarray(0,128));
 const last=await fetch(base+result.video,{headers:{Range:'bytes=-10'}});assert.equal(last.status,206);assert.deepEqual(Buffer.from(await last.arrayBuffer()),mp4.subarray(-10));assert.equal((await fetch(base+result.video,{headers:{Range:'bytes=999999999-'}})).status,416);assert.equal((await fetch(base+result.video,{headers:{Range:'bytes=0-1,4-8'}})).status,416);
 const asset=await fetch(base+'/assets/duc-tu-design-showcase.mp4',{headers:{Range:'bytes=0-15'}});assert.equal(asset.status,206);assert.equal((await asset.arrayBuffer()).byteLength,16);
 }finally{child.kill();await once(child,'exit');fs.rmSync(dir,{recursive:true,force:true});}
});
