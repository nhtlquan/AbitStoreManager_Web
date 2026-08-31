
const API="/api/abit";
const SHOP_AVATAR={"1796791196":"https://down-bs-vn.img.susercontent.com/vn-11134216-81ztc-mmy1izuxis5e86.webp","1796776234":"https://down-zl-vn.img.susercontent.com/vn-11134216-81ztc-mncok4srqgapac.webp"};
const SHOP_DEFAULT="https://down-zl-vn.img.susercontent.com/vn-11134216-81ztc-mohposrjl2q45c.webp";
const EXCLUDED=new Set(["huydnx","chuyenhoan","daphathoanthanhcong"]);
const REPORT_STATUSES=["Choxacnhan","Daxacnhan","Dadonggoi","Danggiao","Dagiao","Chuyenhoan"];
const STATUS_LABEL={"Choxacnhan":"Chờ xác nhận","Daxacnhan":"Đã xác nhận","Dadonggoi":"Đã đóng gói","Danggiao":"Đang giao","Dagiao":"Đã giao","Chuyenhoan":"Chuyển hoàn"};
const state={page:"report",preset:"3 ngày",rows:[],orderRows:[],orderStatuses:[],loading:false,orderLoading:false,start:null,end:null,total:0,seq:0};
let invoiceStatusMap={};
let dynamicKey=localStorage.getItem("abit_dynamic_key")||"";
let shopMapReady=false;
let invoiceStatusReady=false;

const $=id=>document.getElementById(id);
const norm=v=>String(v??"").trim().toLowerCase().replace(/\s+/g,"").replaceAll("_","");
const n=norm;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function money(v){if(v===null||v===undefined||v==="")return null;let s=String(v).trim().replaceAll(" ","");if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replaceAll(".","").replace(",","."),0;else if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replaceAll(",","");let n=Number(s);return Number.isFinite(n)?n:null}
function fm(v){let n=money(v);return n==null?"—":new Intl.NumberFormat("vi-VN",{maximumFractionDigits:0}).format(n)+" đ"}
function fn(v){return new Intl.NumberFormat("vi-VN").format(Number(v)||0)}
function fp(v){return Number.isFinite(v)?Number(v).toFixed(2)+"%":"—"}
function dsql(p){
  const now=new Date();
  const localMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let a=new Date(localMidnight), b=new Date(localMidnight);
  const key=String(p||"").trim().toLowerCase();
  if(key==="hôm qua"){
    a.setDate(a.getDate()-1); b.setDate(b.getDate()-1);
  }else if(key==="3 ngày"){
    a.setDate(a.getDate()-2);
  }else if(key==="1 tuần"){
    a.setDate(a.getDate()-6);
  }else if(key==="1 tháng"){
    a.setDate(a.getDate()-29);
  }
  // "Hôm nay" (and any equivalent capitalization) keeps today's date.
  const f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return [`${f(a)} 00:00:00`,`${f(b)} 23:59:59`];
}
function fmtRange(a,b){return`${a.slice(8,10)}/${a.slice(5,7)}/${a.slice(0,4)} - ${b.slice(8,10)}/${b.slice(5,7)}/${b.slice(0,4)}`}
function items(r){let x=r?.eoi_listproduct;if(!x)return[];try{x=typeof x==="string"?JSON.parse(x):x}catch{return[]}if(x&&typeof x==="object"&&!Array.isArray(x)){for(const k of["items","products","list"])if(Array.isArray(x[k])){x=x[k];break}}return Array.isArray(x)?x.filter(Boolean):[]}
function img(i){
  if(!i||typeof i!=="object")return"";
  const keys=["image_url","imageurl","imageUrl","url","image","thumbnail","thumbnail_url","thumbnailUrl","src","original_image","originalImage","image_info","imageInfo","picture","pic","main_image","mainImage"];
  for(const k of keys){
    const v=i[k];
    if(typeof v==="string"&&/^https?:\/\//i.test(v))return v.trim();
    if(v&&typeof v==="object"){
      for(const sk of["url","imageUrl","image_url","src","original","originalUrl","path"]){
        const q=v[sk];
        if(typeof q==="string"&&/^https?:\/\//i.test(q))return q.trim();
      }
    }
  }
  // Some payloads expose the image in an array.
  for(const k of["images","image_list","imageList","pictures"]){
    const a=i[k];
    if(Array.isArray(a)){
      for(const v of a){
        if(typeof v==="string"&&/^https?:\/\//i.test(v))return v.trim();
        if(v&&typeof v==="object"){
          for(const sk of["url","imageUrl","image_url","src","original"]){
            const q=v[sk];
            if(typeof q==="string"&&/^https?:\/\//i.test(q))return q.trim();
          }
        }
      }
    }
  }
  return"";
}
function shop(r){return String(r?.store_name||r?.brand||r?.cf_882||"Không xác định").replace(/\s*\(Shopee\)\s*$/i,"")}
function avatar(r){return SHOP_AVATAR[String(r?.ecommerce_id??r?.ecommerceId??"").trim()]||SHOP_DEFAULT}
async function api(path,method="GET",body){const opt={method,headers:{"content-type":"application/json","accept":"application/json, text/plain, */*"}};if(body!==undefined)opt.body=JSON.stringify(body);const sep=path.includes("?")?"&":"?";const u=API+path+(dynamicKey?(sep+"dynamic_key="+encodeURIComponent(dynamicKey)):"");const res=await fetch(u,opt);const text=await res.text();let data={};try{data=JSON.parse(text)}catch{}if(!res.ok)throw new Error(data?.message||data?.error||`HTTP ${res.status}`);return data}
function payload(start,end,statuses=[],page=0,limit=100){return[{date_time_start:start,date_time_end:end,invoicestatus:statuses,status_abit_filter:"",pay_method_filter:"",confirm_order:[],nhanvienid:"",packer_name:"",thongtinkhach:"",nguondon:"",typeSearch:"iddonhang",discountType:"",invoicelabel:"all",shop_id:"",invoice_type:"",ngay_confirm:0,ngay_tao:1,ngay_in:0,ngay_gui:0,scanpacked:0,ngay_lay_don:0,ngay_phat_thanh_cong:0,ngay_hoan_don:0,doisoat:"",vanchuyen:[],productcategoryid:"",handle_inv:"",type_emergency:"",storeid:"",warehouseid:"",page,limit,order_by:"",order_type:"",in_don:"all"}]}
function extract(d){let r=d?.listinvoices||d?.data||[],t=d?.number_invoice||d?.total||d?.total_count||d?.count||0;if(r&&typeof r==="object"&&!Array.isArray(r)){t=r.number_invoice||r.total||r.count||t;r=r.listinvoices||r.items||[]}return[Array.isArray(r)?r:[],Number(t)||0]}
function loginView(msg=""){root.innerHTML=`<div class="login-page"><form class="login-card" id="loginForm"><div class="logo">S</div><h1>Abit Store Manager</h1><p>Đăng nhập để quản lý đơn hàng và báo cáo</p><label>Tài khoản</label><input id="lu" type="text" autocomplete="username" required><label>Mật khẩu</label><input id="lp" type="password" autocomplete="current-password" required><label class="remember"><input id="lr" type="checkbox" checked>Lưu thông tin đăng nhập</label><button class="login-btn">Đăng nhập</button><p class="err">${esc(msg)}</p></form></div>`;$("loginForm").onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector("button");b.disabled=true;b.textContent="Đang xác thực...";try{const data=await fetch(API+"/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify([{user_name:$("lu").value.trim(),user_password:$("lp").value,internal_ip:"",external_ip:""}])}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d?.message||"Đăng nhập thất bại");return d});if(data?.status!=="success"||!data?.dynamic_key)throw new Error(data?.message||"Đăng nhập thất bại");dynamicKey=data.dynamic_key;
sessionStorage.removeItem("abit_invoice_status_v1");
invoiceStatusMap={};invoiceStatusReady=false;if($("lr").checked){localStorage.setItem("abit_dynamic_key",dynamicKey);localStorage.setItem("abit_username",$("lu").value.trim())}else{localStorage.removeItem("abit_dynamic_key");localStorage.removeItem("abit_username")}await showReport()}catch(err){b.disabled=false;b.textContent="Đăng nhập";$("loginForm").querySelector(".err").textContent=err.message}}}
function shell(){root.innerHTML=`<div class="app"><aside class="sidebar"><div class="brand" style="display:none">Abit Store Manager</div><nav class="nav"><button class="${state.page==="report"?"active":""}" onclick="go('report')">📊 Báo cáo</button><button class="${state.page==="orders"?"active":""}" onclick="go('orders')">🧾 Đơn hàng</button></nav></aside><main class="main" id="main"></main></div>`}
function skeletons(n=5){return Array.from({length:n},()=>`<div class="skel"><div style="left:12px;top:12px;width:76px;height:76px"></div><div style="left:100px;top:26px;width:43%;height:13px"></div><div style="left:100px;top:50px;width:29%;height:11px"></div><div style="right:120px;top:28px;width:95px;height:13px"></div></div>`).join("")}

let shopMap={};
function normalizeStoreKey(v){
  if(v===null||v===undefined)return"";
  const t=String(v).trim();
  return /\.0$/.test(t)&&/^\d+\.0$/.test(t)?t.slice(0,-2):t;
}
function buildStoreMap(payload){
  const map={};
  function add(id,name){
    const k=normalizeStoreKey(id);
    const v=String(name??"").trim();
    if(k&&v)map[k]=v;
  }
  function walk(n){
    if(Array.isArray(n)){n.forEach(walk);return}
    if(!n||typeof n!=="object")return;

    add(n.source_id??n.sourceId, n.source_name??n.sourceName);
    add(n.ecommerce_id??n.ecommerceId, n.store_name??n.storeName??n.shop_name??n.shopName??n.name);
    add(n.id, n.store_name??n.storeName??n.shop_name??n.shopName);

    // Common resource wrappers.
    for(const key of["ecommerce","ecommerces","stores","shops","sources","data","list","items","result","resources"]){
      const v=n[key];
      if(v&&typeof v==="object")walk(v);
    }
    for(const [k,v] of Object.entries(n)){
      if(v&&typeof v==="object" && !["ecommerce","ecommerces","stores","shops","sources","data","list","items","result","resources"].includes(k)){
        walk(v);
      }
    }
  }
  walk(payload);
  return map;
}
async function loadShopMap(){
  if(shopMapReady)return shopMap;
  if(!dynamicKey)return shopMap;
  try{
    const data=await api("/system/getAllResource");
    shopMap=buildStoreMap(data);
    shopMapReady=true;
  }catch(_e){
    shopMap={};
  }
  return shopMap;
}

function buildInvoiceStatusMap(payload){
  const out={};
  let data=payload;
  if(data && typeof data==="object" && !Array.isArray(data)){
    for(const k of["data","items","result","list"]){
      if(Array.isArray(data[k])){data=data[k];break}
    }
  }
  if(!Array.isArray(data))return out;
  data.forEach(x=>{
    if(!x || typeof x!=="object")return;
    const code=norm(x.invoicestatus);
    if(!code)return;
    out[code]={
      name:String(x.namestatus||x.invoicestatus||"").trim(),
      color:String(x.color||"").trim()
    };
  });
  return out;
}
async function loadInvoiceStatusMap(){
  if(invoiceStatusReady)return invoiceStatusMap;
  if(!dynamicKey)return invoiceStatusMap;
  const cacheKey="abit_invoice_status_v1";
  try{
    const cached=sessionStorage.getItem(cacheKey);
    if(cached){
      const parsed=JSON.parse(cached);
      if(Array.isArray(parsed)&&parsed.length){
        invoiceStatusMap=buildInvoiceStatusMap(parsed);
        invoiceStatusReady=true;
        console.debug("InvoiceStatus cache hit",Object.keys(invoiceStatusMap).length);
        return invoiceStatusMap;
      }
    }
  }catch(_e){}
  try{
    const response=await api("/invoices/invoicestatus");
    invoiceStatusMap=buildInvoiceStatusMap(response);
    sessionStorage.setItem(cacheKey,JSON.stringify(response));
    invoiceStatusReady=true;
    console.debug("GET /api/abit/invoices/invoicestatus",Object.keys(invoiceStatusMap).length);
  }catch(error){
    console.error("GET /api/abit/invoices/invoicestatus failed",error);
  }
  return invoiceStatusMap;
}

function statusStyle(value){
  const orderStatus=String(value??"").trim();
  const mapped=invoiceStatusMap[norm(orderStatus)];
  if(!mapped||!mapped.color)return"";

  const color=String(mapped.color).trim();

  if(/^#[0-9a-f]{3}$/i.test(color)){
    const full=color.slice(1).split("").map(ch=>ch+ch).join("");
    return`style="background:#${full};color:#fff;border:1px solid #${full};"`;
  }

  if(/^#[0-9a-f]{6}$/i.test(color)){
    return`style="background:${color};color:#fff;border:1px solid ${color};"`;
  }

  return`style="background:${esc(color)};color:#fff;border:1px solid ${esc(color)};"`;
}

function mappedShopName(r){
  const eid=normalizeStoreKey(r?.ecommerce_id??r?.ecommerceId);
  return shopMap[eid]||shop(r);
}

async function showReport(){state.page="report";shell();reportView();await Promise.all([loadShopMap(),loadReport()])}
function reportView(){const[st,en]=dsql(state.preset);$("main").innerHTML=`<div class="toolbar"><div><div class="title">Báo cáo</div><div class="date-label">${fmtRange(st,en)}</div></div><div class="presets">${["3 ngày","Hôm nay","Hôm qua","1 tuần","1 tháng"].map(x=>`<button class="${x===state.preset?"active":""}" onclick="pickPreset('${x}')">${x}</button>`).join("")}</div><select class="mobile-period-select" onchange="pickPreset(this.value)">${["3 ngày","Hôm nay","Hôm qua","1 tuần","1 tháng"].map(x=>`<option value="${x}" ${x===state.preset?"selected":""}>${x}</option>`).join("")}</select></div><div class="cards" report-count-cards">${[['unprocessed','Chưa xử lý','⏳','var(--blue)'],['processed','Đã xử lý','✓','var(--green)'],['shipped','Đã lấy hàng','↗','var(--orange)'],['delivered','Đã giao','✓','var(--blue)'],['returned','Đơn hoàn','↩','var(--red)']].map(x=>`<div class="kpi clickable" onclick="openOrders('${x[0]}')"><div class="kpi-head"><div class="kpi-icon" style="background:${x[3]}22;color:${x[3]}">${x[2]}</div><div class="kpi-title">${x[1]}</div></div><div class="kpi-value" id="k_${x[0]}">${state.loading?"----":"0"}</div></div>`).join("")}</div><div class="finance-head"><div class="money-logo">₫</div>TÀI CHÍNH</div><div class="finance-cards">${[['revenue','Doanh thu'],['profit','Lợi nhuận'],['rate','Tỷ lệ lợi nhuận']].map(x=>`<div class="kpi"><div class="kpi-title">${x[1]}</div><div class="kpi-value" id="f_${x[0]}">${state.loading?"----":"—"}</div></div>`).join("")}</div><div class="sections"><div class="panel"><div class="panel-title">Doanh số theo Shop</div><div class="list-head"><div></div><div>Tên Shop</div><div>Doanh thu</div><div>Số đơn</div><div>Lợi nhuận</div></div><div id="shopList">${skeletons()}</div></div><div class="panel"><div class="panel-title">Doanh số theo Sản phẩm / SKU</div><div class="list-head"><div></div><div>Tên sản phẩm</div><div>Doanh thu</div><div>Số đơn</div><div>Lợi nhuận</div></div><div id="productList">${skeletons()}</div></div></div>`}
async function loadReport(){
  await loadInvoiceStatusMap();
  if(!dynamicKey)return;
  state.loading=true;
  state.seq++;
  const seq=state.seq;

  // Keep current report visible while loading.
  ["unprocessed","processed","shipped","delivered","returned"].forEach(k=>{
    const e=$("k_"+k); if(e)e.textContent="----";
  });
  ["revenue","profit","rate"].forEach(k=>{
    const e=$("f_"+k); if(e)e.textContent="----";
  });
  if($("shopList"))$("shopList").innerHTML=skeletons(5);
  if($("productList"))$("productList").innerHTML=skeletons(5);

  let rows,total;
  try{
    const[st,en]=dsql(state.preset);
    const limit=state.preset==="1 tháng"?1000:state.preset==="1 tuần"?200:50;
    [rows,total]=extract(await api(
      "/listOrderEcommerce","POST",
      payload(st,en,REPORT_STATUSES,0,limit)
    ));
  }catch(e){
    if(seq!==state.seq)return;
    state.loading=false;
    console.error("Report API error:", e);
    $("shopList").innerHTML =
      `<div style="padding:24px;color:#ff7282">Lỗi API Báo cáo: ${esc(e.message)}</div>`;
    $("productList").innerHTML =
      `<div style="padding:24px;color:#ff7282">Lỗi API Báo cáo: ${esc(e.message)}</div>`;
    return;
  }

  if(seq!==state.seq)return;

  state.rows=rows;
  state.total=total;
  state.loading=false;

  // Rendering is intentionally outside the API catch block. A UI/data-shape
  // rendering error must not be misclassified as an authentication failure.
  try{
    renderReport(rows);
  }catch(e){
    console.error("Report render error:",e);
    if($("shopList")){
      $("shopList").innerHTML=
        `<div style="padding:24px;color:#ff7282">Lỗi hiển thị báo cáo: ${esc(e.message)}</div>`;
    }
  }
}
function renderReport(rows){
  const c={unprocessed:0,processed:0,shipped:0,delivered:0,returned:0};
  let rev=0,profit=0,sub=0;
  const sm=new Map(),pm=new Map();

  for(const r of (Array.isArray(rows)?rows:[])){
    const sh=n(r.statusvandon), inv=n(r.invoicestatus);
    if(sh==="readytoship")c.unprocessed++;
    else if(sh==="processed")c.processed++;
    else if(sh==="shipped")c.shipped++;
    else if(sh==="delivered")c.delivered++;
    if(inv==="chuyenhoan")c.returned++;

    if(!["readytoship","processed","shipped","delivered"].includes(sh)) continue;

    const revenue=money(r.eoi_escrow_amount);
    const cost=money(r.total_giavon);
    const subtotal=money(r.subtotal);
    if(revenue==null||cost==null) continue;

    const p=revenue-cost;
    rev+=revenue; profit+=p; sub+=subtotal||0;

    const shopId=String(r.ecommerce_id??r.ecommerceId??"").trim();
    const shopLabel=mappedShopName(r);
    const shopKey=shopId||shopLabel;
    let sb=sm.get(shopKey);
    if(!sb) sb={label:shopLabel,revenue:0,profit:0,orders:0,avatar:avatar(r)};
    sb.revenue+=revenue; sb.profit+=p; sb.orders++;
    sm.set(shopKey,sb);

    let its=items(r);
    if(!its.length) its=[{item_name:"Sản phẩm",sku:""}];

    const weights=its.map(i=>money(
      i.thanhtien||i.line_total||i.item_total||i.total||
      i.subtotal||i.amount||i.price_total||i.price
    )||1);
    const totalWeight=weights.reduce((q,v)=>q+v,0)||its.length;
    const oid=String(r.eoi_order_id||r.order_id||r.orderId||r.subject||"");

    its.forEach((it,i)=>{
      const sku=String(it.sku||it.mahang||it.product_sku||"").trim();
      const name=String(it.item_name||"Sản phẩm").trim();
      const key=sku||name;
      let pb=pm.get(key);
      if(!pb) pb={name,sku,revenue:0,profit:0,orders:new Set(),image:img(it)};
      const share=weights[i]/totalWeight;
      pb.revenue+=revenue*share;
      pb.profit+=p*share;
      pb.orders.add(oid);
      if(!pb.image) pb.image=img(it);
      pm.set(key,pb);
    });
  }

  Object.entries(c).forEach(([k,v])=>{const e=$("k_"+k);if(e)e.textContent=fn(v)});
  $("f_revenue").textContent=fm(rev);
  $("f_profit").textContent=fm(profit);
  $("f_rate").textContent=fp(sub?profit/sub*100:NaN);

  $("shopList").innerHTML=[...sm.values()]
    .sort((a,b)=>b.revenue-a.revenue)
    .slice(0,15)
    .map(v=>`<div class="row">
      <img class="avatar" src="${esc(v.avatar||SHOP_DEFAULT)}"
           onerror="this.onerror=null;this.src='${SHOP_DEFAULT}'">
      <div><div class="name report-name-title">${esc(v.label||"Không xác định")}</div><div class="mobile-order-count">${fn(v.orders)} đơn</div></div>
      <div class="metrics"><div class="metric-main">${fm(v.revenue)}</div></div>
      <div class="metrics"><div class="metric-main">${fn(v.orders)}</div></div>
      <div class="metrics"><div class="metric-main">${fm(v.profit)}</div></div>
    </div>`).join("") || empty();

  $("productList").innerHTML=[...pm.values()]
    .sort((a,b)=>b.revenue-a.revenue)
    .map(v=>`<div class="row">
      <img class="avatar" src="${esc(v.image||"")}"
           onerror="this.style.visibility='hidden'">
      <div>
        <div class="name report-name-title">${esc(v.name)}</div><div class="mobile-order-count">${fn(v.orders.size)} đơn</div>
        <div class="muted">${esc(v.sku)}</div>
      </div>
      <div class="metrics"><div class="metric-main">${fm(v.revenue)}</div></div>
      <div class="metrics"><div class="metric-main">${fn(v.orders.size)}</div></div>
      <div class="metrics"><div class="metric-main">${fm(v.profit)}</div></div>
    </div>`).join("") || empty();
}
function empty(){return`<div style="padding:35px;text-align:center;color:#70849b">Không có dữ liệu</div>`}
function pickPreset(p){state.preset=p;reportView();loadReport()}
function openOrders(key){state.page="orders";state.orderStatuses={unprocessed:["Choxacnhan","Daxacnhan","Dadonggoi"],processed:["Daxacnhan","Dadonggoi"],shipped:["Danggiao"],delivered:["Dagiao"],returned:["Chuyenhoan"]}[key]||[];ordersView(false)}
async function ordersView(){shell();const[st,en]=dsql(state.preset);state.start=st;state.end=en;const labs=REPORT_STATUSES.map(x=>STATUS_LABEL[x]);$("main").innerHTML=`<div class="toolbar orders-toolbar"><div><div class="title" id="orderTitle">Đơn hàng</div><div class="date-label" id="orderRange">${fmtRange(st,en)}</div></div><div class="order-status-dropdown"><button type="button" class="status-select-btn" id="statusSelectBtn" onclick="toggleStatusDropdown()">Trạng thái <span id="statusSelectCount"></span> ▾</button><div class="status-dropdown-menu" id="statusDropdownMenu">${labs.map(x=>{const key=statusKey(x);const checked=state.orderStatuses.length?state.orderStatuses.includes(key):true;return `<label class="status-option"><input type="checkbox" value="${esc(key)}" ${checked?"checked":""} onchange="toggleOrderStatus(this.value, this.checked)"><span>${esc(x)}</span></label>`}).join("")}</div></div><div class="presets">${["3 Ngày","Hôm Nay","Hôm Qua","1 Tuần","1 Tháng"].map(x=>{const active=(x===state.preset)||((x==="3 Ngày")&&(state.preset==="3 ngày"))||((x==="Hôm Nay")&&(state.preset==="Hôm nay"))||((x==="Hôm Qua")&&(state.preset==="Hôm qua"))||((x==="1 Tuần")&&(state.preset==="1 tuần"))||((x==="1 Tháng")&&(state.preset==="1 tháng"));return `<button class="${active?"active":""}" onclick="pickOrderPreset('${x}')">${x}</button>`}).join("")}</div><div class="order-date-picker"><button type="button" class="date-range-button" id="orderDateRangeButton" onclick="toggleOrderDatePicker()">${fmtRange(st,en)} ▾</button><div class="date-range-popover" id="orderDatePicker"><div class="date-range-field"><label>Từ ngày</label><input id="orderDateStart" type="date" value="${st.slice(0,10)}"></div><div class="date-range-field"><label>Đến ngày</label><input id="orderDateEnd" type="date" value="${en.slice(0,10)}"></div><button type="button" class="date-range-apply" onclick="applyOrderDateRange()">Áp dụng</button></div></div></div><div class="orders-head"><input class="search" id="search" placeholder="Tìm mã đơn, SKU, sản phẩm, shop..."></div><div class="orders-wrap" id="ordersList"></div><div class="footer" id="ordersInfo"></div>`;$("search").oninput=renderOrders;updateStatusSelectLabel();document.addEventListener("click",closeStatusDropdownOutside,{once:true});loadOrders()}

function toggleStatusDropdown(){const m=$("statusDropdownMenu");if(m)m.classList.toggle("open")}
function closeStatusDropdownOutside(e){const box=document.querySelector(".order-status-dropdown");if(box&&!box.contains(e.target)){const m=$("statusDropdownMenu");if(m)m.classList.remove("open")}else{document.addEventListener("click",closeStatusDropdownOutside,{once:true})}}
function updateStatusSelectLabel(){const n=state.orderStatuses.length;const el=$("statusSelectCount");if(el)el.textContent=n?`(${n})`:""}
function toggleOrderStatus(key,checked){
  const set=new Set(state.orderStatuses.length?state.orderStatuses:REPORT_STATUSES);
  if(checked)set.add(key);else set.delete(key);
  state.orderStatuses=[...set];
  updateStatusSelectLabel();
  loadOrders();
} function statusKey(x){return Object.entries(STATUS_LABEL).find(([,v])=>v===x)?.[0]||""}
function statusKey(x){return Object.entries(STATUS_LABEL).find(([,v])=>v===x)?.[0]||""}

function firstValue(obj,keys){
  for(const k of keys){
    const v=obj?.[k];
    if(v!==undefined&&v!==null&&String(v).trim()!=="")return v;
  }
  return "";
}
function orderCreated(r){
  return firstValue(r,[
    "ngay_tao","created_at","createdAt","created_at_v2","createdAtTime",
    "create_at","createAt","created_date","createdDate","date_created",
    "dateCreated","ngaytao","ngay_tao_don","eoi_created_at","eoi_createdAt",
    "thoi_gian_tao","thoigiantao","create_time","createTime"
  ]);
}
function itemSku(i,r){
  return String(firstValue(i,[
    "sku","SKU","mahang","product_sku","productSku","item_sku","itemSku",
    "variation_sku","variationSku"
  ]) || firstValue(r,[
    "sku","SKU","mahang","product_sku","productSku"
  ]) || "").trim();
}
function itemQty(i,r){
  const v=firstValue(i,[
    "quantity","qty","so_luong","soluong","item_quantity","itemQuantity"
  ]) || firstValue(r,["quantity","qty","so_luong","soluong"]);
  const n=Number(v);
  return Number.isFinite(n)&&n>0?n:1;
}
function itemLineAmount(i){
  return money(firstValue(i,[
    "thanhtien","line_total","lineTotal","item_total","itemTotal",
    "total","subtotal","amount","price_total","priceTotal","price"
  ]));
}
function profitRate(profit,subtotal){
  const p=money(profit), st=money(subtotal);
  if(p==null||st==null||st===0)return null;
  return p/st*100;
}
function profitRateStyle(rate){
  if(rate==null)return"";
  if(rate<11)return' style="color:#E74C3C;font-weight:800"';
  if(rate<14)return' style="color:#F39C12;font-weight:800"';
  if(rate<=16)return' style="color:#3498DB;font-weight:800"';
  return' style="color:#27AE60;font-weight:800"';
}
function productSubtotal(i,r){
  return money(firstValue(r,[
    "subtotal","Subtotal","SUBTOTAL",
    "order_subtotal","orderSubtotal",
    "sub_total","subTotal",
    "eoi_subtotal","eoiSubtotal"
  ]));
}
async function loadOrders(){
  if(!state.orderStatuses.length) state.orderStatuses=REPORT_STATUSES.slice();
  await loadInvoiceStatusMap();state.orderLoading=true;$("ordersList").innerHTML=skeletons(7);try{const[r,t]=extract(await api("/listOrderEcommerce","POST",payload(state.start,state.end,state.orderStatuses,0,100)));state.orderRows=r.filter(x=>norm(x.invoicestatus)!=="daphathoanthanhcong");state.orderTotal=t;state.orderLoading=false;renderOrders()}catch(e){state.orderLoading=false;$("ordersList").innerHTML=`<div style="padding:30px;color:#ff7384">${esc(e.message)}</div>`}}
function formatCreated(v){
  if(v===undefined||v===null||v==="")return"—";
  if(typeof v==="number"){
    const d=new Date(v>10000000000?v:v*1000);
    if(!Number.isNaN(d.getTime())){
      return d.toLocaleString("vi-VN",{hour12:false});
    }
  }
  const text=String(v).trim();
  if(!text)return"—";
  if(/^\d{4}-\d{2}-\d{2}T/.test(text)){
    return text.slice(0,19).replace("T"," ");
  }
  return text;
}

function renderOrders(){
  const q=String($("search")?.value||"").toLowerCase().trim();
  const rows=state.orderRows.filter(r=>{
    if(!q)return true;
    const vals=[
      r.eoi_order_id,r.order_id,r.orderId,r.tracking_no,r.trackingNo,
      r.subject,mappedShopName(r),r.createdtime,
      ...items(r).flatMap(i=>[i.item_name,itemSku(i,r),i.product_sku,i.mahang])
    ];
    return vals.filter(Boolean).join(" ").toLowerCase().includes(q);
  });
    const orderTitle=$("orderTitle");
    if(orderTitle) orderTitle.textContent=`Đơn hàng (${rows.length} đơn)`;
  updateStatusSelectLabel();


  const head=`<div class="order-row head">
    <div class="cell">SẢN PHẨM</div>
    <div class="cell">TRẠNG THÁI ĐƠN HÀNG</div>
    <div class="cell">DOANH THU</div>
    <div class="cell">LỢI NHUẬN</div>
    <div class="cell">ĐƠN HÀNG & VẬN ĐƠN</div>
    <div class="cell">TRẠNG THÁI</div>
    <div class="cell">SHOP</div>
    <div class="cell">NGÀY TẠO</div>
    <div class="cell return-reason-head">LYDOHUY</div>
  </div>`;

  const body=rows.map(r=>{
    const it=items(r)[0]||{};
    const sku=itemSku(it,r);
    const qty=itemQty(it,r);

    // Product price is Subtotal from the order API.
    const subtotal=money(firstValue(r,[
      "subtotal","Subtotal","SUBTOTAL",
      "order_subtotal","orderSubtotal",
      "sub_total","subTotal",
      "eoi_subtotal","eoiSubtotal"
    ]));

    const revenue=money(firstValue(r,[
      "eoi_escrow_amount","escrow_amount","escrowAmount",
      "doanhthu","doanh_thu","revenue"
    ]));
    const cost=money(firstValue(r,[
      "total_giavon","total_gia_von","giavon","gia_von",
      "cost","cost_total"
    ]));

    const eligible=!EXCLUDED.has(norm(r.invoicestatus));
    const profit=eligible&&revenue!=null&&cost!=null?revenue-cost:null;
    const rate=profitRate(profit,subtotal);

    const statusCode=firstValue(r,[
      "invoicestatus","invoice_status","invoiceStatus"
    ]);
    const statusInfo=invoiceStatusMap[norm(statusCode)]||{};
    const statusText=String(
      statusInfo.namestatus||statusInfo.name||statusCode||"—"
    ).trim();

    const shipStatus=firstValue(r,[
      "statusvandon","status_vandon","shipping_status","shippingStatus"
    ]);

    // User explicitly requested createdtime.
    const created=formatCreated(firstValue(r,[
      "createdtime","createdTime","created_time"
    ]));

    const tracking=firstValue(r,[
      "tracking_no","trackingNo","cf_874","tracking_number",
      "waybill","waybill_no"
    ]);
    const orderId=firstValue(r,[
      "eoi_order_id","eoi_orderid","order_id","orderId","subject"
    ]);

    const rateHtml=rate==null ? "" : `<span class="finance-rate">${rate.toFixed(2)}%</span>`;
    const isReturn=norm(statusCode)==="chuyenhoan";
    const rowFinanceHidden=!eligible || profit==null || rate==null;
    const returnReason=firstValue(r,["lydohuy","ly_do_huy","lyDoHuy","cancel_reason","cancelReason"]);

    return `<div class="order-row ${rowFinanceHidden?"finance-not-applicable":""} ${isReturn?"is-chuyenhoan":""}">
      <div class="cell product-cell">
        <img class="product-img"
             src="${esc(img(it)||"")}"
             onerror="this.onerror=null;this.style.visibility='hidden'">
        <div style="min-width:0">
          <div class="name">${esc(it.item_name||"Sản phẩm")}</div>
          <div class="muted">SKU: ${esc(sku||"—")}</div>
          <div class="muted">${subtotal==null?"—":fm(subtotal)} × ${qty}</div>
        </div>
      </div>

      <div class="cell" style="justify-content:center;text-align:center">
        <span class="pill" data-invoicestatus="${esc(statusCode)}" ${statusStyle(statusCode)}>${esc(statusText)}</span>
      </div>

      <div class="cell ${revenue==null&&cost==null?"finance-empty":"finance-present"}" style="justify-content:center;text-align:center">
        ${revenue==null&&cost==null ? "" : `<div>
          <div class="finance-label">Doanh thu</div>
          <div class="metric-main">${eligible&&revenue!=null?fm(revenue):""}</div>
          <div class="finance-label finance-secondary-label">Giá vốn</div>
          <div class="finance-sub">${eligible&&cost!=null?fm(cost):""}</div>
        </div>`}
      </div>

      <div class="cell ${profit==null?"finance-empty":"finance-present"}" style="justify-content:center;text-align:center">
        ${profit==null ? "" : `<div>
          <div class="finance-label">Lợi nhuận</div>
          <div class="metric-main">${fm(profit)}</div>
          <div class="finance-label finance-secondary-label">Tỷ lệ</div>
          <div class="finance-sub">${rateHtml}</div>
        </div>`}
      </div>

      <div class="cell" style="justify-content:center;text-align:center">
        <div>
          <div class="metric-main">${esc(orderId||"—")}</div>
          <div class="metric-sub">${esc(tracking||"—")}</div>
        </div>
      </div>

      <div class="cell" style="justify-content:center;text-align:center">
        <span class="pill">${esc(shipStatus||"—")}</span></div>

      <div class="cell shop-cell" style="justify-content:center;text-align:center">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;min-width:0;width:100%">
          <span class="shopee-logo" aria-label="Shopee">S</span>
          <div class="name shop-name" style="-webkit-line-clamp:2;max-width:100%">${esc(mappedShopName(r)||"Không xác định")}</div>
        </div>
      </div>

      <div class="cell" style="justify-content:center;text-align:center">
        <div class="muted">${esc(created)}</div>
      </div>

      <div class="cell return-reason-cell" style="justify-content:flex-start;text-align:left">
        ${isReturn && returnReason ? `<div class="return-reason-value">${esc(returnReason)}</div>` : ""}
      </div>
    </div>`;
  }).join("");

  $("ordersList").innerHTML=head+(body||empty());
  $("ordersInfo").textContent=`${rows.length} đơn hiển thị • API trả ${state.orderTotal} đơn`;
}
function setStatus(x){state.orderStatuses=x==="Tất cả"?[]:[statusKey(x)];Promise.all([loadShopMap(),loadInvoiceStatusMap()]).then(()=>ordersView())}
function pickOrderPreset(p){
  state.preset=p;
  const [st,en]=dsql(p);
  state.start=st;
  state.end=en;
  const label=$("orderRange");
  if(label)label.textContent=fmtRange(st,en);
  const btn=$("orderDateRangeButton");
  if(btn)btn.textContent=fmtRange(st,en)+" ▾";
  const a=$("orderDateStart");
  const b=$("orderDateEnd");
  if(a)a.value=st.slice(0,10);
  if(b)b.value=en.slice(0,10);
  document.querySelectorAll(".orders-toolbar .presets button").forEach(x=>{
    x.classList.toggle("active",x.textContent.trim()===p);
  });
  loadOrders();
}
function toDateTimeLocal(v){
  const m=String(v||"").match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?/);
  return m?`${m[1]}T${m[2]}`:"";
}
function toggleOrderDatePicker(){
  const p=$("orderDatePicker");
  if(p)p.classList.toggle("open");
}
function applyOrderDateRange(){
  const a=$("orderDateStart")?.value;
  const b=$("orderDateEnd")?.value;
  if(!a||!b)return;
  if(a>b)return toast("Khoảng ngày không hợp lệ");
  state.preset="Tùy chỉnh";
  state.start=a+" 00:00:00";
  state.end=b+" 23:59:59";
  const label=$("orderRange");
  if(label)label.textContent=fmtRange(state.start,state.end);
  const btn=$("orderDateRangeButton");
  if(btn)btn.textContent=fmtRange(state.start,state.end)+" ▾";
  const p=$("orderDatePicker");
  if(p)p.classList.remove("open");
  loadOrders();
}
document.addEventListener("click",e=>{
  const box=document.querySelector(".order-date-picker");
  const p=$("orderDatePicker");
  if(box&&p&&!box.contains(e.target))p.classList.remove("open");
});
function applyDates(){const a=$("od1").value,b=$("od2").value;if(!a||!b||a>b)return toast("Khoảng ngày không hợp lệ");state.start=a+" 00:00:00";state.end=b+" 23:59:59";loadOrders()}
function go(p){if(p==="report"){showReport()}else{state.page="orders";Promise.all([loadShopMap(),loadInvoiceStatusMap()]).then(()=>ordersView())}}
function toast(t){const n=document.createElement("div");n.className="notice";n.textContent=t;document.body.appendChild(n);setTimeout(()=>n.remove(),2500)}
async function boot(){
  if(!dynamicKey){loginView();return}
  try{
    state.page="report";
    shell();
    reportView();
    // Startup sequence:
    // 1) getAllResource -> cache
    // 2) invoices/invoicestatus -> cache
    // 3) listOrderEcommerce -> report data
    await loadShopMap();
    await loadInvoiceStatusMap();
    await loadReport();
  }catch(e){
    console.error("Startup error:",e);
    localStorage.removeItem("abit_dynamic_key");
    dynamicKey="";
    shopMap={};
    shopMapReady=false;
    invoiceStatusMap={};
    invoiceStatusReady=false;
    loginView("Không thể khởi tạo dữ liệu. Vui lòng đăng nhập lại.");
  }
}
boot();


if (location.protocol === 'file:') {
  document.body.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center;background:#07111f;color:#eef4ff;font-family:Segoe UI,Arial;padding:24px"><div style="max-width:620px;background:#0f1b2d;border:1px solid #213852;border-radius:16px;padding:28px"><h2 style="margin-top:0">Cần chạy Web bằng máy chủ</h2><p style="color:#8fa3c0;line-height:1.6">Không mở index.html trực tiếp bằng file://. Hãy chạy <b>start_web.bat</b> để API đăng nhập và dữ liệu Abit hoạt động.</p></div></div>';
}
