// ===== Explore Page (Supabase + Fallback) =====
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

(() => {
  const wall = $('#cityWall');
  const head = $('#resultHead');
  const sk   = $('#skList');
  const list = $('#merchantList');
  if (!wall || !head) return;

  // --- fallback demo（若 Supabase 無法載入就使用） ---
  const DEMO = [
    {id:'kuching', name:'Kuching', icon:'🏛️', count:128, sort_order:1},
    {id:'miri', name:'Miri', icon:'⛽', count:64, sort_order:2},
    {id:'sibu', name:'Sibu', icon:'🛶', count:52, sort_order:3},
    {id:'bintulu', name:'Bintulu', icon:'⚓', count:40, sort_order:4},
    {id:'sarikei', name:'Sarikei', icon:'🍍', count:24, sort_order:5},
    {id:'limbang', name:'Limbang', icon:'🌉', count:16, sort_order:6},
    {id:'lawas', name:'Lawas', icon:'🌿', count:14, sort_order:7},
    {id:'mukah', name:'Mukah', icon:'🐟', count:18, sort_order:8},
    {id:'kapit', name:'Kapit', icon:'⛰️', count:12, sort_order:9},
    {id:'betong', name:'Betong', icon:'🏞️', count:11, sort_order:10},
    {id:'samarahan', name:'Samarahan', icon:'🎓', count:20, sort_order:11},
    {id:'serian', name:'Serian', icon:'🌲', count:9, sort_order:12},
  ];

  // ===== 抓 Supabase 城市資料 =====
  async function loadCities() {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id,name,icon,count,sort_order')
        .order('sort_order', { ascending: true })
        .limit(12);

      console.log("Supabase result:", data, error);

      if (error || !data?.length) {
        console.warn('⚠️ Load cities failed, fallback to demo:', error);
        head.textContent = '⚠️ Using demo data (Supabase unavailable)';
        return DEMO;
      }

      head.textContent = `✅ Loaded ${data.length} cities from Supabase`;
      return data.map((r, i) => ({
        id: r.id,
        name: r.name ?? r.id,
        icon: r.icon || '🏙️',
        count: Number.isFinite(r.count) ? r.count : 0,
        sort_order: r.sort_order ?? (i + 1),
      }));
    } catch (err) {
      console.error('❌ Supabase fetch exception:', err);
      head.textContent = '❌ Connection error — using demo data';
      return DEMO;
    }
  }

  // ===== 渲染城市牆 =====
  function renderWall(cities) {
    wall.innerHTML = '';
    cities.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'citycell';
      btn.setAttribute('role', 'tab');
      btn.dataset.id = c.id;
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.innerHTML = `
        <span class="ico">${c.icon || '🏙️'}</span>
        <span class="name">${c.name}</span>
        <span class="count">${c.count ?? 0}</span>
      `;
      wall.appendChild(btn);
    });
  }

  // ===== 切換城市 =====
  // 讀 merchants（Supabase）
async function fetchMerchants(cityId, {limit = 20} = {}) {
  try {
    // fetchMerchants：把 lat,lng, open_hours, rating 也撈回來
const { data, error } = await supabase
  .from('merchants')
  .select('id,name,category,address,cover,updated_at,city_id,lat,lng,open_hours,rating')
  .eq('city_id', cityId)
  .eq('status', 'active')
  .order('featured', { ascending: false, nullsFirst: false }) // 若有 featured
  .order('updated_at', { ascending: false })
  .limit(limit);


    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (err) {
    console.error('❌ fetchMerchants:', err);
    return { ok: false, error: err };
  }
}

// 把資料畫到 #merchantList
function renderMerchants(items, city) {
  const list = document.getElementById('merchantList');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `
      <div class="empty" style="padding:18px;color:#6b7280;text-align:center">
        No places in <strong>${city?.name || city?.id || 'this city'}</strong> yet.
      </div>`;
    return;
  }

  list.innerHTML = items.map(m => {
    const dist = (m.lat!=null && m.lng!=null && userPos) ? fmtDist(haversineKm(userPos, {lat:m.lat, lng:m.lng})) : '';
    const openFlag = isOpenNow(m.open_hours); // true / false / null
    const openBadge = openFlag===null ? '' :
      `<span class="badge ${openFlag?'ok':'off'}">${openFlag?'Open now':'Closed'}</span>`;
    const rating = (m.rating!=null) ? `<span class="badge rate">★ ${Number(m.rating).toFixed(1)}</span>` : '';

    return `
      <a class="item" data-id="${m.id}" href="javascript:;">
        <div class="thumb" style="background-image:url('${m.cover||''}')"></div>
        <div class="meta">
          <div class="t">${m.name}</div>
          <div class="sub">${m.category ?? ''}${m.address ? ' · ' + m.address : ''}</div>
          <div class="badges">${rating}${openBadge}</div>
        </div>
        <div class="tail">${dist || (m.updated_at ? new Date(m.updated_at).toLocaleDateString() : '')}</div>
      </a>`;
  }).join('');
}


// 取代原本的 selectCity（讓它真的抓 merchants）
function selectCity(id, cities) {
  const wall = document.getElementById('cityWall');
  const head = document.getElementById('resultHead');
  const sk   = document.getElementById('skList');
  const list = document.getElementById('merchantList');
  const empty = document.getElementById('emptyState');
  const err   = document.getElementById('errorState');

  // tab 樣式
  wall.querySelectorAll('.citycell').forEach(b=>{
    const on = b.dataset.id === id;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });

  const city = cities.find(x => x.id === id) || { id, name: id };
  head.textContent = `${city.name} — loading…`;

  // 先重置狀態
  sk.hidden = false;     sk.style.removeProperty('display');
  list.hidden = true;    list.innerHTML = '';
  empty && (empty.hidden = true);
  err && (err.hidden = true);

  // 抓資料
  fetchMerchants(id).then(res => {
    // 關掉骨架（雙保險）
    sk.hidden = true;     sk.style.display = 'none';

    if (!res.ok) {
      head.textContent = `${city.name}`;
      if (err) err.hidden = false;      // 顯示錯誤區塊
      return;
    }

    const items = res.data || [];
    head.textContent = `${city.name} — ${items.length} places`;

    if (!items.length) {
      empty && (empty.hidden = false);  // 顯示空狀態
      list.hidden = true;
      return;
    }

    // 正常渲染清單
    renderMerchants(items, city);
    list.hidden = false;
  }).catch(e=>{
    // 兜底：關骨架、顯錯
    sk.hidden = true; sk.style.display = 'none';
    err && (err.hidden = false);
  });
}

  // 地理距離（公里）
function haversineKm(a, b){
  if(!a || !b) return null;
  const R=6371, toRad = d=>d*Math.PI/180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(s));
}
const fmtDist = km => km==null ? '' : (km<1 ? `${Math.round(km*1000)} m` : `${km.toFixed(1)} km`);

// 簡易營業狀態（支援 "24H" 或 "09:00 - 18:00"）
function isOpenNow(open){
  if(!open) return null;
  const now = new Date();
  if(open.trim().toUpperCase()==='24H') return true;
  const m = open.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
  if(!m) return null;
  const [ , h1,m1,h2,m2 ] = m.map(Number);
  const start = new Date(now), end = new Date(now);
  start.setHours(h1, m1||0, 0, 0);
  end.setHours(h2, m2||0, 0, 0);
  return now>=start && now<=end;
}

// 抓一次使用者定位（允許就有距離，拒絕就 fallback）
let userPos = null;
navigator.geolocation?.getCurrentPosition(
  pos => { userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
  ()=>{}, { enableHighAccuracy:true, maximumAge:60000, timeout:6000 }
);




  // ===== 初始化 =====
  async function bootstrap() {
    const cities = await loadCities();
    renderWall(cities);

    // 點擊事件
    wall.addEventListener('click', (e) => {
      const btn = e.target.closest('.citycell');
      if (!btn) return;
      selectCity(btn.dataset.id, cities);
    });

    // 鍵盤左右切換
    wall.addEventListener('keydown', (e)=>{
      const cells = Array.from(wall.querySelectorAll('.citycell'));
      const cur = cells.findIndex(b => b.getAttribute('aria-selected') === 'true');
      if(e.key === 'ArrowRight'){ e.preventDefault(); const n = cells[Math.min(cur+1, cells.length-1)]; n?.focus(); n?.click(); }
      if(e.key === 'ArrowLeft'){  e.preventDefault(); const p = cells[Math.max(cur-1, 0)];             p?.focus(); p?.click(); }
    });

    // 預設選第一個
    const first = wall.querySelector('.citycell');
    if (first) selectCity(first.dataset.id, cities);
  }

  bootstrap();
})();


// ===== Explore: Filters UI (UI-only) =====
(() => {
  const host = document.getElementById('expFilters');
  if (!host) return;

  // 主分類：多選（切換 .is-on）
  const catsWrap = host.querySelector('.chips--cats');
  catsWrap?.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip[data-cat]');
    if (!btn) return;
    btn.classList.toggle('is-on');
    emit();
  });

  // 快速條件：
  // - data-sort：彼此互斥，aria-pressed true/false
  // - data-open / data-rating：獨立切換
  const quickWrap = host.querySelector('.chips--quick');

  // sort 互斥
  function toggleSort(target) {
    quickWrap.querySelectorAll('.chip[data-sort]').forEach(b=>{
      b.setAttribute('aria-pressed', b === target ? 'true' : 'false');
    });
  }

  quickWrap?.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;

    if (btn.hasAttribute('data-sort')) {
      toggleSort(btn);
    } else if (btn.hasAttribute('data-open')) {
      const on = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
    } else if (btn.hasAttribute('data-rating')) {
      btn.classList.toggle('is-on');
    } else if (btn.id === 'btnOpenFilter') {
      // 之後你要做底部抽屜可在這裡打開
      // openFilterDrawer();
    }
    emit();
  });

  // 將目前 UI 狀態轉成一個乾淨的物件，廣播出去（之後接查詢用）
  function getState(){
    const cats = Array.from(catsWrap?.querySelectorAll('.chip.is-on[data-cat]') || [])
      .map(b => b.dataset.cat);

    const sortBtn = quickWrap?.querySelector('.chip[data-sort][aria-pressed="true"]');
    const sort = sortBtn?.dataset.sort || 'latest';

    const openNow = (quickWrap?.querySelector('.chip[data-open][aria-pressed="true"]') != null);

    const ratingOn = quickWrap?.querySelector('.chip.is-on[data-rating]');
    const minRating = ratingOn ? Number(ratingOn.dataset.rating) : null;

    return { categories: cats, sort, openNow, minRating };
  }

  function emit(){
    const detail = getState();
    window.dispatchEvent(new CustomEvent('explore:filters-change', { detail }));
    // 先觀察用
    console.log('[filters]', detail);
  }

  // 初始同步一次
  emit();
})();

window.addEventListener('explore:filters-change', (e) => {
  const f = e.detail; // {categories, sort, openNow, minRating}
  // TODO: 依 f 重新打 supabase query 或前端過濾
});




