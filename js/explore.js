// js/explore.js
// Explore — Supabase fetch per city, lightweight filters + Advanced Drawer, with summary chips
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ---------- DOM ---------- */
const wall  = $('#cityWall');
const head  = $('#resultHead');
const sk    = $('#skList');
const list  = $('#merchantList');
const empty = $('#emptyState');
const errBx = $('#errorState');
const btnRetry = $('#btnRetry');

const filtersBox = $('#expFilters');
const quickChips = $$('.chips--quick .chip', filtersBox);
const btnOpenDrawer = $('#btnOpenFilter');

const summaryBox = $('#activeFilters');

/* Advanced Drawer */
const drawer   = $('#advFilter');
const btnClose = $('#btnAdvClose');
const btnReset = $('#btnAdvReset');
const btnApply = $('#btnAdvApply');
const afCats   = $('#afCats');
const afThemes = $('#afThemes');
const afAttrs  = $('#afAttrs');
const afMore   = $('#afMore');
const afSort   = $('#afSort');

/* ---------- State ---------- */
const state = {
  cats: new Set(),        // Taste / Nature / ...
  themes: new Set(),      // Market / Heritage / ...
  attrs: new Set(),       // Halal / Vegan / ...
  open: false,
  minRating: null,        // e.g. 4.5
  prices: new Set(),      // 1..4
  sort: 'latest',         // latest | hot | rating
};
let currentCity = null;
let allMerchants = [];

/* ---------- Utils ---------- */
const toNum = (n)=> (Number.isFinite(Number(n)) ? Number(n) : null);
function priceLevelNum(m){
  if (typeof m.price_level === 'number') return m.price_level;
  if (typeof m.priceLevel  === 'number') return m.priceLevel;
  const s = (m.price_level || m.priceLevel || '').toString();
  const cnt = (s.match(/\$/g)||[]).length;
  return cnt || null;
}
function isOpenNow(m, ref=new Date()){
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

/* ---------- Supabase ---------- */
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

/* ---------- Render ---------- */
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
function renderMerchants(items){
  if (!items.length){
    list.hidden = true; empty.hidden = false; errBx.hidden = true;
    return;
  }
  empty.hidden = true; errBx.hidden = true; list.hidden = false;

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

/* ---------- Filters ---------- */
function applyFilters(){
  let arr = [...allMerchants];

  // Categories（OR）
  if (state.cats.size){
    const want = new Set([...state.cats].map(s=>s.toLowerCase()));
    arr = arr.filter(m => want.has((m.category||'').toLowerCase()));
  }
  // Themes（OR / 與資料的交集）
  if (state.themes.size){
    arr = arr.filter(m=>{
      const t = Array.isArray(m.themes) ? m.themes : [];
      return t.some(x => state.themes.has(String(x)));
    });
  }
  // Attributes（OR / 與資料的交集）
  if (state.attrs.size){
    // 支援 m.attributes 陣列 或 m.attributes_json 物件的 true 值
    arr = arr.filter(m=>{
      if (Array.isArray(m.attributes)){
        return m.attributes.some(x => state.attrs.has(String(x)));
      }
      if (m.attributes_json && typeof m.attributes_json === 'object'){
        return [...state.attrs].some(k => m.attributes_json[k] === true);
      }
      return false;
    });
  }
  // Open now
  if (state.open) arr = arr.filter(m => isOpenNow(m));
  // Rating
  if (state.minRating != null) arr = arr.filter(m => (Number(m.rating)||0) >= state.minRating);
  // Price（OR）
  if (state.prices.size){
    arr = arr.filter(m => state.prices.has(String(priceLevelNum(m)||'')));
  }
  // Sort
  if (state.sort === 'hot'){
    arr.sort((a,b)=>{
      const ra = Number(a.rating)||0, rb = Number(b.rating)||0;
      if (rb !== ra) return rb - ra;
      return new Date(b.updated_at||0) - new Date(a.updated_at||0);
    });
  } else if (state.sort === 'rating'){
    arr.sort((a,b)=> (Number(b.rating)||0) - (Number(a.rating)||0));
  } else {
    arr.sort((a,b)=> new Date(b.updated_at||0) - new Date(a.updated_at||0));
  }

  renderMerchants(arr);
  if (head) head.textContent = `${currentCity?.name || currentCity?.id || 'City'} — ${arr.length} places`;

  renderSummaryChips(); // 更新摘要列
}

/* 摘要列 chips */
function renderSummaryChips(){
  const chips = [];

  if (state.cats.size)   chips.push(...[...state.cats].map(v => ({k:'cat', v})));
  if (state.themes.size) chips.push(...[...state.themes].map(v => ({k:'theme', v})));
  if (state.attrs.size)  chips.push(...[...state.attrs].map(v => ({k:'attr', v})));
  if (state.minRating)   chips.push({k:'rating', v: String(state.minRating)});
  if (state.prices.size) chips.push(...[...state.prices].map(v => ({k:'price', v})));
  if (state.open)        chips.push({k:'open', v:'Open now'});
  if (state.sort && state.sort!=='latest') chips.push({k:'sort', v: state.sort}); // latest 略過

  if (!chips.length){ summaryBox.hidden = true; summaryBox.innerHTML = ''; return; }
  summaryBox.hidden = false;
  summaryBox.innerHTML = chips.map(c => `
    <button class="chip chip--pill" data-k="${c.k}" data-v="${c.v}">
      ${c.v} <span aria-hidden="true">×</span>
    </button>
  `).join('');

  // 移除單一條件
  summaryBox.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const k = btn.dataset.k, v = btn.dataset.v;
      if (k==='cat')   state.cats.delete(v);
      if (k==='theme') state.themes.delete(v);
      if (k==='attr')  state.attrs.delete(v);
      if (k==='price') state.prices.delete(v);
      if (k==='rating') state.minRating = null;
      if (k==='open')   state.open = false;
      if (k==='sort')   state.sort = 'latest';
      syncQuickFromState();
      syncDrawerFromState();
      applyFilters();
    });
  });
}

/* 輕量列行為：latest/hot 單選；open 切換；Filter 開抽屜 */
function bindQuick(){
  if (!filtersBox) return;
  quickChips.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if (btn.dataset.sort){
        // 單選
        $$('.chips--quick [data-sort]', filtersBox).forEach(b=>{
          b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
        });
        btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
        state.sort = btn.dataset.sort;
        applyFilters();
      } else if (btn.hasAttribute('data-open')){
        const on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', on ? 'true':'false');
        btn.classList.toggle('is-on', on);
        state.open = on;
        applyFilters();
      } else if (btn.id === 'btnOpenFilter'){
        openDrawer();
      }
    });
  });
}
function syncQuickFromState(){
  // sort
  $$('.chips--quick [data-sort]', filtersBox).forEach(b=>{
    const on = (b.dataset.sort === state.sort);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true':'false');
  });
  // open
  const openBtn = $('.chips--quick [data-open]', filtersBox);
  if (openBtn){
    openBtn.classList.toggle('is-on', state.open);
    openBtn.setAttribute('aria-pressed', state.open ? 'true':'false');
  }
}

/* 進階抽屜：開關 / Reset / Apply / 雙向同步 */
function openDrawer(){
  drawer.hidden = false;
  requestAnimationFrame(()=> drawer.classList.add('active'));
  $('#h-advfilter')?.focus({preventScroll:true});
  syncDrawerFromState();
}
function closeDrawer(){
  drawer.classList.remove('active');
  drawer.setAttribute('hidden','');
}
btnOpenDrawer?.addEventListener('click', openDrawer);
btnClose?.addEventListener('click', closeDrawer);

// toggle helper
function toggleChip(btn, on){
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-pressed', on ? 'true':'false');
}

function syncDrawerFromState(){
  // cats
  $$('[data-cat]', afCats).forEach(b=> toggleChip(b, state.cats.has(b.dataset.cat)));
  // themes
  $$('[data-theme]', afThemes).forEach(b=> toggleChip(b, state.themes.has(b.dataset.theme)));
  // attrs
  $$('[data-attr]', afAttrs).forEach(b=> toggleChip(b, state.attrs.has(b.dataset.attr)));
  // open + rating + price
  $$('[data-open]', afMore).forEach(b=> toggleChip(b, state.open));
  $$('[data-rating]', afMore).forEach(b=> toggleChip(b, Number(b.dataset.rating) === state.minRating));
  $$('[data-price]', afMore).forEach(b=> toggleChip(b, state.prices.has(b.dataset.price)));
  // sort
  $$('[data-sort]', afSort).forEach(b=> toggleChip(b, b.dataset.sort === state.sort));
}

function bindDrawer(){
  // 多選 groups
  [afCats, afThemes, afAttrs].forEach(box=>{
    box?.addEventListener('click', e=>{
      const b = e.target.closest('.chip'); if(!b) return;
      const key = b.dataset.cat ? 'cats' : (b.dataset.theme ? 'themes' : 'attrs');
      const val = b.dataset.cat || b.dataset.theme || b.dataset.attr;
      const set = state[key];
      if (set.has(val)) set.delete(val); else set.add(val);
      toggleChip(b, set.has(val));
    });
  });
  // open / rating / price
  afMore?.addEventListener('click', e=>{
    const b = e.target.closest('.chip'); if(!b) return;
    if (b.dataset.open != null){
      state.open = !state.open; toggleChip(b, state.open);
    } else if (b.dataset.rating){
      // 單選：rating
      $$('[data-rating]', afMore).forEach(x=> toggleChip(x,false));
      state.minRating = Number(b.dataset.rating);
      toggleChip(b, true);
    } else if (b.dataset.price){
      const v = b.dataset.price;
      if (state.prices.has(v)) state.prices.delete(v); else state.prices.add(v);
      toggleChip(b, state.prices.has(v));
    }
  });
  // sort（單選）
  afSort?.addEventListener('click', e=>{
    const b = e.target.closest('.chip'); if(!b) return;
    if (b.dataset.sort){
      $$('[data-sort]', afSort).forEach(x=> toggleChip(x,false));
      state.sort = b.dataset.sort;
      toggleChip(b, true);
    }
  });

  // Reset / Apply
  btnReset?.addEventListener('click', ()=>{
    state.cats.clear(); state.themes.clear(); state.attrs.clear();
    state.open = false; state.minRating = null; state.prices.clear();
    state.sort = 'latest';
    syncDrawerFromState(); syncQuickFromState();
  });
  btnApply?.addEventListener('click', ()=>{
    syncQuickFromState();
    applyFilters();
    closeDrawer();
  });
}

/* ---------- City switching ---------- */
function selectCity(id, cityObj){
  currentCity = cityObj || { id };
  $$('.citycell', wall).forEach(b=> b.setAttribute('aria-selected', b.dataset.id === id ? 'true':'false'));
  head && (head.textContent = `${currentCity.name || id} — loading…`);
  sk.hidden = false; list.hidden = true; empty.hidden = true; errBx.hidden = true;

  fetchMerchants(id).then(res=>{
    sk.hidden = true;
    if (!res.ok){ errBx.hidden = false; list.hidden = true; head && (head.textContent = `${currentCity.name || id}`); return; }

    allMerchants = res.data || [];
    list.hidden = false;

    // 切城市時，保留使用者的條件，但把 sort 至少同步到輕量列
    syncQuickFromState();
    applyFilters();
  });
}

/* ---------- Bootstrap ---------- */
(async function init(){
  if (!wall) return;

  btnRetry?.addEventListener('click', ()=>{
    if (currentCity?.id) selectCity(currentCity.id, currentCity);
  });

  bindQuick();
  bindDrawer();

  const cities = await loadCities();
  renderWall(cities);

  wall.addEventListener('click', (e)=>{
    const btn = e.target.closest('.citycell'); if(!btn) return;
    const city = cities.find(c => c.id === btn.dataset.id) || { id: btn.dataset.id };
    selectCity(btn.dataset.id, city);
  });
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