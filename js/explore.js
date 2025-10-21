// js/explore.js
// Explore — Supabase per-city fetch + client-side filters + Advanced Drawer + Detail Page
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ---------- Explore DOM ---------- */
const wall  = $('#cityWall');
const head  = $('#resultHead');
const sk    = $('#skList');
const list  = $('#merchantList');
const empty = $('#emptyState');
const errBx = $('#errorState');
const btnRetry = $('#btnRetry');
const tabbar = document.querySelector('.tabbar');

/* ---------- Light filter bar ---------- */
const filtersBox = $('#expFilters');
const chipsCats  = $$('.chips--cats .chip',  filtersBox);
const chipsQuick = $$('.chips--quick .chip', filtersBox);
const btnOpenFilter = $('#btnOpenFilter');

/* ---------- Advanced filter drawer ---------- */
const advFilter   = $('#advFilter');
const btnAdvClose = $('#btnAdvClose');
const btnAdvApply = $('#btnAdvApply');
const btnAdvReset = $('#btnAdvReset');
const afCats   = $('#afCats');
const afThemes = $('#afThemes');
const afAttrs  = $('#afAttrs');
const afMore   = $('#afMore');
const afSort   = $('#afSort');

/* ---------- Detail page (你的 HTML) ---------- */
const pageDetail    = document.querySelector('[data-page="detail"]');
const btnDetailBack = $('#btnDetailBack');
const elName   = $('#detailName');
const elCat    = $('#detailCategory');
const elAddr   = $('#detailAddress');
const elDot    = $('#detailDot');
const elBadges = $('#detailBadges');
const elDesc   = $('#detailDesc');
const elRating = $('#detailRating');
const elOpen   = $('#detailOpen');
const elPrice  = $('#detailPrice');
const actMap   = $('#actMap');
const actMap2  = $('#actMap2');
const actPhone = $('#actPhone');
const actWeb   = $('#actWeb');
const actShare = $('#actShare');
const recList  = $('#detailRecList');
const elCarousel = $('#detailCarousel');
const btnCPrev   = $('#cPrev');
const btnCNext   = $('#cNext');
const elCDots    = $('#cDots');

/* ---------- State ---------- */
const state = {
  cats: new Set(),
  themes: new Set(),
  attrs: new Set(),
  prices: new Set(),
  open: false,
  minRating: null,
  sort: 'latest',
};
let currentCity = null;
let allMerchants = [];

/* ---------- Helpers ---------- */
const toNum = n => { const x = Number(n); return Number.isFinite(x) ? x : null; };
const shortAddr = s => (s||'').split(',')[0];

function priceLevelNum(m){
  if (typeof m.price_level === 'number') return m.price_level;
  if (typeof m.priceLevel === 'number') return m.priceLevel;
  const s = (m.priceLevel || m.price_level || '').toString();
  const cnt = (s.match(/\$/g)||[]).length;
  return cnt || null;
}

// 優先 open_days，其次 open_hours(JSON)。舊字串在 isOpenNow 退回處理
function getOpenStruct(m){
  const obj = m.open_days || m.open_hours;
  if (obj && typeof obj === 'object') return obj;
  return null;
}

function isOpenNow(m, ref = new Date()){
  const openObj = getOpenStruct(m);
  if (openObj){
    const wd = ['sun','mon','tue','wed','thu','fri','sat'][ref.getDay()];
    const day = openObj[wd];
    if (!day || day.closed === true) return false;
    const ranges = Array.isArray(day.ranges) ? day.ranges : [];
    if (!ranges.length) return false;

    const cur = ref.getHours() * 60 + ref.getMinutes();
    const toMin = (hhmm) => {
      const [h, mi] = (hhmm || '').split(':').map(x => parseInt(x, 10));
      if (!Number.isFinite(h)) return 0;
      const m = Number.isFinite(mi) ? mi : 0;
      return (h === 24 && m === 0) ? 1440 : (h * 60 + m);
    };

    return ranges.some(r => {
      const o = toMin(r.open);
      const c = toMin(r.close);
      if (c > o) return (cur >= o && cur < c); // 同日
      return (cur >= o || cur < c);            // 跨夜
    });
  }

  // 舊字串 "08:00 - 20:00"/"24H"
  const t = (m.openHours || '').toLowerCase().trim();
  if (!t) return false;
  if (t.includes('24h')) return true;
  const mm = t.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
  if (!mm) return false;
  const mins = (h, mi) => parseInt(h, 10) * 60 + parseInt(mi || '0', 10);
  const start = mins(mm[1], mm[2] || '00'), end = mins(mm[3], mm[4] || '00');
  const cur = ref.getHours() * 60 + ref.getMinutes();
  return (end > start) ? (cur >= start && cur < end) : (cur >= start || cur < end);
}

function setAction(el, href){
  if (!el) return;
  if (href){ el.href = href; el.removeAttribute('aria-disabled'); el.classList.remove('is-disabled'); }
  else { el.removeAttribute('href'); el.setAttribute('aria-disabled','true'); el.classList.add('is-disabled'); }
}

function getOpenStatusText(m, ref=new Date()){
  const openObj = getOpenStruct(m);
  if (openObj){
    const wd = ['sun','mon','tue','wed','thu','fri','sat'][ref.getDay()];
    const day = openObj[wd];
    if (!day || day.closed === true) return 'Closed';
    if (!Array.isArray(day.ranges) || day.ranges.length === 0) return 'Closed';
    return isOpenNow(m, ref) ? 'Open now' : 'Closed';
  }
  const t = (m.openHours||'').trim();
  if (!t) return '—';
  if (/24\s*H/i.test(t)) return 'Open now';
  return isOpenNow(m, ref) ? 'Open now' : 'Closed';
}

function weeklyHoursLines(m){
  const openObj = getOpenStruct(m);
  if (!openObj && !m.openHours) return '';
  const days = [
    {k:'mon', n:'Mon'}, {k:'tue', n:'Tue'}, {k:'wed', n:'Wed'},
    {k:'thu', n:'Thu'}, {k:'fri', n:'Fri'}, {k:'sat', n:'Sat'}, {k:'sun', n:'Sun'}
  ];
  if (openObj){
    return days.map(d=>{
      const day = openObj[d.k];
      let val = '—';
      if (!day || day.closed === true) val = 'Closed';
      else if (Array.isArray(day.ranges) && day.ranges.length){
        val = day.ranges.map(r => `${r.open}–${r.close}`).join(', ');
      } else { val = 'Closed'; }
      return `<div class="oh-line"><span>${d.n}</span><span>${val}</span></div>`;
    }).join('');
  }
  return `<div class="oh-line"><span>Daily</span><span>${m.openHours}</span></div>`;
}

/* ---------- Supabase ---------- */
async function loadCities(){
  try{
    const { data, error } = await supabase
      .from('cities')
      .select('id,name,icon,sort_order')
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
    const q = supabase
      .from('merchants')
      .select('*')
      .eq('status','active')
      .order('updated_at',{ascending:false})
      .limit(limit);
    if (cityId && cityId !== 'all') q.eq('city_id', cityId);
    const { data, error } = await q;
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
    .select('id,name,category,categories,cover,updated_at')
    .eq('status','active')
    .neq('id', exceptId)
    .order('updated_at',{ascending:false})
    .limit(limit);
  if (error) throw error;

  let arr = (data||[]).filter(x => x.city_id === city_id);
  if (!arr.length) arr = data || [];

  if (category){
    const catLower = category.toLowerCase();
    const catMatch = arr.filter(r=>{
      const cats = Array.isArray(r.categories) ? r.categories : (r.category ? [r.category] : []);
      return cats.some(c => (c||'').toLowerCase() === catLower);
    });
    if (catMatch.length) return catMatch;
  }
  return arr;
}

/* ---------- Render: wall & list ---------- */
function renderWall(cities){
  wall.innerHTML = `
    <button class="citycell citycell--all" role="tab" data-id="all" aria-selected="true">
      <span class="ico">✨</span>
      <span class="name">All Sarawak</span>
    </button>
  `;
  cities.slice(0,12).forEach((c)=>{
    const btn = document.createElement('button');
    btn.className = 'citycell';
    btn.setAttribute('role','tab');
    btn.dataset.id = c.id;
    btn.setAttribute('aria-selected', 'false');
    btn.innerHTML = `
      <span class="ico">${c.icon || '🏙️'}</span>
      <span class="name">${c.name || c.id}</span>
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
    const statusTxt = getOpenStruct(m) ? getOpenStatusText(m) : '—';
    const badgeOpen =
      statusTxt === 'Open now' ? `<span class="badge ok">Open now</span>` :
      statusTxt === '—'        ? `<span class="badge">—</span>` :
                                 `<span class="badge off">${statusTxt}</span>`;

    const cats = Array.isArray(m.categories) ? m.categories : (m.category ? [m.category] : []);
    const catStr = cats.slice(0,2).join(', ');

    const addrShort = shortAddr(m.address);
    const price = priceLevelNum(m);
    const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';
    const cover = m.cover || (m.images?.[0]) || '';

    return `
      <div class="item" data-id="${m.id}" role="button" tabindex="0" aria-label="Open details for ${m.name}">
        <div class="thumb" style="background-image:url('${cover}')"></div>
        <div class="meta">
          <div class="t">${m.name}</div>
          <div class="sub">${catStr}${addrShort ? ` · ${addrShort}` : ''}</div>
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
    arr = arr.filter(m => {
      const cats = Array.isArray(m.categories) ? m.categories : (m.category ? [m.category] : []);
      return cats.some(c => want.has((c||'').toLowerCase()));
    });
  }

  if (state.themes.size || state.attrs.size){
    arr = arr.filter(m=>{
      const tags = Array.isArray(m.tags) ? m.tags.map(t=>t.toLowerCase()) : [];
      const hasTheme = !state.themes.size || [...state.themes].some(t => tags.includes(t.toLowerCase()));
      const hasAttr  = !state.attrs.size  || [...state.attrs].some(a => tags.includes(a.toLowerCase()));
      return hasTheme && hasAttr;
    });
  }

  if (state.open){
    arr = arr.filter(m => isOpenNow(m));
  }

  if (state.minRating != null){
    arr = arr.filter(m => (Number(m.rating)||0) >= state.minRating);
  }

  if (state.prices.size){
    arr = arr.filter(m=>{
      const p = priceLevelNum(m);
      return p && state.prices.has(p);
    });
  }

  if (state.sort === 'hot'){
    arr.sort((a,b)=>{
      const ra = Number(a.rating)||0, rb = Number(b.rating)||0;
      if (rb !== ra) return rb - ra;
      const ta = new Date(a.updated_at||0).getTime();
      const tb = new Date(b.updated_at||0).getTime();
      return tb - ta;
    });
  }else if (state.sort === 'rating'){
    arr.sort((a,b)=> (Number(b.rating)||0) - (Number(a.rating)||0));
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

function bindLightFilters(){
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
          b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
        });
        btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
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

/* ---------- Advanced drawer wiring ---------- */
function openAF(){ if (!advFilter) return; advFilter.hidden = false; requestAnimationFrame(()=> advFilter.classList.add('active')); }
function closeAF(){ if (!advFilter) return; advFilter.classList.remove('active'); setTimeout(()=>{ advFilter.hidden = true; }, 150); }
btnOpenFilter?.addEventListener('click', openAF);
btnAdvClose?.addEventListener('click', closeAF);
advFilter?.addEventListener('click', (e)=>{ if (e.target===advFilter) closeAF(); });
window.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && !advFilter?.hidden) closeAF(); });

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

// More：open 切換、rating 單選、price 多選
afMore?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.chip'); if (!btn) return;

  if (btn.hasAttribute('data-open')){
    const on = btn.classList.toggle('is-on');
    btn.setAttribute('aria-pressed', on ? 'true':'false');
    state.open = on;
    return;
  }
  if (btn.hasAttribute('data-rating')){
    afMore.querySelectorAll('.chip[data-rating]').forEach(b=>{
      b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
    });
    btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
    state.minRating = Number(btn.getAttribute('data-rating'));
    return;
  }
  if (btn.hasAttribute('data-price')){
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

// 同步外層 chips 視覺
function syncLightBarFromState(){
  $$('.chips--quick .chip[data-sort]').forEach(b=>{
    const on = (b.dataset.sort === state.sort);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const lightOpen = $('.chips--quick .chip[data-open]');
  if (lightOpen){
    lightOpen.classList.toggle('is-on', !!state.open);
    lightOpen.setAttribute('aria-pressed', state.open ? 'true' : 'false');
  }
  $$('.chips--quick .chip[data-rating]').forEach(b=>{
    const val = Number(b.dataset.rating);
    const on  = (state.minRating != null && state.minRating === val);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

// Apply / Reset
btnAdvApply?.addEventListener('click', ()=>{
  applyFilters();
  syncLightBarFromState();
  closeAF();
});
btnAdvReset?.addEventListener('click', ()=>{
  state.cats.clear(); state.themes.clear(); state.attrs.clear(); state.prices.clear();
  state.open = false; state.minRating = null; state.sort = 'latest';

  advFilter?.querySelectorAll('.chip.is-on').forEach(b=>{
    b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
  });
  const firstSort = afSort?.querySelector('.chip[data-sort="latest"]');
  if (firstSort){
    firstSort.classList.add('is-on'); firstSort.setAttribute('aria-pressed','true');
  }
  syncLightBarFromState();
  applyFilters();
});

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
function showPageDetail(){
  document.querySelectorAll('[data-page]').forEach(sec=>{
    sec.hidden = (sec.dataset.page !== 'detail');
  });
  $$('.tabbar .tab').forEach(t=>{
    t.setAttribute('aria-selected','false');
    t.removeAttribute('aria-current');
  });
  tabbar && (tabbar.style.display = 'none');
}

function restoreMainPage(){
  const current = document.querySelector('.tabbar .tab[aria-current="page"]')?.dataset.target
               || (location.hash||'').replace('#','') || 'home';
  document.querySelectorAll('[data-page]').forEach(sec=>{
    sec.hidden = (sec.dataset.page !== current);
  });
  if (current === 'explore' && !allMerchants.length) {
    const first = wall?.querySelector('.citycell');
    if (first) {
      const id = first.dataset.id;
      const city = { id, name: first.querySelector('.name')?.textContent || id };
      selectCity(id, city);
    }
  }
  tabbar && (tabbar.style.display = '');
}

function humanHours(m){
  const openObj = getOpenStruct(m);
  if (openObj){
    const wd   = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const day  = openObj[wd];
    if (!day) return '—';
    if (day.closed) return `${wd.toUpperCase()}: Closed`;
    if (day.ranges?.length){
      const s = day.ranges.map(r => `${r.open}–${r.close}`).join(', ');
      return `${wd.toUpperCase()}: ${s}`;
    }
    return `${wd.toUpperCase()}: —`;
  }
  return m.openHours || '—';
}

async function loadDetailPage(id){
  showPageDetail();

  // reset UI
  elName.textContent = 'Loading…';
  elCat.textContent = ''; elAddr.textContent = ''; elDot.style.display = 'none';
  elBadges.innerHTML = ''; elDesc.textContent = '';
  elRating.textContent = '—'; elOpen.textContent = '—'; elPrice.textContent = '—';
  recList.innerHTML = '';
  // 重置輪播
  if (elCarousel){
    elCarousel.innerHTML = '';
    if (btnCPrev) btnCPrev.hidden = true;
    if (btnCNext) btnCNext.hidden = true;
    if (elCDots)  elCDots.hidden  = true;
  }

  try{
    const m = await fetchMerchantById(id);

    // name / sub info
    elName.textContent = m.name || '';
    const cats = Array.isArray(m.categories) ? m.categories : (m.category ? [m.category] : []);
    elCat.textContent  = cats.slice(0,2).join(', ');
    elAddr.textContent = m.address || '';
    elDot.style.display = (elCat.textContent && elAddr.textContent) ? '' : 'none';
    elDesc.textContent  = m.description || '—';

    // ===== Hero Carousel =====
    if (elCarousel){
      const imgs = Array.isArray(m.images) ? m.images.filter(Boolean) : [];
      if (!imgs.length && m.cover) imgs.push(m.cover);

      elCarousel.innerHTML = imgs.map((src, i) =>
        `<img src="${src}" alt="${m.name||''}" ${i>0?'loading="lazy"':''}
              onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 675%22><rect width=%221200%22 height=%22675%22 fill=%22%23eee%22/></svg>';">`
      ).join('');

      const multi = imgs.length > 1;
      if (btnCPrev) btnCPrev.hidden = !multi;
      if (btnCNext) btnCNext.hidden = !multi;
      if (elCDots)  elCDots.hidden  = !multi;

      if (multi && elCDots && btnCPrev && btnCNext){
        elCDots.innerHTML = imgs.map((_,i)=>`<button type="button" aria-label="Go to slide ${i+1}" ${i===0?'aria-current="true"':''}></button>`).join('');

        const updateDots = () => {
          const w = elCarousel.clientWidth || 1;
          const idx = Math.round(elCarousel.scrollLeft / w);
          [...elCDots.children].forEach((b,i)=> b.setAttribute('aria-current', i===idx ? 'true':'false'));
          btnCPrev.disabled = (idx===0);
          btnCNext.disabled = (idx===imgs.length-1);
        };

        btnCPrev.onclick = () => elCarousel.scrollBy({ left: -elCarousel.clientWidth, behavior: 'smooth' });
        btnCNext.onclick = () => elCarousel.scrollBy({ left:  elCarousel.clientWidth, behavior: 'smooth' });
        elCarousel.addEventListener('scroll', () => { window.requestAnimationFrame(updateDots); });
        elCDots.onclick = (e)=>{
          const i = [...elCDots.children].indexOf(e.target.closest('button'));
          if (i>=0){
            elCarousel.scrollTo({ left: i * elCarousel.clientWidth, behavior: 'smooth' });
          }
        };
        updateDots();
      }
    }

    // badges（含 tags）
    const rating = (m.rating!=null) ? Number(m.rating).toFixed(1) : null;
    const open   = isOpenNow(m);
    const price  = priceLevelNum(m);
    const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';
    elBadges.innerHTML = `
      ${rating ? `<span class="badge">★ ${rating}</span>` : ''}
      <span class="badge ${open ? 'ok':'off'}">${open ? 'Open now':'Closed'}</span>
      ${priceStr ? `<span class="badge">${priceStr}</span>` : ''}
    `;
    if (Array.isArray(m.tags) && m.tags.length){
      elBadges.innerHTML += m.tags.slice(0,5).map(t=>`<span class="badge tag">${t}</span>`).join('');
    }
    elRating.textContent = rating || '—';
    elOpen.textContent   = getOpenStruct(m) ? getOpenStatusText(m) : '—';
    elPrice.textContent  = priceStr || '—';

    // actions
    const gq = (m.lat && m.lng) ? `${m.lat},${m.lng}` : (m.address || '');
    setAction(actMap,   gq ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gq)}` : null);
    setAction(actPhone, m.phone ? `tel:${m.phone.replace(/\s+/g,'')}` : null);
    setAction(actWeb,   m.website || null);
    actShare?.addEventListener('click', async ()=>{
      const url = location.href;
      const text = `${m.name} — ${cats.slice(0,1).join(', ')}`;
      try{ await navigator.share?.({ title: m.name, text, url }); }catch(_){}
    }, { once:true });

    // ===== Map Preview（OSM 免金鑰）=====
    const box = document.querySelector('.d-mapbox');
    if (box){
      if (m.lat && m.lng){
        const urlQuery = `${m.lat},${m.lng}`;
        setAction(actMap,  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(urlQuery)}`);
        setAction(actMap2, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(urlQuery)}`);
        const src = `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${encodeURIComponent(m.lat)},${encodeURIComponent(m.lng)}`;
        box.innerHTML = `<iframe class="map-embed" src="${src}" style="width:100%;height:220px;border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      }else{
        if (m.address){
          const q = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}`;
          setAction(actMap,  q);
          setAction(actMap2, q);
        }else{
          setAction(actMap,  null);
          setAction(actMap2, null);
        }
        // 恢復 placeholder
        box.innerHTML = `<div class="d-mapph">Map preview</div>`;
      }
    }

    // ===== Hours（週表）=====
    const hoursCard  = document.getElementById('hoursCard');
    const hoursList  = document.getElementById('detailHoursList');
    const openChip   = document.getElementById('detailOpenChip');

    const statusText = getOpenStatusText(m);
    elOpen.textContent = statusText || '—';

    if (hoursCard && hoursList && openChip){
      const hasStruct = !!getOpenStruct(m) || !!m.openHours;
      if (hasStruct){
        hoursCard.hidden = false;
        openChip.textContent = statusText || '—';
        hoursList.innerHTML = weeklyHoursLines(m) || '';
      }else{
        hoursCard.hidden = true;
        hoursList.innerHTML = '';
      }
    }

    // related
    const related = await fetchRelated({ city_id: m.city_id, category: cats[0], exceptId: m.id, limit: 6 });
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
    console.error('loadDetailPage failed:', err);
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
  restoreMainPage();
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

  bindLightFilters();

  const cities = await loadCities();
  renderWall(cities);

  // 城市牆事件
  wall.addEventListener('click', (e)=>{
    const btn = e.target.closest('.citycell');
    if (!btn) return;
    const city = { id: btn.dataset.id, name: btn.querySelector('.name')?.textContent };
    selectCity(btn.dataset.id, city);
  });
  wall.addEventListener('keydown', (e)=>{
    const cells = Array.from(wall.querySelectorAll('.citycell'));
    const cur = cells.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight'){ e.preventDefault(); const n = cells[Math.min(cur+1, cells.length-1)]; n?.focus(); n?.click(); }
    if (e.key === 'ArrowLeft'){  e.preventDefault(); const p = cells[Math.max(cur-1, 0)];             p?.focus(); p?.click(); }
  });

  // 預設選 ALL
  const first = wall.querySelector('.citycell[data-id="all"]') || wall.querySelector('.citycell');
  if (first){
    const id = first.dataset.id;
    const name = first.querySelector('.name')?.textContent || id;
    selectCity(id, { id, name });
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