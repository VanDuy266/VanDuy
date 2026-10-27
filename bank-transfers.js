'use strict';
const crypto=require('node:crypto');
const TTL=15*60*1000;
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
function initializeTransfers(db){db.exec(`
CREATE TABLE IF NOT EXISTS bank_transfer_intents(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),purpose TEXT NOT NULL,amount INTEGER NOT NULL,bank_bin TEXT NOT NULL,bank_name TEXT NOT NULL,bank_account TEXT NOT NULL,bank_account_name TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS bank_payment_events(provider TEXT NOT NULL,event_id TEXT NOT NULL,event_hash TEXT NOT NULL,intent_id TEXT,account_number TEXT NOT NULL,amount INTEGER NOT NULL,content TEXT NOT NULL,reference TEXT NOT NULL,transaction_at TEXT NOT NULL,received_at TEXT NOT NULL,status TEXT NOT NULL,reason TEXT NOT NULL,payment_record_id TEXT,PRIMARY KEY(provider,event_id));
CREATE TABLE IF NOT EXISTS bank_review_resolutions(provider TEXT NOT NULL,event_id TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(provider,event_id));
CREATE INDEX IF NOT EXISTS bank_intent_order ON bank_transfer_intents(order_id,expires_at);`);}
function getIntent(db,order,bank,amount,purpose,now=Date.now()){
 db.prepare("UPDATE bank_transfer_intents SET status='expired' WHERE order_id=? AND status='pending' AND expires_at<=?").run(order.id,now);
 let intent=db.prepare("SELECT * FROM bank_transfer_intents WHERE order_id=? AND purpose=? AND amount=? AND bank_bin=? AND bank_account=? AND status='pending' AND expires_at>? ORDER BY created_at DESC LIMIT 1").get(order.id,purpose,amount,bank.bankBin,bank.bankAccount,now);
 if(!intent){db.prepare("UPDATE bank_transfer_intents SET status='expired' WHERE order_id=? AND purpose=? AND status='pending'").run(order.id,purpose);const id='DT'+crypto.randomBytes(8).toString('hex').toUpperCase();db.prepare('INSERT INTO bank_transfer_intents VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,order.id,purpose,amount,bank.bankBin,bank.bankName,bank.bankAccount,bank.bankAccountName,now,now+TTL,'pending');intent=db.prepare('SELECT * FROM bank_transfer_intents WHERE id=?').get(id);}
 return intent;
}
function verifySePay(secret,authorization){if(!secret||secret.length<32)fail(503,'Chưa cấu hình kết nối đối soát ngân hàng.');const token=typeof authorization==='string'?authorization.replace(/^Apikey\s+/i,''):'';const a=Buffer.from(token),b=Buffer.from(secret);if(!/^Apikey\s+/i.test(authorization||'')||a.length!==b.length||!crypto.timingSafeEqual(a,b))fail(401,'Xác thực webhook không hợp lệ.');}
function normalizeSePay(body){
 if(!body||!['string','number'].includes(typeof body.id)||!/^[A-Za-z0-9_-]{1,80}$/.test(String(body.id))||typeof body.accountNumber!=='string'||!/^\d{6,19}$/.test(body.accountNumber)||typeof body.gateway!=='string'||body.gateway.length>80||!['in','out'].includes(body.transferType)||!Number.isSafeInteger(body.transferAmount)||body.transferAmount<1||body.transferAmount>1000000000000||typeof body.content!=='string'||body.content.length>4000)fail(400,'Sự kiện ngân hàng không hợp lệ.');
 return {id:String(body.id),account:body.accountNumber,gateway:body.gateway,type:body.transferType,amount:body.transferAmount,content:body.content,reference:typeof body.referenceCode==='string'?body.referenceCode.slice(0,200):'',transactionAt:typeof body.transactionDate==='string'?body.transactionDate.slice(0,80):''};
}
function reconcileSePay(db,event,now=Date.now()){
 const hash=crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex');db.exec('BEGIN IMMEDIATE');try{
  const prior=db.prepare("SELECT * FROM bank_payment_events WHERE provider='sepay' AND event_id=?").get(event.id);if(prior){if(prior.event_hash!==hash)fail(409,'Mã giao dịch đã dùng với nội dung khác.');db.exec('COMMIT');return {success:true,duplicate:true,status:prior.status};}
  const codes=[...new Set((event.content.toUpperCase().match(/DT[A-F0-9]{16}(?![A-Z0-9])/g)||[]))];
  const intent=codes.length===1?db.prepare('SELECT * FROM bank_transfer_intents WHERE id=?').get(codes[0]):null;
  const order=intent?db.prepare('SELECT * FROM orders WHERE id=?').get(intent.order_id):null;
  let reason='',status='review',recordId=null;
  if(event.type!=='in'){status='ignored';reason='outgoing';}
  else if(!intent)reason=codes.length>1?'multiple_codes':'unknown_code';
  else if(event.account!==intent.bank_account)reason='wrong_account';
  else if(intent.bank_bin!=='970407'||!['techcombank','tcb'].includes(event.gateway.toLowerCase().replace(/\s/g,'')))reason='wrong_bank';
  else if(intent.status!=='pending')reason=intent.status==='paid'?'already_paid':'expired';
  else if(now>=intent.expires_at)reason='expired';
  else if(!order||!['confirmed','delivered'].includes(order.status)||order.cancellation_requested)reason='order_not_payable';
  else if(event.amount!==intent.amount)reason='amount_mismatch';
  else if(event.reference&&(db.prepare("SELECT 1 FROM bank_payment_events WHERE provider='sepay' AND reference=? AND account_number=? AND status='matched'").get(event.reference,event.account)||db.prepare('SELECT 1 FROM payment_records WHERE reference=?').get(event.reference)))reason='duplicate_bank_reference';
  else {
   const summary=require('./commerce').paymentSummary(db,order);const due=intent.purpose==='deposit'?Math.min(summary.remaining,Math.max(0,(order.deposit_due||0)-summary.received)):summary.remaining;
   if(due!==intent.amount)reason='balance_changed';
   else {status='matched';recordId='SEPAY-'+event.id;db.prepare('INSERT INTO payment_records VALUES(?,?,?,?,?,?,?,?)').run(recordId,order.id,event.amount,'receipt',event.reference||'SEPAY-'+event.id,'Xác nhận từ webhook ngân hàng đã xác thực','sepay:'+event.id,new Date(now).toISOString());db.prepare("UPDATE bank_transfer_intents SET status='paid' WHERE id=?").run(intent.id);}
  }
  if(status==='review'&&intent&&reason!=='already_paid')db.prepare("UPDATE bank_transfer_intents SET status='review' WHERE id=? AND status<>'paid'").run(intent.id);
  db.prepare('INSERT INTO bank_payment_events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run('sepay',event.id,hash,intent?.id||null,event.account,event.amount,event.content,event.reference,event.transactionAt,new Date(now).toISOString(),status,reason,recordId);
  db.exec('COMMIT');return {success:true,status,reason};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
module.exports={initializeTransfers,getIntent,verifySePay,normalizeSePay,reconcileSePay,TTL};
