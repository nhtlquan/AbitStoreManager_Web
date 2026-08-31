(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fn=v=>new Intl.NumberFormat('vi-VN').format(Number(v)||0);
  const norm=v=>String(v??'').trim().toLowerCase();

  function ensureStyle(){
    if($('skuFilterStyle'))return;
    const s=document.createElement('style');s.id='skuFilterStyle';s.textContent=`
.sku-filter-btn{height:42px;min-width:118px;padding:0 16px;border:1px solid #2b4567;border-radius:10px;background:#13243a;color:#dceaff;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;touch-action:manipulation;user-select:none;-webkit-tap-highlight-color:transparent}.sku-filter-btn:hover{background:#193251;border-color:#3478f6}.sku-filter-btn.active{background:#1267d9;border-color:#4b8cff;color:#fff;box-shadow:0 0 0 2px rgba(52,120,246,.16)}
.sku-modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(3,9,18,.72);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;padding:20px}.sku-modal-backdrop.open{display:flex}.sku-modal{width:min(1080px,100%);max-height:min(84vh,900px);background:#0f1a2b;border:1px solid #29415f;border-radius:16px;box-shadow:0 25px 90px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}.sku-modal-head{display:flex;align-items:center;justify-content:space-between;padding:17px 20px;border-bottom:1px solid #20334d}.sku-modal-title{font-size:18px;font-weight:800}.sku-modal-sub{font-size:11px;color:#8fa3c0;margin-top:4px}.sku-close{width:38px;height:38px;border:1px solid #304763;border-radius:10px;background:#132239;color:#b9c9dc;font-size:22px;line-height:1;cursor:pointer}.sku-modal-body{overflow:auto}.sku-table{width:100%;border-collapse:collapse;min-width:700px}.sku-table th{position:sticky;top:0;background:#132239;color:#91a7c2;font-size:11px;text-align:left;padding:11px 14px;border-bottom:1px solid #29405c;z-index:1}.sku-table td{padding:10px 14px;border-bottom:1px solid #1a2c43;font-size:13px}.sku-table th:nth-child(3),.sku-table th:nth-child(4),.sku-table td:nth-child(3),.sku-table td:nth-child(4){text-align:right}.sku-product{display:flex;align-items:center;gap:11px;min-width:290px}.sku-product-img{width:52px;height:52px;border-radius:8px;object-fit:cover;background:#26364d;flex:0 0 auto}.sku-product-name{font-weight:750;line-height:1.3}.sku-product-sku{font-size:11px;color:#8fa3c0;margin-top:4px}.sku-number{font-size:15px;font-weight:800}.sku-empty,.sku-loading{padding:48px;text-align:center;color:#8fa3c0}.sku-modal-foot{padding:11px 16px;color:#7489a4;font-size:11px;border-top:1px solid #1a2c43}@media(max-width:760px){.sku-filter-btn{min-width:0;padding:0 13px}.sku-filter-btn .sku-filter-label{display:none}.sku-modal-backdrop{padding:10px}.sku-modal{max-height:88vh}.sku-table{min-width:650px}}
`;document.head.appendChild(s)
  }

  // IMPORTANT: read the rendered order cards, not window.state.
  // `state` is a top-level const in index.html and is therefore not exposed as window.state.
  // The DOM is the authoritative list after status/search filters have been applied.
  function summaryFromDom(){
    const nodes=[...document.querySelectorAll('#ordersList .order-row:not(.head)')];
    const map=new Map();
    for(const row of nodes){
      const product=row.querySelector('.product-cell');
      if(!product)continue;
      const texts=[...product.querySelectorAll('.muted')].map(x=>x.textContent.trim());
      const skuText=texts.find(x=>/^SKU\s*:/i.test(x))||'';
      const sku=skuText.replace(/^SKU\s*:\s*/i,'').trim();
      if(!sku||sku==='—')continue;
      const nameEl=product.querySelector('.name');
      const name=(nameEl?.textContent||'Sản phẩm').trim();
      const img=product.querySelector('img')?.src||'';
      const qtyText=texts.find(x=>/×/.test(x))||'';
      const qm=qtyText.match(/×\s*([\d.,]+)/);
      const qty=qm?Number(qm[1].replace(/\./g,'').replace(',','.')):1;
      const orderEl=row.querySelector('.cell:nth-child(5) .metric-main');
      const oid=(orderEl?.textContent||'').trim();
      const key=norm(sku);
      let x=map.get(key);
      if(!x)x={sku,name,qty:0,orders:new Set(),image:img};
      x.qty+=Number.isFinite(qty)&&qty>0?qty:1;
      if(oid&&oid!=='—')x.orders.add(oid);
      if(!x.image&&img)x.image=img;
      map.set(key,x);
    }
    return {rows:[...map.values()].sort((a,b)=>b.qty-a.qty||b.orders.size-a.orders.size||a.name.localeCompare(b.name,'vi')),orderCount:nodes.length};
  }

  function render(){
    const body=$('skuModalBody');if(!body)return;
    body.innerHTML='<div class="sku-loading">Đang tổng hợp SKU...</div>';
    const r=summaryFromDom();
    $('skuModalSub').textContent=`Từ ${fn(r.orderCount)} đơn đang hiển thị`;
    $('skuModalFoot').textContent=`${fn(r.rows.length)} SKU`;
    if(!r.rows.length){body.innerHTML='<div class="sku-empty">Không tìm thấy SKU trong danh sách đơn hàng hiện tại.</div>';return}
    body.innerHTML=`<table class="sku-table"><thead><tr><th>Sản phẩm</th><th>Mã SKU</th><th>Số lượng SKU</th><th>Số đơn</th></tr></thead><tbody>${r.rows.map(x=>`<tr><td><div class="sku-product"><img class="sku-product-img" src="${esc(x.image)}" onerror="this.style.visibility='hidden'"><div><div class="sku-product-name">${esc(x.name)}</div><div class="sku-product-sku">SKU: ${esc(x.sku)}</div></div></div></td><td>${esc(x.sku)}</td><td><span class="sku-number">${fn(x.qty)}</span></td><td><span class="sku-number">${fn(x.orders.size)}</span></td></tr>`).join('')}</tbody></table>`;
  }
  function open(){const m=$('skuModal');if(!m)return;m.classList.add('open');$('skuFilterBtn')?.classList.add('active');render()}
  function close(){const m=$('skuModal');if(m)m.classList.remove('open');$('skuFilterBtn')?.classList.remove('active')}
  function install(){
    ensureStyle();
    const head=document.querySelector('.orders-head');
    if(!head)return false;
    if(!$('skuFilterBtn')){
      const b=document.createElement('button');b.type='button';b.id='skuFilterBtn';b.className='sku-filter-btn';b.innerHTML='<span>▦</span><span class="sku-filter-label">Lọc SKU</span>';b.addEventListener('click',open);head.appendChild(b);
    }
    if(!$('skuModal')){
      const wrap=document.createElement('div');wrap.id='skuModal';wrap.className='sku-modal-backdrop';wrap.innerHTML='<div class="sku-modal" role="dialog" aria-modal="true"><div class="sku-modal-head"><div><div class="sku-modal-title">Lọc SKU</div><div class="sku-modal-sub" id="skuModalSub"></div></div><button type="button" class="sku-close" id="skuClose">×</button></div><div class="sku-modal-body" id="skuModalBody"></div><div class="sku-modal-foot" id="skuModalFoot"></div></div>';
      document.body.appendChild(wrap);
      $('skuClose').addEventListener('click',close);
      wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
      document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    }
    return true;
  }
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>120)clearInterval(timer)},250);
  window.addEventListener('load',install);
})();
