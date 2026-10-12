'use strict';
// Payment records are staff-entered receipts/refunds. They are never gateway confirmations.
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
  const rows=db.prepare('SELECT amount,kind FROM payment_records WHERE order_id=?').all(order.id);
  const received=rows.reduce((sum,row)=>sum+(row.kind==='receipt'?row.amount:-row.amount),0);
  return {received,remaining:order.total-received,status:received===0?'unpaid':received>=order.total?'paid':'partial',source:rows.length?'staff_record':'none'};
}
function validateSocial(key,value) {
  if(!value)return '';
  let url;try{url=new URL(value);}catch{throw Error('Đường dẫn mạng xã hội không hợp lệ');}
  const hosts={zaloUrl:['zalo.me','oa.zalo.me'],facebookUrl:['facebook.com','www.facebook.com','m.facebook.com'],messengerUrl:['m.me','www.messenger.com','messenger.com'],tiktokUrl:['tiktok.com','www.tiktok.com']};
  if(url.protocol!=='https:'||url.username||url.password||url.port||!hosts[key]?.includes(url.hostname))throw Error('Đường dẫn phải là HTTPS của đúng mạng xã hội');
  return url.href;
}
module.exports={initializeCommerce,paymentSummary,validateSocial};
