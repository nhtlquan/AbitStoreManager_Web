(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fn=v=>new Intl.NumberFormat('vi-VN').format(Number(v)||0);
  const itemList=r=>{
    let x=r?.eoi_listproduct;
    if(!x)return[];
    try{x=typeof x==='string'?JSON.parse(x):x}catch{return[]}
    if(x&&typeof x==='object'&&!Array.isArray(x)){
      for(const k of ['items','products','list'])if(Array.isArray(x[k])){x=x[k];break}
    }
    return Array.isArray(x)?x.filter(Boolean):[];
  };
  const first=(o,keys)=>{for(const k of keys){const v=o?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return''};
  const skuOf=(i,r)=>String(first(i,['sku','SKU','mahang','product_sku','productSku','item_sku','itemSku','variation_sku','variationSku'])||first(r,['sku','SKU','mahang','product_sku','productSku'])||'').trim();
  const qtyOf=(i,r)=>{const n=Number(first(i,['quantity','qty','so_luong','soluong','item_quantity','itemQuantity'])||first(r,['quantity','qty','so_luong','soluong']));return Number.isFinite(n)&&n>0?n:1};
  const imgOf=i=>{for(const k of ['image_url','imageurl','imageUrl','url','image','thumbnail','thumbnail_url','thumbnailUrl','src','original_image','originalImage']){const v=i?.[k];if(typeof v==='string'&&/^https?:\/\//i.test(v))return v}return''};
  function ensureStyle(){if($('skuFilterStyle'))return;const s=document.createElement('style');s.id='skuFilterStyle';s.textContent=`
.sku-filter-btn{height:42px;min-width:118px;padding:0 16px;border:1px solid #2b4567;border-radius:10px;background:#13243a;color:#dceaff;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;touch-action:manipulation;user-select:none;-webkit-tap-highlight-color:transparent;transition:background .15s,border-color .15s,box-shadow .15s}.sku-filter-btn:hover{background:#193251;border-color:#3478f6}.sku-filter-btn.active{background:#1267d9;border-color:#4b8cff;color:#fff;box-shadow:0 0 0 2px rgba(52,120,246,.16)}
.sku-modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(3,9,18,.72);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;padding:20px}.sku-modal-backdrop.open{display:flex}.sku-modal{width:min(1080px,100%);max-height:min(84vh,900px);background:#0f1a2b;border:1px solid #29415f;border-radius:16px;box-shadow:0 25px 90px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}.sku-modal-head{display:flex;align-items:center;justify-content:space-between;padding:17px 20px;border-bottom:1px solid #20334d}.sku-modal-title{font-size:18px;font-weight:800}.sku-modal-sub{font-size:11px;color:#8fa3c0;margin-top:4px}.sku-close{width:38px;height:38px;border:1px solid #304763;border-radius:10px;background:#132239;color:#b9c9dc;font-size:22px;line-height:1;cursor:pointer}.sku-close:hover{background:#1b304d;color:#fff}.sku-modal-body{overflow:auto}.sku-table{width:100%;border-collapse:collapse;min-width:700px}.sku-table th{position:sticky;top:0;background:#132239;color:#91a7c2;font-size:11px;text-align:left;padding:11px 14px;border-bottom:1px solid #29405c;z-index:1}.sku-table td{padding:10px 14px;border-bottom:1px solid #1a2c43;font-size:13px}.sku-table th:nth-child(3),.sku-table th:nth-child(4),.sku-table td:nth-child(3),.sku-table td:nth-child(4){text-align:right}.sku-product{display:flex;align-items:center;gap:11px;min-width:290px}.sku-product-img{width:52px;height:52px;border-radius:8px;object-fit:cover;background:#26364d;flex:0 0 auto}.sku-product-name{font-weight:750;line-height:1.3}.sku-product-sku{font-size:11px;color:#8fa3c0;margin-top:4px}.sku-number{font-size:15px;font-weight:800}.sku-empty,.sku-loading{padding:48px;text-align:center;color:#8fa3c0}.sku-modal-foot{padding:11px 16px;color:#7489a4;font-size:11px;border-top:1px solid #1a2c43}@media(max-width:760px){.sku-filter-btn{min-width:0;padding:0 13px}.sku-filter-btn .sku-filter-label{display:none}.sku-modal-backdrop{padding:10px}.sku-modal{max-height:88vh}.sku-table{min-width:650px}}
`;document.head.appendChild(s)}
  function summary(){
    const rows=Array.isArray(window.state?.orderRows)?window.state.orderRows:[];
    const q=String($('search')?.value||'').toLowerCase().trim();
    const visible=rows.filter(r=>{if(!q)return true;const vals=[r.eoi_order_id,r.order_id,r.orderId,r.tracking_no,r.trackingNo,r.subject,r.createdtime,r.invoicestatus,...itemList(r).flatMap(i=>[i.item_name,skuOf(i,r),i.product_sku,i.mahang])];return vals.filter(Boolean).join(' ').toLowerCase().includes(q)});
    const map=new Map();
    for(const r of visible){
      const oid=String(first(r,['eoi_order_id','eoi_orderid','order_id','orderId','subject'])||'').trim();
      for(const it of itemList(r)){
        const sku=skuOf(it,r);if(!sku)continue;const key=sku.toLowerCase();let x=map.get(key);
        if(!x)x={sku,name:String(first(it,['item_name','itemName','name','product_name','productName'])||'Sản phẩm').trim(),qty:0,orders:new Set(),image:imgOf(it)};
        x.qty+=qtyOf(it,r);if(oid)x.orders.add(oid);if(!x.image)x.image=imgOf(it);map.set(key,x);
      }
    }
    return {rows:[...map.values()].sort((a,b)=>b.qty-a.qty||b.orders.size-a.orders.size||a.name.localeCompare(b.name,'vi')),orderCount:visible.length};
  }
  function render(){
    const modal=$('skuModal'),body=$('skuModalBody');if(!modal||!body)return;
    body.innerHTML='<div class="sku-loading">Đang tổng hợp SKU...</div>';
    const r=summary();$('skuModalSub').textContent=`Từ ${fn(r.orderCount)} đơn đang hiển thị`;
    $('skuModalFoot').textContent=`${fn(r.rows.length)} SKU`;
    if(!r.rows.length){body.innerHTML='<div class="sku-empty">Không tìm thấy SKU trong danh sách đơn hàng hiện tại.</div>';return}
    body.innerHTML=`<table class="sku-table"><thead><tr><th>Sản phẩm</th><th>Mã SKU</th><th>Số lượng SKU</th><th>Số đơn</th></tr></thead><tbody>${r.rows.map(x=>`<tr><td><div class="sku-product"><img class="sku-product-img" src="${esc(x.image)}" onerror="this.style.visibility='hidden'"><div><div class="sku-product-name">${esc(x.name)}</div><div class="sku-product-sku">SKU: ${esc(x.sku)}</div></div></div></td><td>${esc(x.sku)}</td><td><span class="sku-number">${fn(x.qty)}</span></td><td><span class="sku-number">${fn(x.orders.size)}</span></td></tr>`).join('')}</tbody></table>`;
  }
  function open(){const m=$('skuModal');if(!m)return;m.classList.add('open');$('skuFilterBtn')?.classList.add('active');render()}
  function close(){const m=$('skuModal');if(m)m.classList.remove('open');$('skuFilterBtn')?.classList.remove('active')}
  function install(){
    ensureStyle();
    if($('skuFilterBtn'))return;
    const head=document.querySelector('.orders-head');if(!head)return false;
    const b=document.createElement('button');b.type='button';b.id='skuFilterBtn';b.className='sku-filter-btn';b.innerHTML='<span>▦</span><span class="sku-filter-label">Lọc SKU</span>';b.addEventListener('click',open);head.appendChild(b);
    const wrap=document.createElement('div');wrap.id='skuModal';wrap.className='sku-modal-backdrop';wrap.innerHTML='<div class="sku-modal" role="dialog" aria-modal="true"><div class="sku-modal-head"><div><div class="sku-modal-title">Lọc SKU</div><div class="sku-modal-sub" id="skuModalSub"></div></div><button type="button" class="sku-close" id="skuClose">×</button></div><div class="sku-modal-body" id="skuModalBody"></div><div class="sku-modal-foot" id="skuModalFoot"></div></div>';
    document.body.appendChild(wrap);$('skuClose').addEventListener('click',close);wrap.addEventListener('click',e=>{if(e.target===wrap)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    return true;
  }
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>60)clearInterval(timer)},250);
  window.addEventListener('load',install);
})();
