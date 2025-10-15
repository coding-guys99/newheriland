// js/explore.js
// ===== Explore Page — Supabase fetch all per city, filter on client =====
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ---- UI refs ----
const wall  = $('#cityWall');
const head  = $('#resultHead');
const sk    = $('#skList');
const list  = $('#merchantList');
const empty = $('#emptyState');
const errBx = $('#errorState');
const btnRetry = $('#btnRetry');

// 可選：輕量篩選列（若不存在也不報錯）
const filterBar = $('#filterBar');      // 容器
const filterChips = $$('.fchip', filterBar);

// ---- 篩選狀態 ----
// open: 是否只看現在營業
// minRating: 最低評分（例如 4.5）
// priceMax: 最高價位（例如 1 表示 $）
// category: 單一分類（字串，如 "Culture"）
const filterState = {
  open: false,
  minRating: null,
  priceMax: null,
  category: null,
};

// 目前城市與全量商家
let currentCity = null;
let allMerchants = [];

// ===== 解析營業中（支援兩種資料形狀） =====
function isOpenNow(m, refDate=new Date()){
  // 1) 新格式：m.open_hours = { mon:{ranges:[{open:"08:00",close:"20:00"}]}, ... }
  if (m.open_hours && typeof m.open_hours === 'object'){
    // 以本地時間判斷
    const wd = ['sun','mon','tue','wed','thu','fri','sat'][refDate.getDay()];
    const day = m.open_hours[wd];
    if (!day || !Array.isArray(day.ranges) || !day.ranges.length) return false;

    const curMin = refDate.getHours()*60 + refDate.getMinutes();
    // 處理跨夜：若 close < open，代表隔日（如 18:00-02:00）
    const inRange = (hhmm) => {
      const [h, mi] = hhmm.split(':').map(v=>parseInt(v,10));
      return (h*60 + mi);
    };

    for (const r of day.ranges){
      const o = inRange(r.open);
      const c = inRange(r.close);
      if (c > o){
        if (curMin >= o && curMin < c) return true;
      }else{
        // 跨夜：現在時間 >= open 或 < close
        if (curMin >= o || curMin < c) return true;
      }
    }
    return false;
  }

  // 2) 舊格式：m.openHours = "08:00 - 20:00" / "24H"
  const t = (m.openHours||'').trim().toLowerCase();
  if (!t) return false;
  if (t.includes('24h') || t.includes('24-hour')) return true;
  const m2 = t.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
  if (!m2) return false;

  const hh = (h,mm) => (parseInt(h,10)*60 + parseInt(mm||'0',10));
  const start = hh(m2[1], m2[2]||'00');
  const end   = hh(m2[3], m2[4]||'00');
  const cur   = refDate.getHours()*60 + refDate.getMinutes();
  if (end > start) return cur >= start && cur < end;
  // 跨夜
  return cur >= start || cur < end;
}

// ===== 輔助：價位字串轉數值（$=1, $$=2... 或直接數字）=====
function priceLevelNum(m){
  if (typeof m.priceLevel === 'number') return m.priceLevel;
  if (typeof m.price_level === 'number') return m.price_level;
  // 若是 "$$" 這種
  const s = (m.priceLevel || m.price_level || '').toString();
  if (!s) return null;
  const count = (s.match(/\$/g) || []).length;
  return count || null;
}

// ===== Supabase：載入城市清單 =====
async function loadCities(){
  try{
    const { data, error } = await supabase
      .from('cities')
      .select('id,name,icon,count,sort_order')
      .order('sort_order',{ascending:true})
      .limit(12);
    if (error) throw error;
    return data || [];
  }catch(err){
    console.warn('Load cities failed:', err);
    // fallback demo
    return [
      {id:'kuching', name:'Kuching', icon:'🏛️', count:128, sort_order:1},
      {id:'miri', name:'Miri', icon:'⛽', count:64, sort_order:2},
      {id:'sibu', name:'Sibu', icon:'🛶', count:52, sort_order:3},
      {id:'mukah', name:'Mukah', icon:'🐟', count:18, sort_order:4},
    ];
  }
}

// ===== Supabase：抓某城市全部商家 =====
async function fetchMerchants(cityId, {limit=200} = {}){
  try{
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('city_id', cityId)
      .eq('status', 'active')
      .order('updated_at', { ascending:false })
      .limit(limit);
    if (error) throw error;
    return { ok:true, data: data || [] };
  }catch(err){
    console.error('fetchMerchants error:', err);
    return { ok:false, error: err };
  }
}

// ===== 渲染城市牆 =====
function renderWall(cities){
  if (!wall) return;
  wall.innerHTML = '';
  cities.slice(0,12).forEach((c, i)=>{
    const btn = document.createElement('button');
    btn.className = 'citycell';
    btn.setAttribute('role','tab');
    btn.dataset.id = c.id;
    btn.setAttribute('aria-selected', i===0 ? 'true':'false');
    btn.innerHTML = `
      <span class="ico">${c.icon || '🏙️'}</span>
      <span class="name">${c.name || c.id}</span>
      <span class="count">${Number(c.count)||0}</span>
    `;
    wall.appendChild(btn);
  });
}

// ===== 卡片 UI =====
function renderMerchants(items){
  if (!list) return;

  if (!items.length){
    list.hidden = true;
    empty && (empty.hidden = false);
    errBx && (errBx.hidden = true);
    return;
  }

  empty && (empty.hidden = true);
  errBx && (errBx.hidden = true);
  list.hidden = false;

  const h = [];
  for (const m of items){
    const rating = (m.rating != null) ? Number(m.rating).toFixed(1) : null;
    const open   = isOpenNow(m);
    const badgeOpen = open ? `<span class="badge ok">Open now</span>` : `<span class="badge off">Closed</span>`;

    const category = m.category || '';
    const addrShort = (m.address || '').split(',')[0]; // 簡短地址

    const price = priceLevelNum(m);
    const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';

    const cover = m.cover || (m.images?.[0]) || '';

    h.push(`
      <div class="item" data-id="${m.id}">
        <div class="thumb" style="background-image:url('${cover}');"></div>
        <div class="meta">
          <div class="t">${m.name}</div>
          <div class="sub">
            ${category ? `${category}` : ''}${addrShort ? ` · ${addrShort}` : ''}
          </div>
          <div class="badges">
            ${rating ? `<span class="badge">★ ${rating}</span>` : ''}
            ${badgeOpen}
            ${priceStr ? `<span class="badge">${priceStr}</span>` : ''}
          </div>
        </div>
        <div class="aux"></div>
      </div>
    `);
  }
  list.innerHTML = h.join('');
}

// ===== 應用篩選到 allMerchants =====
function applyFilters(){
  if (!allMerchants || !allMerchants.length){
    renderMerchants([]);
    return;
  }

  let arr = [...allMerchants];

  // Open now
  if (filterState.open){
    arr = arr.filter(m => isOpenNow(m));
  }

  // Rating
  if (filterState.minRating != null){
    arr = arr.filter(m => (Number(m.rating)||0) >= filterState.minRating);
  }

  // Price
  if (filterState.priceMax != null){
    arr = arr.filter(m => {
      const p = priceLevelNum(m);
      return (p == null) ? true : (p <= filterState.priceMax);
    });
  }

  // Category（單選）
  if (filterState.category){
    arr = arr.filter(m => (m.category||'').toLowerCase() === filterState.category.toLowerCase());
  }

  renderMerchants(arr);
  // 可選：更新數量顯示
  head && (head.textContent = `${currentCity?.name || currentCity?.id || 'City'} — ${arr.length} places`);
}

// ===== 綁定篩選列（容器 id="filterBar"、每個按鈕 .fchip data-ft）=====
function bindFilterBar(){
  if (!filterBar || !filterChips.length) return;

  filterBar.addEventListener('click', (e)=>{
    const chip = e.target.closest('.fchip');
    if (!chip) return;
    const ft = chip.dataset.ft || '';

    // 單/複選邏輯：
    // open / r45 / cheap 為獨立切換
    // cat:xxx 為單選；若再次點同一顆 = 取消
    if (ft === 'open'){
      chip.classList.toggle('is-on');
      filterState.open = chip.classList.contains('is-on');
    } else if (ft === 'r45'){
      chip.classList.toggle('is-on');
      filterState.minRating = chip.classList.contains('is-on') ? 4.5 : null;
    } else if (ft === 'cheap'){
      chip.classList.toggle('is-on');
      filterState.priceMax = chip.classList.contains('is-on') ? 1 : null;
    } else if (ft.startsWith('cat:')){
      const cat = ft.split(':')[1] || '';
      const already = chip.classList.contains('is-on');
      // 先清掉同組（所有 cat:*）
      $$('.fchip[data-ft^="cat:"]', filterBar).forEach(c => c.classList.remove('is-on'));
      if (!already){
        chip.classList.add('is-on');
        filterState.category = cat;
      }else{
        filterState.category = null;
      }
    }

    applyFilters();
  });
}

// ===== 切換城市 =====
function selectCity(id, cityObj){
  currentCity = cityObj || { id };
  // 樣式
  if (wall){
    $$('.citycell', wall).forEach(b=>{
      const on = b.dataset.id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  // 狀態顯示
  if (head) head.textContent = `${currentCity.name || id} — loading…`;
  if (sk)   sk.hidden = false;
  if (list) list.hidden = true;
  empty && (empty.hidden = true);
  errBx && (errBx.hidden = true);

  // 抓資料
  fetchMerchants(id).then(res=>{
    sk && (sk.hidden = true);

    if (!res.ok){
      errBx && (errBx.hidden = false);
      list && (list.hidden = true);
      if (head) head.textContent = `${currentCity.name || id}`;
      return;
    }

    allMerchants = res.data;
    list && (list.hidden = false);
    if (head) head.textContent = `${currentCity.name || id} — ${allMerchants.length} places`;

    // 取得資料後立即套用目前的篩選條件
    applyFilters();
  });
}

// ===== 初始化 =====
(async function bootstrap(){
  if (!wall || !head) return;

  // 綁定重試
  btnRetry?.addEventListener('click', ()=>{
    if (currentCity?.id) selectCity(currentCity.id, currentCity);
  });

  // 城市牆
  const cities = await loadCities();
  renderWall(cities);

  // 綁定城市點擊
  wall.addEventListener('click', (e)=>{
    const btn = e.target.closest('.citycell');
    if (!btn) return;
    const city = cities.find(c => c.id === btn.dataset.id) || { id: btn.dataset.id };
    selectCity(btn.dataset.id, city);
  });

  // 鍵盤左右切換（可選）
  wall.addEventListener('keydown', (e)=>{
    const cells = Array.from(wall.querySelectorAll('.citycell'));
    const cur = cells.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if(e.key === 'ArrowRight'){ e.preventDefault(); const n = cells[Math.min(cur+1, cells.length-1)]; n?.focus(); n?.click(); }
    if(e.key === 'ArrowLeft'){  e.preventDefault(); const p = cells[Math.max(cur-1, 0)];             p?.focus(); p?.click(); }
  });

  // 綁定篩選列
  bindFilterBar();

  // 預設選第一個
  const first = wall.querySelector('.citycell');
  if (first){
    const city = cities.find(c => c.id === first.dataset.id) || { id: first.dataset.id };
    selectCity(first.dataset.id, city);
  }
})();