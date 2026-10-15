'use strict';
const crypto=require('node:crypto');
function initializeReviews(db,{accounts,json,body,fail,text,rate}){
 db.exec(`CREATE TABLE IF NOT EXISTS product_reviews(id TEXT PRIMARY KEY,product_id INTEGER NOT NULL REFERENCES products(id),customer_id TEXT NOT NULL REFERENCES customers(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),comment TEXT NOT NULL,reply TEXT NOT NULL DEFAULT '',visible INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,UNIQUE(product_id,customer_id));`);
 const eligible=(id,customer)=>db.prepare("SELECT items FROM orders WHERE customer_id=? AND status='delivered'").all(customer).some(o=>JSON.parse(o.items).some(i=>i.id===id));
 const publicReview=r=>({id:r.id,rating:r.rating,comment:r.comment,reply:r.reply,created_at:r.created_at,name:(r.name||'Khách hàng').trim().split(/\s+/).at(-1),verifiedPurchase:true});
 async function handle(req,res,url){
  const match=url.pathname.match(/^\/api\/reviews\/(\d+)$/);if(!match)return false;const id=Number(match[1]);
  if(!db.prepare('SELECT 1 FROM products WHERE id=? AND published=1').get(id))fail(404,'Không tìm thấy xe');
  const customer=accounts.current(req);
  if(req.method==='GET'){
   const list=db.prepare('SELECT r.*,c.name FROM product_reviews r JOIN customers c ON c.id=r.customer_id WHERE product_id=? AND visible=1 ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?').all(id,Math.max(0,Math.min(100000,Number.parseInt(url.searchParams.get('offset'))||0)));
   const summary=db.prepare('SELECT COUNT(*) count,AVG(rating) average FROM product_reviews WHERE product_id=? AND visible=1').get(id);
   json(res,200,{...summary,average:summary.average||0,reviews:list.map(publicReview),loggedIn:!!customer,eligible:!!customer&&eligible(id,customer.customer_id),alreadyReviewed:!!customer&&!!db.prepare('SELECT 1 FROM product_reviews WHERE product_id=? AND customer_id=?').get(id,customer.customer_id)});return true;
  }
  if(req.method==='POST'){
   if(!customer)fail(401,'Vui lòng đăng nhập để đánh giá');if(req.headers['x-customer-csrf']!==customer.csrf)fail(403,'Phiên yêu cầu không hợp lệ');rate(req,'reviews',10);
   if(!eligible(id,customer.customer_id))fail(403,'Chỉ tài khoản có đơn đã giao của mẫu xe này được đánh giá');const b=await body(req);if(!Number.isInteger(b.rating)||b.rating<1||b.rating>5)fail(400,'Chọn từ 1 đến 5 sao');const comment=text(b.comment,10,1500,'Nội dung đánh giá (10–1500 ký tự)');
   if(db.prepare('SELECT 1 FROM product_reviews WHERE product_id=? AND customer_id=?').get(id,customer.customer_id))fail(409,'Bạn đã đánh giá mẫu xe này');
   db.prepare('INSERT INTO product_reviews(id,product_id,customer_id,rating,comment,created_at) VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),id,customer.customer_id,b.rating,comment,new Date().toISOString());json(res,201,{ok:true});return true;
  }fail(405,'Phương thức không hỗ trợ');
 }
 function listAdmin(){return db.prepare('SELECT r.*,c.name,p.brand,p.name product_name FROM product_reviews r JOIN customers c ON c.id=r.customer_id JOIN products p ON p.id=r.product_id ORDER BY created_at DESC LIMIT 300').all();}
 function moderate(b){const id=text(b.id,1,80,'Mã đánh giá');if(typeof b.visible!=='boolean')fail(400,'Trạng thái hiển thị không hợp lệ');const reply=text(b.reply||'',0,1500,'Phản hồi');if(!db.prepare('UPDATE product_reviews SET reply=?,visible=? WHERE id=?').run(reply,b.visible?1:0,id).changes)fail(404,'Không tìm thấy đánh giá');return{ok:true};}
 return{handle,listAdmin,moderate};
}
module.exports={initializeReviews};
