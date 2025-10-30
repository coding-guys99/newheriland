// experiences.js — list (2-column, reuse featured.css) + detail page fill

// ---------- tiny helpers ----------
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const qs  = (k, d=location.search) => new URLSearchParams(d).get(k) || '';
const toCaps = (s='') => (s||'').toString().toUpperCase();

// ---------- mock data (swap to Supabase later) ----------
/*
Supabase table: experiences
- id (text/uuid)
- title (text)
- cover (text)
- images (jsonb)
- city_id (text)
- tags (jsonb)
- summary (text)
- description (text)
- status (text)         // 'active' | 'draft'
- featured_rank (int)   // 1 is top
- created_at (ts)
*/
const EXPERIENCES = [
  {
    id: 'xp-sarawak-museum',
    title: '砂拉越博物館：穿越百年的人類學收藏',
    cover: 'https://picsum.photos/800/450?museum',
    images: [],
    city_id: 'kuching',
    tags: ['culture','family','weekend'],
    summary: '東南亞頂尖的人類學與天然史館藏，一次走讀砂拉越百年歷史。',
    description: '以輕導覽為主，推薦親子與第一次到古晉的旅人。館內動線友善、設施新穎，雨天也能輕鬆安排。',
    status: 'active',
    featured_rank: 1
  },
  {
    id: 'xp-kampung-foodwalk',
    title: '甘榜美食散步：在地早餐與早市文化',
    cover: 'https://picsum.photos/800/450?food',
    images: [],
    city_id: 'sibu',
    tags: ['food','culture','weekend'],
    summary: '跟著在地人走早市，米糕、乾盤麵、傳統糕點一路吃。',
    description: '無需預約；清晨集合，路線 1.5–2 小時。以吃與拍照為主，視天候調整。',
    status: 'active',
    featured_rank: 2
  },
  {
    id: 'xp-sunset-kayak',
    title: '紅樹林黃昏獨木舟',
    cover: 'https://picsum.photos/800/450?kayak',
    images: [],
    city_id: 'miri',
    tags: ['outdoor','weekend','family'],
    summary: '在導教陪同下，安全體驗潟湖水道與夕陽金光。',
    description: '適合初學者，救生衣與基本裝備包含在內。建議攜帶防曬與防水包。',
    status: 'active',
    featured_rank: 4
  },
  {
    id: 'xp-handcraft-beads',
    title: '手作串珠：傳統圖紋與當代飾品',
    cover: 'https://picsum.photos/800/450?handcraft',
    images: [],
    city_id: 'mukah',
    tags: ['handcraft','culture'],
    summary: '從圖紋故事到配色實作，做一件只屬於你的紀念小物。',
    description: '小班制工作坊，材料現場提供。無需經驗，專人指導。',
    status: 'active',
    featured_rank: 3
  }
];

// ---------- state (filters, optional) ----------
const state = {
  filter: 'all', // 'all' | 'featured'
  tags: new Set(['culture','food','outdoor','handcraft','family','weekend']),
  cities: new Set(['kuching','sibu','miri','mukah'])
};

// ---------- filter + sort ----------
function applyFilter(list){
  const base = list.filter(x => x.status === 'active');

  const byFeat = (state.filter === 'featured')
    ? base.filter(x => Number.isFinite(x.featured_rank))
    : base;

  const byTag = byFeat.filter(x => {
    if (!x.tags?.length) return false;
    return x.tags.some(t => state.tags.has(t));
  });

  const byCity = byTag.filter(x => state.cities.has(x.city_id));

  return byCity.sort((a,b)=>{
    const af = Number.isFinite(a.featured_rank) ? a.featured_rank : 9999;
    const bf = Number.isFinite(b.featured_rank) ? b.featured_rank : 9999;
    return af - bf || a.title.localeCompare(b.title);
  });
}

// ---------- list: render (use featured.css structures) ----------
function cardHTML(x){
  // 使用 .card-v 結構，以便直接吃 featured.css
  const tagsLine = (x.tags||[]).map(t=>`#${t}`).join(' ');
  return `
    <article class="card-v" data-id="${x.id}" aria-label="${x.title}">
      <div class="thumb" style="background-image:url('${x.cover}')"></div>
      <div class="body">
        <h3 class="name">${x.title}</h3>
        <div class="sub">${tagsLine || '&nbsp;'}</div>
        <div class="meta">📍 ${toCaps(x.city_id)}</div>
        <div class="foot">
          <button class="btn" data-act="share"  data-id="${x.id}">分享</button>
          <button class="btn" data-act="detail" data-id="${x.id}">看介紹</button>
        </div>
      </div>
    </article>
  `;
}

function renderList(){
  const box = $('#xpList');
  const empty = $('#xpEmpty');
  if (!box) return;

  const list = applyFilter(EXPERIENCES);
  if (!list.length){
    box.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  // 兩欄容器（確保 class）
  box.classList.add('row','cards');
  box.innerHTML = list.map(cardHTML).join('');
}

// ---------- list: bind actions ----------
function bindListActions(){
  // 點按鈕（避免整卡誤觸）
  $('#xpList')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn'); if (!btn) return;
    const id  = btn.dataset.id;
    const act = btn.dataset.act;

    if (act === 'detail' && id){
      // 跳到獨立詳情頁
      location.href = `./partial/detail.html?id=${encodeURIComponent(id)}`;
    }
    if (act === 'share' && id){
      const x = EXPERIENCES.find(y => y.id === id);
      if (!x) return;
      (async ()=>{
        try{
          await navigator.share?.({ title: x.title, text: x.summary, url: location.href });
        }catch(_){}
      })();
    }
  });
}

// （可選）filter chips 綁定：如果頁面放了 chips 就會生效
function bindFilters(){
  $$('#xpMain [data-filter]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      $$('#xpMain [data-filter]').forEach(c=>{
        const on = (c===chip);
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      state.filter = chip.dataset.filter;
      renderList();
    });
  });

  $$('#xpMain [data-tag]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const tag = chip.dataset.tag;
      const on = chip.classList.toggle('is-on');
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) state.tags.add(tag); else state.tags.delete(tag);
      renderList();
    });
  });

  $$('#xpMain [data-city]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const c = chip.dataset.city;
      const on = chip.classList.toggle('is-on');
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) state.cities.add(c); else state.cities.delete(c);
      renderList();
    });
  });
}

// ---------- detail page: fill by ?id= ----------
function renderDetailPage(){
  const id = qs('id');
  if (!id) return;

  const x = EXPERIENCES.find(y => y.id === id);
  if (!x) {
    // 簡單空狀態
    const ct = $('#xpContent') || document.body;
    ct.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">🫥</div>
        <div class="empty-title">找不到這個體驗</div>
        <div class="empty-sub">請返回上一頁或稍後再試。</div>
      </div>`;
    return;
  }

  // 盡量容錯多種節點 id，對應你現有/未來的 detail HTML
  const titleEl = $('#xpTitle') || $('#xpDetailTitle') || $('h1');
  const heroBox = $('#xpHero') || $('#xpDetailHero') || $('.xp-hero');
  const heroImg = $('#xpHeroImg');
  const metaBox = $('#xpMeta') || $('#xpDetailMeta');
  const tagsBox = $('#xpTags');
  const descBox = $('#xpDesc') || $('#xpDetailDesc') || $('.xp-detail-copy');

  if (titleEl) titleEl.textContent = x.title;

  if (heroImg) {
    heroImg.src = x.cover;
    heroImg.alt = x.title;
  } else if (heroBox) {
    heroBox.style.backgroundImage = `url('${x.cover}')`;
    heroBox.style.backgroundSize = 'cover';
    heroBox.style.backgroundPosition = 'center';
  }

  if (metaBox) {
    metaBox.innerHTML = `📍 ${toCaps(x.city_id)}`;
  }

  const tagLine = (x.tags||[]).map(t => `<span class="xp-tag">#${t}</span>`).join(' ');
  if (tagsBox) tagsBox.innerHTML = tagLine;
  if (descBox) descBox.textContent = x.description || x.summary || '';

  // 行動按鈕（可選）
  $('#xpGoCity')?.addEventListener('click', ()=>{
    location.href = `explore.html#explore?city=${encodeURIComponent(x.city_id)}`;
  });
  $('#xpShare')?.addEventListener('click', async ()=>{
    try{
      await navigator.share?.({ title: x.title, text: x.summary, url: location.href });
    }catch(_){}
  });
  $('#btnBackHome')?.addEventListener('click', ()=> location.href = 'index.html#home');
}

// ---------- bootstrap ----------
document.addEventListener('DOMContentLoaded', ()=>{
  // 如果是入口清單頁（有 #xpList 或 #xpMain），渲染兩欄清單
  if ($('#xpList') || $('#xpMain')) {
    renderList();
    bindListActions();
    bindFilters(); // 沒放 chips 也不會出錯
  }
  // 如果是詳情頁（有 #xpDetail 或 #xpContent），填入內容
  if ($('#xpDetail') || $('#xpContent')) {
    renderDetailPage();
  }
});