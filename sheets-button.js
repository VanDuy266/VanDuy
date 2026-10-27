'use strict';
const crypto=require('node:crypto');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const canonical=b=>['products.update',String(b.timestamp),b.nonce,b.sheetId].join('\n');
function createSheetButtonVerifier({secret,sheetId,now=Date.now}){
 const used=new Map();
 return (body,signature)=>{
  if(!secret||secret.length<32||!sheetId)fail(503,'Chưa cấu hình SHEETS_UPDATE_TOKEN cho nút Google Sheets.');
  if(!body||body.action!=='products.update'||!Number.isSafeInteger(body.timestamp)||typeof body.nonce!=='string'||!/^\w{32}$/.test(body.nonce)||body.sheetId!==sheetId||Math.abs(now()-body.timestamp)>300000)fail(401,'Yêu cầu Sheet không hợp lệ hoặc hết hạn.');
  if(typeof signature!=='string'||!/^\w{64}$/.test(signature))fail(401,'Chữ ký Sheet không hợp lệ.');
  const expected=crypto.createHmac('sha256',secret).update(canonical(body)).digest('hex');
  if(!crypto.timingSafeEqual(Buffer.from(signature,'utf8'),Buffer.from(expected,'utf8')))fail(401,'Chữ ký Sheet không hợp lệ.');
  for(const [key,until] of used)if(until<now())used.delete(key);
  if(used.has(body.nonce))fail(409,'Yêu cầu đã được nhận. Kiểm tra kết quả trước khi bấm lại.');used.set(body.nonce,now()+600000);
 };
}
module.exports={canonical,createSheetButtonVerifier};
