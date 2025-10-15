document.addEventListener('include:loaded', (e) => {
  // 確認是 tabbar 被載入完畢再執行
  if (e.detail.src.includes('tabbar.html')) {
    initApp(); // 主初始化邏輯搬進一個函式
  }
});

function initApp() {

// 基本工具
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ===== 主頁分頁（Tabbar） =====
(() => {
  const PAGES = ["home","explore","map","saved","add"];
  const pages = new Map(PAGES.map(id => [id, document.querySelector(`[data-page="${id}"]`)]));
  const tabs  = $$('.tabbar .tab');

  let active = PAGES[0];
  const scrollMemo = new Map();

  function setAriaSelected(targetId){
    tabs.forEach(t => {
      const on = t.dataset.target === targetId;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      if(on) t.setAttribute('aria-current','page'); else t.removeAttribute('aria-current');
    });
  }

  function swapPages(oldId, newId){
    if (oldId){
      const prev = pages.get(oldId);
      if(prev){ prev.classList.remove('active','page--in'); prev.hidden = true; }
    }
    const next = pages.get(newId);
    if(next){ next.hidden = false; next.classList.add('active'); }
  }

  function afterSwap(newId, {push=true} = {}){
    const y = scrollMemo.get(newId) || 0;
    window.scrollTo(0, y);

    // 先同步 tab 狀態（避免你看到的「先切畫面後高亮才動」）
    setAriaSelected(newId);

    // 可及時把焦點移到該頁 h1（不滾動）
    const h1 = pages.get(newId)?.querySelector('[data-focusable-heading]');
    if(h1){ h1.focus({preventScroll:true}); }

    if (push) location.hash = newId;
    active = newId;
  }

  function showPage(id, {push=true} = {}){
    if (!pages.has(id) || active === id) return;
    const oldId = active, newId = id;

    // 記錄舊頁 scroll
    if (oldId){ scrollMemo.set(oldId, window.scrollY || 0); }

    // 方向（可讓 CSS 決定 forward/reverse 動畫）
    if (oldId){
      const oldIdx = PAGES.indexOf(oldId);
      const newIdx = PAGES.indexOf(newId);
      document.documentElement.dataset.dir = newIdx > oldIdx ? 'forward' : 'reverse';
    } else {
      document.documentElement.dataset.dir = 'forward';
    }

    // 使用 View Transitions（有就用）
    if (document.startViewTransition && matchMedia('(prefers-reduced-motion: no-preference)').matches){
      const vt = document.startViewTransition(() => swapPages(oldId, newId));
      vt.finished.finally(() => afterSwap(newId, {push}));
    } else {
      // fallback：淡入
      swapPages(oldId, newId);
      const next = pages.get(newId);
      if (next){ next.classList.add('page--in'); setTimeout(()=> next.classList.remove('page--in'), 240); }
      afterSwap(newId, {push});
    }
  }

  // Tab click
  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.target;
      showPage(id);
    });
  });

  // hash deep-link（可直接 #map 進來）
  const initHash = () => {
    const h = (location.hash||'').replace('#','');
    if (PAGES.includes(h)) showPage(h, {push:false});
    else showPage(active, {push:false});
  };
  window.addEventListener('hashchange', initHash);
  initHash();
})();

// ===== Settings 二級/三級（Overlay-style） =====
(() => {
  const settingsPage = $('#p-settings');
  const btnOpen = $('#btnOpenSettings');
  const btnBack = $('#btnSettingsBack');

  // 第三級集合
  const tertiaryPages = new Map(
    ['settings-language','settings-currency','settings-privacy','settings-policy']
      .map(id => [id, document.getElementById(id)])
  );

  // 狀態
  let lastMainPage = 'home'; // 開 settings 前的主頁（單純紀錄，不切換）
  let stacking = [];         // 疊代：['settings', 'settings-language', ...]

  // 開啟二級
  function openSettings(){
    if (!settingsPage) return;
    // 紀錄目前主頁 id（用 hash 或 aria-current 找）
    const curr = document.querySelector('.tabbar .tab[aria-current="page"]')?.dataset.target || 'home';
    lastMainPage = curr;

    settingsPage.hidden = false;
    settingsPage.classList.add('active');
    stacking = ['settings'];

    // 聚焦標題
    $('#h-settings')?.focus({preventScroll:true});
  }

  // 關閉二級（回到「開啟時」的主頁，不動 hash）
  function closeSettings(){
    settingsPage?.classList.remove('active');
    settingsPage?.setAttribute('hidden','');
    // 關閉所有三級
    tertiaryPages.forEach(p => { p.hidden = true; p.classList.remove('active'); });
    stacking = [];
  }

  // 自二級打開三級
  function openTertiary(id){
    const page = tertiaryPages.get(id);
    if (!page) return;
    page.hidden = false;
    // 右進右出
    if (document.startViewTransition && matchMedia('(prefers-reduced-motion: no-preference)').matches){
      document.startViewTransition(() => page.classList.add('active'));
    } else {
      page.classList.add('active');
    }
    stacking.push(id);
    page.querySelector('.settings-title')?.focus({preventScroll:true});
  }

  // 第三級返回：只回到二級
  function closeTopTertiary(){
    const top = stacking[stacking.length - 1];
    if (top && top !== 'settings'){
      const page = tertiaryPages.get(top);
      if (page){
        page.classList.remove('active');
        page.setAttribute('hidden','');
        stacking.pop();
        $('#h-settings')?.focus({preventScroll:true});
      }
      return;
    }
    // 如果已回到二級，再執行一次就是關閉整個 Settings
    closeSettings();
  }

  // 綁定
  btnOpen?.addEventListener('click', openSettings);
  btnBack?.addEventListener('click', closeSettings);

  // 二級 → 第三級
  $$('.settings-list .set-item[data-target]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.target;
      openTertiary(id);
    });
  });

  // 第三級返回
  $$('.overlay-page.tertiary .sub-back').forEach(btn=>{
    btn.addEventListener('click', closeTopTertiary);
  });

  // Esc 關閉頂層（先收第三級，再收二級）
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape'){
      if (stacking.length > 1) closeTopTertiary();
      else if (stacking.length === 1) closeSettings();
    }
  });
})();

// ===== 小開關（示意） =====
(() => {
  const dark = $('#toggleDark');
  dark?.addEventListener('change', (e)=>{
    document.documentElement.classList.toggle('dark', e.target.checked);
  });

  const a11y = $('#toggleA11y');
  a11y?.addEventListener('change', (e)=>{
    document.documentElement.dataset.a11y = e.target.checked ? 'on' : 'off';
  });
})();
}


// ===== Explore UI: 4x3 城市牆 + 三種狀態 =====
(() => {
  const wall  = document.getElementById('cityWall');
  const head  = document.getElementById('resultHead');
  const sk    = document.getElementById('skList');
  const list  = document.getElementById('merchantList');
  const empty = document.getElementById('emptyState');
  const error = document.getElementById('errorState');
  const btnRetry = document.getElementById('btnRetry');
  if (!wall || !head) return;

  // Demo 城市（icon 先用 emoji）
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
    {id:'serian',    name:'Serian',    icon:'🌲',  count:9}
  ];

  // Render 4x3
  wall.innerHTML = '';
  CITIES.slice(0,12).forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'citycell';
    btn.setAttribute('role','tab');
    btn.dataset.id = c.id;
    btn.setAttribute('aria-selected', i===0 ? 'true' : 'false');
    btn.innerHTML = `
      <span class="ico">${c.icon}</span>
      <span class="name">${c.name}</span>
      <span class="count">${c.count}</span>
    `;
    wall.appendChild(btn);
  });

  // 簡單狀態切換
  function showState(state){
    // state: 'loading' | 'list' | 'empty' | 'error'
    sk.hidden    = state !== 'loading';
    list.hidden  = state !== 'list';
    empty.hidden = state !== 'empty';
    error.hidden = state !== 'error';
  }

  // 渲染清單
  function renderMerchants(items){
    list.innerHTML = items.map(m=>`
      <div class="item">
        <div class="thumb" style="background-image:url('${m.cover}')"></div>
        <div>
          <div class="t">${m.name}</div>
          <div class="sub">${m.category || ''}</div>
          <div class="sub" style="font-size:12px;opacity:.7">${m.address || ''}</div>
        </div>
      </div>
    `).join('');
  }

  // 選擇城市 → 載入 JSON
  async function selectCity(id){
    // 標註選取
    wall.querySelectorAll('.citycell').forEach(b=>{
      const on = b.dataset.id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const city = CITIES.find(x=>x.id===id);
    head.textContent = `${city?.name || 'City'} — Loading…`;
    showState('loading');

    try{
      // 換成你的 mock 檔名規則
      const res = await fetch(`./mock/merchants_${id}.json`);
      if(!res.ok) throw new Error('network');
      const data = await res.json();
      const items = data.items || [];

      if (!items.length){
        head.textContent = `${city?.name || 'City'} — No places yet`;
        showState('empty');
        return;
      }

      head.textContent = `${city?.name || 'City'} — ${items.length} places`;
      renderMerchants(items);
      showState('list');

    }catch(err){
      head.textContent = `${city?.name || 'City'} — Failed to load`;
      showState('error');
      // 把要 retry 的 city id 暫存在按鈕
      if (btnRetry) btnRetry.dataset.city = id;
    }
  }

  // 點擊城市
  wall.addEventListener('click', (e)=>{
    const btn = e.target.closest('.citycell');
    if(!btn) return;
    selectCity(btn.dataset.id);
  });

  // 鍵盤左右切換（可選）
  wall.addEventListener('keydown', (e)=>{
    const cells = Array.from(wall.querySelectorAll('.citycell'));
    const cur = cells.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if(e.key === 'ArrowRight'){ e.preventDefault(); const n = cells[Math.min(cur+1, cells.length-1)]; n?.focus(); n?.click(); }
    if(e.key === 'ArrowLeft'){  e.preventDefault(); const p = cells[Math.max(cur-1, 0)];             p?.focus(); p?.click(); }
  });

  // Retry
  btnRetry?.addEventListener('click', ()=>{
    const cid = btnRetry.dataset.city;
    if (cid) selectCity(cid);
  });

  // 預設選第一個
  const first = wall.querySelector('.citycell');
  if(first) selectCity(first.dataset.id);
})();


// ===== Add Page — UI only (chips, autosize, photo preview) =====
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const form = $('#addForm');
  if (!form) return;

  // chips：type 單選、tags 多選
  const typeWrap = $('#typeChips');
  const tagWrap  = $('#tagChips');

  typeWrap?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip');
    if (!btn) return;
    // 單選
    $$('.chip', typeWrap).forEach(c => c.classList.remove('is-on'));
    btn.classList.add('is-on');
  });
  tagWrap?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip');
    if (!btn) return;
    btn.classList.toggle('is-on'); // 多選
  });

  // textarea autosize
  const desc = $('#fDesc');
  const auto = (el)=>{
    el.style.height = 'auto';
    el.style.height = Math.min(240, el.scrollHeight) + 'px';
  };
  desc?.addEventListener('input', ()=> auto(desc));
  desc && auto(desc);

  // 照片預覽（本地）
  const fileInput = $('#fPhotos');
  const grid = $('#previewGrid');

  function renderPreview(files){
    if (!grid) return;
    grid.innerHTML = '';
    const list = Array.from(files).slice(0, 10);
    list.forEach(file=>{
      const url = URL.createObjectURL(file);
      const cell = document.createElement('div');
      cell.className = 'thumb';
      cell.style.backgroundImage = `url("${url}")`;
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '×';
      del.addEventListener('click', ()=>{
        // 純 UI：移除預覽
        cell.remove();
      });
      cell.appendChild(del);
      grid.appendChild(cell);
    });
  }

  fileInput?.addEventListener('change', (e)=>{
    const files = e.target.files || [];
    renderPreview(files);
  });

  // 提交：目前只阻止送出，保留 UI 流程
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    // 簡單 required UI
    if (!$('#fName').value.trim()){
      $('#fName').focus();
      return;
    }
    // 這裡先不做儲存；之後再接 localStorage / 後端
    alert('UI ready. Save logic comes next ✨');
  });

  $('#btnPreview')?.addEventListener('click', ()=>{
    alert('Preview mock — 之後接真預覽頁');
  });
})();