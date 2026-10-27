'use strict';
const crypto=require('node:crypto');
const MARKER='DucTuWeb:export:v1:import-products';
const HEADERS=['Mã xe','Hãng','Tên xe','Danh mục','Giá bán (VND)','Giá so sánh (VND)','Tồn kho','Hiển thị','Mô tả','Ghi chú giá','Mốc dữ liệu (không sửa)','Hành động'];
const FIELDS=['brand','name','category','price','compare_price','stock','published','description','price_note'];
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fingerprint=p=>digest([p.id,...FIELDS.map(k=>p[k]??null)]);
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
function inputView(db){return {title:'Nhap_SanPham',key:'import-products',preserveExisting:true,values:[[MARKER,'Sửa dòng cần đổi, đặt Hành động = Cập nhật; sau đó vào admin xem trước và áp dụng.'],HEADERS,...db.prepare('SELECT * FROM products ORDER BY id').all().map(p=>[p.id,p.brand,p.name,p.category,p.price,p.compare_price??'',p.stock??'',p.published?'Đang bán':'Ẩn',p.description,p.price_note,fingerprint(p),'Giữ nguyên'])]};}
function parseInput(rows,db){
 if(rows?.[0]?.[0]!==MARKER||HEADERS.some((h,i)=>rows[1]?.[i]!==h))fail(422,'Bảng Nhap_SanPham sai tiêu đề. Tạo lại bảng nhập từ admin.');
 if(rows.length>1002)fail(422,'Bảng nhập tối đa 1000 sản phẩm.');
 const result=[],seen=new Set();
 const text=(v,min,max,label,row)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max||v.startsWith('='))fail(422,`Dòng ${row}: ${label} không hợp lệ.`);return v.trim();};
 const integer=(v,min,max,label,row,nullable=false)=>{if(nullable&&(v===''||v===undefined||v===null))return null;const n=typeof v==='number'?v:typeof v==='string'&&/^\d+$/.test(v)?Number(v):NaN;if(!Number.isSafeInteger(n)||n<min||n>max)fail(422,`Dòng ${row}: ${label} phải là số nguyên ${min}–${max}, không dùng dấu phân cách hoặc công thức.`);return n;};
 for(let i=2;i<rows.length;i++){const r=rows[i];if(!Array.isArray(r)||r.every(x=>x===''||x===null))continue;const action=r[11]||'Giữ nguyên';if(!['Giữ nguyên','Cập nhật'].includes(action))fail(422,`Dòng ${i+1}: Hành động chỉ nhận Giữ nguyên hoặc Cập nhật.`);if(action!=='Cập nhật')continue;
  const line=i+1,id=integer(r[0],1,2147483647,'mã xe',line);if(seen.has(id))fail(422,`Dòng ${line}: mã xe bị trùng.`);seen.add(id);
  const old=db.prepare('SELECT * FROM products WHERE id=?').get(id);if(!old)fail(422,`Dòng ${line}: mã xe không tồn tại. Tính năng này chỉ sửa xe có sẵn.`);
  const next={brand:text(r[1],1,40,'hãng',line),name:text(r[2],1,100,'tên xe',line),category:text(r[3],1,30,'danh mục',line),price:integer(r[4],0,1000000000,'giá bán',line),compare_price:integer(r[5],0,1000000000,'giá so sánh',line,true),stock:integer(r[6],0,10000,'tồn kho',line,true),description:text(r[8]??'',0,3000,'mô tả',line),price_note:text(r[9]??'',0,300,'ghi chú giá',line)};
  if(!['city','sport','compact','accessory'].includes(next.category))fail(422,`Dòng ${line}: danh mục phải là city, sport, compact hoặc accessory.`);
  if(!['Đang bán','Ẩn'].includes(r[7]))fail(422,`Dòng ${line}: hiển thị phải là Đang bán hoặc Ẩn.`);next.published=r[7]==='Đang bán'?1:0;
  const changes=FIELDS.filter(k=>old[k]!==next[k]);if(!changes.length)continue;
  if(r[10]!==fingerprint(old))fail(409,`Dòng ${line}: xe đã đổi trong admin hoặc tồn kho đã thay đổi. Tạo lại bảng nhập và nhập lại thay đổi.`);
  result.push({id,baseline:fingerprint(old),next,changes:changes.map(field=>({field,before:old[field],after:next[field]}))});
 }
 if(result.length>200)fail(422,'Mỗi lần áp dụng tối đa 200 xe.');return result;
}
function createImporter({db,read,onChanged=()=>{},now=Date.now}){
 const previews=new Map();
 const clean=()=>{for(const [token,p] of previews)if(p.expires<now())previews.delete(token);};
 return {
  async preview(owner){clean();if(previews.size>=20)fail(429,'Có quá nhiều bản xem trước. Thử lại sau 10 phút.');const rows=await read();const plan=parseInput(rows,db);const token=crypto.randomBytes(24).toString('hex');previews.set(token,{owner,source:digest(rows),plan,expires:now()+600000,applied:false});return {token,count:plan.length,changes:plan.map(p=>({id:p.id,name:p.next.name,fields:p.changes}))};},
  async apply(owner,token){clean();const p=previews.get(token);if(!p||p.owner!==owner)fail(409,'Bản xem trước hết hạn hoặc không thuộc phiên này. Hãy xem trước lại.');if(p.applied)return {updated:p.plan.length,repeated:true};
   if(digest(await read())!==p.source)fail(409,'Sheet đã thay đổi sau bước xem trước. Hãy xem trước lại.');
   db.exec('BEGIN IMMEDIATE');try{
    for(const item of p.plan){const current=db.prepare('SELECT * FROM products WHERE id=?').get(item.id);if(!current||fingerprint(current)!==item.baseline)fail(409,'Sản phẩm/tồn kho đã thay đổi sau xem trước. Không áp dụng; hãy xem trước lại.');}
    for(const item of p.plan){const before=db.prepare('SELECT * FROM products WHERE id=?').get(item.id);db.prepare('UPDATE products SET brand=?,name=?,category=?,price=?,compare_price=?,stock=?,published=?,description=?,price_note=? WHERE id=?').run(...FIELDS.map(k=>item.next[k]),item.id);onChanged(before,db.prepare('SELECT * FROM products WHERE id=?').get(item.id));}
    db.exec('COMMIT');p.applied=true;return {updated:p.plan.length};
   }catch(error){db.exec('ROLLBACK');throw error;}
  }
 };
}
module.exports={inputView,parseInput,createImporter,fingerprint,HEADERS,MARKER};
