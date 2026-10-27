'use strict';
// EMVCo/NAPAS account-transfer payload; QR generation never confirms a bank transaction.
const {paymentSummary}=require('./commerce');
const DEFAULT_BANK={bankName:'Techcombank',bankBin:'970407',bankAccount:'2606050708',bankAccountName:'NGUYEN VAN DUY',bankTransferEnabled:true};
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
function bankConfig(store){if(store.bankTransferEnabled!==true)return null;const bank={bankName:store.bankName,bankBin:store.bankBin,bankAccount:store.bankAccount,bankAccountName:store.bankAccountName};if(typeof bank.bankName!=='string'||!bank.bankName.trim()||bank.bankName.length>80||!/^\d{6}$/.test(bank.bankBin)||!/^\d{6,19}$/.test(bank.bankAccount)||typeof bank.bankAccountName!=='string'||!bank.bankAccountName.trim()||bank.bankAccountName.length>64)return null;return bank;}
function crc16(value){let crc=0xffff;for(const byte of Buffer.from(value,'utf8')){crc^=byte<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}return crc.toString(16).toUpperCase().padStart(4,'0');}
function field(id,value){value=String(value);const length=Buffer.byteLength(value,'utf8');if(length>99)fail(400,'Trường QR quá dài.');return id+String(length).padStart(2,'0')+value;}
function payload({bankBin,bankAccount,amount,memo}){
 if(!/^\d{6}$/.test(bankBin)||!/^\d{6,19}$/.test(bankAccount)||!Number.isSafeInteger(amount)||amount<1||amount>1000000000000||typeof memo!=='string'||!/^[A-Za-z0-9 -]{1,50}$/.test(memo))fail(400,'Thông tin QR không hợp lệ.');
 const consumer=field('00',bankBin)+field('01',bankAccount),provider=field('00','A000000727')+field('01',consumer)+field('02','QRIBFTTA');
 const base=field('00','01')+field('01','12')+field('38',provider)+field('53','704')+field('54',amount)+field('58','VN')+field('62',field('08',memo))+'6304';return base+crc16(base);
}
function transferFor(db,store,id,phone,purpose='remaining',now=Date.now()){
 const bank=bankConfig(store);if(!bank)fail(503,'Cửa hàng chưa bật thông tin QR chuyển khoản hợp lệ.');
 const order=db.prepare('SELECT * FROM orders WHERE id=? AND phone=?').get(id,phone);if(!order)fail(404,'Không tìm thấy đơn với mã và số điện thoại này.');
 if(!['confirmed','delivered'].includes(order.status)||order.cancellation_requested)fail(409,'Chỉ tạo QR sau khi cửa hàng xác nhận đơn và đơn không chờ hủy.');
 if(!['remaining','deposit'].includes(purpose))fail(400,'Loại khoản chuyển không hợp lệ.');const summary=paymentSummary(db,order);
 let amount=summary.remaining;if(purpose==='deposit'){if(!Number.isSafeInteger(order.deposit_due)||order.deposit_due<=0)fail(409,'Đơn này chưa có mức cọc được xác nhận.');amount=Math.min(summary.remaining,Math.max(0,order.deposit_due-summary.received));}
 if(db.prepare("SELECT 1 FROM bank_payment_events e JOIN bank_transfer_intents i ON i.id=e.intent_id WHERE i.order_id=? AND e.status='review' AND e.account_number=i.bank_account").get(order.id))fail(409,'Đơn có giao dịch đang chờ đối soát. Liên hệ cửa hàng trước khi chuyển thêm tiền.');
 if(amount<=0)fail(409,'Khoản tiền này đã được cửa hàng ghi nhận đủ.');
 const intent=require('./bank-transfers').getIntent(db,order,bank,amount,purpose,now);const memo=intent.id,content=payload({...bank,amount,memo});const qr=require('./vendor/qrcode')(0,'M');qr.addData(content);qr.make();
 return {orderId:order.id,...bank,amount,currency:'VND',memo,purpose,qrPayload:content,qrSvg:qr.createSvgTag({cellSize:5,margin:24,scalable:true}),payment:summary,intentId:intent.id,expiryScope:'website_only',expiresAt:new Date(intent.expires_at).toISOString(),expiresInSeconds:Math.max(0,Math.ceil((intent.expires_at-now)/1000)),confirmation:process.env.SEPAY_WEBHOOK_KEY?'bank_webhook_pending':'manual_reconciliation',generatedAt:new Date(now).toISOString()};
}
module.exports={DEFAULT_BANK,bankConfig,crc16,payload,transferFor};
