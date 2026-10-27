'use strict';
const VIEW_MARKER='DucTuWeb:export:v1:';
const parse=value=>{try{return JSON.parse(value||'[]');}catch{return [];}};
function readableViews(db){
 const products=db.prepare('SELECT id,brand,name,category,price,compare_price,stock,published,image,gallery,description,price_note FROM products ORDER BY id').all();
 const orders=db.prepare('SELECT id,name,phone,address,items,total,status,created_at,payment_plan,note FROM orders ORDER BY created_at DESC,id').all();
 const consultations=db.prepare('SELECT id,name,phone,kind,product_id,months,down_payment,note,status,created_at,internal_note FROM consultations ORDER BY created_at DESC,id').all();
 const replyRows=db.prepare('SELECT consultation_id,message,created_at FROM consultation_replies ORDER BY created_at,id').all();
 const replies=new Map();for(const r of replyRows){if(!replies.has(r.consultation_id))replies.set(r.consultation_id,[]);replies.get(r.consultation_id).push(r.created_at+': '+r.message);}
 const settings=JSON.parse(db.prepare('SELECT value FROM settings WHERE id=1').get()?.value||'{}');
 const view=(key,title,headers,rows)=>({title,key,values:[[VIEW_MARKER+key,'Tự cập nhật từ website. Sửa dữ liệu trong trang admin, không sửa các ô này.'],headers,...rows]});
 return [
  view('products','Web_SanPham',['Mã xe','Hãng','Tên xe','Danh mục','Giá bán (VND)','Giá so sánh (VND)','Tồn kho','Hiển thị','Ảnh chính','Bộ ảnh','Mô tả','Ghi chú giá'],products.map(p=>[p.id,p.brand,p.name,p.category,p.price,p.compare_price??'',p.stock??'Chưa cập nhật',p.published===1?'Đang bán':'Ẩn',p.image,parse(p.gallery).join('\n'),p.description,p.price_note])),
  view('orders','Web_DonHang',['Mã đơn','Khách hàng','Điện thoại','Địa chỉ','Sản phẩm','Tổng tiền (VND)','Trạng thái','Ngày tạo','Phương án thanh toán','Ghi chú'],orders.map(o=>[o.id,o.name,o.phone,o.address,parse(o.items).map(i=>`${i.quantity} × ${i.name}${i.color?' · '+i.color:''} — ${i.price} VND`).join('\n'),o.total,o.status,o.created_at,o.payment_plan,o.note])),
  view('consultations','Web_TuVan',['Mã tư vấn','Khách hàng','Điện thoại','Loại tư vấn','Mã xe','Kỳ hạn (tháng)','Trả trước (VND)','Nội dung khách gửi','Trạng thái','Ngày tạo','Ghi chú nội bộ','Phản hồi cửa hàng'],consultations.map(c=>[c.id,c.name,c.phone,c.kind,c.product_id??'',c.months??'',c.down_payment??'',c.note,c.status,c.created_at,c.internal_note,(replies.get(c.id)||[]).join('\n')])),
  require('./sheets-import').inputView(db),
  view('settings','Web_CaiDat',['Mục cấu hình','Giá trị'],Object.entries(settings).filter(([key])=>['name','phone','secondaryPhone','address','email','legalName','registration','zaloUrl','facebookUrl','messengerUrl','tiktokUrl','depositAmount','depositPolicy','installmentPolicy','shipping','returns','warranty'].includes(key)).map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):v??'']))
 ];
}
module.exports={readableViews,VIEW_MARKER};
