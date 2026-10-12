let products=[];
let store={acceptingOrders:false};
const escapeHtml=value=>String(value).replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\'":"&#39;"}[c]));
const money = value => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(value);
let cart = {};
try {const saved=JSON.parse(localStorage.getItem('volt-cart')||'{}');if(saved&&typeof saved==='object')for(const [id,qty] of Object.entries(saved)){if(/^\d+$/.test(id)&&Number.isInteger(qty)&&qty>0&&qty<=10)cart[id]=qty;}} catch {}
let brand='all',toastTimer;
const grid=document.querySelector('#product-grid');
function renderProducts(){
  const query=document.querySelector('#search').value.trim().toLocaleLowerCase('vi');
  const filtered=products.filter(p=>(brand==='all'||p.brand===brand)&&`${escapeHtml(p.brand)} ${escapeHtml(p.name)}`.toLocaleLowerCase('vi').includes(query));
  const sort=document.querySelector('#sort').value;
  if(sort!=='featured')filtered.sort((a,b)=>sort==='asc'?a.price-b.price:b.price-a.price);
  grid.innerHTML=filtered.map(p=>`<article class="product-card"><div class="product-image"><span class="badge">${escapeHtml(p.badge)}</span><img src="${escapeHtml(p.image||'assets/scooter.svg')}" alt="${p.image?'':'Minh họa '}${escapeHtml(p.brand)} ${escapeHtml(p.name)}" style="filter:hue-rotate(${p.image?0:p.hue}deg)"></div><div class="product-info"><span class="product-brand">${escapeHtml(p.brand)}</span><h3>${escapeHtml(p.name)}</h3><div class="specs"><span>↗ ${p.range} km / lần sạc</span><span>◷ ${p.speed} km/h</span></div><div class="price-row"><div><small>GIÁ SẢN PHẨM</small><strong>${money(p.price)}</strong></div><button class="add-cart" data-add="${p.id}" aria-label="Thêm ${escapeHtml(p.name)} vào giỏ hàng">+</button></div></div></article>`).join('')||'<p class="empty">'+(products.length?'Không tìm thấy xe phù hợp. Hãy thử tên xe khác.':'Danh mục đang được cập nhật. Vui lòng quay lại sau.')+'</p>';
  document.querySelector('#result-count').textContent=`${filtered.length} mẫu xe`;
}
function renderCart(){
  let total=0,count=0;
  document.querySelector('#cart-items').innerHTML=products.filter(p=>cart[p.id]).map(p=>{count+=cart[p.id];total+=cart[p.id]*p.price;return `<div class="cart-line"><div><strong>${escapeHtml(p.brand)} ${escapeHtml(p.name)}</strong><p>${money(p.price)}</p></div><div class="quantity"><button data-qty="${p.id}" data-delta="-1" aria-label="Giảm số lượng ${escapeHtml(p.name)}">−</button><span>${cart[p.id]}</span><button data-qty="${p.id}" data-delta="1" aria-label="Tăng số lượng ${escapeHtml(p.name)}">+</button></div></div>`;}).join('')||'<p class="empty">Giỏ hàng đang trống. Khám phá chiếc xe bạn thích nhé.</p>';
  document.querySelector('#cart-count').textContent=count;
  document.querySelector('#cart-total').textContent=money(total);
  document.querySelector('#cart-contact').disabled=!count||!store.acceptingOrders;
  try{localStorage.setItem('volt-cart',JSON.stringify(cart));}catch{}
}
document.querySelector('#brands').addEventListener('click',event=>{const button=event.target.closest('[data-brand]');if(!button)return;brand=button.dataset.brand;document.querySelectorAll('[data-brand]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});renderProducts();});
document.querySelector('#search').addEventListener('input',renderProducts);
document.querySelector('#sort').addEventListener('change',renderProducts);
grid.addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(!button)return;const id=button.dataset.add;orderKey=crypto.randomUUID();cart[id]=Math.min(10,(cart[id]||0)+1);renderCart();const toast=document.querySelector('#toast');toast.textContent='Đã thêm xe vào giỏ hàng';toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2500);});
const dialog=document.querySelector('#cart-dialog');
document.querySelector('#cart-toggle').addEventListener('click',()=>dialog.showModal());
document.querySelector('#cart-close').addEventListener('click',()=>dialog.close());
document.querySelector('#cart-items').addEventListener('click',event=>{const button=event.target.closest('[data-qty]');if(!button)return;const id=button.dataset.qty;orderKey=crypto.randomUUID();cart[id]=Math.min(10,cart[id]+Number(button.dataset.delta));if(cart[id]<=0)delete cart[id];renderCart();});
let orderKey=crypto.randomUUID();
async function api(url,data,key){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||'Không thể gửi yêu cầu');return result;}
document.querySelector('#order-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=document.querySelector('#order-status');const data=Object.fromEntries(new FormData(form));data.items=Object.entries(cart).map(([id,quantity])=>({id:Number(id),quantity,expectedPrice:products.find(p=>p.id===Number(id))?.price}));button.disabled=true;status.textContent='Đang gửi yêu cầu…';try{const result=await api('/api/orders',data,orderKey);cart={};renderCart();orderKey=crypto.randomUUID();form.reset();status.textContent=`Đã nhận yêu cầu ${result.id}. Cửa hàng sẽ liên hệ xác nhận. Chưa thu tiền.`;}catch(error){status.textContent=error.message;}finally{button.disabled=!Object.keys(cart).length||!store.acceptingOrders;}});
document.querySelector('#contact-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=document.querySelector('#form-status');button.disabled=true;status.textContent='Đang gửi…';try{await api('/api/consultations',Object.fromEntries(new FormData(form)));status.textContent='Cửa hàng đã nhận yêu cầu tư vấn. Chúng tôi sẽ liên hệ với bạn.';form.reset();}catch(error){status.textContent=error.message;}finally{button.disabled=!store.acceptingOrders;}});
async function load(){try{const responses=await Promise.all([fetch('/api/products'),fetch('/api/store')]);if(responses.some(r=>!r.ok))throw Error('Không thể tải danh mục');[products,store]=await Promise.all(responses.map(r=>r.json()));for(const id of Object.keys(cart))if(!products.some(p=>p.id===Number(id)))delete cart[id];document.title=store.name+' — Xe máy điện';document.querySelector('#store-contact').textContent=[store.phone,store.address].filter(Boolean).join(' · ');document.querySelector('#contact-form button').disabled=!store.acceptingOrders;if(!store.acceptingOrders)document.querySelector('#form-status').textContent='Cửa hàng đang hoàn thiện thông tin, chưa nhận yêu cầu.';renderProducts();renderCart();}catch(error){grid.textContent='Không thể tải danh mục. Vui lòng tải lại trang.';document.querySelector('#contact-form button').disabled=true;}}
load();
