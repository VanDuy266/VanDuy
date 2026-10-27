'use strict';
const crypto=require('node:crypto');
const {paymentSummary}=require('./commerce');
const {createGateway}=require('./sepay-gateway');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
function money(value){if(typeof value==='number')return Number.isSafeInteger(value)&&value>0?value:null;if(typeof value==='string'&&/^\d+(?:\.0{1,2})?$/.test(value)){const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:null;}return null;}
function initializeSePay(db,{env=process.env,siteUrl,client,onPaid=()=>{}}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS sepay_attempts(
 invoice TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),amount INTEGER NOT NULL CHECK(amount>0),
 purpose TEXT NOT NULL,environment TEXT NOT NULL,merchant TEXT NOT NULL,initial_received INTEGER NOT NULL,initial_ledger TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending',reason TEXT NOT NULL DEFAULT '',provider_order_id TEXT,
 record_id TEXT REFERENCES payment_records(id),created_at TEXT NOT NULL,checked_at TEXT,
 UNIQUE(environment,merchant,provider_order_id));`);
 if(!db.prepare('PRAGMA table_info(sepay_attempts)').all().some(c=>c.name==='initial_ledger'))db.exec("ALTER TABLE sepay_attempts ADD COLUMN initial_ledger TEXT NOT NULL DEFAULT ''");
 const ledger=id=>crypto.createHash('sha256').update(JSON.stringify(db.prepare('SELECT id,amount,kind,reference,request_key FROM payment_records WHERE order_id=? ORDER BY id').all(id))).digest('hex');
 const enabled=env.SEPAY_PG_ENABLED==='true',environment=env.SEPAY_PG_ENV||'sandbox',merchant=env.SEPAY_PG_MERCHANT_ID||'',secret=env.SEPAY_PG_SECRET_KEY||'',token=env.SEPAY_IPN_TOKEN||'';
 if(enabled&&(!/^[A-Za-z0-9_-]{32,128}$/.test(token)))throw Error('Set SEPAY_IPN_TOKEN to a private random token of at least 32 characters');
 const gateway=enabled?(client||createGateway({env:environment,merchantId:merchant,secretKey:secret,siteUrl})):null;
 const pending=new Map();
 function requireEnabled(){if(!enabled)fail(503,'Chưa bật kết nối Cổng thanh toán SePay.');}
 function verifyToken(value){requireEnabled();const a=Buffer.from(token),b=Buffer.from(typeof value==='string'?value:'');if(a.length!==b.length||!crypto.timingSafeEqual(a,b))fail(401,'IPN không hợp lệ');}
 function amountDue(order,purpose){const summary=paymentSummary(db,order);if(!['confirmed','delivered'].includes(order.status)||order.cancellation_requested)fail(409,'Cần shop xác nhận đơn và xử lý yêu cầu hủy trước khi thanh toán.');let amount=summary.remaining;if(purpose==='deposit'){if(order.payment_plan!=='deposit'||!order.deposit_due)fail(409,'Đơn chưa có mức cọc được xác nhận.');amount=Math.max(0,order.deposit_due-summary.received);}else if(purpose!=='balance')fail(400,'Khoản thanh toán không hợp lệ');if(!Number.isSafeInteger(amount)||amount<=0||amount>1000000000)fail(409,'Không còn khoản tiền phù hợp để thanh toán.');return{amount,received:summary.received};}
 function start(orderId,purpose='balance',{owner=false}={}){
  requireEnabled();if(environment==='sandbox'&&!owner)fail(403,'Thanh toán thử chỉ dành cho chủ cửa hàng.');
  const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);if(!order)fail(404,'Không tìm thấy đơn');
  if(!owner&&!['online','deposit'].includes(order.payment_plan))fail(409,'Đơn này chọn thanh toán khi nhận xe hoặc tư vấn trả góp, không thanh toán QR trực tuyến.');
  const due=amountDue(order,purpose);
  const old=db.prepare("SELECT * FROM sepay_attempts WHERE order_id=? AND environment=? AND merchant=? AND status IN ('pending','review') ORDER BY created_at DESC LIMIT 1").get(orderId,environment,merchant);
  if(old){if(old.status==='review'||old.amount!==due.amount||old.initial_received!==due.received||old.initial_ledger!==ledger(orderId)||old.purpose!==purpose)fail(409,'Đơn có phiên thanh toán cần đối soát. Không tạo thêm để tránh chuyển trùng.');return{invoice:old.invoice,environment,...gateway.checkout({invoiceNumber:old.invoice,amount:old.amount})};}
  const invoice='DT'+crypto.randomBytes(16).toString('hex').toUpperCase();
  db.prepare('INSERT INTO sepay_attempts(invoice,order_id,amount,purpose,environment,merchant,initial_received,initial_ledger,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(invoice,order.id,due.amount,purpose,environment,merchant,due.received,ledger(order.id),new Date().toISOString());
  return{invoice,environment,...gateway.checkout({invoiceNumber:invoice,amount:due.amount})};
 }
 function current(invoice){requireEnabled();if(typeof invoice!=='string'||!/^DT[A-F0-9]{32}$/.test(invoice))fail(400,'Mã thanh toán không hợp lệ');const a=db.prepare('SELECT * FROM sepay_attempts WHERE invoice=? AND environment=? AND merchant=?').get(invoice,environment,merchant);if(!a)fail(404,'Không tìm thấy phiên thanh toán');return a;}
 function summary(a){return{invoice:a.invoice,orderId:a.order_id,status:a.status,reason:a.reason,amount:a.amount,environment:a.environment,checkedAt:a.checked_at};}
 async function verify(invoice){
  const a=current(invoice);if(a.status==='paid'||a.status==='test_paid')return summary(a);
  if(pending.has(invoice))return pending.get(invoice);
  const job=(async()=>{
   let result;try{result=await gateway.retrieve(invoice);}catch{fail(503,'Chưa tra cứu được giao dịch SePay. Vui lòng thử lại.');}
   const remote=result?.data;
   // IPN is only a hint. Only a fresh authenticated server-to-server response can create a receipt.
   if(!remote||remote.order_invoice_number!==invoice||remote.order_currency!=='VND'||money(remote.order_amount)!==a.amount||!['string','number'].includes(typeof remote.id)||!String(remote.id)||String(remote.id).length>120||(remote.merchant_id!==undefined&&remote.merchant_id!==merchant))fail(502,'Kết quả SePay không khớp phiên thanh toán. Chưa ghi nhận tiền.');
   if(remote.order_status!=='CAPTURED'){
    db.prepare('UPDATE sepay_attempts SET checked_at=? WHERE invoice=?').run(new Date().toISOString(),invoice);
    return summary(current(invoice));
   }
   db.exec('BEGIN IMMEDIATE');try{
    let attempt=current(invoice);if(['paid','test_paid'].includes(attempt.status)){db.exec('COMMIT');return summary(attempt);}
    const duplicate=db.prepare('SELECT invoice FROM sepay_attempts WHERE environment=? AND merchant=? AND provider_order_id=? AND invoice<>?').get(environment,merchant,String(remote.id),invoice);
    if(duplicate)fail(409,'Giao dịch SePay đã được đối soát cho phiên khác.');
    const order=db.prepare('SELECT * FROM orders WHERE id=?').get(attempt.order_id);
    let reason='';try{const due=amountDue(order,attempt.purpose);if(due.amount!==attempt.amount||due.received!==attempt.initial_received||attempt.initial_ledger!==ledger(order.id))reason='Sổ thu hoặc số tiền của đơn đã thay đổi.';}catch{reason='Trạng thái đơn không còn phù hợp để tự ghi nhận.';}
    let record=null,status=reason?'review':environment==='sandbox'?'test_paid':'paid';
    if(status==='paid'){
     record=crypto.randomUUID();db.prepare('INSERT INTO payment_records VALUES(?,?,?,?,?,?,?,?)').run(record,order.id,attempt.amount,'receipt','SePay '+String(remote.id),'SePay xác nhận qua API; hóa đơn '+invoice,'sepay-pg:'+environment+':'+merchant+':'+String(remote.id),new Date().toISOString());
     onPaid(order,attempt);
    }
    db.prepare('UPDATE sepay_attempts SET status=?,reason=?,provider_order_id=?,record_id=?,checked_at=? WHERE invoice=?').run(status,reason,String(remote.id),record,new Date().toISOString(),invoice);
    attempt=current(invoice);db.exec('COMMIT');return summary(attempt);
   }catch(error){db.exec('ROLLBACK');throw error;}
  })();pending.set(invoice,job);try{return await job;}finally{pending.delete(invoice);}
 }
 function notificationInvoice(data){const values=[data?.order_invoice_number,data?.order?.order_invoice_number].filter(v=>v!==undefined);if(!values.length||values.some(v=>v!==values[0]))fail(400,'Thông báo thiếu mã hóa đơn hoặc mã không nhất quán.');current(values[0]);return values[0];}
 return{enabled,environment,verifyToken,start,verify,current,notificationInvoice,
  publicConfig:()=>({onlineAvailable:enabled&&environment==='production',provider:enabled?'sepay':null,sandbox:enabled&&environment==='sandbox'}),
  adminStatus:()=>({enabled,environment,merchant:enabled?merchant:null,ipnUrl:enabled?new URL('/api/payments/sepay/ipn?token='+encodeURIComponent(token),siteUrl).href:null,attempts:db.prepare('SELECT invoice,order_id,amount,purpose,environment,status,reason,created_at,checked_at FROM sepay_attempts ORDER BY created_at DESC LIMIT 100').all()})};
}
module.exports={initializeSePay,money};
