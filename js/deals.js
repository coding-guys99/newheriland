// deals.js — data + filters + render + detail overlay

// DOM helpers
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ---- 假資料（之後可換成 Supabase / API）----
const DEALS = [
  {
  id: 'mid-autumn',
  title: '中秋城市聯動｜餐飲 85 折',
  cover: 'https://picsum.photos/640/360?mid',
  status: 'ongoing',
  tags: ['food','travel'],
  city: 'Kuching',
  dateRange: '10/01 – 10/15',
  summary: '指定商家餐飲 85 折，滿 50 再送在地小禮。',
  details: [
    '活動期間內於合作餐廳消費滿 RM50 即享 15% 折扣，並可獲贈「在地限定月餅」乙份。',
    '參與商家包含：The Local Kitchen、Taste Garden、Urban Brew 等超過 30 間店家。',
    '活動僅限 Kuching 地區，部分餐廳需提前預約，敬請留意公告。'
  ],
  url: '#explore?collection=mid-autumn'
},
  {
    id: 'dyson-week',
    title: 'Dyson 聯名週｜最高送 14%',
    cover: 'https://picsum.photos/640/360?dy',
    status: 'ongoing',
    tags: ['travel'],
    city: 'Sibu',
    dateRange: '10/08 – 10/20',
    summary: '電器專區滿額送；活動內容以現場公告為準。',
    url: '#explore?brand=dyson'
  },
  {
    id: '3m-zone',
    title: '3M 專區｜登記送 200',
    cover: 'https://picsum.photos/640/360?3m',
    status: 'upcoming',
    tags: ['family','group'],
    city: 'Miri',
    dateRange: '10/25 – 11/05',
    summary: '指定商品結帳回饋，數量有限先到先得。',
    url: '#explore?brand=3m'
  },
  {
    id: 'tea-fest',
    title: '花草茶節｜人氣專題',
    cover: 'https://picsum.photos/640/360?tea',
    status: 'ended',
    tags: ['food','couple'],
    city: 'Mukah',
    dateRange: '09/10 – 09/25',
    summary: '在地茶飲展售與課程，下一檔預計 12 月回歸。',
    url: '#explore?collection=tea'
  }
];

// ---- 狀態（篩選條件）----
const state = {
  status: 'ongoing',   // ongoing | upcoming | ended
  tags: new Set(),     // 'food', 'travel', ...
};

// ---- 篩選 ----
function applyFilter(list){
  return list.filter(d=>{
    if (state.status && d.status !== state.status) return false;
    if (state.tags.size){
      // 任一符合就保留
      const hit = d.tags?.some(t => state.tags.has(t));
      if (!hit) return false;
    }
    return true;
  });
}

// ---- Render：清單 ----
function cardHTML(d){
  const badge = d.status==='ongoing' ? `<span class="badge ok">進行中</span>`
              : d.status==='upcoming' ? `<span class="badge soon">即將開跑</span>`
              : `<span class="badge end">已結束</span>`;
  return `
  <article class="deal-card" data-id="${d.id}" aria-label="${d.title}">
    <div class="deal-thumb" style="background-image:url('${d.cover}')"></div>
    <div class="deal-body">
      <h3 class="deal-title">${d.title}</h3>
      <div class="deal-meta">
        ${badge}
        <span>📍 ${d.city}</span>
        <span>🗓️ ${d.dateRange}</span>
      </div>
      <div class="deal-foot">
        <span>${d.summary}</span>
        <button class="deal-cta" type="button" data-id="${d.id}">前往</button>
      </div>
    </div>
  </article>`;
}

function renderList(){
  const box = $('#dealList');
  const empty = $('#dealEmpty');
  const endHint = $('#dealEndHint');

  if (!box) return;

  const list = applyFilter(DEALS);
  if (!list.length){
    box.innerHTML = '';
    empty.hidden = false;
    endHint.hidden = true;
    return;
  }
  empty.hidden = true;

  box.setAttribute('aria-busy','true');
  box.innerHTML = list.map(cardHTML).join('');
  box.removeAttribute('aria-busy');
  endHint.hidden = false;
}

// ---- 詳情 Overlay ----
function openDetail(id){
  const d = DEALS.find(x => x.id === id);
  if (!d) return;
  const panel = $('#dealDetail');
  const cont  = $('#dealContent');
  $('#dealTitle').textContent = '活動詳情';
  cont.innerHTML = `
    <div class="deal-hero" style="background-image:url('${d.cover}')"></div>
    <h3 style="margin:4px 0 0; font-weight:800">${d.title}</h3>
    <div class="detail-meta">
      <span class="badge ${d.status==='ongoing'?'ok':d.status==='upcoming'?'soon':'end'}">
        ${d.status==='ongoing'?'進行中':d.status==='upcoming'?'即將開跑':'已結束'}
      </span>
      <span>📍 ${d.city}</span>
      <span>🗓️ ${d.dateRange}</span>
    </div>
    <p style="margin:.4rem 0">${d.summary}</p>
    <div class="detail-actions">
      <button class="btn" data-share>分享</button>
      <a class="btn primary" href="${d.url}">前往專區</a>
    </div>
  `;
  if (d.details?.length){
  cont.innerHTML += `
    <section class="deal-section">
      <h4>活動內容</h4>
      <ul>${d.details.map(t=>`<li>${t}</li>`).join('')}</ul>
    </section>
  `;
}
  panel.hidden = false;
  panel.classList.add('active');
  document.body.classList.add('no-scroll');
  cont.querySelector('[data-share]')?.addEventListener('click', async ()=>{
    try{
      await navigator.share?.({ title: d.title, text: d.summary, url: location.href });
    }catch(_){}
  });
}

function closeDetail(){
  const panel = $('#dealDetail');
  if (!panel) return;
  panel.classList.remove('active');
  panel.setAttribute('hidden','');
  document.body.classList.remove('no-scroll'); 
}

// ---- 綁定 UI ----
function bindFilterChips(){
  // 狀態
  $$('#dealsMain .filters [data-filter]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      $$('#dealsMain [data-filter]').forEach(c=>{
        c.classList.toggle('is-on', c===chip);
        c.setAttribute('aria-selected', c===chip ? 'true':'false');
      });
      state.status = chip.dataset.filter;
      renderList();
    });
  });

  // 主題 tags（可多選）
  $$('#dealsMain .filters [data-tag]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const t = chip.dataset.tag;
      const on = chip.classList.toggle('is-on');
      if (on) state.tags.add(t); else state.tags.delete(t);
      renderList();
    });
  });
}

// 只讓 CTA 觸發詳情、卡片本身不做事
function bindListActions(){
  // CTA 前往 → 打開詳情（避免誤觸，整卡不做事）
  $('#dealList')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.deal-cta'); if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.id;
    if (id) openDetail(id);
  });

  // 詳情關閉
  $('#btnCloseDeal')?.addEventListener('click', closeDetail);

  // 重新整理（空/錯誤）
  $('#btnDealRetry')?.addEventListener('click', renderList);
  $('#btnDealRetry2')?.addEventListener('click', renderList);

  // 返回首頁
  $('#btnBackHome')?.addEventListener('click', ()=>{
    location.href = 'index.html#home';
  });
}

// ---- 啟動 ----
document.addEventListener('DOMContentLoaded', ()=>{
  bindFilterChips();
  bindListActions();
  renderList();
});