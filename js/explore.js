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
  function selectCity(id, cities) {
    wall.querySelectorAll('.citycell').forEach(b => {
      const on = b.dataset.id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const city = cities.find(x => x.id === id);
    head.textContent = `${city?.name || 'City'} — ${city?.count || 0} places`;

    // 模擬載入骨架
    sk.hidden = false;
    list.hidden = true;

    setTimeout(() => {
      sk.hidden = true;
      list.hidden = false;
      list.innerHTML = `
        <div class="item">
          <div class="thumb"></div>
          <div class="t">${city?.name} Placeholder</div>
          <div class="sub">${city?.count || 0} locations</div>
        </div>`;
    }, 1000);
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
