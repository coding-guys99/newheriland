// js/explore.js
// Explore — Supabase per-city fetch + client-side filters + Detail Overlay
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
  // 新版对象结构
  if (m.open_hours && typeof m.open_hours === 'object'){
    const wd = ['sun','mon','tue','wed','thu','fri','sat'][ref.getDay()];
    const day = m.open_hours[wd];
    if (!day || !Array.isArray(day.ranges) || !day.ranges.length) return false;
    const cur = ref.getHours()*60 + ref.getMinutes();
    const toMin = (hhmm)=>{ const [h,mi]=(hhmm||'').split(':').map(x=>parseInt(x,10)); return (h||0)*60+(mi||0); };
    return day.ranges.some(r=>{
      const o = toMin(r.open), c = toMin(r.close);
      return (c>o) ? (cur>=o && cur<c) : (cur>=o || cur<c); // 跨夜
    });
  }

  // 旧字串：容错各种连接符与中文
  let t = (m.openHours||'').trim().toLowerCase();
  if (!t) return false;
  if (t.includes('24h') || t.includes('全天') || t.includes('24小時') || t.includes('24小时')) return true;

  // 统一连接符（-、–、—、至、到）
  t = t.replace(/[–—\-~至到]/g, '-').replace(/\s+/g,'');
  const mm = t.match(/(\d{1,2}):?(\d{2})?-(\d{1,2}):?(\d{2})?/);
  if (!mm) return false;

  const toMin = (h,mi)=> parseInt(h||'0',10)*60 + parseInt(mi||'0',10);
  const start = toMin(mm[1], mm[2]);
  const end   = toMin(mm[3], mm[4]);
  const cur   = ref.getHours()*60 + ref.getMinutes();
  return (end>start) ? (cur>=start && cur<end) : (cur>=start || cur<end); // 跨夜
}

function shortAddr(s){ return (s||'').split(',')[0]; }

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
  // 排序
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

  // 快速：latest/hot 單選；open / rating 為切換
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

/* =========================================================
   Detail Page (data-page="detail") — render + router
   依赖：isOpenNow, priceLevelNum, shortAddr, fetchMerchantById, fetchRelated
   ========================================================= */

// refs
const pageDetail     = document.querySelector('[data-page="detail"]');
const btnDetailBack  = document.getElementById('btnDetailBack');
const elHero         = document.getElementById('detailHero');
const elName         = document.getElementById('detailName');
const elCat          = document.getElementById('detailCategory');
const elAddr         = document.getElementById('detailAddress');
const elDot          = document.getElementById('detailDot');
const elBadges       = document.getElementById('detailBadges');
const elDesc         = document.getElementById('detailDesc');
const elRating       = document.getElementById('detailRating');
const elOpen         = document.getElementById('detailOpen');
const elPrice        = document.getElementById('detailPrice');
const actPhone       = document.getElementById('actPhone');
const actWeb         = document.getElementById('actWeb');
// 你有两处 actMap，同一个 id；用“全选”方式一起赋值
const actMaps        = Array.from(document.querySelectorAll('#actMap'));
const actShare       = document.getElementById('actShare');
const recList        = document.getElementById('detailRecList);

// 工具：切页
function showPageDetail(){  document.querySelectorAll('[data-page]')
  .forEach(sec => sec.hidden = (sec.dataset.page !== 'detail')); }
function showPageExplore(){ document.querySelectorAll('[data-page]')
  .forEach(sec => sec.hidden = (sec.dataset.page !== 'explore')); }

// 工具：批量设置动作按钮（Map 有两处）
function setActionAll(els, href){
  (Array.isArray(els)? els: [els]).forEach(el=>{
    if (!el) return;
    if (href){ el.href = href; el.removeAttribute('aria-disabled'); el.classList.remove('is-disabled'); }
    else     { el.removeAttribute('href'); el.setAttribute('aria-disabled','true'); el.classList.add('is-disabled'); }
  });
}

// 人类可读的今天营运时间（简版）
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

// 主渲染
async function loadDetailPage(id){
  showPageDetail();

  // skeleton / reset
  elHero.style.backgroundImage = '';
  elName.textContent = 'Loading…';
  elCat.textContent = '—';
  elAddr.textContent = '—';
  elDot.style.display = 'none';
  elBadges.innerHTML = '';
  elDesc.textContent = '—';
  elRating.textContent = '—';
  elOpen.textContent = '—';
  elPrice.textContent = '—';
  recList.innerHTML = '';

  try{
    const m = await fetchMerchantById(id);

    // 标题/次行
    elName.textContent = m.name || '';
    elCat.textContent  = m.category || '';
    elAddr.textContent = m.address  || '';
    elDot.style.display = (elCat.textContent && elAddr.textContent) ? '' : 'none';

    // Hero 图（单张）
    const cover = m.cover || (Array.isArray(m.images) && m.images[0]) || '';
    if (cover) elHero.style.backgroundImage = `url("${cover}")`;

    // 徽章列
    const rating   = (m.rating!=null) ? Number(m.rating).toFixed(1) : null;
    const isOpen   = isOpenNow(m);
    const price    = priceLevelNum(m);
    const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';
    elBadges.innerHTML = `
      ${rating ? `<span class="badge">★ ${rating}</span>` : ''}
      <span class="badge ${isOpen ? 'ok':'off'}">${isOpen ? 'Open now' : 'Closed'}</span>
      ${priceStr ? `<span class="badge">${priceStr}</span>` : ''}
    `;
    elRating.textContent = rating || '—';
    elOpen.textContent   = isOpen ? 'Open now' : 'Closed';
    elPrice.textContent  = priceStr || '—';

    // About / Hours / Info
    elDesc.textContent = m.description || '—';

    // Location 卡片里的 “Open in Maps” 已通过 actMaps 一起赋值
    const gq = (m.lat && m.lng) ? `${m.lat},${m.lng}` : (m.address || '');
    const mapHref = gq ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gq)}` : '';
    setActionAll(actMaps, mapHref);

    // quick actions
    setActionAll(actPhone, m.phone   ? `tel:${String(m.phone).replace(/\s+/g,'')}` : '');
    setActionAll(actWeb,   m.website || '');

    // share
    if (actShare){
      actShare.onclick = async ()=>{
        const url  = location.href.split('#')[0] + `#detail/${m.id}`;
        const text = `${m.name} — ${m.category || ''}`;
        try{ await navigator.share?.({ title:m.name, text, url }); }catch(_){}
      };
    }

    // 相关推荐
    const related = await fetchRelated({ city_id: m.city_id, category: m.category, exceptId: m.id, limit: 6 });
    recList.innerHTML = related.map(r=>`
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
    console.error('loadDetailPage error:', err);
    elName.textContent = 'Failed to load';
    elDesc.textContent = 'Please check your connection and try again.';
  }
}

// Router：#detail/{id} → 详页；其它 → Explore
function handleDetailRoute(){
  const h = location.hash || '';
  if (h.startsWith('#detail/')){
    const id = h.split('/')[1];
    if (id) loadDetailPage(id);
  }else{
    showPageExplore();
  }
}
window.addEventListener('hashchange', handleDetailRoute);

// 返回键
btnDetailBack?.addEventListener('click', ()=>{ location.hash = '#explore'; });

// 首次进来时看 hash
handleDetailRoute();



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

  // 列表 → 打開 overlay 詳情
  list.addEventListener('click', (e)=>{
    const card = e.target.closest('.item'); if (!card) return;
    const id = card.dataset.id; if (!id) return;
    openDetailById(id);
  });
  list.addEventListener('keydown', (e)=>{
    if (e.key !== 'Enter') return;
    const card = e.target.closest('.item'); if (!card) return;
    const id = card.dataset.id; if (!id) return;
    openDetailById(id);
  });
})();
