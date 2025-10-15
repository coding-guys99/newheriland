// ===== Explore Page (Supabase + Filters + Open Hours) =====
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

(() => {
  const wall = $('#cityWall');
  const head = $('#resultHead');
  const sk   = $('#skList');
  const list = $('#merchantList');
  if (!wall || !head) return;

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
      sort_order: r.sort_order ?? (i + 1)
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
        <span class="ico">${c.icon}</span>
        <span class="name">${c.name}</span>
        <span class="count">${c.count}</span>`;
      wall.appendChild(btn);
    });
  }

  // ===== 狀態 =====
  let currentCity = null;
  const filters = {
    categories: [],
    sort: 'latest',     // latest | hot
    minRating: null,    // 4.5+
    openNow: false
  };

  // ===== 後端抓取 =====
  async function fetchMerchants(cityId, filters) {
    const useView = !!filters.openNow;
    const table = useView ? 'merchants_view' : 'merchants';
    const baseFields = 'id,name,category,address,cover,updated_at,rating,open_hours,city_id';
    const viewFields = baseFields + ',open_now';

    let q = supabase
      .from(table)
      .select(useView ? viewFields : baseFields)
      .eq('city_id', cityId)
      .eq('status', 'active');

    if (filters.categories.length) q = q.in('category', filters.categories);
    if (filters.minRating) q = q.gte('rating', filters.minRating);
    if (filters.openNow) q = q.eq('open_now', true);

    if (filters.sort === 'hot')
      q = q.order('rating', { ascending: false }).order('updated_at', { ascending: false });
    else
      q = q.order('updated_at', { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  // ===== 判斷營業中 =====
  function computeIsOpen(openHours) {
    if (!openHours) return null;
    const s = String(openHours).trim().toLowerCase();
    if (s.includes('全天') || s.includes('24h')) return true;

    const match = s.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
    if (!match) return null;

    const pad = v => String(v).padStart(2, '0');
    const cur = new Date();
    const curStr = `${pad(cur.getHours())}:${pad(cur.getMinutes())}`;

    const open = `${pad(+match[1])}:${pad(match[2] ? +match[2] : 0)}`;
    const close = `${pad(+match[3])}:${pad(match[4] ? +match[4] : 0)}`;

    return (open <= curStr && curStr <= close);
  }

  // ===== 渲染卡片 =====
  function renderMerchants(items, city) {
    if (!items.length) {
      list.innerHTML = `
        <div class="empty" style="padding:18px;color:#6b7280;text-align:center">
          No places in <strong>${city.name}</strong> yet.
        </div>`;
      return;
    }

    list.innerHTML = items.map(m => {
      const isOpen = (m.open_now !== undefined) ? m.open_now : computeIsOpen(m.open_hours);
      const badge = isOpen == null ? '' :
        `<span class="pill ${isOpen ? 'ok' : 'bad'}">${isOpen ? 'Open now' : 'Closed'}</span>`;

      return `
        <div class="item">
          <div class="thumb" style="background-image:url('${m.cover || ''}')"></div>
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

  // ===== 切換城市 =====
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
      const data = await fetchMerchants(id, filters);
      head.textContent = `${city.name} — ${data.length} places`;
      renderMerchants(data, city);
    } catch (err) {
      console.error(err);
      head.textContent = city.name;
      list.innerHTML = `
        <div class="error" style="padding:18px;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:12px">
          Failed to load merchants. Please try again.
        </div>`;
    } finally {
      sk.hidden = true; list.hidden = false;
    }
  }

  // ===== 篩選列 =====
  function setupFilters() {
    const bar = $('#quickFilters');
    if (!bar) return;

    bar.addEventListener('click', e => {
      const chip = e.target.closest('.qchip');
      if (!chip) return;
      const cat = chip.dataset.cat;
      const type = chip.dataset.type;

      // 多選分類
      if (cat) {
        chip.classList.toggle('is-on');
        if (chip.classList.contains('is-on')) filters.categories.push(cat);
        else filters.categories = filters.categories.filter(x => x !== cat);
      }

      // 排序
      if (type === 'sort') {
        $$('.qchip[data-type="sort"]').forEach(c => c.classList.remove('is-on'));
        chip.classList.add('is-on');
        filters.sort = chip.dataset.val;
      }

      // 4.5+
      if (type === 'rating') {
        chip.classList.toggle('is-on');
        filters.minRating = chip.classList.contains('is-on') ? 4.5 : null;
      }

      // 營業中
      if (type === 'open') {
        chip.classList.toggle('is-on');
        filters.openNow = chip.classList.contains('is-on');
      }

      if (currentCity) selectCity(currentCity, lastCities);
    });
  }

  // ===== 初始化 =====
  let lastCities = [];
  async function bootstrap() {
    lastCities = await loadCities();
    renderWall(lastCities);
    setupFilters();

    wall.addEventListener('click', e => {
      const btn = e.target.closest('.citycell');
      if (!btn) return;
      selectCity(btn.dataset.id, lastCities);
    });

    const first = wall.querySelector('.citycell');
    if (first) selectCity(first.dataset.id, lastCities);
  }

  bootstrap();
})();