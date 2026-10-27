'use strict';
(() => {
  const sidebar=document.querySelector('.admin-sidebar'),workspace=document.querySelector('.admin-workspace'),nav=document.querySelector('.admin-navigation'),topToggle=document.querySelector('#toggle-admin-menu');
  if(!sidebar||!workspace||!nav||!topToggle)return;
  sidebar.id='admin-sidebar';sidebar.setAttribute('aria-label','Menu quản trị');nav.setAttribute('aria-label','Điều hướng quản trị');
  const media=window.matchMedia('(max-width:700px)');let collapsed=false,mobileOpen=false,loggedIn=false;
  try{collapsed=localStorage.getItem('duc-tu-admin-menu')==='1';}catch{}
  const links=[...nav.querySelectorAll('a')];
  for(const link of links){
    const nodes=[...link.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE),label=nodes.map(n=>n.textContent).join(' ').trim();
    nodes.forEach(n=>n.remove());const text=document.createElement('span');text.className='admin-nav-label';text.textContent=label;link.append(text);
    link.firstElementChild?.classList.add('admin-nav-icon');link.dataset.label=label;link.title=label;link.setAttribute('aria-label',label);
    const badge=document.createElement('span');badge.className='admin-nav-badge';badge.hidden=true;badge.setAttribute('aria-hidden','true');link.append(badge);
  }
  const toggle=document.createElement('button');toggle.type='button';toggle.className='sidebar-toggle';toggle.innerHTML='<span aria-hidden="true">‹</span><span class="sidebar-toggle-label">Thu gọn menu</span>';sidebar.querySelector('.admin-identity').after(toggle);
  const search=document.createElement('div');search.className='sidebar-search';search.innerHTML='<label for="admin-nav-search">Tìm mục quản trị</label><input id="admin-nav-search" type="search" placeholder="Tìm mục quản trị…" autocomplete="off">';nav.before(search);
  const empty=document.createElement('p');empty.className='sidebar-search-empty';empty.textContent='Không tìm thấy mục phù hợp.';empty.hidden=true;nav.append(empty);
  const normal=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
  search.querySelector('input').addEventListener('input',event=>{const q=normal(event.target.value.trim());let visible=0;for(const link of links){link.hidden=!normal(link.dataset.label).includes(q);if(!link.hidden)visible++;}empty.hidden=visible>0;});
  const status=document.createElement('div');status.className='sidebar-connection';status.dataset.state='idle';status.innerHTML='<i aria-hidden="true"></i><span>Đăng nhập để cập nhật</span>';sidebar.querySelector('.sidebar-footer')?.before(status);
  const overlay=document.createElement('button');overlay.type='button';overlay.className='admin-sidebar-backdrop';overlay.setAttribute('aria-label','Đóng menu quản trị');overlay.hidden=true;sidebar.after(overlay);
  function render(){
    document.body.classList.toggle('admin-menu-collapsed',!media.matches&&collapsed);document.body.classList.toggle('admin-drawer-open',media.matches&&mobileOpen);
    const expanded=media.matches?mobileOpen:!collapsed;
    for(const button of [topToggle,toggle]){button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-controls',sidebar.id);button.setAttribute('aria-label',media.matches?(expanded?'Đóng menu quản trị':'Mở menu quản trị'):(expanded?'Thu gọn menu quản trị':'Mở rộng menu quản trị'));button.title=button.getAttribute('aria-label');}
    toggle.querySelector('.sidebar-toggle-label').textContent=media.matches?'Đóng menu':collapsed?'Mở rộng menu':'Thu gọn menu';toggle.firstElementChild.textContent=media.matches?'×':collapsed?'›':'‹';
    sidebar.inert=media.matches&&!mobileOpen;sidebar.setAttribute('aria-hidden',String(media.matches&&!mobileOpen));workspace.inert=media.matches&&mobileOpen;overlay.hidden=!(media.matches&&mobileOpen);
  }
  function setOpen(open,restore=false){mobileOpen=open;render();if(media.matches){if(open)toggle.focus();else if(restore)topToggle.focus();}}
  function toggleMenu(){if(media.matches)setOpen(!mobileOpen,true);else{collapsed=!collapsed;try{localStorage.setItem('duc-tu-admin-menu',collapsed?'1':'0');}catch{}render();}}
  topToggle.addEventListener('click',toggleMenu);toggle.addEventListener('click',toggleMenu);overlay.addEventListener('click',()=>setOpen(false,true));
  for(const link of [...links,...sidebar.querySelectorAll('.store-link,.admin-identity')])link.addEventListener('click',()=>{if(media.matches)setOpen(false);});
  document.addEventListener('keydown',event=>{if(!media.matches||!mobileOpen)return;if(event.key==='Escape'){event.preventDefault();setOpen(false,true);}if(event.key==='Tab'){const focusable=[...sidebar.querySelectorAll('a,button,input')].filter(e=>!e.disabled&&e.getClientRects().length&&!e.closest('[hidden]'));const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
  media.addEventListener('change',()=>{mobileOpen=false;render();});
  const counts={ '/admin/don-hang':'orders','/admin/tu-van':'consultations','/admin/v3-1':'support','/admin/thanh-toan':'payments' };
  function clearCounts(){for(const link of links){link.querySelector('.admin-nav-badge').hidden=true;link.setAttribute('aria-label',link.dataset.label);link.title=link.dataset.label;}}
  window.addEventListener('admin:auth',event=>{loggedIn=event.detail.loggedIn;if(!loggedIn){clearCounts();status.dataset.state='idle';status.lastElementChild.textContent='Đăng nhập để cập nhật';}});
  window.addEventListener('admin:notifications',event=>{loggedIn=true;for(const link of links){const key=counts[link.getAttribute('href')],n=key?Number(event.detail[key]||0):0,badge=link.querySelector('.admin-nav-badge');badge.hidden=n<=0;badge.textContent=n>99?'99+':String(n);link.setAttribute('aria-label',link.dataset.label+(n?' · '+n+' đang chờ':''));link.title=link.getAttribute('aria-label');}status.dataset.state='connected';const time=new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});status.lastElementChild.textContent='Đã cập nhật '+time;status.title='Dữ liệu công việc cập nhật từ máy chủ lúc '+time;});
  window.addEventListener('admin:notifications-error',()=>{if(loggedIn){status.dataset.state='offline';status.lastElementChild.textContent='Chưa cập nhật được';status.title='Giữ số liệu gần nhất; thử lại ở lần kết nối tiếp theo.';}});
  render();
})();
