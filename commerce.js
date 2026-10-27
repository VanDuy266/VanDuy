'use strict';
// Manual receipts/refunds and independently verified SePay receipts share the ledger.
function initializeCommerce(db) {
  const additions={payment_plan:"TEXT NOT NULL DEFAULT 'cod'",deposit_due:'INTEGER',finance_months:'INTEGER'};
  for(const [column,definition]of Object.entries(additions)){
    if(!db.prepare('PRAGMA table_info(orders)').all().some(c=>c.name===column))db.exec(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS payment_records(
    id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),
    amount INTEGER NOT NULL CHECK(amount>0),kind TEXT NOT NULL CHECK(kind IN ('receipt','refund')),
    reference TEXT NOT NULL,note TEXT NOT NULL,request_key TEXT UNIQUE NOT NULL,created_at TEXT NOT NULL
  );`);
}
function paymentSummary(db,order) {
  const rows=db.prepare('SELECT amount,kind,request_key FROM payment_records WHERE order_id=?').all(order.id);
  const gateway=rows.some(r=>r.request_key.startsWith('sepay-pg:')),manual=rows.some(r=>!r.request_key.startsWith('sepay-pg:'));
  const received=rows.reduce((sum,row)=>sum+(row.kind==='receipt'?row.amount:-row.amount),0);
  return {received,remaining:order.total-received,status:received===0?'unpaid':received>=order.total?'paid':'partial',source:gateway?(manual?'mixed':'sepay_verified'):rows.length?'staff_record':'none'};
}
function validateSocial(key,value) {
  if(!value)return '';
  let url;try{url=new URL(value);}catch{throw Error('Đường dẫn mạng xã hội không hợp lệ');}
  const hosts={zaloUrl:['zalo.me','oa.zalo.me'],facebookUrl:['facebook.com','www.facebook.com','m.facebook.com'],messengerUrl:['m.me','www.messenger.com','messenger.com'],tiktokUrl:['tiktok.com','www.tiktok.com']};
  if(url.protocol!=='https:'||url.username||url.password||url.port||!hosts[key]?.includes(url.hostname))throw Error('Đường dẫn phải là HTTPS của đúng mạng xã hội');
  return url.href;
}
module.exports={initializeCommerce,paymentSummary,validateSocial};

function initializeOrderHistory(db){for(const [column,definition]of Object.entries({received_at:'TEXT',cancellation_requested:'INTEGER NOT NULL DEFAULT 0',cancellation_reason:"TEXT NOT NULL DEFAULT ''",cancellation_requested_at:'TEXT',cancellation_response:"TEXT NOT NULL DEFAULT ''"}))if(!db.prepare('PRAGMA table_info(orders)').all().some(c=>c.name===column))db.exec(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);db.exec('CREATE TABLE IF NOT EXISTS order_events(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),event TEXT NOT NULL,actor TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL)');}
const eventId=()=>require('node:crypto').randomUUID();
function orderEvent(db,id,event,actor,note=''){db.prepare('INSERT INTO order_events VALUES(?,?,?,?,?,?)').run(eventId(),id,event,actor,note,new Date().toISOString());}
function applyStatus(db,old,status,actor){const fail=message=>{throw Object.assign(Error(message),{status:409});};if(status===old.status)return;if(!({new:['confirmed','cancelled'],confirmed:['delivered','cancelled'],delivered:[],cancelled:[]}[old.status]||[]).includes(status))fail('Không thể đổi trạng thái này');if(status==='cancelled'&&paymentSummary(db,old).received>0)fail('Cần ghi nhận hoàn tiền trước khi hủy đơn');if(status==='delivered'&&old.cancellation_requested)fail('Cần xử lý yêu cầu hủy trước khi giao xe');db.prepare('UPDATE orders SET status=?,cancellation_requested=CASE WHEN ?=\'cancelled\' THEN 0 ELSE cancellation_requested END WHERE id=?').run(status,status,old.id);if(status==='cancelled')for(const item of JSON.parse(old.items)){if(item.reserved)db.prepare('UPDATE products SET stock=stock+? WHERE id=? AND stock IS NOT NULL').run(item.quantity,item.id);if(item.variantReserved){db.prepare('UPDATE v31_variants SET stock=stock+? WHERE product_id=? AND color=?').run(item.quantity,item.id,item.color);db.prepare('INSERT INTO v31_stock_log VALUES(?,?,?,?,?,?)').run(eventId(),item.id,item.color,item.quantity,'Hoàn kho '+old.id,new Date().toISOString());}}orderEvent(db,old.id,status,actor);}
function transaction(db,action){db.exec('BEGIN IMMEDIATE');try{const r=action();db.exec('COMMIT');return r;}catch(error){db.exec('ROLLBACK');throw error;}}
function changeOrderStatus(db,id,status,actor='admin'){return transaction(db,()=>{const old=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!old)throw Object.assign(Error('Không tìm thấy đơn'),{status:404});applyStatus(db,old,status,actor);return{ok:true};});}
function requestCancellation(db,id,reason){return transaction(db,()=>{const old=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!old)throw Object.assign(Error('Không tìm thấy đơn'),{status:404});if(old.status==='cancelled')return{ok:true,status:'cancelled'};if(old.status==='delivered')throw Object.assign(Error('Đơn đã giao. Vui lòng liên hệ cửa hàng về chính sách đổi trả.'),{status:409});if(old.cancellation_requested)return{ok:true,status:old.status,cancellationRequested:true};db.prepare('UPDATE orders SET cancellation_reason=?,cancellation_requested_at=?,cancellation_response=\'\' WHERE id=?').run(reason,new Date().toISOString(),id);if(old.status==='new'&&paymentSummary(db,old).received===0){applyStatus(db,old,'cancelled','customer');return{ok:true,status:'cancelled'};}db.prepare('UPDATE orders SET cancellation_requested=1 WHERE id=?').run(id);orderEvent(db,id,'cancellation_requested','customer',reason);return{ok:true,status:old.status,cancellationRequested:true};});}
function rejectCancellation(db,id,note){return transaction(db,()=>{const old=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!old||!old.cancellation_requested)throw Object.assign(Error('Không có yêu cầu hủy cần xử lý'),{status:409});db.prepare('UPDATE orders SET cancellation_requested=0,cancellation_response=? WHERE id=?').run(note,id);orderEvent(db,id,'cancellation_rejected','admin',note);return{ok:true};});}
function orderHistory(db,id){return db.prepare('SELECT event,actor,note,created_at FROM order_events WHERE order_id=? ORDER BY created_at,rowid').all(id);}
module.exports={...module.exports,initializeOrderHistory,orderEvent,changeOrderStatus,requestCancellation,rejectCancellation,orderHistory};

function acknowledgeReceipt(db,id,customerId){return transaction(db,()=>{const o=db.prepare('SELECT * FROM orders WHERE id=? AND customer_id=?').get(id,customerId);if(!o)throw Object.assign(Error('Không tìm thấy đơn của bạn'),{status:404});if(o.received_at)return{ok:true};if(o.status!=='confirmed'&&o.status!=='delivered')throw Object.assign(Error('Đơn cần shop xác nhận trước khi nhận xe'),{status:409});if(o.cancellation_requested)throw Object.assign(Error('Cần xử lý yêu cầu hủy trước'),{status:409});if(o.status==='confirmed')applyStatus(db,o,'delivered','customer');db.prepare('UPDATE orders SET received_at=? WHERE id=?').run(new Date().toISOString(),id);orderEvent(db,id,'customer_received','customer');return{ok:true};});}
module.exports.acknowledgeReceipt=acknowledgeReceipt;
