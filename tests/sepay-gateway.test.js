'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createGateway}=require('../sepay-gateway');
const config={merchantId:'SP-TEST-example',secretKey:'test-secret-not-real',siteUrl:'https://store.example'};
test('checkout uses sandbox, signs SDK field order and never returns the secret',()=>{
 const result=createGateway(config).checkout({invoiceNumber:'DT_123',amount:10000});
 assert.equal(result.url,'https://pay-sandbox.sepay.vn/v1/checkout/init');
 const canonical='payment_method=BANK_TRANSFER,order_invoice_number=DT_123,order_amount=10000,currency=VND,order_description=Thanh toan don hang DT_123,success_url=https://store.example/thanh-toan/ket-qua?invoice=DT_123,error_url=https://store.example/thanh-toan/ket-qua?invoice=DT_123,cancel_url=https://store.example/thanh-toan/ket-qua?invoice=DT_123,merchant=SP-TEST-example,operation=PURCHASE';
 assert.equal(result.fields.signature,crypto.createHmac('sha256',config.secretKey).update(canonical).digest('base64'));
 assert.ok(!JSON.stringify(result).includes(config.secretKey));
 assert.equal(result.fields.expires_at,undefined); // No undocumented expiry parameter.
});
test('rejects mismatched environments, unsafe origins, amounts and invoice paths',()=>{
 for(const patch of [{env:'production'},{env:'wrong'},{siteUrl:'http://store.example'},{siteUrl:'https://user:pass@store.example'},{siteUrl:'https://store.example/path'}])assert.throws(()=>createGateway({...config,...patch}));
 const gateway=createGateway(config);
 for(const amount of [0,-1,1.1,'10000',Infinity,1000000001])assert.throws(()=>gateway.checkout({invoiceNumber:'DT_123',amount}));
 assert.throws(()=>gateway.checkout({invoiceNumber:'../other',amount:10000}));
});
test('lookup and cancellation use authenticated API and cancellation is not assumed successful',async()=>{
 const calls=[];
 const gateway=createGateway({...config,fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({received:true})};}});
 await gateway.retrieve('DT_123');await gateway.cancel('DT_123');
 assert.equal(calls[0].url,'https://pgapi-sandbox.sepay.vn/v1/order/detail/DT_123');
 assert.equal(calls[1].options.method,'POST');
 assert.deepEqual(JSON.parse(calls[1].options.body),{order_invoice_number:'DT_123'});
 assert.equal(calls[1].options.redirect,'error');
 assert.equal(calls[1].options.headers.Authorization,'Basic '+Buffer.from(config.merchantId+':'+config.secretKey).toString('base64'));
 const rejected=createGateway({...config,fetchImpl:async()=>({ok:false,status:503})});
 await assert.rejects(rejected.cancel('DT_123'),/rejected/);
 const unavailable=createGateway({...config,fetchImpl:async()=>{throw Error(config.secretKey);}});
 await assert.rejects(unavailable.cancel('DT_123'),error=>!error.message.includes(config.secretKey));
});
