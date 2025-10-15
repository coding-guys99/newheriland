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
    const { data, error } = await supabase
      .from('merchants')
      .select('id,name,category,address,cover,updated_at,city_id')
      .eq('city_id', cityId)
      .eq('status', 'active')              // 若你表有 status 欄
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

  list.innerHTML = items.map(m => `
    <div class="item" data-id="${m.id}">
      <div class="thumb" style="background-image:url('${m.cover || ''}');"></div>
      <div>
        <div class="t">${m.name}</div>
        <div class="sub">${m.category ?? ''}${m.address ? ' · ' + m.address : ''}</div>
      </div>
      <div class="sub" style="white-space:nowrap;margin-left:8px">
        ${m.updated_at ? new Date(m.updated_at).toLocaleDateString() : ''}
      </div>
    </div>
  `).join('');
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


