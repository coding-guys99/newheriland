// js/explore.js
// Explore — Supabase per-city fetch + client-side filters + Detail Page router
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ---------- DOM refs ---------- */
const wall  = $('#cityWall');
const head  = $('#resultHead');
const sk    = $('#skList');
const list  = $('#merchantList');
const empty = $('#emptyState');
const errBx = $('#errorState');
const btnRetry = $('#btnRetry');

const filtersBox = $('#expFilters');
const chipsCats  = $$('.chips--cats .chip',  filtersBox);
const chipsQuick = $$('.chips--quick .chip', filtersBox);

/* ===== Advanced Filter Drawer wiring (matches your HTML) ===== */

// 外層篩選列：開啟按鈕（你外面那顆 🎯 Filter）
const btnOpenFilter = document.getElementById('btnOpenFilter');

// 抽屜節點 & 控制鍵（用你的 id）
const advFilter     = document.getElementById('advFilter');
const btnAdvClose   = document.getElementById('btnAdvClose');
const btnAdvApply   = document.getElementById('btnAdvApply');
const btnAdvReset   = document.getElementById('btnAdvReset');

// 分組容器
const afCats   = document.getElementById('afCats');    // data-cat   （多選）
const afThemes = document.getElementById('afThemes');  // data-theme（多選）
const afAttrs  = document.getElementById('afAttrs');   // data-attr （多選）
const afMore   = document.getElementById('afMore');    // data-open / data-rating / data-price
const afSort   = document.getElementById('afSort');    // data-sort（單選）

// 擴充 state：保留進階的選項（先不影響列表，之後可接到 applyFilters）
state.themes = state.themes || new Set();
state.attrs  = state.attrs  || new Set();
state.prices = state.prices || new Set();   // 多選 $/$$/$$$/$$$$

// 打開 / 關閉抽屜
function openAF(){
  if (!advFilter) return;
  advFilter.hidden = false;
  requestAnimationFrame(()=> advFilter.classList.add('active'));
}
function closeAF(){
  if (!advFilter) return;
  advFilter.classList.remove('active');
  setTimeout(()=>{ advFilter.hidden = true; }, 150);
}

// 綁開關
btnOpenFilter?.addEventListener('click', openAF);
btnAdvClose?.addEventListener('click', closeAF);
// 點背景（空白處）也關（你的 overlay-page 可能沒背景層，保險寫一下）
advFilter?.addEventListener('click', (e)=>{ if (e.target === advFilter) closeAF(); });
window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && !advFilter?.hidden) closeAF(); });

// —— Chips 切換邏輯 ——

// 通用：多選切換（加/移除 .is-on）
function toggleMulti(container, attr, set){
  container?.addEventListener('click', (e)=>{
    const btn = e.target.closest(`.chip[${attr}]`); if (!btn) return;
    const val = btn.getAttribute(attr);
    const on  = btn.classList.toggle('is-on');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) set.add(val); else set.delete(val);
  });
}
toggleMulti(afCats,   'data-cat',   state.cats);
toggleMulti(afThemes, 'data-theme', state.themes);
toggleMulti(afAttrs,  'data-attr',  state.attrs);

// More 區：Open=切換；Rating=單選；Price=多選
afMore?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.chip'); if (!btn) return;

  if (btn.hasAttribute('data-open')){
    const on = btn.classList.toggle('is-on');
    btn.setAttribute('aria-pressed', on ? 'true':'false');
    state.open = on;
    return;
  }

  if (btn.hasAttribute('data-rating')){
    // 單選
    afMore.querySelectorAll('.chip[data-rating]').forEach(b=>{
      b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
    });
    btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
    state.minRating = Number(btn.getAttribute('data-rating'));
    return;
  }

  if (btn.hasAttribute('data-price')){
    // 多選：$ / $$ / $$$ / $$$$
    const val = Number(btn.getAttribute('data-price'));
    const on  = btn.classList.toggle('is-on');
    btn.setAttribute('aria-pressed', on ? 'true':'false');
    if (on) state.prices.add(val); else state.prices.delete(val);
    return;
  }
});

// Sort：單選
afSort?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.chip[data-sort]'); if (!btn) return;
  afSort.querySelectorAll('.chip[data-sort]').forEach(b=>{
    b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
  });
  btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
  state.sort = btn.getAttribute('data-sort') || 'latest';
});

// —— Apply / Reset ——

// 把抽屜選擇同步到外層「輕量 chips」視覺（只同步：sort / open / rating）
function syncLightBarFromState(){
  // sort（單選）
  document.querySelectorAll('.chips--quick .chip[data-sort]')?.forEach(b=>{
    const on = (b.getAttribute('data-sort') === state.sort);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  // open
  const lightOpen = document.querySelector('.chips--quick .chip[data-open]');
  if (lightOpen){
    lightOpen.classList.toggle('is-on', !!state.open);
    lightOpen.setAttribute('aria-pressed', state.open ? 'true' : 'false');
  }
  // rating（只有 4.5 這顆，或你有別顆就一起判斷）
  document.querySelectorAll('.chips--quick .chip[data-rating]')?.forEach(b=>{
    const val = Number(b.getAttribute('data-rating'));
    const on  = (state.minRating != null && state.minRating === val);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

btnAdvApply?.addEventListener('click', ()=>{
  // 目前的 applyFilters() 只看 cats / open / minRating / sort
  // 若未來要用 themes / attrs / prices，也在 applyFilters() 裡加條件即可
  applyFilters();
  syncLightBarFromState();
  closeAF();
});

btnAdvReset?.addEventListener('click', ()=>{
  // 清 state
  state.cats.clear();
  state.themes.clear();
  state.attrs.clear();
  state.prices.clear();
  state.open = false;
  state.minRating = null;
  state.sort = 'latest';

  // 清抽屜視覺
  advFilter?.querySelectorAll('.chip.is-on')?.forEach(b=>{
    b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
  });
  // 預設 sort=latest 標記回來
  const firstSort = afSort?.querySelector('.chip[data-sort="latest"]');
  if (firstSort){
    firstSort.classList.add('is-on'); firstSort.setAttribute('aria-pressed','true');
  }

  // 外層輕量 chips 也回復預設
  syncLightBarFromState();

  // 重新套用
  applyFilters();
});

/* Detail page refs (你的 HTML) */
const pageDetail    = document.querySelector('[data-page="detail"]');
const btnDetailBack = $('#btnDetailBack');
const elHero   = $('#detailHero');
const elName   = $('#detailName');
const elCat    = $('#detailCategory');
const elAddr   = $('#detailAddress');
const elDot    = $('#detailDot');
const elBadges = $('#detailBadges');
const elDesc   = $('#detailDesc');
const elRating = $('#detailRating');
const elOpen   = $('#detailOpen');
const elPrice  = $('#detailPrice');
const actMap   = $('#actMap');     // 快速動作列的 Map
const actMap2  = $('#actMap2');    // ← 請把 Location 標題旁的那顆改成這個 id
const actPhone = $('#actPhone');
const actWeb   = $('#actWeb');
const actShare = $('#actShare');
const recList  = $('#detailRecList');

/* ---------- State ---------- */
const state = { cats:new Set(), open:false, minRating:null, sort:'latest' };
let currentCity = null;
let allMerchants = [];

/* ---------- Helpers ---------- */
const toNum = (n)=>{ const x = Number(n); return Number.isFinite(x) ? x : null; };
function priceLevelNum(m){
  if (typeof m.priceLevel === 'number') return m.priceLevel;
  if (typeof m.price_level === 'number') return m.price_level;
  const s = (m.priceLevel || m.price_level || '').toString();
  const cnt = (s.match(/\$/g)||[]).length;
  return cnt || null;
}
function isOpenNow(m, ref=new Date()){
  // 新版結構：open_hours.{sun..sat}.ranges[{open:"08:00",close:"20:00"}]
  if (m.open_hours && typeof m.open_hours === 'object'){
    const wd = ['sun','mon','tue','wed','thu','fri','sat'][ref.getDay()];
    const day = m.open_hours[wd];
    if (!day || !Array.isArray(day.ranges) || !day.ranges.length) return false;
    const cur = ref.getHours()*60 + ref.getMinutes();
    const toMin = (hhmm)=>{ const [h,mi] = (hhmm||'').split(':').map(x=>parseInt(x,10)); return (h||0)*60+(mi||0); };
    return day.ranges.some(r=>{
      const o = toMin(r.open), c = toMin(r.close);
      return (c>o) ? (cur>=o && cur<c) : (cur>=o || cur<c); // 跨夜
    });
  }
  // 舊字串："08:00 - 20:00" / "24H"
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
const shortAddr = s => (s||'').split(',')[0];

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
async function fetchMerchantById(id){
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
async function fetchRelated({city_id, category, exceptId, limit=6}={}){
  const { data, error } = await supabase
    .from('merchants')
    .select('id,name,category,cover,updated_at')
    .eq('city_id', city_id)
    .eq('status','active')
    .neq('id', exceptId)
    .order('updated_at',{ascending:false})
    .limit(limit);
  if (error) throw error;
  if (!data?.length || !category) return data || [];
  const sameCat = data.filter(x => (x.category||'').toLowerCase() === (category||'').toLowerCase());
  return sameCat.length ? sameCat : data;
}

/* ---------- Render: wall & list ---------- */
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
    const addrShort = shortAddr(m.address);
    const price = priceLevelNum(m);
    const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';
    const cover = m.cover || (m.images?.[0]) || '';

    return `
      <div class="item" data-id="${m.id}" role="button" tabindex="0" aria-label="Open details for ${m.name}">
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

/* ---------- Filters (client-side) ---------- */
function applyFilters(){
  let arr = [...allMerchants];

  if (state.cats.size){
    const want = new Set([...state.cats].map(s => s.toLowerCase()));
    arr = arr.filter(m => want.has((m.category||'').toLowerCase()));
  }
  if (state.open){
    arr = arr.filter(m => isOpenNow(m));
  }
  if (state.minRating != null){
    arr = arr.filter(m => (Number(m.rating)||0) >= state.minRating);
  }

  if (state.sort === 'hot'){
    arr.sort((a,b)=>{
      const ra = Number(a.rating)||0, rb = Number(b.rating)||0;
      if (rb !== ra) return rb - ra;
      const ta = new Date(a.updated_at||0).getTime();
      const tb = new Date(b.updated_at||0).getTime();
      return tb - ta;
    });
  }else{
    arr.sort((a,b)=>{
      const ta = new Date(a.updated_at||0).getTime();
      const tb = new Date(b.updated_at||0).getTime();
      return tb - ta;
    });
  }

  renderMerchants(arr);
  if (head) head.textContent = `${currentCity?.name || currentCity?.id || 'City'} — ${arr.length} places`;
}
function bindFilters(){
  if (!filtersBox) return;

  chipsCats.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cat = btn.dataset.cat;
      const on = btn.classList.toggle('is-on');
      btn.setAttribute('aria-pressed', on ? 'true':'false');
      if (on) state.cats.add(cat); else state.cats.delete(cat);
      applyFilters();
    });
  });

  chipsQuick.forEach(btn=>{
    if (!btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed','false');
    btn.addEventListener('click', ()=>{
      const hasSort   = btn.hasAttribute('data-sort');
      const hasOpen   = btn.hasAttribute('data-open');
      const hasRating = btn.hasAttribute('data-rating');

      if (hasSort){
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

/* ---------- City switching ---------- */
function selectCity(id, cityObj){
  currentCity = cityObj || { id };

  $$('.citycell', wall).forEach(b=>{
    const on = b.dataset.id === id;
    b.setAttribute('aria-selected', on ? 'true':'false');
  });

  head && (head.textContent = `${currentCity.name || id} — loading…`);
  sk.hidden = false; list.hidden = true;
  empty.hidden = true; errBx.hidden = true;

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

    // 重置排序為 latest（視覺也重置）
    state.sort = 'latest';
    $$('.chips--quick .chip[data-sort]', filtersBox).forEach(b=>{
      const on = (b.dataset.sort === 'latest');
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    applyFilters();
  });
}

/* ---------- Detail page: render & router (#detail/{id}) ---------- */
function setAction(el, href){
  if (!el) return;
  if (href){ el.href = href; el.removeAttribute('aria-disabled'); el.classList.remove('is-disabled'); }
  else { el.removeAttribute('href'); el.setAttribute('aria-disabled','true'); el.classList.add('is-disabled'); }
}
function showPageDetail(){
  document.querySelectorAll('[data-page]').forEach(sec=>{
    sec.hidden = (sec.dataset.page !== 'detail');
  });
  // 取消 tabbar 高亮（交給 app.js 在返回時處理）
  $$('.tabbar .tab').forEach(t=>{
    t.setAttribute('aria-selected','false');
    t.removeAttribute('aria-current');
  });
}

function restoreMainPage(){
  const current = document.querySelector('.tabbar .tab[aria-current="page"]')?.dataset.target
               || (location.hash||'').replace('#','') || 'home';
  document.querySelectorAll('[data-page]').forEach(sec=>{
    sec.hidden = (sec.dataset.page !== current);
  });

  // 保底：回到 explore 且尚未載入任何商家時，自動選第一個城市
  if (current === 'explore' && !allMerchants.length) {
    const first = wall?.querySelector('.citycell');
    if (first) {
      const id = first.dataset.id;
      const city = { id, name: first.querySelector('.name')?.textContent || id };
      selectCity(id, city);
    }
  }
}

function humanHours(m){
  if (m.open_hours && typeof m.open_hours==='object'){
    const wd = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const day = m.open_hours[wd];
    if (day?.ranges?.length){
      const s = day.ranges.map(r=>`${r.open}–${r.close}`).join(', ');
      return `${wd.toUpperCase()}: ${s}`;
    }
  }
  return m.openHours || '—';
}

async function loadDetailPage(id){
  showPageDetail();

  // reset UI
  elHero.style.backgroundImage = '';
  elName.textContent = 'Loading…';
  elCat.textContent = ''; elAddr.textContent = ''; elDot.style.display = 'none';
  elBadges.innerHTML = ''; elDesc.textContent = '';
  elRating.textContent = '—'; elOpen.textContent = '—'; elPrice.textContent = '—';
  recList.innerHTML = '';

  try{
    const m = await fetchMerchantById(id);

    // hero/name/sub
    const cover = m.cover || (m.images?.[0]) || '';
    if (cover) elHero.style.backgroundImage = `url("${cover}")`;
    elName.textContent = m.name || '';
    elCat.textContent  = m.category || '';
    elAddr.textContent = m.address || '';
    elDot.style.display = (elCat.textContent && elAddr.textContent) ? '' : 'none';
    elDesc.textContent  = m.description || '—';

    // badges
    const rating = (m.rating!=null) ? Number(m.rating).toFixed(1) : null;
    const open   = isOpenNow(m);
    const price  = priceLevelNum(m);
    const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';
    elBadges.innerHTML = `
      ${rating ? `<span class="badge">★ ${rating}</span>` : ''}
      <span class="badge ${open ? 'ok':'off'}">${open ? 'Open now':'Closed'}</span>
      ${priceStr ? `<span class="badge">${priceStr}</span>` : ''}
    `;
    elRating.textContent = rating || '—';
    elOpen.textContent   = open ? 'Open now' : 'Closed';
    elPrice.textContent  = priceStr || '—';

    // actions（兩顆 Map 都要綁好）
    const gq = (m.lat && m.lng) ? `${m.lat},${m.lng}` : (m.address || '');
    const mapHref = gq ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gq)}` : null;
    setAction(actMap,  mapHref);
    setAction(actMap2, mapHref);
    setAction(actPhone, m.phone   ? `tel:${m.phone.replace(/\s+/g,'')}` : null);
    setAction(actWeb,   m.website || null);
    actShare?.addEventListener('click', async ()=>{
      const url = location.href;
      const text = `${m.name} — ${m.category || ''}`;
      try{ await navigator.share?.({ title: m.name, text, url }); }catch(_){}
    }, { once:true });

    // related
    const related = await fetchRelated({ city_id: m.city_id, category: m.category, exceptId: m.id, limit: 6 });
    recList.innerHTML = related.map(r => `
      <a class="rec" data-id="${r.id}" role="button" tabindex="0" aria-label="Open ${r.name}">
        <div class="rthumb" style="background-image:url('${r.cover||''}')"></div>
        <div class="rname">${r.name}</div>
      </a>
    `).join('');
    recList.onclick = (e)=>{
      const a = e.target.closest('.rec'); if (!a) return;
      location.hash = `#detail/${a.dataset.id}`;
    };

  }catch(err){
    elName.textContent = 'Failed to load';
    elDesc.textContent = 'Please check your connection and try again.';
  }
}

/* ---------- Router ---------- */
function handleHash(){
  const h = location.hash || '';
  if (h.startsWith('#detail/')){
    const id = h.split('/')[1];
    if (id){
      showPageDetail();
      loadDetailPage(id);
    }
    return;
  }

  // 非 detail：恢復目前 tab 選中的主頁
  restoreMainPage();

  // 回到 Explore（或初始沒有 hash）時，重算列表，確保篩選立即生效
  if (h === '#explore' || h === '') {
    if (allMerchants.length) applyFilters();
  }
}
window.addEventListener('hashchange', handleHash);

/* ---------- Bootstrap ---------- */
(async function init(){
  if (!wall) return;

  btnRetry?.addEventListener('click', ()=>{
    if (currentCity?.id) selectCity(currentCity.id, currentCity);
  });

  bindFilters();

  const cities = await loadCities();
  renderWall(cities);

  // 城市牆事件
  wall.addEventListener('click', (e)=>{
    const btn = e.target.closest('.citycell');
    if (!btn) return;
    const city = cities.find(c => c.id === btn.dataset.id) || { id: btn.dataset.id };
    selectCity(btn.dataset.id, city);
  });
  wall.addEventListener('keydown', (e)=>{
    const cells = Array.from(wall.querySelectorAll('.citycell'));
    const cur = cells.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight'){ e.preventDefault(); const n = cells[Math.min(cur+1, cells.length-1)]; n?.focus(); n?.click(); }
    if (e.key === 'ArrowLeft'){  e.preventDefault(); const p = cells[Math.max(cur-1, 0)];             p?.focus(); p?.click(); }
  });

  // 預設選第一個城市
  const first = wall.querySelector('.citycell');
  if (first){
    const c = cities.find(x=>x.id === first.dataset.id) || { id:first.dataset.id };
    selectCity(first.dataset.id, c);
  }

  // 列表 → 進二級頁（hash 導向）
  list.addEventListener('click', (e)=>{
    const card = e.target.closest('.item'); if (!card) return;
    const id = card.dataset.id; if (!id) return;
    location.hash = `#detail/${id}`;
  });
  list.addEventListener('keydown', (e)=>{
    if (e.key !== 'Enter') return;
    const card = e.target.closest('.item'); if (!card) return;
    const id = card.dataset.id; if (!id) return;
    location.hash = `#detail/${id}`;
  });

  // 詳情返回
  btnDetailBack?.addEventListener('click', ()=>{ location.hash = '#explore'; });

  // 初始路由
  handleHash();
})();