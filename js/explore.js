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
   ---------- Merchant Detail Overlay (Start) ----------
   說明：
   1) HTML 需要這些 id：#merchantDetail (整個 overlay 容器)
      內部至少要有：
      #mdTitle, #mdGallery, #mdName, #mdSub, #mdBadges,
      #mdDesc, #mdHours, #mdInfo, #mdMap, #recList,
      #actCall, #actWA, #actWeb, #actMap
   2) 這段就是你之後要改的唯一區域（樣式/欄位/文案）
   ========================================================= */
const mdRoot  = $('#merchantDetail');
const mdClose = mdRoot?.querySelector('.md-close');
const mdBack  = mdRoot?.querySelector('.md-back');

function openOverlay(){
  if (!mdRoot) return;
  mdRoot.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(()=> mdRoot.classList.add('active'));
}
function closeOverlay(){
  if (!mdRoot) return;
  mdRoot.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(()=>{ mdRoot.hidden = true; }, 180);
}
mdClose?.addEventListener('click', closeOverlay);
mdBack?.addEventListener('click', closeOverlay);
mdRoot?.addEventListener('click', (e)=>{ if (e.target===mdRoot) closeOverlay(); });
window.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closeOverlay(); });

function setAction(el, href){
  if (!el) return;
  if (href){ el.href=href; el.removeAttribute('aria-disabled'); el.classList?.remove('is-disabled'); }
  else { el.removeAttribute('href'); el.setAttribute('aria-disabled','true'); el.classList?.add('is-disabled'); }
}
function humanHours(m){
  // 先簡單：若 open_hours 有當天 ranges，就列一行；否則顯示 openHours 或 '—'
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

async function openDetailById(id){
  if (!mdRoot){ console.warn('Detail overlay HTML (#merchantDetail) not found.'); return; }

  // 快取 DOM
  const els = {
    title:  $('#mdTitle'),
    gallery:$('#mdGallery'),
    name:   $('#mdName'),
    sub:    $('#mdSub'),
    badges: $('#mdBadges'),
    desc:   $('#mdDesc'),
    hours:  $('#mdHours'),
    info:   $('#mdInfo'),
    map:    $('#mdMap'),
    rec:    $('#recList'),
    actCall:$('#actCall'),
    actWA:  $('#actWA'),
    actWeb: $('#actWeb'),
    actMap: $('#actMap'),
  };

  // reset skeleton
  els.title.textContent = 'Loading…';
  els.gallery.innerHTML = `<div class="md-photo sk-block"></div><div class="md-photo sk-block"></div><div class="md-photo sk-block"></div>`;
  els.name.textContent = '';
  els.sub.textContent = '';
  els.badges.innerHTML = '';
  els.desc.innerHTML = '';
  els.hours.innerHTML = '';
  els.info.innerHTML = '';
  els.map.innerHTML = '';
  els.rec.innerHTML = '';

  openOverlay();

  try{
    const m = await fetchMerchantById(id);

    // 標題與次行
    els.title.textContent = m.name || '';
    els.name.textContent  = m.name || '';
    els.sub.textContent   = [m.category, shortAddr(m.address)].filter(Boolean).join(' · ');

    // 徽章列
    const rating = (m.rating!=null) ? Number(m.rating).toFixed(1) : null;
    const open = isOpenNow(m);
    const price = priceLevelNum(m);
    const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';
    els.badges.innerHTML = `
      ${rating ? `<span class="badge">★ ${rating}</span>` : ''}
      <span class="badge ${open?'ok':'off'}">${open?'Open now':'Closed'}</span>
      ${priceStr ? `<span class="badge">${priceStr}</span>` : ''}
    `;

    // 圖片群
    const imgs = [m.cover, ...(Array.isArray(m.images)?m.images:[])].filter(Boolean);
    els.gallery.innerHTML = imgs.length
      ? imgs.slice(0,6).map(src=>`<div class="md-photo" style="background:url('${src}') center/cover;border-radius:14px"></div>`).join('')
      : `<div class="md-photo sk-block"></div>`;

    // About / Hours / Info
    els.desc.innerHTML  = m.description || `<span style="color:#999">No description.</span>`;
    els.hours.textContent = humanHours(m);

    els.info.innerHTML = [
      m.address ? `📍 ${m.address}` : '',
      m.phone   ? `📞 ${m.phone}`   : '',
      m.email   ? `✉️ ${m.email}`   : '',
      m.website ? `🖥️ ${m.website}` : ''
    ].filter(Boolean).map(s=>`<div>${s}</div>`).join('') || '<div>—</div>';

    // 簡易 map 佔位
    if (m.lat && m.lng){
      els.map.innerHTML = `<div style="text-align:center;color:#555">(${Number(m.lat).toFixed(5)}, ${Number(m.lng).toFixed(5)})</div>`;
    }else{
      els.map.innerHTML = `<div style="text-align:center;color:#888">No coordinates</div>`;
    }

    // 動作按鈕
    const mapHref = (m.lat && m.lng) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.lat},${m.lng}`)}` : (m.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}` : '');
    const telHref = m.phone   ? `tel:${m.phone.replace(/\s+/g,'')}` : '';
    const waHref  = m.whatsapp? `https://wa.me/${m.whatsapp.replace(/[^\d]/g,'')}` : '';
    const webHref = m.website || '';
    setAction(els.actMap,  mapHref);
    setAction(els.actCall, telHref);
    setAction(els.actWA,   waHref);
    setAction(els.actWeb,  webHref);

    // 相關推薦
    const related = await fetchRelated({ city_id: m.city_id, category: m.category, exceptId: m.id, limit: 6 });
    els.rec.innerHTML = related.map(r=>`
      <a class="rec" data-id="${r.id}">
        <div class="rthumb" style="background:url('${r.cover||''}') center/cover;height:90px;border-radius:12px"></div>
        <div class="rname">${r.name}</div>
      </a>
    `).join('');
    els.rec.onclick = (e)=>{
      const a = e.target.closest('.rec'); if (!a) return;
      openDetailById(a.dataset.id);
    };

  }catch(err){
    console.error('openDetailById error:', err);
    els.title.textContent = 'Failed to load';
    els.desc.innerHTML = 'Please check your connection and try again.';
  }
}
/* ---------- Merchant Detail Overlay (End) ---------- */

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