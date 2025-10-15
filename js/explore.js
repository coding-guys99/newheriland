// ===== Explore Page (Supabase server-side filters) =====
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

(() => {
  const wall = $('#cityWall');
  const head = $('#resultHead');
  const sk   = $('#skList');
  const list = $('#merchantList');
  if (!wall || !head) return;

  // --- 城市載入 (和你現有相同) ---
  async function loadCities() {
    const { data, error } = await supabase
      .from('cities')
      .select('id,name,icon,count,sort_order')
      .order('sort_order', { ascending: true })
      .limit(12);
    if (error || !data?.length) return [];
    return data.map((r, i) => ({
      id: r.id, name: r.name ?? r.id, icon: r.icon || '🏙️',
      count: Number.isFinite(r.count) ? r.count : 0,
      sort_order: r.sort_order ?? (i+1),
    }));
  }

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

  // ====== 後端抓商家（帶條件） ======
  // filters 來源：輕量篩選列會 dispatch 'explore:filters-change'
  let __EXP_FILTERS = { categories: [], sort: 'latest', openNow: false, minRating: null };
  let __CURRENT_CITY = null;

  async function fetchMerchantsServer(cityId, filters) {
    // 若勾了 openNow，查 view（有 open_now 欄）；否則查原表
    const table = filters.openNow ? 'merchants_view' : 'merchants';

    let q = supabase
      .from(table)
      .select('id,name,category,address,cover,updated_at,rating,open_now,city_id,open_hours')
      .eq('city_id', cityId)
      .eq('status', 'active');

    if (filters.categories?.length) {
      q = q.in('category', filters.categories);
    }
    if (typeof filters.minRating === 'number') {
      q = q.gte('rating', filters.minRating);
    }
    if (filters.openNow) {
      q = q.eq('open_now', true);            // 只在 view 有效
    }

    // 排序：latest / hot
    if (filters.sort === 'hot') {
      q = q.order('rating', { ascending: false }).order('updated_at', { ascending:false });
    } else {
      q = q.order('updated_at', { ascending: false });
    }

    // 你可以依需求 .limit(n)
    q = q.limit(50);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  function renderMerchants(items) {
    if (!items.length) {
      list.innerHTML = `
        <div class="empty" style="padding:18px;color:#6b7280;text-align:center">
          No places in <strong>${__CURRENT_CITY || 'this city'}</strong> yet.
        </div>`;
      return;
    }

    list.innerHTML = items.map(m => `
      <div class="item" data-id="${m.id}">
        <div class="thumb" style="background-image:url('${m.cover || ''}');"></div>
        <div>
          <div class="t">${m.name}</div>
          <div class="sub">
            ${m.category ?? ''}${m.address ? ' · ' + m.address : ''}
          </div>
          <div class="badges" style="margin-top:6px; display:flex; gap:8px; align-items:center;">
            ${m.rating ? `<span class="chip sm">★ ${m.rating.toFixed(1)}</span>` : ''}
            ${m.open_now ? `<span class="chip sm on">Open now</span>` : ''}
          </div>
        </div>
        <div class="sub" style="white-space:nowrap;margin-left:8px">
          ${m.updated_at ? new Date(m.updated_at).toLocaleDateString() : ''}
        </div>
      </div>
    `).join('');
  }

  async function applyServer() {
    if (!__CURRENT_CITY) return;
    head.textContent = `${__CURRENT_CITY} — loading…`;
    sk.hidden = false; list.hidden = true;

    try {
      const rows = await fetchMerchantsServer(__CURRENT_CITY, __EXP_FILTERS);
      head.textContent = `${__CURRENT_CITY} — ${rows.length} places`;
      renderMerchants(rows);
    } catch (err) {
      console.error('fetchMerchantsServer failed:', err);
      head.textContent = `${__CURRENT_CITY}`;
      list.innerHTML = `
        <div class="error" style="padding:18px;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:12px">
          Failed to load merchants. Please try again.
        </div>`;
    } finally {
      sk.hidden = true; list.hidden = false;
    }
  }

  function selectCity(id, cities) {
    // 樣式
    wall.querySelectorAll('.citycell').forEach(b=>{
      const on = b.dataset.id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const cityName = cities.find(x => x.id === id)?.name || id;
    __CURRENT_CITY = id;
    head.textContent = `${cityName} — loading…`;
    applyServer();
  }

  // ===== 初始化 =====
  async function bootstrap() {
    const cities = await loadCities();
    renderWall(cities);

    wall.addEventListener('click', (e) => {
      const btn = e.target.closest('.citycell');
      if (!btn) return;
      selectCity(btn.dataset.id, cities);
    });

    // 篩選列的事件（你現有的輕量篩選列會 dispatch 這個）
    window.addEventListener('explore:filters-change', (e) => {
      __EXP_FILTERS = { ...__EXP_FILTERS, ...(e.detail || {}) };
      applyServer();
    });

    // 預設選第一個城市
    const first = wall.querySelector('.citycell');
    if (first) selectCity(first.dataset.id, cities);
  }

  bootstrap();
})();