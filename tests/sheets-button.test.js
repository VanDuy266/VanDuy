'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {canonical,createSheetButtonVerifier}=require('../sheets-button');
const secret='test-sheet-button-secret-at-least-32-chars';
const payload=()=>({action:'products.update',timestamp:1000000,nonce:crypto.randomBytes(16).toString('hex'),sheetId:'test-sheet'});
const sign=b=>crypto.createHmac('sha256',secret).update(canonical(b)).digest('hex');
test('Sheet update signatures verify exact action, sheet and freshness; same nonce is accepted once',()=>{
 const verify=createSheetButtonVerifier({secret,sheetId:'test-sheet',now:()=>1000000});const b=payload();verify(b,sign(b));assert.throws(()=>verify(b,sign(b)),e=>e.status===409);
 for(const bad of [{...payload(),action:'admin.login'},{...payload(),sheetId:'wrong-sheet'},{...payload(),timestamp:1}])assert.throws(()=>verify(bad,sign(bad)),e=>e.status===401);
 const changed=payload(),signature=sign(changed);changed.timestamp++;assert.throws(()=>verify(changed,signature),e=>e.status===401);
 assert.throws(()=>verify(payload(),'bad'),e=>e.status===401);
});
test('missing button secret fails closed without enabling a public update endpoint',()=>{
 const verify=createSheetButtonVerifier({sheetId:'test-sheet',now:()=>1000000});assert.throws(()=>verify(payload(),'signature'),e=>e.status===503);
});
test('Apps Script signed byte conversion matches the server HMAC',()=>{
 const b=payload(),bytes=[...crypto.createHmac('sha256',secret).update(canonical(b)).digest()].map(n=>n>127?n-256:n);assert.equal(bytes.map(n=>('0'+((n+256)%256).toString(16)).slice(-2)).join(''),sign(b));
});
