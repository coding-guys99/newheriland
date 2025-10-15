// js/explore.js
// Explore — Supabase per-city fetch + client-side filters + Detail Drawer (data-filled)
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

// Filters
const filtersBox = $('#expFilters');
const chipsCats  = $$('.chips--cats .chip',  filtersBox);
const chipsQuick = $$('.chips--quick .chip', filtersBox);

// ===== Filter state =====
const state = { cats:new Set(), open:false, minRating:null, sort:'latest' };
let currentCity = null;
let allMerchants = [];

/* ----------------- Helpers ----------------- */
const toNum = (n)=>{ const x = Number(n); return Number.isFinite(x) ? x : null; };
function priceLevelNum(m){
  if (typeof m.priceLevel === 'number') return m.priceLevel;
  if (typeof m.price_level === 'number') return m.price_level;
  const s = (m.priceLevel || m.price_level || '').toString();
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
      return (c>o) ? (cur>=o && cur<c) : (cur>=o || cur<c);
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

/* ----------------- Supabase ----------------- */
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
  // 若沒同類別，退而求其次：直接最新
  if (!data?.length || !category) return data || [];
  const sameCat = data.filter(x => (x.category||'').toLowerCase() === (category||'').toLowerCase());
  return sameCat.length ? sameCat : data;
}

/* ----------------- Render: wall & list ----------------- */
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
    const addrShort = (m.address || '').split(',')[0];
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

/* ----------------- Filters (client-side) ----------------- */
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
    if (!btn.hasAttribute('aria-pressed')){
      btn.setAttribute('aria-pressed','false');
    }
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

/* ----------------- City switching ----------------- */
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

    // 重置排序為 latest
    state.sort = 'latest';
    $$('.chips--quick .chip[data-sort]', filtersBox).forEach(b=>{
      const on = (b.dataset.sort === 'latest');
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    applyFilters();
  });
}

/* ----------------- Detail Drawer (data-filled) ----------------- */
// IDs/結構對上我先前給你的骨架
const md  = $('#mdBackdrop');
const mdClose = $('#mdClose');

function openDrawer(){ if (md){ md.hidden = false; md.classList.add('active'); } }
function closeDrawer(){ if (md){ md.classList.remove('active'); md.hidden = true; } }

function setAction(el, href){
  if (!el) return;
  if (href){
    el.href = href; el.removeAttribute('aria-disabled'); el.classList.remove('is-disabled');
  }else{
    el.removeAttribute('href'); el.setAttribute('aria-disabled','true'); el.classList.add('is-disabled');
  }
}

function fillDetail(m){
  // 主視覺 / 標題區
  $('#mdTitle').textContent = m.name || 'Untitled';
  $('#mdCategory').textContent = m.category || '';
  $('#mdRating').textContent = (m.rating!=null) ? `★ ${Number(m.rating).toFixed(1)}` : '';
  const open = isOpenNow(m);
  $('#mdOpen').textContent = open ? 'Open now' : 'Closed';

  // 價格
  const p = priceLevelNum(m);
  $('#mdPrice').textContent = p ? '💲'.repeat(Math.max(1, Math.min(4, p))) : '';

  // 地址（若沒有就提示）
  const addrEl = $('#mdAddress');
  if (m.address) { addrEl.textContent = m.address; addrEl.classList.remove('muted'); }
  else { addrEl.textContent = 'No address yet'; addrEl.classList.add('muted'); }

  // 描述 / 營業時間
  $('#mdDesc').textContent  = m.description || '';
  $('#mdHours').textContent = (() => {
    if (m.open_hours && typeof m.open_hours === 'object') return 'See daily schedule';
    return m.openHours || '';
  })();

  // Tags（支援字串陣列或以逗號分隔）
  const tagsWrap = $('#mdBadges');
  if (tagsWrap){
    tagsWrap.innerHTML = '';
    const tags = Array.isArray(m.tagIds) ? m.tagIds
               : Array.isArray(m.tags) ? m.tags
               : (typeof m.tags === 'string' ? m.tags.split(',').map(s=>s.trim()).filter(Boolean) : []);
    tags.slice(0,8).forEach(t=>{
      const s = document.createElement('span');
      s.className = 'badge';
      s.textContent = `#${t}`;
      tagsWrap.appendChild(s);
    });
  }

  // 動作按鈕
  setAction($('#mdPhone'),   m.phone    ? `tel:${m.phone.replace(/\s+/g,'')}` : null);
  setAction($('#mdWA'),      m.whatsapp ? `https://wa.me/${m.whatsapp.replace(/\D+/g,'')}` : null);
  setAction($('#mdWeb'),     m.website  ? m.website : null);

  // Map：lat/lng 優先，其次用地址
  let mapHref = null;
  if (m.lat!=null && m.lng!=null){
    mapHref = `https://www.google.com/maps?q=${m.lat},${m.lng}`;
  } else if (m.location && m.location.lat!=null && m.location.lng!=null){
    mapHref = `https://www.google.com/maps?q=${m.location.lat},${m.location.lng}`;
  } else if (m.address){
    mapHref = `https://www.google.com/maps?q=${encodeURIComponent(m.address)}`;
  }
  setAction($('#mdMap'), mapHref);

  // 分享（簡單版）
  $('#mdShare')?.addEventListener('click', async ()=>{
    const shareData = {
      title: m.name,
      text: `${m.name} — ${m.category||''}`,
      url: location.href
    };
    try{ if (navigator.share) await navigator.share(shareData); else await navigator.clipboard.writeText(`${m.name}\n${location.href}`); }catch{}
  }, { once:true });

  // 主圖（可用 cover 或 images[0]）
  const gallery = $('#modalGallery');
  if (gallery){
    const cover = m.cover || (m.images?.[0]) || '';
    gallery.innerHTML = cover ? `<div class="gimg" style="background-image:url('${cover}')"></div>` : `<div class="gimg placeholder"></div>`;
  }
}

async function openDetailById(id){
  try{
    openDrawer();
    // 顯示骨架（用你的 CSS/結構）
    md.classList.add('loading');

    const m = await fetchMerchantById(id);

    fillDetail(m);

    // 推薦（同城同類別）
    try{
      const related = await fetchRelated({ city_id:m.city_id, category:m.category, exceptId:m.id, limit:6 });
      const rec = $('#recList');
      if (rec){
        rec.innerHTML = related.map(r => `
          <a class="rec" data-id="${r.id}" role="button" tabindex="0" aria-label="Open ${r.name}">
            <div class="rthumb" style="background-image:url('${r.cover||''}')"></div>
            <div class="rname">${r.name}</div>
          </a>
        `).join('');
        // 讓推薦可再次開啟詳情
        rec.addEventListener('click', (e)=>{
          const a = e.target.closest('.rec'); if (!a) return;
          openDetailById(a.dataset.id);
        });
      }
    }catch(e){ /* 靜默略過推薦錯誤 */ }

  }catch(err){
    console.error('openDetailById error:', err);
    // 在抽屜內顯示簡單錯誤
    $('#mdTitle').textContent = 'Failed to load';
    $('#mdDesc').textContent = 'Please check your connection and try again.';
  }finally{
    md.classList.remove('loading');
  }
}

/* ----------------- Bootstrap ----------------- */
(async function init(){
  if (!wall) return;

  btnRetry?.addEventListener('click', ()=>{
    if (currentCity?.id) selectCity(currentCity.id, currentCity);
  });

  bindFilters();

  const cities = await loadCities();
  renderWall(cities);

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

  const first = wall.querySelector('.citycell');
  if (first){
    const c = cities.find(x=>x.id === first.dataset.id) || { id:first.dataset.id };
    selectCity(first.dataset.id, c);
  }

  // 綁定列表→開詳情
  list.addEventListener('click', (e)=>{
    const card = e.target.closest('.item');
    if (!card) return;
    const id = card.dataset.id;
    if (id) openDetailById(id);
  });
  list.addEventListener('keydown', (e)=>{
    if (e.key !== 'Enter') return;
    const card = e.target.closest('.item');
    if (!card) return;
    const id = card.dataset.id;
    if (id) openDetailById(id);
  });

  // 抽屜關閉
  mdClose?.addEventListener('click', closeDrawer);
  md?.addEventListener('click', (e)=>{ if (e.target === md) closeDrawer(); });
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeDrawer(); });
})();