// js/newly.js — 新上架頁面

// 小工具
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// 假資料（之後可換 Supabase）
const NEWLY = [
  {id:'n1',name:'椰香小館',city:'Kuching',type:'餐飲',daysAgo:1,thumb:'https://picsum.photos/300/200?food',    summary:'道地砂勞越口味，主打椰香海鮮套餐。',tags:['food','local']},
  {id:'n2',name:'Sibu Heritage Walk',city:'Sibu',type:'體驗',daysAgo:2,thumb:'https://picsum.photos/300/200?heritage',summary:'導覽老街、碼頭與在地故事的半日遊。',tags:['tour','culture']},
  {id:'n3',name:'Borneo Coffee Roasters',city:'Miri',type:'飲品',daysAgo:4,thumb:'https://picsum.photos/300/200?coffee',summary:'手烘咖啡＋在地甜點，週末滿座。',tags:['coffee','dessert']},
  {id:'n4',name:'Mukah Craft Studio',city:'Mukah',type:'文創',daysAgo:8,thumb:'https://picsum.photos/300/200?craft',summary:'展示與販售 Melanau 編織工藝。',tags:['craft','souvenir']},
  {id:'n5',name:'Dayak Village Stay',city:'Kuching',type:'住宿',daysAgo:12,thumb:'https://picsum.photos/300/200?village',summary:'山區部落體驗，附早餐與傳統表演。',tags:['stay','nature']},
];

// 狀態
let filter = 'all';

// 篩選
function applyFilter(list){
  if (filter === '7d')  return list.filter(i => i.daysAgo <= 7);
  if (filter === '30d') return list.filter(i => i.daysAgo <= 30);
  return list;
}

// 卡片 HTML
function cardHTML(d){
  const timeLabel = d.daysAgo <= 1 ? '今天' : d.daysAgo + ' 天前';
  const badge = d.daysAgo <= 7 ? `<span class="newly-badge">NEW</span>` : '';
  const summary = d.summary ? `<p class="summary">${d.summary}</p>` : '';
  const tagLine = d.tags?.length
    ? `<div class="tags">${d.tags.slice(0,2).map(t => `<span>#${t}</span>`).join('')}</div>`
    : '';

  return `
  <article class="newly-card" data-id="${d.id}">
    <div class="newly-thumb" style="background-image:url('${d.thumb || 'https://via.placeholder.com/300x200?text=No+Image'}')"></div>
    <div class="newly-info">
      <h3>${d.name}${badge}</h3>
      <div class="meta">${d.city} · ${d.type}</div>
      ${summary}
      ${tagLine}
      <div class="time">${timeLabel}</div>
    </div>
  </article>`;
}

// 渲染清單
function renderList(){
  const box   = $('#newlyList');
  const empty = $('#newlyEmpty');
  if (!box) return;

  const list = applyFilter(NEWLY);
  if (!list.length){
    box.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;
  box.innerHTML = list.map(cardHTML).join('');
}

// 開啟詳情（用共用 overlay）
function openNewlyDetailById(id){
  const d = NEWLY.find(x => x.id === id);
  if (!d) return;

  // 有共用的漂亮版 → 用它
  if (typeof window.openDetailView === 'function'){
    window.openDetailView({
      id: d.id,
      title: d.name,
      subtitle: `${d.city} · ${d.type}`,
      cover: d.thumb,
      status: 'info',
      city: d.city,
      dateRange: '',
      body: d.summary || '這是一個示意的商家詳情區塊，可連結到 Explore 頁面顯示更完整資訊。',
      actions: [
        {
          type: 'primary',
          label: '前往 Explore',
          href: `index.html#explore?city=${encodeURIComponent(d.city)}`
        },
        {
          type: 'ghost',
          label: '關閉',
          action: 'close'
        }
      ]
    });
    return;
  }

  // 沒有共用就保命 alert
  alert(`${d.name}\n${d.city} · ${d.type}`);
}

// 綁定篩選
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

// 綁定卡片
function bindListClicks(){
  $('#newlyList')?.addEventListener('click', (e)=>{
    const card = e.target.closest('.newly-card');
    if (!card) return;
    openNewlyDetailById(card.dataset.id);
  });
}

// Header 按鈕
function bindHeader(){
  $('#btnBackHome')?.addEventListener('click', ()=>{
    // 回到主頁的 home tab
    location.href = 'index.html#home';
  });

  $('#btnOpenSettings')?.addEventListener('click', ()=>{
    // 這裡沿用 app.js 那套 settings overlay
    const s = $('#p-settings');
    if (s){
      s.hidden = false;
      s.classList.add('active');
    }
  });
}

// 初始化（等 DOM）
document.addEventListener('DOMContentLoaded', ()=>{
  bindFilters();
  bindListClicks();
  bindHeader();
  renderList();

  // 如果你這頁的 overlay 是透過 <include> 注入的
  // 再補聽一次，確保真的載入了
  document.addEventListener('include:loaded', (e)=>{
    if (e.detail?.src?.includes('detail-overlay.html')){
      // 再 render 一次也沒關係，資料不大
      renderList();
    }
  });
});