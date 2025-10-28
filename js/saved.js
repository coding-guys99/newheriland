// js/saved.js — drop-in Saved module
// 需求：app.js export { supabase }

import { supabase } from './app.js';

const SAVED_KEY = 'hl.saved';

/* ------------- localStorage store ------------- */
const savedStore = {
  list() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
    catch { return []; }
  },
  set(arr) {
    const uniq = [...new Set(arr)].filter(Boolean);
    localStorage.setItem(SAVED_KEY, JSON.stringify(uniq));
    window.dispatchEvent(new CustomEvent('saved:change', { detail: uniq }));
  },
  has(id) { return this.list().includes(id); },
  toggle(id) {
    const a = this.list();
    const i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else a.push(id);
    this.set(a);
    return a.includes(id);
  }
};

/* ------------- 渲染工具 ------------- */
function moneyChips(n){
  if (!n) return '';
  const k = Math.max(1, Math.min(4, Number(n)));
  return '💲'.repeat(k);
}
function firstCover(m){
  return m.cover || (Array.isArray(m.images) && m.images[0]) || '';
}
function cardHTML(m){
  const favOn = savedStore.has(m.id) ? ' on' : '';
  const cov = firstCover(m);
  const price = moneyChips(m.price_level);
  const rating = (m.rating != null) ? Number(m.rating).toFixed(1) : '';
  return `
    <a class="mcard" data-id="${m.id}" role="button" aria-label="Open ${m.name}">
      <div class="mcov" style="background-image:url('${cov}')"></div>
      <div class="mmeta">
        <div class="mname">${m.name}</div>
        <div class="msub">
          ${rating ? `<span class="pill">★ ${rating}</span>` : ''}
          ${price ? `<span class="pill">${price}</span>` : ''}
          ${m.category ? `<span class="pill">${m.category}</span>` : ''}
        </div>
      </div>
      <button class="fav${favOn}" data-id="${m.id}" aria-label="Save">${favOn ? '♥' : '♡'}</button>
    </a>
  `;
}

/* ------------- Explore 列表代理收藏按鈕 ------------- */
function bindExploreFavs(){
  const listEL = document.getElementById('merchantList');
  if (!listEL) return;
  listEL.addEventListener('click', (e)=>{
    const fav = e.target.closest('.fav'); 
    if (!fav) return;
    e.preventDefault(); e.stopPropagation();
    const id = fav.dataset.id;
    const on = savedStore.toggle(id);
    fav.classList.toggle('on', on);
    fav.textContent = on ? '♥' : '♡';
  });
}

/* ------------- 詳情頁愛心（對外鉤子） ------------- */
function wireDetailFavorite(currentId){
  const btnFav = document.getElementById('btnFav');
  if (!btnFav || !currentId) return;
  const setUI = () => {
    const on = savedStore.has(currentId);
    btnFav.classList.toggle('on', on);
    btnFav.textContent = on ? '♥' : '♡';
    btnFav.setAttribute('aria-pressed', on ? 'true' : 'false');
    btnFav.title = on ? 'Saved' : 'Save';
  };
  setUI();
  btnFav.onclick = (e)=>{
    e.preventDefault();
    savedStore.toggle(currentId);
    setUI();
  };
  const handler = ()=> setUI();
  window.addEventListener('saved:change', handler);
}

/* ------------- Saved 頁渲染 ------------- */
async function renderSavedPage(){
  const box = document.getElementById('savedList');
  if (!box) return;
  const ids = savedStore.list();

  if (!ids.length){
    box.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">🗂️</div>
        <div class="empty-title">No saved places</div>
        <div class="empty-sub">Tap the ♡ on any place to save it here.</div>
      </div>`;
    return;
  }

  let rows = [];
  try{
    if (supabase){
      const { data, error } = await supabase
        .from('merchants')
        .select('id,name,cover,images,category,price_level,rating,status')
        .in('id', ids);
      if (error) throw error;
      rows = (data || []).filter(r => r.status !== 'deleted');
      rows.sort((a,b)=> ids.indexOf(a.id) - ids.indexOf(b.id));
    }
  }catch(err){
    console.warn('[saved] fetch error:', err);
  }

  if (!rows.length){
    box.innerHTML = ids.map(id => `
      <a class="mcard" data-id="${id}">
        <div class="mcov mcov--ph"></div>
        <div class="mmeta">
          <div class="mname">${id}</div>
          <div class="msub"><span class="pill">—</span></div>
        </div>
        <button class="fav on" data-id="${id}" aria-label="Save">♥</button>
      </a>
    `).join('');
  }else{
    box.innerHTML = rows.map(cardHTML).join('');
  }
}

/* ------------- 進入 Saved 頁自動刷新 ------------- */
function onPageShown(pageName, cb){
  const el = document.querySelector(`[data-page="${pageName}"]`);
  if (!el) return;
  const run = ()=> { if (!el.hidden) cb(); };
  const mo = new MutationObserver(run);
  mo.observe(el, { attributes:true, attributeFilter:['hidden'] });
  run();
}

/* ------------- 全域導出（給 explore.js 呼叫） ------------- */
window.wireDetailFavorite = wireDetailFavorite;

/* ------------- 啟動 ------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  bindExploreFavs();
  onPageShown('saved', renderSavedPage);

  // 收藏變化時刷新 Saved 與列表愛心
  window.addEventListener('saved:change', ()=>{
    document.querySelectorAll('.fav[data-id]').forEach(btn=>{
      const on = savedStore.has(btn.dataset.id);
      btn.classList.toggle('on', on);
      btn.textContent = on ? '♥' : '♡';
    });
    renderSavedPage();
  });
});