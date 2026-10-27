'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');
const {initializeCommerce,paymentSummary}=require('../commerce');const {initializeSePay}=require('../sepay-payments');
function setup({sandbox=false,fetcher}={}){
 const db=new DatabaseSync(':memory:');db.exec(`PRAGMA foreign_keys=ON;CREATE TABLE orders(id TEXT PRIMARY KEY,total INTEGER,status TEXT,cancellation_requested INTEGER DEFAULT 0);INSERT INTO orders VALUES('V-1',100000,'confirmed',0);`);initializeCommerce(db);db.prepare("UPDATE orders SET payment_plan='online'").run();
 let response,queries=0,paid=0;
 const env={SEPAY_PG_ENABLED:'true',SEPAY_PG_ENV:sandbox?'sandbox':'production',SEPAY_PG_MERCHANT_ID:sandbox?'SP-TEST-example':'SP-example',SEPAY_IPN_TOKEN:'a'.repeat(64)};
 const api=initializeSePay(db,{env,siteUrl:'https://store.example',client:{checkout:({invoiceNumber,amount})=>({url:'https://pay.example',fields:{invoiceNumber,amount}}),retrieve:async invoice=>{queries++;return fetcher?fetcher(invoice):response;}},onPaid:()=>paid++});
 return{db,api,env,get queries(){return queries;},get paid(){return paid;},order:()=>db.prepare('SELECT * FROM orders WHERE id=?').get('V-1'),respond:(invoice,patch={})=>{response={data:{id:'remote123',order_invoice_number:invoice,order_amount:'100000.00',order_currency:'VND',order_status:'CAPTURED',...patch}};}};
}
test('IPN authentication and invoice consistency are mandatory; disabled gateway rejects calls',()=>{
 const f=setup();assert.throws(()=>f.api.verifyToken('wrong'),{status:401});f.api.verifyToken(f.env.SEPAY_IPN_TOKEN);
 const a=f.api.start('V-1');assert.equal(f.api.notificationInvoice({order:{order_invoice_number:a.invoice}}),a.invoice);
 assert.throws(()=>f.api.notificationInvoice({order_invoice_number:a.invoice,order:{order_invoice_number:'other'}}),{status:400});
 assert.throws(()=>f.api.notificationInvoice({transferAmount:100000}),{status:400});
 const off=initializeSePay(f.db,{env:{},siteUrl:'https://store.example'});assert.throws(()=>off.start('V-1'),{status:503});assert.throws(()=>off.verifyToken('x'),{status:503});f.db.close();
});
test('captured provider query records exactly once including concurrent retries; IPN payload amount/status ignored',async()=>{
 const f=setup();const a=f.api.start('V-1');assert.equal(f.api.start('V-1').invoice,a.invoice);
 f.respond(a.invoice);const invoice=f.api.notificationInvoice({order_invoice_number:a.invoice,order_amount:1,order_status:'FAILED'});
 const results=await Promise.all([f.api.verify(invoice),f.api.verify(invoice),f.api.verify(invoice)]);assert.ok(results.every(r=>r.status==='paid'));assert.equal(f.paid,1);assert.equal(f.queries,1);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM payment_records').get().n,1);assert.equal(paymentSummary(f.db,f.order()).received,100000);assert.equal(paymentSummary(f.db,f.order()).source,'sepay_verified');await f.api.verify(invoice);assert.equal(f.queries,1);f.db.close();
});
test('forged IPN cannot confirm a pending provider order; API failure never creates a receipt',async()=>{
 const f=setup();const a=f.api.start('V-1');f.respond(a.invoice,{order_status:'PENDING'});assert.equal((await f.api.verify(a.invoice)).status,'pending');assert.equal(f.paid,0);assert.equal(paymentSummary(f.db,f.order()).received,0);f.db.close();
 const down=setup({fetcher:async()=>{throw Error('secret');}});const b=down.api.start('V-1');await assert.rejects(down.api.verify(b.invoice),{status:503});assert.equal(paymentSummary(down.db,down.order()).received,0);down.db.close();
});
test('provider invoice, amount, currency and merchant mismatches cannot credit any money',async()=>{
 for(const patch of [{order_invoice_number:'wrong'},{order_amount:1},{order_amount:'100000.01'},{order_amount:'1e5'},{order_currency:'USD'},{merchant_id:'other'},{id:null}]){const f=setup(),a=f.api.start('V-1');f.respond(a.invoice,patch);await assert.rejects(f.api.verify(a.invoice),{status:502});assert.equal(paymentSummary(f.db,f.order()).received,0);f.db.close();}
});
test('sandbox success never writes real receipt; public checkout cannot create a sandbox session',async()=>{
 const f=setup({sandbox:true});assert.throws(()=>f.api.start('V-1'),{status:403});const a=f.api.start('V-1','balance',{owner:true});f.respond(a.invoice);assert.equal((await f.api.verify(a.invoice)).status,'test_paid');assert.equal(f.paid,0);assert.equal(paymentSummary(f.db,f.order()).received,0);assert.equal(f.api.publicConfig().onlineAvailable,false);f.db.close();
});
test('order cancellation or manual receipt during provider request goes to review without double credit',async()=>{
 for(const change of [db=>db.exec("UPDATE orders SET status='cancelled'"),db=>db.exec("UPDATE orders SET cancellation_requested=1"),db=>db.prepare('INSERT INTO payment_records VALUES(?,?,?,?,?,?,?,?)').run('manual','V-1',10000,'receipt','cash','checked','manual-request','now')]){
  const f=setup(),a=f.api.start('V-1');change(f.db);f.respond(a.invoice);assert.equal((await f.api.verify(a.invoice)).status,'review');assert.equal(f.paid,0);assert.throws(()=>f.api.start('V-1'),{status:409});f.db.close();
 }
});
test('deposit amount is calculated on server, credited once, then balance can be paid',async()=>{
 const f=setup();f.db.exec("UPDATE orders SET payment_plan='deposit',deposit_due=20000");const a=f.api.start('V-1','deposit');assert.equal(a.fields.amount,20000);f.respond(a.invoice,{id:'deposit1',order_amount:20000});await f.api.verify(a.invoice);assert.equal(paymentSummary(f.db,f.order()).received,20000);
 const b=f.api.start('V-1');assert.equal(b.fields.amount,80000);f.respond(b.invoice,{id:'balance1',order_amount:80000});await f.api.verify(b.invoice);assert.equal(paymentSummary(f.db,f.order()).remaining,0);assert.equal(f.paid,2);f.db.close();
});
test('same provider order cannot pay two invoices',async()=>{
 const f=setup();const a=f.api.start('V-1');f.respond(a.invoice);await f.api.verify(a.invoice);f.db.exec("INSERT INTO orders VALUES('V-2',100000,'confirmed',0,'online',NULL,NULL)");const b=f.api.start('V-2');f.respond(b.invoice);await assert.rejects(f.api.verify(b.invoice),{status:409});assert.equal(f.paid,1);f.db.close();
});

test('offsetting manual receipt and refund still require review',async()=>{
 const f=setup(),a=f.api.start('V-1');for(const kind of ['receipt','refund'])f.db.prepare('INSERT INTO payment_records VALUES(?,?,?,?,?,?,?,?)').run(kind,'V-1',10000,kind,kind,'checked',kind,'now');f.respond(a.invoice);assert.equal((await f.api.verify(a.invoice)).status,'review');assert.equal(f.paid,0);assert.equal(paymentSummary(f.db,f.order()).received,0);f.db.close();
});

test('customer COD and installment orders cannot start online payment',()=>{const f=setup();try{for(const plan of ['cod','installment']){f.db.prepare('UPDATE orders SET payment_plan=?').run(plan);assert.throws(()=>f.api.start('V-1'),{status:409});}assert.equal(f.db.prepare('SELECT COUNT(*) n FROM sepay_attempts').get().n,0);}finally{f.db.close();}});

test('new online and deposit orders can pay before confirmation; verified payment leaves delivery state unchanged',async()=>{for(const plan of ['online','deposit']){const f=setup();try{f.db.prepare("UPDATE orders SET status='new',payment_plan=?,deposit_due=?").run(plan,plan==='deposit'?20000:null);const a=f.api.start('V-1',plan==='deposit'?'deposit':'balance');assert.equal(a.fields.amount,plan==='deposit'?20000:100000);f.respond(a.invoice,{order_amount:a.fields.amount});assert.equal((await f.api.verify(a.invoice)).status,'paid');assert.equal(f.order().status,'new');assert.equal(paymentSummary(f.db,f.order()).received,a.fields.amount);}finally{f.db.close();}}});
