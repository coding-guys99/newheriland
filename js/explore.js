// js/explore.js
// Explore — Supabase fetch per city, client-side filters + Filter Drawer
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ---- DOM refs (match your HTML) ----
const wall  = $('#cityWall');
const head  = $('#resultHead');
const sk    = $('#skList');
const list  = $('#merchantList');
const empty = $('#emptyState');
const errBx = $('#errorState');
const btnRetry = $('#btnRetry');

// Filters container（輕量列）
const filtersBox   = $('#expFilters');
const chipsCats    = $$('.chips--cats .chip', filtersBox);   // 多選
const chipsQuick   = $$('.chips--quick .chip', filtersBox);  // 單顆切換/排序
const quickWrap    = $('.chips--quick', filtersBox);
const catsWrap     = $('.chips--cats',  filtersBox);

// ---- Filter Drawer（進階面板）DOM ----
const overlay   = document.getElementById('filterOverlay');
const panel     = overlay?.querySelector('.filter-panel');
const btnOpen   = document.getElementById('btnOpenFilter');   // 輕量列的 🎯 Filter
const btnClose  = document.getElementById('btnCloseFilter');
const btnApply  = document.getElementById('btnApplyFilter');
const btnReset  = document.getElementById('btnResetFilter');

// ---- Filter state (match your UI) ----
const state = {
  cats: new Set(),       // e.g. {"Taste","Culture"}  多選 OR
  open: false,           // true => 只顯示營業中
  minRating: null,       // e.g. 4.5
  priceLevels: new Set(),// e.g. {1,2,3,4}
  sort: 'latest',        // 'latest' | 'hot'
};

let currentCity = null;
let allMerchants = [];

// ===== Helpers =====
function toNum(n){ const x = Number(n); return Number.isFinite(x) ? x : null; }
function priceLevelNum(m){
  if (typeof m.priceLevel === 'number') return m.priceLevel;
  if (typeof m.price_level === 'number') return m.price_level;
  const s = (m.priceLevel || m.price_level || '').toString();
  const cnt = (s.match(/\$/g)||[]).length;
  return cnt || null;
}

function isOpenNow(m, ref=new Date()){
  // 新：open_hours.{sun..sat}.ranges[{open:"08:00",close:"20:00"}]
  if (m.open_hours && typeof m.open_hours === 'object'){
    const wd = ['sun','mon','tue','wed','thu','fri','sat'][ref.getDay()];
    const day = m.open_hours[wd];
    if (!day || !Array.isArray(day.ranges) || !day.ranges.length) return false;
    const cur = ref.getHours()*60 + ref.getMinutes();
    const toMin = (hhmm)=>{ const [h,mi] = hhmm.split(':').map(x=>parseInt(x,10)); return h*60+(mi||0); };
    return day.ranges.some(r=>{
      const o = toMin(r.open), c = toMin(r.close);
      return (c>o) ? (cur>=o && cur<c) : (cur>=o || cur<c); // 跨夜
    });
  }
  // 舊：openHours: "08:00 - 20:00" / "24H"
  const t = (m.openHours||'').toLowerCase().trim();
  if (!t) return false;
  if (t.includes('24h')) return true;
  const mm = t.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
  if (!mm) return false;
  const mins = (h,mi)=> parseInt(h,10)*60 + parseInt(mi||'0',10);
  const start = mins(mm[1],mm[2]||'00'), end = mins(mm[3],mm[4]||'00');
  const cur = ref.getHours()*60 + ref.getMinutes();
  return (end>start) ? (cur>=start && cur<end) : (cur>=start || cur<end);
}

// ===== Supabase =====
async function loadCities(){
  try{
    const { data, error } = await supabase
      .from('cities')
      .select('id,name,icon,count,sort_order')
      .order('sort_order',{ascending:true})
      .limit(12);
    if (error) throw error;
    return data || [];
  }catch(e){
    console.warn('Load cities failed, fallback:', e);
    return [
      {id:'kuching', name:'Kuching', icon:'🏛️', count:128},
      {id:'miri',    name:'Miri',    icon:'⛽',  count:64},
      {id:'sibu',    name:'Sibu',    icon:'🛶',  count:52},
      {id:'mukah',   name:'Mukah',   icon:'🐟',  count:18},
    ];
  }
}

async function fetchMerchants(cityId, {limit=500} = {}){
  try{
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('city_id', cityId)
      .eq('status','active')
      .order('updated_at',{ascending:false})
      .limit(limit);
    if (error) throw error;
    return { ok:true, data: data || [] };
  }catch(err){
    console.error('fetchMerchants:', err);
    return { ok:false, error: err };
  }
}

// ===== Render wall =====
function renderWall(cities){
  wall.innerHTML = '';
  cities.slice(0,12).forEach((c,i)=>{
    const btn = document.createElement('button');
    btn.className = 'citycell';
    btn.setAttribute('role','tab');
    btn.dataset.id = c.id;
    btn.setAttribute('aria-selected', i===0 ? 'true':'false');
    btn.innerHTML = `
      <span class="ico">${c.icon || '🏙️'}</span>
      <span class="name">${c.name || c.id}</span>
      <span class="count">${toNum(c.count) ?? 0}</span>
    `;
    wall.appendChild(btn);
  });
}

// ===== Render list =====
function renderMerchants(items){
  if (!items.length){
    list.hidden = true;
    empty.hidden = false;
    errBx.hidden = true;
    return;
  }
  empty.hidden = true;
  errBx.hidden = true;
  list.hidden = false;

  list.innerHTML = items.map(m=>{
    const rating = (m.rating!=null) ? Number(m.rating).toFixed(1) : null;
    const open = isOpenNow(m);
    const badgeOpen = open ? `<span class="badge ok">Open now</span>` : `<span class="badge off">Closed</span>`;
    const category = m.category || '';
    const addrShort = (m.address || '').split(',')[0];
    const price = priceLevelNum(m);
    const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';
    const cover = m.cover || (m.images?.[0]) || '';

    return `
      <div class="item" data-id="${m.id}">
        <div class="thumb" style="background-image:url('${cover}')"></div>
        <div class="meta">
          <div class="t">${m.name}</div>
          <div class="sub">${category}${addrShort ? ` · ${addrShort}` : ''}</div>
          <div class="badges">
            ${rating ? `<span class="badge">★ ${rating}</span>` : ''}
            ${badgeOpen}
            ${priceStr ? `<span class="badge">${priceStr}</span>` : ''}
          </div>
        </div>
        <div class="aux"></div>
      </div>
    `;
  }).join('');
}

// ===== Apply filters (client-side) =====
function applyFilters(){
  let arr = [...allMerchants];

  // 類別（多選 OR）
  if (state.cats.size){
    const want = new Set([...state.cats].map(s => s.toLowerCase()));
    arr = arr.filter(m => want.has((m.category||'').toLowerCase()));
  }

  // Open now
  if (state.open){
    arr = arr.filter(m => isOpenNow(m));
  }

  // Rating
  if (state.minRating != null){
    arr = arr.filter(m => (Number(m.rating)||0) >= state.minRating);
  }

  // Price（如果面板有選）
  if (state.priceLevels.size){
    const want = new Set([...state.priceLevels].map(n => Number(n)));
    arr = arr.filter(m => want.has(priceLevelNum(m) || 0));
  }

  // 排序
  if (state.sort === 'hot'){
    arr.sort((a,b)=>{
      const ra = Number(a.rating)||0, rb = Number(b.rating)||0;
      if (rb !== ra) return rb - ra;
      const ta = new Date(a.updated_at||0).getTime();
      const tb = new Date(b.updated_at||0).getTime();
      return tb - ta;
    });
  }else{ // latest
    arr.sort((a,b)=>{
      const ta = new Date(a.updated_at||0).getTime();
      const tb = new Date(b.updated_at||0).getTime();
      return tb - ta;
    });
  }

  renderMerchants(arr);
  if (head) head.textContent = `${currentCity?.name || currentCity?.id || 'City'} — ${arr.length} places`;
}

// ===== Bind filter chips（輕量列） =====
function bindFilters(){
  if (!filtersBox) return;

  // 類別：多選
  chipsCats.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cat = btn.dataset.cat;
      const on = btn.classList.toggle('is-on');
      btn.setAttribute('aria-pressed', on ? 'true':'false');
      if (on) state.cats.add(cat); else state.cats.delete(cat);
      applyFilters();
    });
  });

  // 快速條件：latest/hot 單選；open / rating 為切換
  chipsQuick.forEach(btn=>{
    if (!btn.hasAttribute('aria-pressed')){
      btn.setAttribute('aria-pressed','false');
    }

    btn.addEventListener('click', ()=>{
      const hasSort   = btn.hasAttribute('data-sort');
      const hasOpen   = btn.hasAttribute('data-open');
      const hasRating = btn.hasAttribute('data-rating');

      if (hasSort){
        // 單選：清掉同組
        $$('.chips--quick .chip[data-sort]', filtersBox).forEach(b=>{
          b.classList.remove('is-on');
          b.setAttribute('aria-pressed','false');
        });
        btn.classList.add('is-on');
        btn.setAttribute('aria-pressed','true');
        state.sort = btn.dataset.sort || 'latest';
      } else if (hasOpen){
        const on = btn.classList.toggle('is-on');
        btn.setAttribute('aria-pressed', on ? 'true':'false');
        state.open = on;
      } else if (hasRating){
        const on = btn.classList.toggle('is-on');
        btn.setAttribute('aria-pressed', on ? 'true':'false');
        state.minRating = on ? Number(btn.dataset.rating) : null;
      }

      applyFilters();
    });
  });
}

// ===== City switching =====
function selectCity(id, cityObj){
  currentCity = cityObj || { id };

  // 高亮城市牆
  $$('.citycell', wall).forEach(b=>{
    const on = b.dataset.id === id;
    b.setAttribute('aria-selected', on ? 'true':'false');
  });

  // 狀態
  head && (head.textContent = `${currentCity.name || id} — loading…`);
  sk.hidden = false; list.hidden = true;
  empty.hidden = true; errBx.hidden = true;

  // 抓資料
  fetchMerchants(id).then(res=>{
    sk.hidden = true;

    if (!res.ok){
      errBx.hidden = false;
      list.hidden = true;
      head && (head.textContent = `${currentCity.name || id}`);
      return;
    }

    allMerchants = res.data || [];
    list.hidden = false;

    // 新城市：重置排序為 latest（視覺也同步）
    state.sort = 'latest';
    $$('.chips--quick .chip[data-sort]', filtersBox).forEach(b=>{
      const on = (b.dataset.sort === 'latest');
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    applyFilters();
  });
}

// ===== Filter Drawer（進階面板）：open/close + sync =====
function syncQuickBarFromState(){
  // 類別（多選）
  catsWrap?.querySelectorAll('[data-cat]').forEach(b=>{
    const on = state.cats?.has(b.dataset.cat);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true':'false');
  });
  // open
  const qOpen = quickWrap?.querySelector('[data-open]');
  if (qOpen) qOpen.setAttribute('aria-pressed', state.open ? 'true':'false');
  if (qOpen) qOpen.classList.toggle('is-on', !!state.open);
  // rating
  quickWrap?.querySelectorAll('[data-rating]')?.forEach(b => {
    const on = state.minRating && Number(b.dataset.rating) === Number(state.minRating);
    b.setAttribute('aria-pressed', on ? 'true':'false');
    b.classList.toggle('is-on', on);
  });
  // sort
  quickWrap?.querySelectorAll('[data-sort]')?.forEach(b => {
    const on = (b.dataset.sort === (state.sort || 'latest'));
    b.setAttribute('aria-pressed', on ? 'true':'false');
    b.classList.toggle('is-on', on);
  });
}

function hydrateFromState(){ // state → 面板 UI
  if (!panel) return;
  // 類別
  panel.querySelectorAll('[data-cat]')?.forEach(b=>{
    b.classList.toggle('is-on', state.cats?.has(b.dataset.cat));
  });
  // open
  const pOpen = panel.querySelector('[data-open]');
  if (pOpen) pOpen.setAttribute('aria-pressed', state.open ? 'true':'false');
  // rating
  panel.querySelectorAll('[data-rating]')?.forEach(b=>{
    const on = state.minRating && Number(b.dataset.rating) === Number(state.minRating);
    b.setAttribute('aria-pressed', on ? 'true':'false');
  });
  // price
  panel.querySelectorAll('[data-price]')?.forEach(b=>{
    b.classList.toggle('is-on', state.priceLevels?.has(Number(b.dataset.price)));
  });
  // sort
  panel.querySelectorAll('[data-sort]')?.forEach(b=>{
    const on = (b.dataset.sort === (state.sort||'latest'));
    b.setAttribute('aria-pressed', on ? 'true':'false');
  });
}

function collectFromPanel(){ // 面板 UI → 新的暫存 state
  const next = {
    cats: new Set(),
    open: false,
    minRating: null,
    priceLevels: new Set(),
    sort: 'latest'
  };
  panel.querySelectorAll('[data-cat].is-on')?.forEach(b => next.cats.add(b.dataset.cat));
  next.open = panel.querySelector('[data-open][aria-pressed="true"]') ? true : false;

  const r = panel.querySelector('[data-rating][aria-pressed="true"]');
  next.minRating = r ? Number(r.dataset.rating) : null;

  panel.querySelectorAll('[data-price].is-on')?.forEach(b => next.priceLevels.add(Number(b.dataset.price)));

  const s = panel.querySelector('[data-sort][aria-pressed="true"]');
  next.sort = s ? s.dataset.sort : 'latest';

  return next;
}

function openDrawer(){
  if (!overlay || !panel) return;
  overlay.hidden = false;
  requestAnimationFrame(()=> overlay.classList.add('show'));
  hydrateFromState();
  panel.querySelector('.filter-head .close')?.focus({preventScroll:true});
}
function closeDrawer(){
  if (!overlay) return;
  overlay.classList.remove('show');
  setTimeout(()=> overlay.hidden = true, 200);
}

// Drawer 綁定
if (btnOpen && overlay && panel){
  btnOpen.addEventListener('click', openDrawer);
  btnClose?.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closeDrawer(); });
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && !overlay.hidden) closeDrawer(); });

  // 面板 chips 的按鈕互動（切換樣式即可）
  panel.addEventListener('click', (e)=>{
    const b = e.target.closest('.chip');
    if (!b) return;

    if (b.dataset.cat || b.dataset.price){
      b.classList.toggle('is-on');
      return;
    }
    if (b.dataset.rating){
      panel.querySelectorAll('[data-rating]').forEach(x=> x.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true');
      return;
    }
    if (b.dataset.sort){
      panel.querySelectorAll('[data-sort]').forEach(x=> x.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true');
      return;
    }
    if (b.dataset.open !== undefined){
      const on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
    }
  });

  // Reset
  btnReset?.addEventListener('click', ()=>{
    // UI reset
    panel.querySelectorAll('.chip.is-on')?.forEach(x=> x.classList.remove('is-on'));
    panel.querySelectorAll('[aria-pressed="true"]')?.forEach(x=> x.setAttribute('aria-pressed','false'));
    // state reset
    state.cats.clear();
    state.open = false;
    state.minRating = null;
    state.priceLevels = new Set();
    state.sort = 'latest';
    // 同步輕量列外觀 + 套用
    syncQuickBarFromState();
    applyFilters();
  });

  // Apply
  btnApply?.addEventListener('click', ()=>{
    const next = collectFromPanel();
    state.cats = next.cats;
    state.open = next.open;
    state.minRating = next.minRating;
    state.priceLevels = next.priceLevels;
    state.sort = next.sort;

    syncQuickBarFromState();
    applyFilters();
    closeDrawer();
  });
}

// ===== Bootstrap =====
(async function init(){
  if (!wall) return;

  btnRetry?.addEventListener('click', ()=>{
    if (currentCity?.id) selectCity(currentCity.id, currentCity);
  });

  bindFilters();

  const cities = await loadCities();
  renderWall(cities);

  // click
  wall.addEventListener('click', (e)=>{
    const btn = e.target.closest('.citycell');
    if (!btn) return;
    const city = cities.find(c => c.id === btn.dataset.id) || { id: btn.dataset.id };
    selectCity(btn.dataset.id, city);
  });

  // keyboard
  wall.addEventListener('keydown', (e)=>{
    const cells = Array.from(wall.querySelectorAll('.citycell'));
    const cur = cells.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight'){ e.preventDefault(); const n = cells[Math.min(cur+1, cells.length-1)]; n?.focus(); n?.click(); }
    if (e.key === 'ArrowLeft'){  e.preventDefault(); const p = cells[Math.max(cur-1, 0)];             p?.focus(); p?.click(); }
  });

  // 預設選第一個
  const first = wall.querySelector('.citycell');
  if (first){
    const c = cities.find(x=>x.id === first.dataset.id) || { id:first.dataset.id };
    selectCity(first.dataset.id, c);
  }
})();