'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {backup,DatabaseSync}=require('node:sqlite');
const MAX_COMPRESSED=1024*1024,MAX_DATABASE=32*1024*1024,CHUNK=30000;
function createGoogleTransport(env=process.env,fetcher=fetch){
 const id=env.GOOGLE_SHEET_ID,email=env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n');
 if(!id||!/^[A-Za-z0-9_-]+$/.test(id)||!email||!key)throw Error('Cần GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_PRIVATE_KEY để bật sao lưu Sheet.');
 let cached;
 async function json(url,options){let r;try{r=await fetcher(url,{...options,signal:AbortSignal.timeout(20000)});}catch{throw Error('Không kết nối được Google Sheets; chưa xác nhận lưu dữ liệu.');}if(!r.ok)throw Error('Google Sheets trả mã '+r.status+'. Kiểm tra quyền service account, API và hạn mức.');return r.json();}
 async function token(){if(cached&&cached.until>Date.now()+60000)return cached.value;const now=Math.floor(Date.now()/1000),encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});const signer=crypto.createSign('RSA-SHA256');signer.update(unsigned);const assertion=unsigned+'.'+signer.sign(key,'base64url');const r=await json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}).toString()});if(!r.access_token)throw Error('Google không cấp access token.');cached={value:r.access_token,until:Date.now()+Number(r.expires_in||3600)*1000};return cached.value;}
 async function call(suffix,method='GET',body){return json('https://sheets.googleapis.com/v4/spreadsheets/'+id+suffix,{method,headers:{Authorization:'Bearer '+await token(),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
 return {
  async ensure(){const r=await call('?fields=sheets.properties');if(!r.sheets?.some(s=>s.properties?.title==='AppBackup')){if(env.GOOGLE_BACKUP_INITIALIZE!=='true')throw Error('Chưa có tab AppBackup. Chỉ bật GOOGLE_BACKUP_INITIALIZE=true trong lần thiết lập đầu tiên.');await call(':batchUpdate','POST',{requests:[{addSheet:{properties:{title:'AppBackup',gridProperties:{rowCount:1000,columnCount:2}}}}]});}},
  async read(){const r=await call('/values/'+encodeURIComponent('AppBackup!A:B'));return r.values||[];},
  async write(rows){const result=await call('/values/'+encodeURIComponent('AppBackup!A1:B'+rows.length)+'?valueInputOption=RAW','PUT',{majorDimension:'ROWS',values:rows});if(result.updatedRows!==rows.length)throw Error('Google chưa xác nhận đủ dòng sao lưu.');},
  async readProductInput(){const result=await call('/values/'+encodeURIComponent('Nhap_SanPham!A:L')+'?valueRenderOption=FORMULA');return result.values||[];},
  async writeViews(views){
   const {VIEW_MARKER}=require('./sheets-views');
   const metadata=await call('?fields=sheets.properties');const sheets=metadata.sheets||[];
   const existing=views.filter(v=>sheets.some(s=>s.properties.title===v.title));
   if(existing.length){const result=await call('/values:batchGet?'+existing.map(v=>'ranges='+encodeURIComponent("'"+v.title+"'!A1")).join('&'));for(let i=0;i<existing.length;i++)if(result.valueRanges?.[i]?.values?.[0]?.[0]!==VIEW_MARKER+existing[i].key)throw Error('Tab '+existing[i].title+' đã có dữ liệu khác; không ghi đè.');}
   const used=new Set(sheets.map(s=>s.properties.sheetId)),requests=[];
   for(const v of views){let properties=sheets.find(s=>s.properties.title===v.title)?.properties;if(properties&&v.preserveExisting)continue;const rowCount=Math.max(100,v.values.length+20),columnCount=Math.max(...v.values.map(r=>r.length));
    if(!properties){let sheetId;do{sheetId=crypto.randomInt(1,2147483647);}while(used.has(sheetId));used.add(sheetId);properties={sheetId,title:v.title,gridProperties:{rowCount,columnCount}};requests.push({addSheet:{properties}});}
    else if(properties.gridProperties.rowCount<rowCount||properties.gridProperties.columnCount<columnCount)requests.push({updateSheetProperties:{properties:{sheetId:properties.sheetId,gridProperties:{rowCount:Math.max(properties.gridProperties.rowCount,rowCount),columnCount:Math.max(properties.gridProperties.columnCount,columnCount)}},fields:'gridProperties.rowCount,gridProperties.columnCount'}});
    const rows=v.values.map(row=>({values:row.map(value=>({userEnteredValue:typeof value==='number'?{numberValue:value}:{stringValue:String(value??'')}}))}));
    // A full range clears stale trailing rows; stringValue never executes customer text as formulas.
    requests.push({updateCells:{range:{sheetId:properties.sheetId},rows,fields:'userEnteredValue'}});
   }
   if(!requests.length)return;const payload={requests};if(Buffer.byteLength(JSON.stringify(payload))>2*1024*1024)throw Error('Các bảng dễ đọc vượt 2 MB; cần kho dữ liệu lớn hơn.');await call(':batchUpdate','POST',payload);
  }
 };
}
function codec(secret){
 if(typeof secret!=='string'||secret.length<32)throw Error('SHEETS_BACKUP_KEY phải là chuỗi ngẫu nhiên ít nhất 32 ký tự. Giữ nguyên khóa để khôi phục dữ liệu.');
 const key=crypto.createHash('sha256').update(secret).digest();
 return {
  encode(bytes){if(bytes.length>MAX_DATABASE)throw Error('Database vượt giới hạn sao lưu Sheet 32 MB.');const packed=zlib.gzipSync(bytes);if(packed.length>MAX_COMPRESSED)throw Error('Bản sao lưu nén vượt 1 MB; cần chuyển sang kho dữ liệu phù hợp trước khi nhận thêm dữ liệu.');const nonce=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from('ductu-sheets-backup-v1'));const encrypted=Buffer.concat([cipher.update(packed),cipher.final()]);const base64=encrypted.toString('base64'),chunks=[];for(let i=0;i<base64.length;i+=CHUNK)chunks.push(base64.slice(i,i+CHUNK));return [['manifest',JSON.stringify({version:1,nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),count:chunks.length,sha256:crypto.createHash('sha256').update(encrypted).digest('hex'),createdAt:new Date().toISOString()})],...chunks.map((c,i)=>[String(i),c])];},
  decode(rows){if(!rows.length)return null;try{if(rows[0][0]!=='manifest')throw Error();const m=JSON.parse(rows[0][1]);if(m.version!==1||!Number.isInteger(m.count)||m.count<1||m.count>100)throw Error();const chunks=rows.slice(1,m.count+1);if(chunks.length!==m.count||chunks.some((r,i)=>r[0]!==String(i)||typeof r[1]!=='string'||r[1].length>CHUNK))throw Error();const encrypted=Buffer.from(chunks.map(r=>r[1]).join(''),'base64');if(crypto.createHash('sha256').update(encrypted).digest('hex')!==m.sha256)throw Error();const nonce=Buffer.from(m.nonce,'base64'),tag=Buffer.from(m.tag,'base64');if(nonce.length!==12||tag.length!==16)throw Error();const decipher=crypto.createDecipheriv('aes-256-gcm',key,nonce);decipher.setAAD(Buffer.from('ductu-sheets-backup-v1'));decipher.setAuthTag(tag);const bytes=zlib.gunzipSync(Buffer.concat([decipher.update(encrypted),decipher.final()]),{maxOutputLength:MAX_DATABASE});if(bytes.subarray(0,16).toString()!=='SQLite format 3\0')throw Error();return bytes;}catch{throw Error('Không đọc được bản sao lưu Sheet: kiểm tra SHEETS_BACKUP_KEY, không xóa hoặc sửa tab AppBackup.');}}
 };
}
function createPersistence({transport,secret,file,allowEmpty=false}){
 const coding=codec(secret);let pending=Promise.resolve(),lastChanges=-1,lastStatus={enabled:true,synced:false,lastSavedAt:null,error:null,viewsSynced:false,viewsUpdatedAt:null,viewsError:null};
 return {
  async restore(){await transport.ensure();const bytes=coding.decode(await transport.read());if(!bytes){if(!allowEmpty)throw Error('Không có bản sao lưu để khôi phục. Chỉ cho phép khởi tạo Sheet trống trong lần thiết lập đầu tiên.');return false;}fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.restore';try{fs.writeFileSync(temp,bytes,{mode:0o600});const check=new DatabaseSync(temp,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Bản SQLite không toàn vẹn.');}finally{check.close();}fs.renameSync(temp,file);for(const suffix of ['-wal','-shm'])fs.rmSync(file+suffix,{force:true});}finally{fs.rmSync(temp,{force:true});}return true;},
  flush(db){const run=async()=>{const changes=Number(db.prepare('SELECT total_changes() n').get().n);if(changes===lastChanges&&lastStatus.synced)return;const temp=file+'.backup-'+crypto.randomBytes(6).toString('hex');try{await backup(db,temp);const bytes=fs.readFileSync(temp);await transport.write(coding.encode(bytes));lastChanges=changes;lastStatus={...lastStatus,enabled:true,synced:true,lastSavedAt:new Date().toISOString(),error:null};
 if(transport.writeViews){let viewDb;try{viewDb=new DatabaseSync(temp,{readOnly:true});const views=require('./sheets-views').readableViews(viewDb);await transport.writeViews(views);lastStatus={...lastStatus,viewsSynced:true,viewsUpdatedAt:new Date().toISOString(),viewsError:null};}catch{lastStatus={...lastStatus,viewsSynced:false,viewsError:'Bản sao lưu đã lưu, nhưng bảng dễ đọc chưa cập nhật. Kiểm tra quyền, tên tab và hạn mức Google.'};}finally{viewDb?.close();}}}catch{lastStatus={...lastStatus,synced:false,error:'Sao lưu Google Sheets thất bại. Kiểm tra quyền, kết nối và dung lượng.'};throw Error(lastStatus.error);}finally{fs.rmSync(temp,{force:true});}};const result=pending.then(run,run);pending=result.catch(()=>{});return result;},
  readProductInput(){return transport.readProductInput();},
  async resetProductInput(db){const v=require('./sheets-import').inputView(db);await transport.writeViews([{...v,preserveExisting:false}]);},
  status(){return {...lastStatus};},
  attach(res,db){
   const persistence=this,originalEnd=res.end.bind(res),originalWrite=res.write.bind(res),originalHead=res.writeHead.bind(res),originalFlush=res.flushHeaders.bind(res);
   let head=null,streaming=false,ending=false;
   const commitHead=()=>{if(head){originalHead(...head);head=null;}};
   res.writeHead=function(...args){head=args;this.statusCode=args[0];return this;};
   res.write=function(...args){streaming=true;commitHead();return originalWrite(...args);};
   res.flushHeaders=function(){streaming=true;commitHead();return originalFlush();};
   res.end=function(...args){
    if(ending)return this;ending=true;
    if(streaming||this.headersSent){commitHead();return originalEnd(...args);}
    // Hold JSON and redirect headers as well as body until remote durability is confirmed.
    persistence.flush(db).then(()=>{if(!this.destroyed){commitHead();originalEnd(...args);}}).catch(()=>{
     if(this.destroyed)return;
     head=null;this.removeHeader('Set-Cookie');this.removeHeader('Location');this.removeHeader('Content-Length');
     originalHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
     originalEnd(JSON.stringify({error:'Chưa xác nhận được bản sao lưu Google Sheets. Không gửi lại đơn liên tục; kiểm tra mã đơn trước khi thử lại.'}));
    });return this;
   };
  }
 };
}
module.exports={createGoogleTransport,createPersistence,codec};
