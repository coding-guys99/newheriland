// experiences.js — 兩欄卡片樣式對應版（結構微調，邏輯不變）

// helpers
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ---- 假資料（之後可換成 Supabase / API）----
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

// ---- 狀態（篩選）----
const state = {
  filter: 'all', // 'all' | 'featured'
  tags: new Set(['culture','food','outdoor','handcraft','family','weekend']),
  cities: new Set(['kuching','sibu','miri','mukah'])
};

// ---- 篩選 ----
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

// ---- Render：卡片（兩欄結構對應）----
function cardHTML(x){
  const featured = Number.isFinite(x.featured_rank);
  const city = (x.city_id||'').toUpperCase();
  const tags = (x.tags||[]).map(t=>`<span class="xp-tag">#${t}</span>`).join('');
  const sum  = x.summary || '';
  const rating = (x.rating || 4.5).toFixed(1);
  const sub = x.summary.split('，')[0] || '';

  if (featured){
    return `
    <article class="xp-card" data-id="${x.id}">
    <div class="xp-thumb" style="background-image:url('${x.cover}')"></div>
    <div class="xp-body">
      <h3 class="xp-title">${x.title}</h3>
      <p class="xp-sub">${sub}</p>
      <div class="xp-meta">
        <span>⭐ ${rating}</span>
        <span>📍 ${x.city_id.toUpperCase()}</span>
      </div>
      <button class="xp-btn" data-id="${x.id}" data-act="detail">查看詳情</button>
    </div>
  </article>`;
  }

  return `
  <article class="xp-card" data-id="${x.id}" aria-label="${x.title}">
    <div class="xp-cover" style="background-image:url('${x.cover}')"></div>
    <div class="xp-body">
      <h3 class="xp-title">${x.title}</h3>
      <div class="xp-meta">📍 ${city}</div>
      <p class="xp-desc">${sum}</p>
      <div class="xp-foot">
        <button class="xp-cta" data-id="${x.id}" data-act="share">分享</button>
        <button class="xp-cta primary" data-id="${x.id}" data-act="detail">看介紹</button>
      </div>
    </div>
  </article>`;
}

function renderList(){
  const box = $('#xpList');
  const empty = $('#xpEmpty');
  if (!box) return;

  const list = applyFilter(EXPERIENCES);
  if (!list.length){
    box.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  box.setAttribute('aria-busy','true');
  box.innerHTML = list.map(cardHTML).join('');
  box.removeAttribute('aria-busy');
}

// ---- 詳情 Overlay（玻璃款）----
function openDetail(id){
  const x = EXPERIENCES.find(y => y.id === id);
  if (!x) return;

  const panel = $('#xpDetail');
  const cont  = $('#xpContent');
  $('#xpTitle').textContent = '體驗介紹';

  const hero = `<div class="xp-hero" style="background-image:url('${x.cover}')"></div>`;

  cont.innerHTML = `
    ${hero}
    <h3 class="xp-detail-title">${x.title}</h3>
    <div class="xp-detail-meta">
      <span>📍 ${(x.city_id||'').toUpperCase()}</span>
      ${(x.tags||[]).map(t=>`<span class="xp-tag">#${t}</span>`).join('')}
    </div>
    <p class="xp-detail-copy">${x.description || x.summary || ''}</p>
    <div class="xp-detail-actions">
      <button class="xp-btn" data-share>分享</button>
      <a class="xp-btn primary" href="explore.html#explore?city=${encodeURIComponent(x.city_id)}">去城市館</a>
    </div>
  `;

  panel.hidden = false;
  panel.classList.add('active');
  document.body.classList.add('no-scroll');

  cont.querySelector('[data-share]')?.addEventListener('click', async ()=>{
    try{
      await navigator.share?.({ title: x.title, text: x.summary, url: location.href });
    }catch(_){}
  });
}

function closeDetail(){
  const panel = $('#xpDetail');
  if (!panel) return;
  panel.classList.remove('active');
  panel.setAttribute('hidden','');
  document.body.classList.remove('no-scroll');
}

// ---- 綁定 ----
function bindFilters(){
  // 全部 / 精選
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

  // Tag 多選
  $$('#xpMain [data-tag]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const tag = chip.dataset.tag;
      const on = chip.classList.toggle('is-on');
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) state.tags.add(tag); else state.tags.delete(tag);
      renderList();
    });
  });

  // 城市多選
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

function bindListActions(){
  // 僅按鈕觸發，避免誤觸整卡
  $('#xpList')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.xp-cta,.xp-btn'); if (!btn) return;
    const id  = btn.dataset.id;
    const act = btn.dataset.act || (btn.hasAttribute('data-share') ? 'share' : '');
    if (act === 'detail' && id) openDetail(id);
    if (act === 'share'  && id){
      const x = EXPERIENCES.find(y => y.id === id);
      if (!x) return;
      (async ()=>{
        try{
          await navigator.share?.({ title: x.title, text: x.summary, url: location.href });
        }catch(_){}
      })();
    }
  });

  $('#btnCloseXp')?.addEventListener('click', closeDetail);
  $('#btnXpRetry')?.addEventListener('click', renderList);
  $('#btnBackHome')?.addEventListener('click', ()=> location.href = 'index.html#home');
}

// ---- 啟動 ----
document.addEventListener('DOMContentLoaded', ()=>{
  bindFilters();
  bindListActions();
  renderList();
});