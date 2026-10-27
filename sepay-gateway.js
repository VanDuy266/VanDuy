'use strict';
// Gateway preparation only: not wired to the storefront until IPN and expiry are verified.
const crypto = require('node:crypto');
const SIGNED_FIELDS = new Set(['merchant','env','operation','payment_method','order_amount','currency','order_invoice_number','order_description','customer_id','agreement_id','agreement_name','agreement_type','agreement_payment_frequency','agreement_amount_per_payment','success_url','error_url','cancel_url','order_id']);
function createGateway({env='sandbox',merchantId,secretKey,siteUrl,fetchImpl=fetch}={}) {
  if(!['sandbox','production'].includes(env)) throw Error('Invalid SePay environment');
  if(typeof merchantId!=='string'||!merchantId.trim()||typeof secretKey!=='string'||!secretKey.trim()) throw Error('SePay credentials required');
  if((env==='sandbox')!==merchantId.startsWith('SP-TEST-')) throw Error('SePay merchant environment mismatch');
  const site=new URL(siteUrl);
  if(site.protocol!=='https:'||site.username||site.password||site.search||site.hash||site.pathname!=='/') throw Error('HTTPS site origin required');
  const api=env==='sandbox'?'https://pgapi-sandbox.sepay.vn/v1':'https://pgapi.sepay.vn/v1';
  const checkoutURL=env==='sandbox'?'https://pay-sandbox.sepay.vn/v1/checkout/init':'https://pay.sepay.vn/v1/checkout/init';
  function invoice(value) {if(typeof value!=='string'||! /^[A-Za-z0-9_-]{1,80}$/.test(value))throw Error('Invalid invoice');return value;}
  function checkout({invoiceNumber,amount}) {
    invoice(invoiceNumber);
    if(!Number.isSafeInteger(amount)||amount<=0||amount>1000000000)throw Error('Invalid payment amount');
    // Preserve insertion order: the official SDK signs fields in this order.
    const fields={payment_method:'BANK_TRANSFER',order_invoice_number:invoiceNumber,order_amount:amount,currency:'VND',order_description:'Thanh toan don hang '+invoiceNumber,success_url:site.origin+'/tai-khoan?payment=return',error_url:site.origin+'/tai-khoan?payment=error',cancel_url:site.origin+'/tai-khoan?payment=cancel',merchant:merchantId,operation:'PURCHASE'};
    const message=Object.keys(fields).filter(key=>SIGNED_FIELDS.has(key)&&fields[key]!==undefined).map(key=>key+'='+(fields[key]??'')).join(',');
    return {url:checkoutURL,fields:{...fields,signature:crypto.createHmac('sha256',secretKey).update(message).digest('base64')}};
  }
  async function request(path,method='GET',data) {
    let response;
    try {response=await fetchImpl(api+path,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(merchantId+':'+secretKey).toString('base64')},...(data?{body:JSON.stringify(data)}:{})});}
    catch {throw Error('SePay request failed');}
    if(!response.ok)throw Error('SePay request rejected ('+response.status+')');
    try{return await response.json();}catch{throw Error('Invalid SePay response');}
  }
  return {checkout,retrieve:number=>request('/order/detail/'+invoice(number)),cancel:number=>request('/order/cancel','POST',{order_invoice_number:invoice(number)})};
}
module.exports={createGateway};
