// ===== Explore — Supabase-first with JSON fallback =====
import { supabase } from './app.js'; // 若尚未接 Supabase，先保留這行；沒初始化也會自動 fallback

(() => {
  const wall = document.getElementById('cityWall');
  const head = document.getElementById('resultHead');
  const sk   = document.getElementById('skList');
  const list = document.getElementById('merchantList');
  if (!wall || !head || !sk || !list) return;

  // 12 城市（icon 先用 emoji；之後可換 SVG）
  const CITIES = [
    {id:'kuching',   name:'Kuching',   icon:'🏛️', count:128},
    {id:'miri',      name:'Miri',      icon:'⛽',  count:64},
    {id:'sibu',      name:'Sibu',      icon:'🛶',  count:52},
    {id:'bintulu',   name:'Bintulu',   icon:'⚓',  count:40},
    {id:'sarikei',   name:'Sarikei',   icon:'🍍',  count:24},
    {id:'limbang',   name:'Limbang',   icon:'🌉',  count:16},
    {id:'lawas',     name:'Lawas',     icon:'🌿',  count:14},
    {id:'mukah',     name:'Mukah',     icon:'🐟',  count:18},
    {id:'kapit',     name:'Kapit',     icon:'⛰️',  count:12},
    {id:'betong',    name:'Betong',    icon:'🏞️', count:11},
    {id:'samarahan', name:'Samarahan', icon:'🎓',  count:20},
    {id:'serian',    name:'Serian',    icon:'🌲',  count:9},
  ];

  // ========== Render city wall 4x3 ==========
  wall.innerHTML = '';
  CITIES.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'citycell';
    btn.type = 'button';
    btn.setAttribute('role','tab');
    btn.dataset.id = c.id;
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.innerHTML = `
      <span class="ico">${c.icon}</span>
      <span class="name">${c.name}</span>
      <span class="count">${c.count}</span>
    `;
    wall.appendChild(btn);
  });

  // ========== Data loaders ==========
  async function loadFromSupabase(cityId){
    if (!supabase) throw new Error('no-supabase');
    // 說明：
    // - merchants 資料表；欄位建議 snake_case：id, name, address, cover, rating, price_level, city_id, status, tag_ids
    // - 只取 active + 該城市，依 rating DESC 排序
    const { data, error } = await supabase
      .from('merchants')
      .select('id,name,address,cover,rating,price_level,city_id,tag_ids')
      .eq('city_id', cityId)
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []).map(normalizeRecord);
  }

  async function loadFromJSON(cityId){
    // 對應你的 demo 路徑：data/merchants/{city}.json
    const url = `data/merchants/${cityId}.json`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
    const j = await r.json();
    return (j.items || []).map(normalizeRecord);
  }

  // 統一欄位名稱（兼容 snake_case 及 camelCase）
  function normalizeRecord(row){
    return {
      id:        row.id,
      name:      row.name,
      address:   row.address ?? row.address_line ?? '',
      cover:     row.cover ?? row.image ?? '',
      rating:    row.rating ?? null,
      price:     row.price_level ?? row.priceLevel ?? null,
      tags:      row.tag_ids ?? row.tagIds ?? [],
      cityId:    row.city_id ?? row.cityId ?? '',
    };
  }

  async function loadMerchants(cityId){
    // 先試 Supabase，抓不到就退回 JSON
    try {
      return await loadFromSupabase(cityId);
    } catch (e) {
      // console.warn('[Supabase fallback]', e);
      try {
        return await loadFromJSON(cityId);
      } catch (e2) {
        // console.error('[Both failed]', e2);
        throw e2;
      }
    }
  }

  // ========== Renderers ==========
  function renderMerchants(items){
    if (!items || !items.length){
      head.textContent = 'No places yet.';
      list.hidden = true;
      return;
    }
    list.hidden = false;
    list.innerHTML = `
      ${items.map(m => `
        <div class="item" role="button" tabindex="0" data-id="${m.id}">
          <div class="thumb" style="background-image:url('${m.cover || ''}')"></div>
          <div class="info">
            <div class="t">${escapeHtml(m.name)}</div>
            <div class="sub">
              ${escapeHtml(m.address || '')}
              ${m.tags?.length ? ` · ${m.tags.slice(0,3).join(' · ')}` : ''}
            </div>
          </div>
          <div class="meta">
            ${m.rating ? `⭐ ${m.rating.toFixed ? m.rating.toFixed(1) : m.rating}` : ''}
            ${m.price ? ` · ${'💲'.repeat(Math.min(4, m.price))}` : ''}
          </div>
        </div>
      `).join('')}
    `;
  }

  function escapeHtml(s=''){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ========== Interactions ==========
  async function selectCity(id){
    // 樣式選中 + 箭頭
    wall.querySelectorAll('.citycell').forEach(b=>{
      const on = b.dataset.id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    // 標題與骨架
    const city = CITIES.find(x => x.id === id);
    head.textContent = `${city?.name || 'City'} — loading…`;

    sk.hidden = false;
    list.hidden = true;

    try{
      const items = await loadMerchants(id);
      sk.hidden = true;

      if (!items.length){
        head.textContent = `${city?.name || 'City'} — 0 places`;
        list.hidden = true;
        return;
      }

      head.textContent = `${city?.name || 'City'} — ${items.length} places`;
      renderMerchants(items);

    }catch(e){
      sk.hidden = true;
      head.textContent = 'Failed to load. Please try again.';
      list.hidden = true;
    }
  }

  // 點擊選城
  wall.addEventListener('click', (e)=>{
    const btn = e.target.closest('.citycell');
    if(!btn) return;
    selectCity(btn.dataset.id);
  });

  // 鍵盤左右切換
  wall.addEventListener('keydown', (e)=>{
    const cells = Array.from(wall.querySelectorAll('.citycell'));
    const cur = cells.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight'){ e.preventDefault(); const n = cells[Math.min(cur+1, cells.length-1)]; n?.focus(); n?.click(); }
    if (e.key === 'ArrowLeft'){  e.preventDefault(); const p = cells[Math.max(cur-1, 0)];             p?.focus(); p?.click(); }
    if (e.key === 'Home'){       e.preventDefault(); cells[0]?.focus(); cells[0]?.click(); }
    if (e.key === 'End'){        e.preventDefault(); cells[cells.length-1]?.focus(); cells[cells.length-1]?.click(); }
  });

  // 預設選第一個
  const first = wall.querySelector('.citycell');
  if (first) selectCity(first.dataset.id);
})();
