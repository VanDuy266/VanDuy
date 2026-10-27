'use strict';
// Local mock provider only. No request reaches SePay and no real money is transferred.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {spawn,execFileSync}=require('node:child_process');const {once}=require('node:events');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),https=require('node:https'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'sepay-qa-'));
const base='https://localhost:32211',password=crypto.randomBytes(20).toString('hex'),token=crypto.randomBytes(32).toString('hex');
const key=path.join(temp,'key.pem'),cert=path.join(temp,'cert.pem'),fixture=path.join(temp,'provider.json'),preload=path.join(temp,'mock.cjs');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
fs.writeFileSync(fixture,'{}');fs.writeFileSync(preload,`const fs=require('node:fs');const original=global.fetch;global.fetch=async(url,opts)=>{if(String(url).startsWith('https://pgapi')){const invoice=String(url).split('/').pop();const data=JSON.parse(fs.readFileSync(process.env.SEPAY_QA_FIXTURE,'utf8'))[invoice];return new Response(JSON.stringify(data?{data}:{error:'not found'}),{status:data?200:404});}return original(url,opts);};`);
let child,proxy,browser;
async function start(mode){child=spawn(process.execPath,['--require',preload,'server.js'],{cwd:root,env:{...process.env,PORT:'32210',SITE_URL:base,ADMIN_PASSWORD:password,DATA_DIR:path.join(temp,mode),GOOGLE_BACKUP_ENABLED:'false',SEPAY_PG_ENABLED:'true',SEPAY_PG_ENV:mode,SEPAY_PG_MERCHANT_ID:mode==='sandbox'?'SP-TEST-QA':'SP-QA',SEPAY_PG_SECRET_KEY:'fake-key-only-for-tests',SEPAY_IPN_TOKEN:token,SEPAY_QA_FIXTURE:fixture},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('exit',c=>reject(Error('server exited '+c)));child.stderr.on('data',d=>{if(!String(d).includes('ExperimentalWarning')&&!String(d).includes('--trace-warnings'))process.stderr.write(d);});});}
async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}}
async function main(){
 proxy=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{const upstream=http.request({host:'127.0.0.1',port:32210,path:req.url,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);});proxy.listen(32211);await once(proxy,'listening');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const mode of ['sandbox','production']){
  await start(mode);const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const api=context.request;async function post(route,data,extra={}){return api.post(base+route,{data,headers:{Origin:base,...extra}});}
  const login=await post('/api/admin/login',{password}),csrf=(await login.json()).csrf,auth={'X-CSRF-Token':csrf};assert.equal(login.status(),200);
  const products=await(await api.get(base+'/api/products')).json();
  const created=await post('/api/orders',{name:'Khách kiểm tra',phone:'0901234567',address:'Địa chỉ kiểm tra',note:'Test only',consent:true,items:[{id:products[0].id,quantity:1}]},{'Idempotency-Key':crypto.randomUUID()});assert.equal(created.status(),201);const order=await created.json();
  assert.equal((await post('/api/admin/orders',{id:order.id,status:'confirmed'},auth)).status(),200);
  const config=await(await api.get(base+'/api/payments/config')).json();assert.equal(config.onlineAvailable,mode==='production');
  assert.equal((await post('/api/payments/sepay/checkout',{id:order.id,phone:'0900000000'})).status(),404);
  await page.goto(base+'/admin/thanh-toan');await page.locator('#sepay-panel').waitFor();
  assert.match(await page.locator('#sepay-panel').innerText(),mode==='sandbox'?/Môi trường thử/:/Môi trường thật/);
  const ipn=await page.locator('#sepay-ipn-url').inputValue();assert.ok(ipn.includes(token));
  let checkout;
  if(mode==='sandbox'){
   assert.equal((await post('/api/payments/sepay/checkout',{id:order.id,phone:'0901234567'})).status(),403);
   const r=await post('/api/admin/sepay/checkout',{id:order.id,amount:1},auth);assert.equal(r.status(),200);checkout=await r.json();
  }else{
   await page.goto(base+'/tra-cuu');await page.locator('#tracking-form [name=id]').fill(order.id);await page.locator('#tracking-form [name=phone]').fill('0901234567');await page.locator('#tracking-form button').click();await page.locator('[data-sepay-order]:not([hidden])').first().waitFor();
   const r=await post('/api/payments/sepay/checkout',{id:order.id,phone:'0901234567',amount:1});assert.equal(r.status(),200);checkout=await r.json();
  }
  assert.equal(checkout.fields.order_amount,order.total);assert.ok(!JSON.stringify(checkout).includes('fake-key'));
  const remote={id:'provider-'+mode,order_invoice_number:checkout.invoice,order_amount:order.total,order_currency:'VND',order_status:'PENDING'};const fixtures={[checkout.invoice]:remote};fs.writeFileSync(fixture,JSON.stringify(fixtures));
  assert.equal((await api.post(base+'/api/payments/sepay/ipn?token=wrong',{data:{order:{order_invoice_number:checkout.invoice}}})).status(),401);
  const payload={notification_type:'ORDER_PAID',order:{order_invoice_number:checkout.invoice},order_amount:1};
  assert.equal((await api.post(ipn,{data:payload})).status(),503);
  remote.order_status='CAPTURED';fs.writeFileSync(fixture,JSON.stringify(fixtures));
  for(let i=0;i<3;i++){const result=await api.post(ipn,{data:payload});assert.equal(result.status(),200);assert.deepEqual(await result.json(),{success:true});}
  const records=await(await api.get(base+'/api/admin/payments')).json();assert.equal(records.length,mode==='sandbox'?0:1);
  const tracked=await(await post('/api/orders/track',{id:order.id,phone:'0901234567'})).json();assert.equal(tracked.payment.received,mode==='sandbox'?0:order.total);assert.equal(tracked.status,'confirmed');
  assert.equal((await post('/api/payments/sepay/status',{invoice:checkout.invoice,phone:'0900000000'})).status(),404);
  await page.goto(base+'/thanh-toan/ket-qua?invoice='+checkout.invoice+'&payment=success');await page.locator('#sepay-check-form [name=phone]').fill('0901234567');await page.locator('#sepay-check-form button').click();await page.waitForFunction(()=>document.querySelector('#sepay-check-form').hidden);
  assert.match(await page.locator('#sepay-result').innerText(),mode==='sandbox'?/không ghi nhận tiền thật/:/SePay đã xác nhận thanh toán/);
  // Confirm sandbox form submission uses provider URL under the site's CSP.
  if(mode==='sandbox'){
   await page.route('https://pay-sandbox.sepay.vn/**',async route=>{assert.equal(route.request().method(),'POST');const fields=new URLSearchParams(route.request().postData());assert.equal(fields.get('order_amount'),String(order.total));await route.fulfill({body:'<h1>Mock SePay checkout</h1>',contentType:'text/html'});});
   await page.goto(base+'/admin/thanh-toan');await page.locator('#sepay-start-form').waitFor();await page.locator('#sepay-start-form button').click();await page.waitForURL('https://pay-sandbox.sepay.vn/**');assert.match(await page.locator('h1').innerText(),/Mock SePay/);
  }
  assert.deepEqual(errors,[]);await context.close();await stop();
  // Restart with the same data directory; verified receipts must remain idempotent.
  await start(mode);const again=await browser.newContext({ignoreHTTPSErrors:true});const status=await again.request.post(base+'/api/payments/sepay/status',{data:{invoice:checkout.invoice,phone:'0901234567'},headers:{Origin:base}});assert.equal(status.status(),200);assert.equal((await status.json()).status,mode==='sandbox'?'test_paid':'paid');await again.close();await stop();
  console.log('SePay '+mode+' browser/API/restart checks: PASS (mock provider only)');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await stop();if(proxy)await new Promise(r=>proxy.close(r));fs.rmSync(temp,{recursive:true,force:true});});
