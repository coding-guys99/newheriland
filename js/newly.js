// DOM helpers
const $ = (s,r=document)=>r.querySelector(s);
const $$= (s,r=document)=>Array.from(r.querySelectorAll(s));

// 假資料（之後換 Supabase）
const NEWLY = [
  {id:'n1',name:'椰香小館',city:'Kuching',type:'餐飲',daysAgo:1,thumb:'https://picsum.photos/300/200?food'},
  {id:'n2',name:'Sibu Heritage Walk',city:'Sibu',type:'體驗',daysAgo:2,thumb:'https://picsum.photos/300/200?heritage'},
  {id:'n3',name:'Borneo Coffee Roasters',city:'Miri',type:'飲品',daysAgo:4,thumb:'https://picsum.photos/300/200?coffee'},
  {id:'n4',name:'Mukah Craft Studio',city:'Mukah',type:'文創',daysAgo:8,thumb:'https://picsum.photos/300/200?craft'},
  {id:'n5',name:'Dayak Village Stay',city:'Kuching',type:'住宿',daysAgo:12,thumb:'https://picsum.photos/300/200?village'},
];

// 狀態
let filter = 'all';

// 篩選
function applyFilter(list){
  if(filter==='7d') return list.filter(i=>i.daysAgo<=7);
  if(filter==='30d') return list.filter(i=>i.daysAgo<=30);
  return list;
}

// 渲染卡片
function cardHTML(d){
  const timeLabel = d.daysAgo<=1?'今天':d.daysAgo+' 天前';
  const badge = d.daysAgo<=7?`<span class="newly-badge">NEW</span>`:'';
  return `
  <article class="newly-card" data-id="${d.id}">
    <div class="newly-thumb" style="background-image:url('${d.thumb}')"></div>
    <div class="newly-info">
      <h3>${d.name}${badge}</h3>
      <div class="meta">${d.city} · ${d.type}</div>
      <div class="time">${timeLabel}</div>
    </div>
  </article>`;
}

function renderList(){
  const box = $('#newlyList');
  const empty = $('#newlyEmpty');
  const list = applyFilter(NEWLY);
  if(!list.length){ box.innerHTML=''; empty.hidden=false; return; }
  empty.hidden=true;
  box.innerHTML = list.map(cardHTML).join('');
}

// 綁定篩選
function bindFilters(){
  $$('#newlyMain [data-filter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      $$('#newlyMain [data-filter]').forEach(c=>{
        c.classList.toggle('is-on',c===btn);
        c.setAttribute('aria-selected',c===btn?'true':'false');
      });
      filter = btn.dataset.filter;
      renderList();
    });
  });
}

// 詳情（共用 overlay 樣式）
function openDetail(id){
  const d = NEWLY.find(x=>x.id===id);
  if(!d) return;
  const panel = $('#newlyDetail');
  const cont = $('#newlyContent');
  cont.innerHTML = `
    <div class="deal-hero" style="background-image:url('${d.thumb}')"></div>
    <h3 style="margin-top:8px">${d.name}</h3>
    <p style="color:#475569;font-size:14px">${d.city} · ${d.type}</p>
    <p style="margin:.6rem 0">這是一個示意的商家詳情區塊，可連結到 Explore 頁面顯示更完整資訊。</p>
  `;
  panel.hidden=false;
  panel.classList.add('active');
  document.body.classList.add('no-scroll');
}

function closeDetail(){
  const panel=$('#newlyDetail');
  panel.classList.remove('active');
  panel.hidden=true;
  document.body.classList.remove('no-scroll');
}

// 綁定卡片點擊
function bindListActions(){
  $('#newlyList')?.addEventListener('click',(e)=>{
    const card=e.target.closest('.newly-card'); if(!card) return;
    openDetail(card.dataset.id);
  });
  $('#btnCloseNewly')?.addEventListener('click',closeDetail);
}

// Header 功能
$('#btnBackHome')?.addEventListener('click',()=>location.href='index.html#home');
$('#btnOpenSettings')?.addEventListener('click',()=>{
  const s=$('#p-settings');
  if(s){s.hidden=false;s.classList.add('active');}
});

// 啟動
document.addEventListener('DOMContentLoaded',()=>{
  bindFilters();
  bindListActions();
  renderList();
});