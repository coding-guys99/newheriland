// js/search-overlay.js
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const LS_RECENT_KEY = 'hl.search.history';
const HOT_KEYWORDS  = ['Kolo mee','Kek lapis','Bidayuh','Night market','Museum','Waterfront','Hidden gems'];

let state = { open:false, city:null, cat:null };

function openOverlay(){
  const ovl = $('#searchOverlay'); if(!ovl) return;
  ovl.hidden = false;
  requestAnimationFrame(()=> ovl.classList.add('show'));
  document.body.classList.add('no-scroll');
  $('#sQuery')?.focus({ preventScroll:true });
  state.open = true;
  renderRecent();
  renderHot();
}
function closeOverlay(){
  const ovl = $('#searchOverlay'); if(!ovl) return;
  ovl.classList.remove('show');
  setTimeout(()=> ovl.hidden = true, 200);
  document.body.classList.remove('no-scroll');
  state = { open:false, city:null, cat:null };
  $('#sQuery').value = '';
  $('#sBtnClear').hidden = true;
  $('#sSuggest').hidden = true;
}
function addRecent(q){
  q = (q||'').trim(); if(!q) return;
  const arr = JSON.parse(localStorage.getItem(LS_RECENT_KEY) || '[]').filter(x => x && x!==q);
  arr.unshift(q);
  localStorage.setItem(LS_RECENT_KEY, JSON.stringify(arr.slice(0,10)));
}
function renderRecent(){
  const box = $('#sRecentChips'); if(!box) return;
  const arr = JSON.parse(localStorage.getItem(LS_RECENT_KEY) || '[]');
  box.innerHTML = arr.length ? arr.map(t=>`<button class="chip" data-q="${t}">${t}</button>`).join('') : `<span style="color:#64748b">No recent</span>`;
}
function renderHot(){
  $('#sHotChips').innerHTML = HOT_KEYWORDS.map(t=>`<button class="chip" data-q="${t}">${t}</button>`).join('');
}

async function fetchSuggest(q, {city=null, cat=null} = {}){
  q = (q||'').trim(); if(!q) return [];
  // Supabase 查詢（active + 部分欄位）
  if (supabase){
    const like = `%${q}%`;
    let query = supabase.from('merchants')
      .select('id,name,city_id,category,cover,images,tags', { count:'exact', head:false })
      .eq('status','active')
      .or(`name.ilike.${like},description.ilike.${like}`)
      .order('featured', { ascending:false })
      .order('rating', { ascending:false, nullsFirst:false })
      .order('updated_at', { ascending:false })
      .limit(10);
    if (city) query = query.eq('city_id', city);
    if (cat)  query = query.eq('category', cat);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) return data.map(row => ({
      id: row.id, name: row.name,
      sub: [row.city_id, row.category].filter(Boolean).join(' · '),
      thumb: row.cover || (Array.isArray(row.images) ? row.images[0] : '') || '',
    }));
  }
  // 退化：簡單假資料
  return [
    { id:'x1', name:`${q} Cafe`, sub:'kuching · Taste', thumb:'' },
    { id:'x2', name:`${q} Market`, sub:'sibu · Local', thumb:'' },
  ];
}

function bindEvents(){
  // 開關
  $('#openSearch')?.addEventListener('click', openOverlay);
  $('#sBtnClose')?.addEventListener('click', closeOverlay);

  // 鍵盤 / 退出
  window.addEventListener('keydown', (e)=>{
    if (!state.open) return;
    if (e.key === 'Escape') closeOverlay();
  });

  // 手勢下滑關閉（只在頂部時生效）
  const body = $('#sBody');
  let sy = 0, dragging = false;
  body.addEventListener('touchstart', (e)=>{ if (body.scrollTop<=0){ dragging=true; sy = e.touches[0].clientY; }});
  body.addEventListener('touchmove',  (e)=>{ if(!dragging) return; const dy = e.touches[0].clientY - sy; if (dy > 22){ closeOverlay(); dragging=false; }});
  body.addEventListener('touchend',   ()=> dragging=false);

  // 輸入：即時建議（去抖）
  const qInput = $('#sQuery');
  let t = 0;
  qInput.addEventListener('input', ()=>{
    const q = qInput.value.trim();
    $('#sBtnClear').hidden = !q;
    clearTimeout(t);
    if (!q){ $('#sSuggest').hidden = true; return; }
    t = setTimeout(async ()=>{
      const list = await fetchSuggest(q, state);
      const ul = $('#sSuggestList');
      ul.innerHTML = list.map(item=>`
        <li class="s-item" data-id="${item.id}" data-name="${item.name}">
          <img class="s-thumb" src="${item.thumb}" alt="" onerror="this.style.display='none'">
          <div>
            <div class="s-name">${item.name}</div>
            <div class="s-sub">${item.sub||''}</div>
          </div>
          <div class="s-go">›</div>
        </li>
      `).join('');
      $('#sSuggest').hidden = !list.length;
    }, 260);
  });

  // 清空
  $('#sBtnClear')?.addEventListener('click', ()=>{
    $('#sQuery').value = '';
    $('#sBtnClear').hidden = true;
    $('#sSuggest').hidden = true;
    $('#sQuery').focus();
  });

  // 點建議 → 關 overlay → 去 Explore
  $('#sSuggestList')?.addEventListener('click', (e)=>{
    const li = e.target.closest('.s-item'); if(!li) return;
    const name = li.dataset.name || '';
    addRecent(name);
    closeOverlay();
    location.hash = `#explore?q=${encodeURIComponent(name)}${state.city?`&city=${state.city}`:''}${state.cat?`&cat=${state.cat}`:''}`;
  });

  // Recent/Hot chips
  const goWith = (q)=>{ addRecent(q); closeOverlay(); location.hash = `#explore?q=${encodeURIComponent(q)}`; };
  $('#sRecentChips')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if(btn?.dataset.q) goWith(btn.dataset.q);
  });
  $('#sHotChips')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if(btn?.dataset.q) goWith(btn.dataset.q);
  });
  $('#sBtnClearRecent')?.addEventListener('click', ()=>{
    localStorage.removeItem(LS_RECENT_KEY); renderRecent();
  });

  // Quick filter chips（切換 city / cat）
  $('#sQuickChips')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if(!btn) return;
    const city = btn.dataset.city || null;
    const cat  = btn.dataset.cat || null;
    if (city) state.city = city;
    if (cat)  state.cat  = cat;
    // 視覺提示
    $$('#sQuickChips .chip').forEach(c=> c.classList.remove('is-on'));
    if (city || cat) btn.classList.add('is-on');
    // 重新跑建議（若有字）
    const q = $('#sQuery').value.trim();
    if (q) qInput.dispatchEvent(new Event('input'));
  });
}

document.addEventListener('DOMContentLoaded', bindEvents);