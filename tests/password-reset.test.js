'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite'),{initializeAccounts}=require('../accounts');
test('reset mail token is private, expires, single-use, and revokes sessions',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE orders(id TEXT PRIMARY KEY)');let input={},sent=[];
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 const accounts=initializeAccounts(db,{origin:'https://shop.example',production:false,json:(r,status,data)=>{r.status=status;r.data=data;},body:async()=>input,fail,text:(v,min,max)=>{if(typeof v!=='string'||v.length<min||v.length>max)fail(400,'invalid');return v;},phone:()=>'',rate:()=>{},paymentSummary:()=>({}),resetMailer:async mail=>sent.push(mail)});
 async function call(route,data,headers={}){input=data;const res={headers:{},getHeader(k){return this.headers[k];},setHeader(k,v){this.headers[k]=v;}};await accounts.handle({method:'POST',headers},res,new URL('https://shop.example'+route));return res;}
 try{const registered=await call('/api/auth/register',{name:'Test customer',email:'buyer@example.invalid',password:'original-password',consent:true});assert.equal(registered.status,201);
 const known=await call('/api/auth/password-reset',{email:'buyer@example.invalid'}),unknown=await call('/api/auth/password-reset',{email:'unknown@example.invalid'});assert.deepEqual(known.data,unknown.data);assert.equal(sent.length,1);const token=new URL(sent[0].link).hash.slice(1);assert.equal(token.length,64);assert.equal(db.prepare('SELECT token_hash FROM password_resets').get().token_hash===token,false);assert.equal(JSON.stringify(known.data).includes(token),false);
 await call('/api/auth/password-reset/confirm',{token,password:'replacement-password'});assert.equal(db.prepare('SELECT COUNT(*) n FROM customer_sessions').get().n,0);
 await assert.rejects(call('/api/auth/password-reset/confirm',{token,password:'another-password'}),e=>e.status===400);
 await assert.rejects(call('/api/auth/login',{email:'buyer@example.invalid',password:'original-password'}),e=>e.status===401);
 assert.equal((await call('/api/auth/login',{email:'buyer@example.invalid',password:'replacement-password'})).status,200);
 await call('/api/auth/password-reset',{email:'buyer@example.invalid'});const expired=new URL(sent.at(-1).link).hash.slice(1);db.prepare('UPDATE password_resets SET expires=0').run();await assert.rejects(call('/api/auth/password-reset/confirm',{token:expired,password:'expired-password'}),e=>e.status===400);
 }finally{db.close();}
});
