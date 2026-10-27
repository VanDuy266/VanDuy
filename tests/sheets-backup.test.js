'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events'),{DatabaseSync}=require('node:sqlite');
const {codec,createPersistence,createGoogleTransport}=require('../sheets-backup');
const secret='test-only-random-key-not-for-production-12345';
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'ductu-sheets-'));}
test('encrypted SQLite snapshots restore account and order data after local storage deletion',async()=>{
 const dir=temp();let saved=[];const transport={ensure:async()=>{},read:async()=>saved,write:async rows=>{saved=structuredClone(rows);}};let db;
 try{const file=path.join(dir,'store.sqlite');const p=createPersistence({transport,secret,file,allowEmpty:true});assert.equal(await p.restore(),false);db=new DatabaseSync(file);db.exec("CREATE TABLE customers(id TEXT PRIMARY KEY,password_hash TEXT);CREATE TABLE orders(id TEXT PRIMARY KEY,total INTEGER);INSERT INTO customers VALUES('customer-a','sensitive-password-hash');INSERT INTO orders VALUES('order-a',15900000)");await p.flush(db);assert.equal(p.status().synced,true);assert.ok(!JSON.stringify(saved).includes('sensitive-password-hash'));db.close();db=null;fs.rmSync(file);const restored=createPersistence({transport,secret,file});assert.equal(await restored.restore(),true);db=new DatabaseSync(file);assert.equal(db.prepare('SELECT total FROM orders').get().total,15900000);assert.equal(db.prepare('SELECT password_hash FROM customers').get().password_hash,'sensitive-password-hash');}finally{db?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('wrong encryption key or altered chunk fails restoration without overwriting local database',async()=>{
 const dir=temp(),file=path.join(dir,'db.sqlite');const db=new DatabaseSync(file);db.exec('CREATE TABLE marker(value TEXT); INSERT INTO marker VALUES(\'keep\')');db.close();const bytes=fs.readFileSync(file),rows=codec(secret).encode(bytes);
 try{assert.throws(()=>codec('wrong-key-that-is-at-least-thirty-two-characters').decode(rows),/Không đọc/);rows[1][1]='X'+rows[1][1].slice(1);const p=createPersistence({file,secret,transport:{ensure:async()=>{},read:async()=>rows}});await assert.rejects(()=>p.restore(),/Không đọc/);assert.deepEqual(fs.readFileSync(file),bytes);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('successful mutation response waits for remote save; failure returns 503 and clears auth cookie',async()=>{
 const dir=temp(),file=path.join(dir,'store.sqlite'),db=new DatabaseSync(file);db.exec('CREATE TABLE items(value TEXT)');let deny=true,writes=0;const p=createPersistence({secret,file,transport:{write:async()=>{writes++;if(deny)throw Error('upstream unavailable');}}});
 const server=http.createServer((req,res)=>{p.attach(res,db);db.prepare('INSERT INTO items VALUES(?)').run('order');res.writeHead(201,{'Content-Type':'application/json','Set-Cookie':'private-session=example'});res.end(JSON.stringify({ok:true}));});server.listen(0,'127.0.0.1');await once(server,'listening');
 try{let r=await fetch('http://127.0.0.1:'+server.address().port);assert.equal(r.status,503);assert.equal(r.headers.get('set-cookie'),null);assert.ok((await r.json()).error);deny=false;r=await fetch('http://127.0.0.1:'+server.address().port);assert.equal(r.status,201);assert.deepEqual(await r.json(),{ok:true});assert.equal(p.status().synced,true);assert.equal(writes,2);}finally{await new Promise(r=>server.close(r));db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('static streaming responses remain usable with backup hook',async()=>{
 const dir=temp(),file=path.join(dir,'store.sqlite'),db=new DatabaseSync(file);const p=createPersistence({secret,file,transport:{write:async()=>{throw Error('must not write during static stream');}}});const server=http.createServer((req,res)=>{p.attach(res,db);res.writeHead(200);res.write('static ');res.end('asset');});server.listen(0,'127.0.0.1');await once(server,'listening');try{const r=await fetch('http://127.0.0.1:'+server.address().port);assert.equal(await r.text(),'static asset');}finally{await new Promise(r=>server.close(r));db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('Google transport creates only backup tab and writes RAW encrypted cells',async()=>{
 const {generateKeyPairSync}=require('node:crypto');const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});let created=false,written=false;
 const t=createGoogleTransport({GOOGLE_BACKUP_INITIALIZE:'true',GOOGLE_SHEET_ID:'test-only',GOOGLE_SERVICE_ACCOUNT_EMAIL:'example@example.test',GOOGLE_PRIVATE_KEY:privateKey},async(url,options)=>{if(url.includes('oauth2.googleapis.com'))return Response.json({access_token:'test',expires_in:3600});assert.equal(options.headers.Authorization,'Bearer test');if(url.endsWith(':batchUpdate')){assert.equal(JSON.parse(options.body).requests[0].addSheet.properties.title,'AppBackup');created=true;return Response.json({});}if(options.method==='PUT'){assert.ok(url.endsWith('valueInputOption=RAW'));written=true;return Response.json({updatedRows:1});}if(url.includes('fields='))return Response.json({sheets:[]});return Response.json({values:[]});});
 await t.ensure();assert.equal(created,true);assert.deepEqual(await t.read(),[]);await t.write([['manifest','test']]);assert.equal(written,true);
});
test('missing remote snapshot fails closed unless first-time initialization is explicitly allowed',async()=>{
 const dir=temp();try{const p=createPersistence({secret,file:path.join(dir,'store.sqlite'),transport:{ensure:async()=>{},read:async()=>[]}});await assert.rejects(()=>p.restore(),/Không có bản sao lưu/);assert.equal(fs.existsSync(path.join(dir,'store.sqlite')),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('real website restores its catalog, customer login and order after deleting its entire local data directory',async()=>{
 const {spawn}=require('node:child_process');const dir=temp(),data=path.join(dir,'data'),remote=path.join(dir,'remote.json'),preload=path.join(dir,'mock-google.cjs'),base='http://127.0.0.1:32183';let child;
 const modulePath=path.join(__dirname,'..','sheets-backup.js');
 fs.writeFileSync(preload,`const fs=require('node:fs');require(${JSON.stringify(modulePath)}).createGoogleTransport=()=>({ensure:async()=>{},read:async()=>fs.existsSync(${JSON.stringify(remote)})?JSON.parse(fs.readFileSync(${JSON.stringify(remote)},'utf8')):[],write:async rows=>fs.writeFileSync(${JSON.stringify(remote)},JSON.stringify(rows))});`);
 const start=async first=>{child=spawn(process.execPath,['--require',preload,'server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,NODE_ENV:'test',PORT:'32183',HOST:'127.0.0.1',SITE_URL:base,ADMIN_PASSWORD:'integration-test-password',DATA_DIR:data,GOOGLE_BACKUP_ENABLED:'true',GOOGLE_BACKUP_INITIALIZE:first?'true':'false',SHEETS_BACKUP_KEY:secret},stdio:['ignore','pipe','pipe']});for(let i=0;i<80;i++){if(child.exitCode!==null)throw Error('Website exited during test startup');try{const r=await fetch(base+'/api/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('Website startup timeout');};
 const stop=async()=>{if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}};
 const call=(route,body,headers={})=>fetch(base+route,{...(body?{method:'POST',body:JSON.stringify(body)}:{}),headers:{'Content-Type':'application/json',Origin:base,...headers}});
 try{
  await start(true);let r=await call('/api/auth/register',{name:'Nguyen Test',email:'backup@example.test',password:'ExamplePassword123',consent:true});assert.equal(r.status,201);await r.json();
  const products=await(await call('/api/products')).json();assert.ok(products.length>0);
  r=await call('/api/orders',{name:'Nguyen Test',phone:'0901234567',address:'12 Test Street',note:'',consent:true,items:[{id:products[0].id,quantity:1}]},{'Idempotency-Key':'backup-integration-test-request'});assert.equal(r.status,201);const order=await r.json();
  assert.equal((await call('/style.css')).status,200);
  await stop();fs.rmSync(data,{recursive:true,force:true});await start(false);
  r=await call('/api/auth/login',{email:'backup@example.test',password:'ExamplePassword123'});assert.equal(r.status,200);await r.json();
  r=await call('/api/orders/track',{id:order.id,phone:'0901234567'});assert.equal(r.status,200);assert.equal((await r.json()).total,order.total);
  assert.equal((await(await call('/api/products')).json()).length,products.length);
 }finally{await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
