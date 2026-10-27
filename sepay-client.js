'use strict';
(()=>{
 const allowed=new Set(['https://pay-sandbox.sepay.vn/v1/checkout/init','https://pay.sepay.vn/v1/checkout/init']);
 function submit(checkout){
  if(!allowed.has(checkout?.url)||!checkout.fields||typeof checkout.fields!=='object')throw Error('Thông tin cổng thanh toán không hợp lệ.');
  const form=document.createElement('form');form.method='POST';form.action=checkout.url;form.hidden=true;
  for(const [name,value]of Object.entries(checkout.fields)){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=String(value);form.append(input);}
  document.body.append(form);form.submit();
 }
 window.ducTuSePay={submit};
 let active=false,configLoaded=false,configFailed=false;
 function visibility(){document.querySelectorAll('[data-sepay-order]').forEach(button=>{button.hidden=!active;});document.querySelectorAll('[data-sepay-availability]').forEach(node=>{const message=active?'Mã QR sẽ mở trên cổng SePay. Chỉ chuyển tiền một lần và chờ đối soát.':configFailed?'Chưa tải được kết nối thanh toán. Vui lòng tải lại trang.':configLoaded?'Thanh toán QR hiện chưa khả dụng. Vui lòng chọn thanh toán khi nhận xe hoặc liên hệ Đức Tú.':'Đang kiểm tra kết nối thanh toán…';if(node.textContent!==message)node.textContent=message;});}
 if(document.querySelector('.shop-main')){
  fetch('/api/payments/config').then(r=>{if(!r.ok)throw Error('config');return r.json();}).then(c=>{active=c.onlineAvailable===true;configLoaded=true;visibility();}).catch(()=>{configFailed=true;visibility();});
  new MutationObserver(visibility).observe(document.querySelector('.shop-main'),{childList:true,subtree:true});
 }
 async function request(url,data){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||'Chưa xử lý được thanh toán');return result;}
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-sepay-order]');if(!button)return;button.disabled=true;
  const box=button.closest('[data-sepay-controls]'),status=box.querySelector('[role=status]');
  try{
   const phone=document.querySelector('#tracking-form')?.elements.phone.value;
   const result=await request('/api/payments/sepay/checkout',{id:button.dataset.sepayOrder,purpose:button.dataset.purpose||'balance',phone});
   try{sessionStorage.setItem('duc-tu-sepay-'+result.invoice,phone||'');}catch{}
   status.textContent='Đang chuyển đến SePay…';submit(result);
  }catch(error){status.textContent=error.message;button.disabled=false;}
 });
 const form=document.querySelector('#sepay-check-form');if(!form)return;
 const box=document.querySelector('#sepay-result'),invoice=new URLSearchParams(location.search).get('invoice');
 if(!/^DT[A-F0-9]{32}$/.test(invoice||'')){box.textContent='Thiếu mã phiên thanh toán hợp lệ. Vui lòng tra cứu đơn hàng.';form.hidden=true;return;}
 try{form.elements.phone.value=sessionStorage.getItem('duc-tu-sepay-'+invoice)||'';}catch{}
 const labels={paid:'SePay đã xác nhận thanh toán. Khoản thu đã được ghi nhận vào đơn hàng.',test_paid:'Thanh toán thử thành công. Đây là sandbox, không ghi nhận tiền thật.',pending:'Chưa có xác nhận thanh toán từ SePay. Bạn có thể kiểm tra lại; không chuyển tiền thêm.',review:'Đã nhận kết quả SePay nhưng đơn cần cửa hàng đối soát. Không chuyển thêm tiền.'};
 let checking=false;
 async function check(){if(checking)return;checking=true;const button=form.querySelector('button');button.disabled=true;box.textContent='Đang đối soát với SePay…';try{const result=await request('/api/payments/sepay/status',{invoice,phone:form.elements.phone.value||undefined});box.textContent=labels[result.status]||'Cần kiểm tra lại trạng thái thanh toán.';if(['paid','test_paid','review'].includes(result.status)){form.hidden=true;try{sessionStorage.removeItem('duc-tu-sepay-'+invoice);}catch{}}}catch(error){box.textContent=error.message+' Nhập số điện thoại đã đặt xe để kiểm tra.';}finally{checking=false;button.disabled=false;}}
 form.addEventListener('submit',event=>{event.preventDefault();check();});check();
})();
