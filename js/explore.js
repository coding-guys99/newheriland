// ===== Explore Page (front-end filters + open-hours parsing) =====
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

(() => {
  const wall = $('#cityWall');
  const head = $('#resultHead');
  const sk   = $('#skList');
  const list = $('#merchantList');
  const qbar = $('#quickFilters');
  if (!wall || !head) return;

  // --- 狀態 ---
  let currentCity = null;
  let cachedRaw = [];      // 後端抓回該城市的原始列表（不加任何條件）
  const filters = {
    categories: [],        // 多選：['Taste','Culture'...]
    sort: 'latest',        // latest | hot
    minRating: null,       // 4.5+
    openNow: false,        // 是否只看營業中
  };

  // ===== 載入城市 =====
  async function loadCities() {
    const { data, error } = await supabase
      .from('cities')
      .select('id,name,icon,count,sort_order')
      .order('sort_order', { ascending: true });
    if (error || !data?.length) return [];
    return data.map((r, i) => ({
      id: r.id, name: r.name ?? r.id,
      icon: r.icon || '🏙️', count: r.count ?? 0,
      sort_order: r.sort_order ?? (i + 1),
    }));
  }

  function renderWall(cities) {
    wall.innerHTML = '';
    cities.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'citycell';
      btn.setAttribute('role','tab');
      btn.dataset.id = c.id;
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.innerHTML = `
        <span class="ico">${c.icon}</span>
        <span class="name">${c.name}</span>
        <span class="count">${c.count}</span>`;
      wall.appendChild(btn);
    });
  }

  // ===== 後端只抓一次：該城市的商家清單（不套條件） =====
  async function fetchMerchantsBase(cityId) {
    const { data, error } = await supabase
      .from('merchants')
      .select('id,name,category,address,cover,updated_at,rating,open_hours,city_id,status')
      .eq('city_id', cityId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // ===== 開關時間解析（支援：全天 / 24H / HH:MM - HH:MM）=====
  function computeIsOpen(openHours) {
    if (!openHours) return null;
    const s = String(openHours).trim().toLowerCase();
    if (s.includes('全天') || s.includes('24h')) return true;

    const m = s.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
    if (!m) return null;

    const pad = v => String(v).padStart(2,'0');
    const cur = new Date();
    const curStr = `${pad(cur.getHours())}:${pad(cur.getMinutes())}`;

    const open  = `${pad(+m[1])}:${pad(m[2] ? +m[2] : 0)}`;
    const close = `${pad(+m[3])}:${pad(m[4] ? +m[4] : 0)}`;

    return (open <= curStr && curStr <= close);
  }

  // ===== 在前端套用所有篩選 + 排序 =====
  function applyFilters(items) {
    let out = [...items];

    if (filters.categories.length) {
      out = out.filter(x => x.category && filters.categories.includes(x.category));
    }
    if (filters.minRating) {
      out = out.filter(x => (typeof x.rating === 'number') && x.rating >= filters.minRating);
    }
    if (filters.openNow) {
      out = out.filter(x => computeIsOpen(x.open_hours) === true);
    }

    if (filters.sort === 'hot') {
      out.sort((a,b) => (b.rating || 0) - (a.rating || 0) || new Date(b.updated_at) - new Date(a.updated_at));
    } else {
      out.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    return out;
  }

  // ===== 繪製清單 =====
  function renderMerchants(items, city) {
    if (!items.length) {
      list.innerHTML = `
        <div class="empty" style="padding:18px;color:#6b7280;text-align:center">
          No places in <strong>${city?.name || city?.id}</strong> yet.
        </div>`;
      return;
    }
    list.innerHTML = items.map(m => {
      const isOpen = computeIsOpen(m.open_hours);
      const badge = (isOpen == null) ? '' :
        `<span class="pill ${isOpen ? 'ok' : 'bad'}">${isOpen ? 'Open now' : 'Closed'}</span>`;
      return `
        <div class="item" data-id="${m.id}">
          <div class="thumb" style="background-image:url('${m.cover || ''}');"></div>
          <div>
            <div class="t">${m.name}</div>
            <div class="sub">${m.category ?? ''}${m.address ? ' · ' + m.address : ''}</div>
            <div class="meta-line">
              ${m.rating ? `<span class="rate">★ ${m.rating.toFixed(1)}</span>` : ''}
              ${badge}
            </div>
          </div>
          <div class="sub" style="white-space:nowrap;margin-left:8px">
            ${m.updated_at ? new Date(m.updated_at).toLocaleDateString() : ''}
          </div>
        </div>`;
    }).join('');
  }

  // ===== 切換城市：抓一次 → 快取 → 前端篩選 → 繪製 =====
  async function selectCity(id, cities) {
    currentCity = id;
    wall.querySelectorAll('.citycell').forEach(b => {
      const on = b.dataset.id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const city = cities.find(c => c.id === id) || { id, name: id };
    head.textContent = `${city.name} — loading…`;
    sk.hidden = false; list.hidden = true;

    try {
      cachedRaw = await fetchMerchantsBase(id);
      const filtered = applyFilters(cachedRaw);
      head.textContent = `${city.name} — ${filtered.length} places`;
      renderMerchants(filtered, city);
    } catch (err) {
      console.error('fetch merchants failed:', err);
      head.textContent = city.name;
      list.innerHTML = `
        <div class="error" style="padding:18px;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:12px">
          Failed to load merchants. Please try again.
        </div>`;
    } finally {
      sk.hidden = true; list.hidden = false;
    }
  }

  // ===== 篩選列事件：更新 filters → 用 cachedRaw 即時重繪 =====
  function setupQuickFilters(cities) {
    if (!qbar) return;
    qbar.addEventListener('click', e => {
      const chip = e.target.closest('.qchip');
      if (!chip) return;

      // 分類（多選）
      if (chip.dataset.cat) {
        chip.classList.toggle('is-on');
        const cat = chip.dataset.cat;
        if (chip.classList.contains('is-on')) {
          if (!filters.categories.includes(cat)) filters.categories.push(cat);
        } else {
          filters.categories = filters.categories.filter(x => x !== cat);
        }
      }

      // 排序（單選）
      if (chip.dataset.type === 'sort') {
        $$('.qchip[data-type="sort"]').forEach(c => c.classList.remove('is-on'));
        chip.classList.add('is-on');
        filters.sort = chip.dataset.val || 'latest';
      }

      // 4.5+
      if (chip.dataset.type === 'rating') {
        chip.classList.toggle('is-on');
        filters.minRating = chip.classList.contains('is-on') ? 4.5 : null;
      }

      // 營業中
      if (chip.dataset.type === 'open') {
        chip.classList.toggle('is-on');
        filters.openNow = chip.classList.contains('is-on');
      }

      // 只用 cachedRaw 即時重繪（不重抓）
      if (currentCity) {
        const city = (cities || []).find(c => c.id === currentCity) || { id: currentCity, name: currentCity };
        const filtered = applyFilters(cachedRaw);
        head.textContent = `${city.name} — ${filtered.length} places`;
        renderMerchants(filtered, city);
      }
    });
  }

  // ===== 初始化 =====
  async function bootstrap() {
    const cities = await loadCities();
    renderWall(cities);
    setupQuickFilters(cities);

    wall.addEventListener('click', e => {
      const btn = e.target.closest('.citycell');
      if (!btn) return;
      selectCity(btn.dataset.id, cities);
    });

    const first = wall.querySelector('.citycell');
    if (first) selectCity(first.dataset.id, cities);
  }

  bootstrap();
})();