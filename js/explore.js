// ===== Explore — City wall → load merchants (完整替換版) =====

import { supabase } from './app.js';  // ← 引用上面的 client

async function loadMerchants(cityId){
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('city_id', cityId)
    .eq('status', 'active')
    .order('rating', { ascending: false });

  if(error) {
    console.error('Supabase error:', error);
    showErrorState();
    return [];
  }
  return data || [];
}


(() => {
  const wall = document.getElementById('cityWall');
  const head = document.getElementById('resultHead');
  const sk   = document.getElementById('skList');
  const list = document.getElementById('merchantList');
  if (!wall || !head || !sk || !list) return;

  // 你要的 4x3 城市牆（icon 先用 emoji；之後可換 SVG）
  const CITIES = [
    {id:'kuching',   name:'Kuching',   icon:'🏛️', count:128},
    {id:'miri',      name:'Miri',      icon:'⛽',  count:64},
    {id:'sibu',      name:'Sibu',      icon:'🛶',  count:52},
    {id:'bintulu',   name:'Bintulu',   icon:'⚓',  count:40},
    {id:'sarikei',   name:'Sarikei',   icon:'🍍',  count:24},
    {id:'limbang',   name:'Limbang',   icon:'🌉',  count:16},
    {id:'sriaman',   name:'Sri-Aman',  icon:'🌿',  count:14},
    {id:'mukah',     name:'Mukah',     icon:'🐟',  count:18},
    {id:'kapit',     name:'Kapit',     icon:'⛰️',  count:12},
    {id:'betong',    name:'Betong',    icon:'🏞️', count:11},
    {id:'samarahan', name:'Samarahan', icon:'🎓',  count:20},
    {id:'serian',    name:'Serian',    icon:'🌲',  count:9},
  ];

  // ---- 小工具 ----
  const $el = (t, cls, html) => { const n=document.createElement(t); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; };
  const url = (p) => {
    if (!p) return '#';
    if (/^https?:\/\//i.test(p)) return p;
    return p.replace(/^\.\//,'');
  };
  async function fetchJSON(path){
    try{
      const r = await fetch(path, {cache:'no-cache'});
      if(!r.ok) throw new Error(`${r.status} ${path}`);
      return await r.json();
    }catch(e){
      console.warn('[Explore] fetchJSON failed:', e);
      throw e;
    }
  }

  function showSkeleton(on){
    sk.hidden   = !on;
    list.hidden = on;
  }
  function renderEmpty(msg = 'No places yet.'){
    list.hidden = false;
    list.innerHTML = `<div class="merchant-list"><div class="item"><div class="t">${msg}</div></div></div>`;
  }
  function renderError(){
    list.hidden = false;
    list.innerHTML = `<div class="merchant-list"><div class="item"><div class="t">Failed to load. Please try again.</div></div></div>`;
  }

  function renderMerchants(items=[]){
    list.hidden = false;
    if(!items.length){ renderEmpty(); return; }

    const wrap = $el('div','merchant-list');
    items.forEach(m=>{
      const row = $el('button','item');
      row.type = 'button';
      row.innerHTML = `
        <div class="thumb" style="background-image:url('${url(m.cover)}')"></div>
        <div class="main">
          <div class="t">${m.name || ''}</div>
          <div class="sub">${m.address || (m.tagIds||[]).join(' · ') || ''}</div>
        </div>
        <div class="meta">${m.rating ? `⭐ ${m.rating}` : ''} ${m.priceLevel ? `· ${'💲'.repeat(m.priceLevel)}` : ''}</div>
      `;
      // 先不做二級頁，預留點擊事件
      row.addEventListener('click', ()=> {
        // TODO: open detail overlay
      });
      wrap.appendChild(row);
    });
    list.innerHTML = '';
    list.appendChild(wrap);
  }

  // ---- 渲染城市牆（固定 12 顆）----
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

  // ---- 點城市 → 更新標題 + 骨架 + 載入假資料 ----
  async function selectCity(id) {
  wall.querySelectorAll('.citycell').forEach(b=>{
    const on = b.dataset.id === id;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });

  const city = CITIES.find(x=>x.id===id);
  head.textContent = `${city?.name || 'City'} — loading...`;

  sk.hidden = false;
  list.hidden = true;

  // 调 Supabase 取得数据
  const merchants = await loadMerchants(id);

  sk.hidden = true;

  if (merchants.length === 0) {
    list.hidden = true;
    showEmptyState();
  } else {
    renderMerchants(merchants);
    list.hidden = false;
  }
}


  // 事件：點擊城市
  wall.addEventListener('click', (e)=>{
    const btn = e.target.closest('.citycell');
    if(!btn) return;
    selectCity(btn.dataset.id);
  });
  // 鍵盤左右切換（僅改選不捲動）
  wall.addEventListener('keydown', (e)=>{
    const cells = Array.from(wall.querySelectorAll('.citycell'));
    const cur = cells.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if(e.key === 'ArrowRight'){ e.preventDefault(); const n = cells[Math.min(cur+1, cells.length-1)]; n?.focus(); n?.click(); }
    if(e.key === 'ArrowLeft'){  e.preventDefault(); const p = cells[Math.max(cur-1, 0)];             p?.focus(); p?.click(); }
  });

  // 預設選第一個
  const first = wall.querySelector('.citycell');
  if(first) selectCity(first.dataset.id);

// 放在檔案頂部的小設定：外部 /data 映射
const CITY_DATA_URLS = {
  kuching: 'https://coding-guys99.github.io/newheriland/data/merchants/kuching.json',
  miri: 'https://coding-guys99.github.io/newheriland/data/merchants/miri.json',
  sibu: 'https://coding-guys99.github.io/newheriland/data/merchants/sibu.json',
  bintulu: 'https://coding-guys99.github.io/newheriland/data/merchants/bintulu.json',
  sarikei: 'https://coding-guys99.github.io/newheriland/data/merchants/sarikei.json',
  limbang: 'https://coding-guys99.github.io/newheriland/data/merchants/limbang.json',
  sriaman : 'https://coding-guys99.github.io/newheriland/data/merchants/sri-aman.json',
  mukah: 'https://coding-guys99.github.io/newheriland/data/merchants/mukah.json',
  kapit: 'https://coding-guys99.github.io/newheriland/data/merchants/kapit.json',
  betong: 'https://coding-guys99.github.io/newheriland/data/merchants/betong.json',
  samarahan: 'https://coding-guys99.github.io/newheriland/data/merchants/samarahan.json',
  serian: 'https://coding-guys99.github.io/newheriland/data/merchants/serian.json',
  // 其他城市之後補：kuching: 'https://.../kuching.json', ...
};

// 取得城市 JSON URL（有外部就用外部；否則退回本機相對路徑）
function getCityUrl(id){
  if (CITY_DATA_URLS[id]) return CITY_DATA_URLS[id];
  return `data/merchants/${id}.json`; // 保留本機開發
}

  
})();



