// js/newly.js — 新上架（使用共用 detail overlay）

// DOM helpers
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// 假資料（之後換 Supabase）
const NEWLY = [
  {id:'n1',name:'椰香小館',city:'Kuching',type:'餐飲',daysAgo:1,thumb:'https://picsum.photos/300/200?food'},
  {id:'n2',name:'Sibu Heritage Walk',city:'Sibu',type:'體驗',daysAgo:2,thumb:'https://picsum.photos/300/200?heritage'},
  {id:'n3',name:'Borneo Coffee Roasters',city:'Miri',type:'飲品',daysAgo:4,thumb:'https://picsum.photos/300/200?coffee'},
  {id:'n4',name:'Mukah Craft Studio',city:'Mukah',type:'文創',daysAgo:8,thumb:'https://picsum.photos/300/200?craft'},
  {id:'n5',name:'Dayak Village Stay',city:'Kuching',type:'住宿',daysAgo:12,thumb:'https://picsum.photos/300/200?village'},
];

// 篩選狀態
let filter = 'all';

// 篩選器
function applyFilter(list){
  if (filter === '7d')  return list.filter(i => i.daysAgo <= 7);
  if (filter === '30d') return list.filter(i => i.daysAgo <= 30);
  return list;
}

// 卡片 HTML
function cardHTML(d){
  const timeLabel = d.daysAgo <= 1 ? '今天' : d.daysAgo + ' 天前';
  const badge = d.daysAgo <= 7 ? `<span class="newly-badge">NEW</span>` : '';
  const summary = d.summary || d.desc || '';
  const tagLine = d.tags?.length
    ? `<div class="tags">${d.tags.slice(0,2).map(t=>`<span>#${t}</span>`).join('')}</div>`
    : '';

  return `
  <article class="newly-card" data-id="${d.id}">
    <div class="newly-thumb" style="background-image:url('${d.thumb || 'https://via.placeholder.com/300x200?text=No+Image'}')"></div>
    <div class="newly-info">
      <h3>${d.name}${badge}</h3>
      <div class="meta">${d.city} · ${d.type}</div>
      ${summary ? `<p class="summary">${summary}</p>` : ''}
      ${tagLine}
      <div class="time">${timeLabel}</div>
    </div>
  </article>`;
}

// 渲染清單
function renderList(){
  const box = $('#newlyList');
  const empty = $('#newlyEmpty');
  if (!box) return;

  const list = applyFilter(NEWLY);
  if (!list.length){
    box.innerHTML = '';
    empty && (empty.hidden = false);
    return;
  }
  empty && (empty.hidden = true);
  box.innerHTML = list.map(cardHTML).join('');
}

// 綁定篩選 chips
function bindFilters(){
  $$('#newlyMain [data-filter]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('#newlyMain [data-filter]').forEach(c=>{
        c.classList.toggle('is-on', c===btn);
        c.setAttribute('aria-selected', c===btn ? 'true' : 'false');
      });
      filter = btn.dataset.filter;
      renderList();
    });
  });
}

// 開啟共用詳情
function openNewlyDetail(id){
  const d = NEWLY.find(x => x.id === id);
  if (!d) return;

  // 共用 overlay 的 API（在 detail-overlay.js 裡 export 的）
  // 如果你是用 <script type="module">，這裡直接呼叫全域的 window.openDetailView
  const openFn = window.openDetailView || window.showDetailOverlay; // 看你最後取哪個名字
  if (typeof openFn === 'function'){
    openFn({
      id: d.id,
      title: d.name,
      cover: d.thumb,
      city: d.city,
      type: d.type,
      // 這裡先塞描述，之後你從 Supabase 帶完整的再換
      description: '這是最新上架的在地店家，點「到商家頁」可看更完整資訊。',
      tags: d.tags || [],
      actions: [
        { type: 'primary', label: '到商家頁', href: `#detail/${d.id}` },
        { type: 'ghost',   label: '分享',     action: 'share' }
      ]
    });
  }else{
    // 如果你還沒載入共用 js，就暫時 alert 一下，避免沒反應
    alert(`${d.name}\n${d.city} · ${d.type}`);
  }
}

// 綁定清單點擊
function bindListActions(){
  $('#newlyList')?.addEventListener('click', (e)=>{
    const card = e.target.closest('.newly-card'); 
    if (!card) return;
    openNewlyDetail(card.dataset.id);
  });
}

// Header：返回 & 設定
function bindHeader(){
  $('#btnBackHome')?.addEventListener('click', ()=>{
    // 回首頁 hash
    location.href = 'index.html#home';
  });
  $('#btnOpenSettings')?.addEventListener('click', ()=>{
    const s = $('#p-settings');
    if (s){ s.hidden = false; s.classList.add('active'); }
  });
}

// 啟動
document.addEventListener('DOMContentLoaded', ()=>{
  bindHeader();
  bindFilters();
  bindListActions();
  renderList();
});