// js/explore.js — 專屬 Explore 頁面的版本
// 只要這支被載到沒有 explore 的頁面，會自動什麼都不做
import { supabase } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  // 這頁真的有 explore 嗎？
  const explorePage = document.querySelector('[data-page="explore"]');
  if (!explorePage) return;

  /* ---------- 快取 DOM ---------- */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const wall  = $('#cityWall');
  const head  = $('#resultHead');
  const sk    = $('#skList');
  const list  = $('#merchantList');
  const empty = $('#emptyState');
  const errBx = $('#errorState');
  const btnRetry = $('#btnRetry');
  const tabbar = document.querySelector('.tabbar');

  // 輕量篩選列
  const filtersBox  = $('#expFilters');
  const chipsQuick  = $$('.chips--quick .chip', filtersBox);
  const chipsCats   = $$('.chips--cats .chip',  filtersBox);  // 你現在 html 沒這組也沒關係
  const btnOpenFilter = $('#btnOpenFilter');

  // 進階篩選 overlay
  const advFilter   = $('#advFilter');
  const btnAdvClose = $('#btnAdvClose');
  const btnAdvApply = $('#btnAdvApply');
  const btnAdvReset = $('#btnAdvReset');
  const afCats   = $('#afCats');
  const afThemes = $('#afThemes');
  const afAttrs  = $('#afAttrs');
  const afMore   = $('#afMore');
  const afSort   = $('#afSort');

  // 詳情頁（注意：只有主 APP 那一頁才會有）
  const detailPage    = document.querySelector('[data-page="detail"]');
  const HAS_DETAIL    = !!detailPage;
  const btnDetailBack = $('#btnDetailBack');
  const elName   = $('#detailName');
  const elDesc   = $('#detailDesc');
  const elCarousel = $('#detailCarousel');
  const btnCPrev   = $('#cPrev');
  const btnCNext   = $('#cNext');
  const elCDots    = $('#cDots');
  const elMeta   = $('#detailMeta');
  const elTags   = $('#detailTags');
  const elAddrText = $('#detailAddressText');
  const btnCopyAddr= $('#btnCopyAddr');
  const hoursCard  = $('#hoursCard');
  const openChip   = $('#detailOpenChip');
  const todayHours = $('#todayHours');
  const hoursList  = $('#detailHoursList');
  const elOpen   = $('#detailOpen');
  const elRating = $('#detailRating');
  const elPrice  = $('#detailPrice');
  const actMap   = $('#actMap');
  const actMap2  = $('#actMap2');
  const actPhone = $('#actPhone');
  const actWeb   = $('#actWeb');
  const actShare = $('#actShare');
  const recList  = $('#detailRecList');

  /* ---------- 狀態 ---------- */
  const state = {
    cats: new Set(),
    themes: new Set(),
    attrs: new Set(),
    prices: new Set(),
    open: false,
    minRating: null,
    sort: 'latest',
  };
  let currentCity = null;
  let allMerchants = [];

  /* ---------- 小工具 ---------- */
  const toNum = n => {
    const x = Number(n);
    return Number.isFinite(x) ? x : null;
  };
  const shortAddr = s => (s || '').split(',')[0];

  function priceLevelNum(m) {
    if (typeof m.price_level === 'number') return m.price_level;
    if (typeof m.priceLevel === 'number') return m.priceLevel;
    const s = (m.priceLevel || m.price_level || '').toString();
    const cnt = (s.match(/\$/g) || []).length;
    return cnt || null;
  }

  // ====== 開放時間工具 ======
  function getOpenStruct(m){
    const obj = m.open_days || m.open_hours;
    return (obj && typeof obj === 'object') ? obj : null;
  }
  function isOpenNow(m, ref = new Date()){
    const openObj = getOpenStruct(m);
    if (openObj){
      const wd = ['sun','mon','tue','wed','thu','fri','sat'][ref.getDay()];
      const day = openObj[wd];
      if (!day || day.closed === true) return false;
      const ranges = Array.isArray(day.ranges) ? day.ranges : [];
      if (!ranges.length) return false;

      const cur = ref.getHours() * 60 + ref.getMinutes();
      const toMin = (hhmm) => {
        const [h, mi] = (hhmm || '').split(':').map(x => parseInt(x, 10));
        if (!Number.isFinite(h)) return 0;
        const m = Number.isFinite(mi) ? mi : 0;
        return (h === 24 && m === 0) ? 1440 : (h * 60 + m);
      };
      return ranges.some(r => {
        const o = toMin(r.open);
        const c = toMin(r.close);
        if (c > o) return (cur >= o && cur < c);
        return (cur >= o || cur < c);
      });
    }
    const t = (m.openHours || '').toLowerCase().trim();
    if (!t) return false;
    if (t.includes('24h')) return true;
    const mm = t.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
    if (!mm) return false;
    const mins = (h, mi) => parseInt(h, 10) * 60 + parseInt(mi || '0', 10);
    const start = mins(mm[1], mm[2] || '00'), end = mins(mm[3], mm[4] || '00');
    const cur = ref.getHours() * 60 + ref.getMinutes();
    return (end > start) ? (cur >= start && cur < end) : (cur >= start || cur < end);
  }
  function getOpenStatusText(m, ref=new Date()){
    const openObj = getOpenStruct(m);
    if (openObj){
      const wd = ['sun','mon','tue','wed','thu','fri','sat'][ref.getDay()];
      const day = openObj[wd];
      if (!day || day.closed === true) return 'Closed';
      if (!Array.isArray(day.ranges) || day.ranges.length === 0) return 'Closed';
      return isOpenNow(m, ref) ? 'Open now' : 'Closed';
    }
    const t = (m.openHours||'').trim();
    if (!t) return '—';
    if (/24\s*H/i.test(t)) return 'Open now';
    return isOpenNow(m, ref) ? 'Open now' : 'Closed';
  }
  function weeklyHoursLines(m){
    const openObj = getOpenStruct(m);
    if (!openObj && !m.openHours) return '';
    const days = [
      {k:'mon', n:'Mon'}, {k:'tue', n:'Tue'}, {k:'wed', n:'Wed'},
      {k:'thu', n:'Thu'}, {k:'fri', n:'Fri'}, {k:'sat', n:'Sat'}, {k:'sun', n:'Sun'}
    ];
    if (openObj){
      return days.map(d=>{
        const day = openObj[d.k];
        let val = '—';
        if (!day || day.closed === true) val = 'Closed';
        else if (Array.isArray(day.ranges) && day.ranges.length){
          val = day.ranges.map(r => `${r.open}–${r.close}`).join(', ');
        }else{
          val = 'Closed';
        }
        return `<div class="oh-line"><span>${d.n}</span><span>${val}</span></div>`;
      }).join('');
    }
    return `<div class="oh-line"><span>Daily</span><span>${m.openHours}</span></div>`;
  }
  function todayHoursText(m){
    const openObj = getOpenStruct(m);
    if (openObj){
      const wd   = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
      const day  = openObj[wd];
      if (!day) return '—';
      if (day.closed) return 'Closed';
      if (day.ranges?.length) return day.ranges.map(r=>`${r.open}–${r.close}`).join(', ');
      return '—';
    }
    return (m.openHours || '—');
  }

  function setAction(el, href){
    if (!el) return;
    if (href){
      el.href = href;
      el.removeAttribute('aria-disabled');
      el.classList.remove('is-disabled');
    } else {
      el.removeAttribute('href');
      el.setAttribute('aria-disabled','true');
      el.classList.add('is-disabled');
    }
  }

  /* ---------- Supabase ---------- */
  async function loadCities(){
    try{
      const { data, error } = await supabase
        .from('cities')
        .select('id,name,icon,sort_order')
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
      const q = supabase
        .from('merchants')
        .select('*')
        .eq('status','active')
        .order('updated_at',{ascending:false})
        .limit(limit);
      if (cityId && cityId !== 'all') q.eq('city_id', cityId);
      const { data, error } = await q;
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
      .select('id,name,category,categories,cover,images,updated_at,city_id')
      .eq('status','active')
      .neq('id', exceptId)
      .order('updated_at',{ascending:false})
      .limit(limit);
    if (error) throw error;

    let arr = (data||[]).filter(x => x.city_id === city_id);
    if (!arr.length) arr = data || [];

    if (category){
      const catLower = category.toLowerCase();
      const catMatch = arr.filter(r=>{
        const cats = Array.isArray(r.categories) ? r.categories : (r.category ? [r.category] : []);
        return cats.some(c => (c||'').toLowerCase() === catLower);
      });
      if (catMatch.length) return catMatch;
    }
    return arr;
  }

  /* ---------- Render ---------- */
  function renderWall(cities){
    if (!wall) return;
    wall.innerHTML = `
      <button class="citycell citycell--all" role="tab" data-id="all" aria-selected="true">
        <span class="ico">✨</span>
        <span class="name">All Sarawak</span>
      </button>
    `;
    cities.slice(0,12).forEach((c)=>{
      const btn = document.createElement('button');
      btn.className = 'citycell';
      btn.setAttribute('role','tab');
      btn.dataset.id = c.id;
      btn.setAttribute('aria-selected', 'false');
      btn.innerHTML = `
        <span class="ico">${c.icon || '🏙️'}</span>
        <span class="name">${c.name || c.id}</span>
      `;
      wall.appendChild(btn);
    });
  }

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

    list.innerHTML = items.map(m=>{
      const rating = (m.rating!=null) ? Number(m.rating).toFixed(1) : null;
      const statusTxt = getOpenStruct(m) ? getOpenStatusText(m) : '—';
      const badgeOpen =
        statusTxt === 'Open now' ? `<span class="badge ok">Open now</span>` :
        statusTxt === '—'        ? `<span class="badge">—</span>` :
                                   `<span class="badge off">${statusTxt}</span>`;
      const cats = Array.isArray(m.categories) ? m.categories : (m.category ? [m.category] : []);
      const catStr = cats.slice(0,2).join(', ');
      const addrShort = shortAddr(m.address);
      const price = priceLevelNum(m);
      const priceStr = price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';
      const cover = m.cover || (m.images?.[0]) || '';

      return `
        <div class="item" data-id="${m.id}" role="button" tabindex="0" aria-label="Open details for ${m.name}">
          <div class="thumb" style="background-image:url('${cover}')"></div>
          <div class="meta">
            <div class="t">${m.name}</div>
            <div class="sub">${catStr}${addrShort ? ` · ${addrShort}` : ''}</div>
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

  /* ---------- 套用篩選 ---------- */
  function applyFilters(){
    let arr = [...allMerchants];

    if (state.cats.size){
      const want = new Set([...state.cats].map(s => s.toLowerCase()));
      arr = arr.filter(m => {
        const cats = Array.isArray(m.categories) ? m.categories : (m.category ? [m.category] : []);
        return cats.some(c => want.has((c||'').toLowerCase()));
      });
    }
    if (state.themes.size || state.attrs.size){
      arr = arr.filter(m=>{
        const tags = Array.isArray(m.tags) ? m.tags.map(t=>t.toLowerCase()) : [];
        const hasTheme = !state.themes.size || [...state.themes].some(t => tags.includes(t.toLowerCase()));
        const hasAttr  = !state.attrs.size  || [...state.attrs].some(a => tags.includes(a.toLowerCase()));
        return hasTheme && hasAttr;
      });
    }
    if (state.open){
      arr = arr.filter(m => isOpenNow(m));
    }
    if (state.minRating != null){
      arr = arr.filter(m => (Number(m.rating)||0) >= state.minRating);
    }
    if (state.prices.size){
      arr = arr.filter(m=>{
        const p = priceLevelNum(m);
        return p && state.prices.has(p);
      });
    }

    // sort
    if (state.sort === 'hot'){
      arr.sort((a,b)=>{
        const ra = Number(a.rating)||0, rb = Number(b.rating)||0;
        if (rb !== ra) return rb - ra;
        const ta = new Date(a.updated_at||0).getTime();
        const tb = new Date(b.updated_at||0).getTime();
        return tb - ta;
      });
    } else if (state.sort === 'rating'){
      arr.sort((a,b)=> (Number(b.rating)||0) - (Number(a.rating)||0));
    } else {
      arr.sort((a,b)=>{
        const ta = new Date(a.updated_at||0).getTime();
        const tb = new Date(b.updated_at||0).getTime();
        return tb - ta;
      });
    }

    renderMerchants(arr);
    if (head) head.textContent = `${currentCity?.name || currentCity?.id || 'City'} — ${arr.length} places`;
  }

  /* ---------- 輕量篩選欄 ---------- */
  function bindLightFilters(){
    if (!filtersBox) return;
    // 分類組（你目前 html 沒這組也沒關係）
    chipsCats.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const cat = btn.dataset.cat;
        const on = btn.classList.toggle('is-on');
        btn.setAttribute('aria-pressed', on ? 'true':'false');
        if (on) state.cats.add(cat); else state.cats.delete(cat);
        applyFilters();
      });
    });

    // Quick chips
    chipsQuick.forEach(btn=>{
      if (!btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed','false');
      btn.addEventListener('click', ()=>{
        const hasSort   = btn.hasAttribute('data-sort');
        const hasOpen   = btn.hasAttribute('data-open');
        const hasRating = btn.hasAttribute('data-rating');

        if (hasSort){
          $$('.chips--quick .chip[data-sort]', filtersBox).forEach(b=>{
            b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
          });
          btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
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

  /* ---------- Advanced Filter ---------- */
  function openAF(){
    if (!advFilter) return;
    advFilter.hidden = false;
    requestAnimationFrame(()=> advFilter.classList.add('active'));
  }
  function closeAF(){
    if (!advFilter) return;
    advFilter.classList.remove('active');
    setTimeout(()=>{ advFilter.hidden = true; }, 150);
  }

  btnOpenFilter?.addEventListener('click', openAF);
  btnAdvClose?.addEventListener('click', closeAF);
  advFilter?.addEventListener('click', (e)=>{ if (e.target===advFilter) closeAF(); });
  window.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && advFilter && !advFilter.hidden) closeAF(); });

  function toggleMulti(container, attr, set){
    container?.addEventListener('click', (e)=>{
      const btn = e.target.closest(`.chip[${attr}]`); if (!btn) return;
      const val = btn.getAttribute(attr);
      const on  = btn.classList.toggle('is-on');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) set.add(val); else set.delete(val);
    });
  }
  toggleMulti(afCats,   'data-cat',   state.cats);
  toggleMulti(afThemes, 'data-theme', state.themes);
  toggleMulti(afAttrs,  'data-attr',  state.attrs);

  // More
  afMore?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if (!btn) return;
    if (btn.hasAttribute('data-open')){
      const on = btn.classList.toggle('is-on');
      btn.setAttribute('aria-pressed', on ? 'true':'false');
      state.open = on; return;
    }
    if (btn.hasAttribute('data-rating')){
      afMore.querySelectorAll('.chip[data-rating]').forEach(b=>{
        b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
      });
      btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
      state.minRating = Number(btn.getAttribute('data-rating')); return;
    }
    if (btn.hasAttribute('data-price')){
      const val = Number(btn.getAttribute('data-price'));
      const on  = btn.classList.toggle('is-on');
      btn.setAttribute('aria-pressed', on ? 'true':'false');
      if (on) state.prices.add(val); else state.prices.delete(val);
    }
  });

  // sort
  afSort?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip[data-sort]'); if (!btn) return;
    afSort.querySelectorAll('.chip[data-sort]').forEach(b=>{
      b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
    });
    btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
    state.sort = btn.getAttribute('data-sort') || 'latest';
  });

  function syncLightBarFromState(){
    $$('.chips--quick .chip[data-sort]').forEach(b=>{
      const on = (b.dataset.sort === state.sort);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const lightOpen = $('.chips--quick .chip[data-open]');
    if (lightOpen){
      lightOpen.classList.toggle('is-on', !!state.open);
      lightOpen.setAttribute('aria-pressed', state.open ? 'true' : 'false');
    }
  }

  btnAdvApply?.addEventListener('click', ()=>{
    applyFilters();
    syncLightBarFromState();
    closeAF();
  });

  btnAdvReset?.addEventListener('click', ()=>{
    state.cats.clear();
    state.themes.clear();
    state.attrs.clear();
    state.prices.clear();
    state.open = false;
    state.minRating = null;
    state.sort = 'latest';

    advFilter?.querySelectorAll('.chip.is-on').forEach(b=>{
      b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
    });
    const firstSort = afSort?.querySelector('.chip[data-sort="latest"]');
    firstSort?.classList.add('is-on'); firstSort?.setAttribute('aria-pressed','true');
    syncLightBarFromState();
    applyFilters();
  });
  
  // ====== AF: scroll-to-section + scroll-spy ======
const afScroll = document.getElementById('afScroll');
const afNav    = document.getElementById('afNav');
const afTabs   = Array.from(afNav?.querySelectorAll('.af-tab') || []);
const afSecs   = ['#sec-cats','#sec-themes','#sec-attrs','#sec-more','#sec-sort']
  .map(s => document.querySelector(s))
  .filter(Boolean);

// 點導覽 → 平滑捲動到對應段落
afNav?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.af-tab'); if (!btn) return;
  const targetSel = btn.getAttribute('data-target');
  const sec = targetSel ? document.querySelector(targetSel) : null;
  if (!sec) return;
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// 滾動同步高亮（優先用 IntersectionObserver）
if (afScroll && afSecs.length){
  const setActive = (id)=>{
    afTabs.forEach(t=>{
      const on = (t.getAttribute('data-target') === `#${id}`);
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  };

  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries)=>{
        // 取最靠近頂端且可見的 section
        const visible = entries
          .filter(en => en.isIntersecting)
          .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      }, { root: afScroll, threshold: .3 })
    : null;

  if (io){
    afSecs.forEach(sec => io.observe(sec));
  }else{
    // 後備方案：scroll 事件
    afScroll.addEventListener('scroll', ()=>{
      const top = afScroll.scrollTop + 80; // 頂部導覽高度補償
      let current = afSecs[0].id;
      afSecs.forEach(sec=>{
        if (sec.offsetTop <= top) current = sec.id;
      });
      setActive(current);
    }, { passive: true });
  }
}
  
  // --- Modern drawer: tabs + row click ---
(() => {
  const drawer = document.getElementById('advFilter');
  if (!drawer) return;

  // Tabs
  const tabs = Array.from(drawer.querySelectorAll('.af-tab'));
  const panels = Array.from(drawer.querySelectorAll('.af-panel'));
  drawer.querySelector('.af-tabs')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.af-tab'); if (!btn) return;
    const sel = btn.dataset.tab;
    tabs.forEach(t => t.classList.toggle('is-active', t === btn));
    panels.forEach(p => p.classList.toggle('is-active', p.matches(sel)));
    // A11y
    tabs.forEach(t => t.setAttribute('aria-selected', t === btn ? 'true':'false'));
  });

  // 讓整個 row 點了也能切換右側 chip（保留你原有的事件）
  drawer.addEventListener('click', (e)=>{
    const row = e.target.closest('.af-row[data-toggle-chip]');
    if (!row) return;
    // 如果直接點在 chip 或 chip 的子元素，就交給原本邏輯
    if (e.target.closest('.chip')) return;
    // 否則就找 row 內第一個 chip 模擬點擊
    const firstChip = row.querySelector('.chip');
    firstChip?.click();
  });
})();

  /* ---------- 城市切換 ---------- */
  function selectCity(id, cityObj){
    currentCity = cityObj || { id };
    $$('.citycell', wall).forEach(b=>{
      const on = b.dataset.id === id;
      b.setAttribute('aria-selected', on ? 'true':'false');
    });

    head && (head.textContent = `${currentCity.name || id} — loading…`);
    sk && (sk.hidden = false);
    list && (list.hidden = true);
    empty && (empty.hidden = true);
    errBx && (errBx.hidden = true);

    fetchMerchants(id).then(res=>{
      sk && (sk.hidden = true);
      if (!res.ok){
        errBx && (errBx.hidden = false);
        list && (list.hidden = true);
        head && (head.textContent = `${currentCity.name || id}`);
        return;
      }
      allMerchants = res.data || [];
      list && (list.hidden = false);

      // 輕量排序 reset
      state.sort = 'latest';
      $$('.chips--quick .chip[data-sort]', filtersBox).forEach(b=>{
        const on = (b.dataset.sort === 'latest');
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      applyFilters();
    });
  }

  /* ---------- 詳情頁 ---------- */
  function showPageDetail(){
    if (!HAS_DETAIL) return;
    document.querySelectorAll('[data-page]').forEach(sec=>{
      sec.hidden = (sec.dataset.page !== 'detail');
    });
    $$('.tabbar .tab').forEach(t=>{
      t.setAttribute('aria-selected','false');
      t.removeAttribute('aria-current');
    });
    tabbar && (tabbar.style.display = 'none');
  }

  function restoreMainPage(){
    if (!HAS_DETAIL) return;
    const current = document.querySelector('.tabbar .tab[aria-current="page"]')?.dataset.target
                 || (location.hash||'').replace('#','') || 'home';
    document.querySelectorAll('[data-page]').forEach(sec=>{
      sec.hidden = (sec.dataset.page !== current);
    });
    tabbar && (tabbar.style.display = '');
  }

  async function loadDetailPage(id){
    if (!HAS_DETAIL) return;
    showPageDetail();

    // reset
    elName && (elName.textContent = 'Loading…');
    elDesc && (elDesc.textContent = '');
    elMeta && (elMeta.innerHTML = '');
    elTags && (elTags.innerHTML = '');
    elAddrText && (elAddrText.textContent = '—');
    elRating && (elRating.textContent = '—');
    elOpen   && (elOpen.textContent   = '—');
    elPrice  && (elPrice.textContent  = '—');
    recList && (recList.innerHTML = '');
    if (elCarousel) elCarousel.innerHTML = '';
    if (elCDots){ elCDots.innerHTML = ''; btnCPrev && (btnCPrev.hidden = true); btnCNext && (btnCNext.hidden = true); elCDots.hidden = true; }

    try{
      const m = await fetchMerchantById(id);

      // ★ 這裡是你之前的坑：沒有這支就不要呼叫
      if (window.wireDetailFavorite) {
        window.wireDetailFavorite(m.id);
      }

      // 名稱 / 描述
      elName && (elName.textContent = m.name || '');
      elDesc && (elDesc.textContent = m.description || '—');

      // 圖片
      const imgs = Array.isArray(m.images) ? m.images.filter(Boolean) : [];
      if (!imgs.length && m.cover) imgs.push(m.cover);
      if (elCarousel){
        elCarousel.innerHTML = imgs.map((src, i) =>
          `<img src="${src}" alt="${m.name||''}" ${i>0?'loading="lazy"':''}>`
        ).join('');
      }
      const multi = imgs.length > 1;
      if (btnCPrev && btnCNext && elCDots){
        btnCPrev.hidden = btnCNext.hidden = elCDots.hidden = !multi;
        if (multi){
          elCDots.innerHTML = imgs.map((_,i)=>`<button type="button" aria-label="Go to slide ${i+1}" ${i===0?'aria-current="true"':''}></button>`).join('');
          const updateDots = () => {
            const w = elCarousel.clientWidth || 1;
            const idx = Math.round(elCarousel.scrollLeft / w);
            [...elCDots.children].forEach((b,i)=> b.setAttribute('aria-current', i===idx ? 'true':'false'));
            btnCPrev.disabled = (idx===0);
            btnCNext.disabled = (idx===imgs.length-1);
          };
          btnCPrev.onclick = () => elCarousel.scrollBy({ left: -elCarousel.clientWidth, behavior: 'smooth' });
          btnCNext.onclick = () => elCarousel.scrollBy({ left:  elCarousel.clientWidth, behavior: 'smooth' });
          elCarousel.addEventListener('scroll', () => { window.requestAnimationFrame(updateDots); });
          elCDots.onclick = (e)=>{
            const i = [...elCDots.children].indexOf(e.target.closest('button'));
            if (i>=0) elCarousel.scrollTo({ left: i * elCarousel.clientWidth, behavior: 'smooth' });
          };
          updateDots();
        }
      }

      // meta
      const rating = (m.rating!=null) ? Number(m.rating).toFixed(1) : null;
      const openTxt = getOpenStruct(m) ? getOpenStatusText(m) : '—';
      const price   = priceLevelNum(m);
      const priceStr= price ? '💲'.repeat(Math.max(1, Math.min(4, price))) : '';

      elMeta && (elMeta.innerHTML = `
        ${rating ? `<span class="chip">★ ${rating}</span>` : ''}
        ${openTxt !== '—' ? `<span class="chip ${openTxt==='Open now'?'ok':'off'}">${openTxt}</span>` : ''}
        ${priceStr ? `<span class="chip">${priceStr}</span>` : ''}
      `);
      const tags = Array.isArray(m.tags) ? m.tags.filter(Boolean) : [];
      elTags && (elTags.innerHTML = tags.length ? tags.map(t=>`<span class="tag">${t}</span>`).join('') : '');

      elRating && (elRating.textContent = rating || '—');
      elOpen   && (elOpen.textContent   = openTxt || '—');
      elPrice  && (elPrice.textContent  = priceStr || '—');

      // address
      elAddrText && (elAddrText.textContent = m.address || '—');
      if (btnCopyAddr){
        btnCopyAddr.addEventListener('click', async ()=>{
          try{
            await navigator.clipboard?.writeText(m.address||'');
            btnCopyAddr.textContent='Copied';
            setTimeout(()=>btnCopyAddr.textContent='Copy',1000);
          }catch(_){}
        }, { once:true });
      }

      // actions
      const mapHref = m.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}` : null;
      setAction(actMap,  mapHref);
      setAction(actMap2, mapHref);
      setAction(actPhone, m.phone ? `tel:${m.phone.replace(/\s+/g,'')}` : null);
      setAction(actWeb,   m.website || null);
      actShare?.addEventListener('click', async ()=>{
        try{ await navigator.share?.({ title: m.name, text: m.description || '', url: location.href }); }catch(_){}
      }, { once:true });

      // hours
      const hasHours = !!getOpenStruct(m) || !!m.openHours;
      if (hoursCard){
        if (hasHours){
          hoursCard.hidden = false;
          openChip && (openChip.textContent = openTxt || '—');
          todayHours && (todayHours.textContent = todayHoursText(m) || '—');
          hoursList && (hoursList.innerHTML = weeklyHoursLines(m) || '');
        }else{
          hoursCard.hidden = true;
          hoursList && (hoursList.innerHTML = '');
        }
      }
      
      // ===== Comments (per merchant) =====
const comments = loadComments(m.id);
renderCmtPreview(comments);

const btnShowComments = document.getElementById('btnShowComments');
const btnCmtClose     = document.getElementById('btnCmtClose');
const btnCmtSend      = document.getElementById('btnCmtSend');
const cmtInput        = document.getElementById('cmtText');
const cmtSheet        = document.getElementById('cmtSheet');

// 打開：每次都覆蓋，這樣關掉再開也OK
if (btnShowComments) {
  btnShowComments.onclick = () => {
    renderCmtSheet(comments);  // 先用最新的陣列畫一次
    openCmtSheet();
  };
}

// 關閉：按X
if (btnCmtClose) {
  btnCmtClose.onclick = () => {
    closeCmtSheet();
  };
}

// 關閉：點遮罩
if (cmtSheet) {
  cmtSheet.onclick = (e) => {
    if (e.target === cmtSheet) {
      closeCmtSheet();
    }
  };
}

// 送出留言
if (btnCmtSend) {
  btnCmtSend.onclick = () => {
    const text = (cmtInput?.value || '').trim();
    if (!text) return;

    // 匿名暱稱，可之後再做「設定裡自訂名稱」
    const nick = localStorage.getItem('hl.user.nick') || '旅人';

    const item = {
      text,
      nick,
      ts: Date.now()
    };

    // 新的放最前面
    comments.unshift(item);
    saveComments(m.id, comments);

    // 更新詳情頁那一條
    renderCmtPreview(comments);
    // 如果面板開著，也更新
    renderCmtSheet(comments);

    if (cmtInput) cmtInput.value = '';
  };
}


      // related
      const cats = Array.isArray(m.categories) ? m.categories : (m.category ? [m.category] : []);
      const related = await fetchRelated({ city_id: m.city_id, category: cats[0], exceptId: m.id, limit: 6 });
      if (recList){
        recList.innerHTML = related.map(r => {
          const cov = r.cover || (Array.isArray(r.images) ? r.images[0] : '') || '';
          return `
            <a class="rec" data-id="${r.id}" role="button" tabindex="0" aria-label="Open ${r.name}">
              <div class="rthumb" style="background-image:url('${cov}')"></div>
              <div class="rname">${r.name}</div>
            </a>
          `;
        }).join('');
        recList.onclick = (e)=>{
          const a = e.target.closest('.rec'); if (!a) return;
          location.hash = `#detail/${a.dataset.id}`;
        };
      }

    }catch(err){
      console.warn('[detail] load failed:', err);
      elName && (elName.textContent = 'Failed to load');
      elDesc && (elDesc.textContent = 'Please check your connection and try again.');
    }
  }

  /* ---------- Router ---------- */
  function handleHash(){
    if (!HAS_DETAIL) return; // 沒有 detail 頁就不要攔 hash 了
    const h = location.hash || '';
    if (h.startsWith('#detail/')){
      const id = h.split('/')[1];
      if (id){
        showPageDetail();
        loadDetailPage(id);
      }
      return;
    }
    // 回清單
    restoreMainPage();
    if (h === '#explore' || h === '') {
      if (allMerchants.length) applyFilters();
    }
  }
  if (HAS_DETAIL) {
    window.addEventListener('hashchange', handleHash);
  }

  /* ---------- 啟動 ---------- */
  (async function init(){
    if (!wall) return;

    btnRetry?.addEventListener('click', ()=>{
      if (currentCity?.id) selectCity(currentCity.id, currentCity);
    });

    bindLightFilters();

    const cities = await loadCities();
    renderWall(cities);

    // 城市牆事件
    wall.addEventListener('click', (e)=>{
      const btn = e.target.closest('.citycell');
      if (!btn) return;
      const city = { id: btn.dataset.id, name: btn.querySelector('.name')?.textContent };
      selectCity(btn.dataset.id, city);
    });

    // 預設選 ALL
    const first = wall.querySelector('.citycell[data-id="all"]') || wall.querySelector('.citycell');
    if (first){
      const id = first.dataset.id;
      const name = first.querySelector('.name')?.textContent || id;
      selectCity(id, { id, name });
    }

    // 列表 → 詳情
    list?.addEventListener('click', (e)=>{
      const card = e.target.closest('.item'); if (!card) return;
      const id = card.dataset.id; if (!id) return;
      if (HAS_DETAIL) {
        location.hash = `#detail/${id}`;
      }
    });
    list?.addEventListener('keydown', (e)=>{
      if (e.key !== 'Enter') return;
      const card = e.target.closest('.item'); if (!card) return;
      const id = card.dataset.id; if (!id) return;
      if (HAS_DETAIL) {
        location.hash = `#detail/${id}`;
      }
    });

    // 詳情返回
    btnDetailBack?.addEventListener('click', ()=>{ location.hash = '#explore'; });

    // 初始路由（只在有 detail 時）
    if (HAS_DETAIL) handleHash();
  })();
});

// === Comments (local, per merchant) =====================
const CMT_KEY_PREFIX = 'HL_CMTS_';

function cmtKey(id){
  return CMT_KEY_PREFIX + id;
}

function loadComments(merchId){
  try {
    const raw = localStorage.getItem(cmtKey(merchId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch(e){
    return [];
  }
}

function saveComments(merchId, list){
  try {
    localStorage.setItem(cmtKey(merchId), JSON.stringify(list));
  } catch(e){}
}

function maskName(nick){
  // 如果是兩個中文字 → 留第一個 + **
  if (/^[\u4e00-\u9fa5]{2,3}$/.test(nick)) {
    return nick[0] + ' **';
  }
  // 其它就留前 1~2 字
  return (nick || 'Guest').slice(0, 1).toUpperCase() + ' ***';
}

function renderCmtPreview(comments){
  const card = document.getElementById('detailCommentsCard');
  const summary = document.getElementById('cmtSummary');
  const preview = document.getElementById('cmtPreview');
  if (!card || !summary || !preview) return;

  if (!comments.length){
    summary.textContent = '尚無留言';
    preview.classList.add('cmt-empty');
    preview.innerHTML = '還沒有留言，歡迎搶頭香！';
    return;
  }

  const first = comments[0];
  const name = maskName(first.nick || '旅人');
  const dt = new Date(first.ts || Date.now());
  const dateStr = dt.toLocaleDateString('zh-TW');

  summary.textContent = `${comments.length} 則留言`;
  preview.classList.remove('cmt-empty');
  preview.innerHTML = `
    <div class="cmt-preview-user">
      <div class="cmt-avatar">${name.slice(0,1)}</div>
      <div>
        <div class="cmt-name">${name}</div>
        <div class="cmt-date">${dateStr}</div>
      </div>
    </div>
    <div class="cmt-text">${first.text}</div>
  `;
}

function renderCmtSheet(comments){
  const list = document.getElementById('cmtList');
  if (!list) return;
  if (!comments.length){
    list.innerHTML = `<div class="cmt-item">還沒有留言，當第一個吧 🥳</div>`;
    return;
  }
  list.innerHTML = comments.map(c=>{
    const name = maskName(c.nick || '旅人');
    const dt = new Date(c.ts || Date.now());
    const timeStr = dt.toLocaleString('zh-TW', {year:'numeric', month:'2-digit', day:'2-digit'});
    return `
      <div class="cmt-item">
        <div class="top">
          <div class="cmt-avatar">${name.slice(0,1)}</div>
          <div class="name">${name}</div>
          <div class="time">${timeStr}</div>
        </div>
        <div class="body">${c.text}</div>
      </div>
    `;
  }).join('');
}

function openCmtSheet(){
  const sheet = document.getElementById('cmtSheet');
  if (!sheet) return;
  sheet.hidden = false;
  requestAnimationFrame(()=> sheet.classList.add('active'));
  document.body.classList.add('no-scroll');
}

function closeCmtSheet(){
  const sheet = document.getElementById('cmtSheet');
  if (!sheet) return;
  sheet.classList.remove('active');
  setTimeout(()=>{ sheet.hidden = true; }, 140);
  document.body.classList.remove('no-scroll');
}