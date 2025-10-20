// js/add.js
// Add Page — form UI, validation, preview, and Supabase insert (with local fallback)
import { supabase } from './app.js';

/**
 * 你的 HTML 需要有的元素 id（照這些就能直接用）：
 * <form id="addForm">
 *   #fName (text)               名稱
 *   #fCity (select)             城市 id（例如 kuching/miri/... 或 all 禁止）
 *   #catChips (.chip[data-cat]) 類別（單選）：Taste/Nature/Culture/Stay/Local/Experience
 *   #themeChips (.chip[data-theme]) 主題（多選）可選
 *   #attrChips  (.chip[data-attr])  屬性（多選）可選
 *   #fAddress (text)            完整地址
 *   #fLat (text/number)         緯度（可空）
 *   #fLng (text/number)         經度（可空）
 *   #fPhone (text)              電話（可空）
 *   #fWebsite (url)             網站（可空）
 *   #fPrice (select 1-4)        價位（$~$$$$，可空）
 *   #fRating (number 0-5)       評分（可空）
 *   #fHours (text)              營業時間字串（例如 "09:00-18:00" / "24H"）
 *   #fDesc (textarea)           描述
 *   #fCoverUrl (url)            封面圖 URL（可空）
 *   #fImagesUrls (textarea)     其他圖片 URL（每行一個，可空）
 *   #fPhotos (file multiple)    本地圖片預覽（僅預覽，不上傳）可空
 *   #previewGrid (div)          本地預覽格
 *   #btnSave (button type=submit)儲存
 *   #btnReset (button)          重設（可選）
 *   #toast (div)                簡易提示容器（可選）
 * </form>
 */

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ---- Refs
const form       = $('#addForm');
if (!form) {
  console.warn('[add.js] #addForm not found — skip init.');
} else {
  const catWrap    = $('#catChips');
  const themeWrap  = $('#themeChips');
  const attrWrap   = $('#attrChips');

  const fName      = $('#fName');
  const fCity      = $('#fCity');
  const fAddress   = $('#fAddress');
  const fLat       = $('#fLat');
  const fLng       = $('#fLng');
  const fPhone     = $('#fPhone');
  const fWebsite   = $('#fWebsite');
  const fPrice     = $('#fPrice');
  const fRating    = $('#fRating');
  const fHours     = $('#fHours');
  const fDesc      = $('#fDesc');
  const fCoverUrl  = $('#fCoverUrl');
  const fImagesUrls= $('#fImagesUrls');
  const fPhotos    = $('#fPhotos');
  const previewGrid= $('#previewGrid');
  const btnReset   = $('#btnReset');
  const toastBox   = $('#toast');

  // ---- State
  let category = null;           // 單選
  const themes = new Set();      // 多選
  const attrs  = new Set();      // 多選

  // ---- Helpers
  const showToast = (msg, type='info')=>{
    if (!toastBox) { alert(msg); return; }
    toastBox.textContent = msg;
    toastBox.dataset.type = type;
    toastBox.classList.add('on');
    setTimeout(()=> toastBox.classList.remove('on'), 2000);
  };

  const parseUrls = (val='')=>{
    return val
      .split(/\n|,/)         // 每行或逗號
      .map(s => s.trim())
      .filter(Boolean);
  };

  const toNumberOrNull = (s)=>{
    if (s===null || s===undefined || s==='') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  // ---- Chips (category: single)
  catWrap?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip[data-cat]');
    if (!btn) return;
    $$('.chip', catWrap).forEach(c => c.classList.remove('is-on'));
    btn.classList.add('is-on');
    category = btn.dataset.cat;
  });

  // ---- Chips (themes/attrs: multi)
  const bindMulti = (wrap, dataAttr, set) => {
    wrap?.addEventListener('click', (e)=>{
      const btn = e.target.closest(`.chip[${dataAttr}]`);
      if (!btn) return;
      const val = btn.getAttribute(dataAttr);
      const on = btn.classList.toggle('is-on');
      if (on) set.add(val); else set.delete(val);
    });
  };
  bindMulti(themeWrap, 'data-theme', themes);
  bindMulti(attrWrap,  'data-attr',  attrs);

  // ---- Autosize for description
  const autosize = (el)=>{
    el.style.height = 'auto';
    el.style.height = Math.min(320, el.scrollHeight) + 'px';
  };
  fDesc?.addEventListener('input', ()=> autosize(fDesc));
  fDesc && autosize(fDesc);

  // ---- Photo preview (local)
  function renderPreview(files){
    if (!previewGrid) return;
    previewGrid.innerHTML = '';
    const list = Array.from(files).slice(0, 10);
    list.forEach(file=>{
      const url = URL.createObjectURL(file);
      const cell = document.createElement('div');
      cell.className = 'thumb';
      cell.style.backgroundImage = `url("${url}")`;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'thumb-del';
      del.textContent = '×';
      del.addEventListener('click', ()=> cell.remove());
      cell.appendChild(del);
      previewGrid.appendChild(cell);
    });
  }
  fPhotos?.addEventListener('change', (e)=>{
    const files = e.target.files || [];
    renderPreview(files);
  });

  // ---- Validation (light)
  function validate(){
    if (!fName?.value.trim()){
      fName?.focus();
      showToast('Please enter a name', 'warn');
      return false;
    }
    if (!fCity?.value){
      fCity?.focus();
      showToast('Please choose a city', 'warn');
      return false;
    }
    if (!category){
      showToast('Please pick a category', 'warn');
      catWrap?.scrollIntoView({behavior:'smooth', block:'center'});
      return false;
    }
    return true;
  }

  // ---- Build payload matching your Supabase table
  function buildPayload(){
    const images = parseUrls(fImagesUrls?.value);
    const cover  = (fCoverUrl?.value || '').trim();

    // 注意：如果你之後要改為 weekly open_hours JSON，這裡先保留 open_hours=null
    // 現在先把簡單字串塞到 openHours 欄（如果你的表有這欄）
    const payload = {
      id: undefined, // 讓 DB 預設或你自己有 trigger；若需要自訂可在此生成
      name: (fName?.value||'').trim(),
      city_id: fCity?.value || null,
      category: category || null,
      themes: themes.size ? Array.from(themes) : null,
      attrs:  attrs.size  ? Array.from(attrs)  : null,
      address: (fAddress?.value||'').trim() || null,
      lat: toNumberOrNull(fLat?.value),
      lng: toNumberOrNull(fLng?.value),
      phone: (fPhone?.value||'').trim()   || null,
      website: (fWebsite?.value||'').trim()|| null,
      price_level: toNumberOrNull(fPrice?.value),
      rating: toNumberOrNull(fRating?.value),
      openHours: (fHours?.value||'').trim() || null,  // 舊簡易字串
      open_hours: null,                                // 預留 weekly JSON
      description: (fDesc?.value||'').trim() || null,
      cover: cover || (images[0] || null),
      images: images.length ? images : null,
      status: 'active',
    };
    return payload;
  }

  async function saveToSupabase(payload){
    if (!supabase){
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase.from('merchants').insert(payload).select('id').single();
    if (error) throw error;
    return data;
  }

  function saveToLocalQueue(payload){
    const key = 'addQueue';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ payload, ts: Date.now() });
    localStorage.setItem(key, JSON.stringify(arr));
  }

  // ---- Submit
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (!validate()) return;

    const payload = buildPayload();

    // 簡單防重複點擊
    const btn = form.querySelector('[type="submit"]');
    btn?.setAttribute('disabled','true');

    try{
      const res = await saveToSupabase(payload);
      showToast('Saved ✅');
      // 清空或導向
      form.reset();
      $$('.chip.is-on', form).forEach(c => c.classList.remove('is-on'));
      category = null; themes.clear(); attrs.clear();
      previewGrid && (previewGrid.innerHTML = '');
    }catch(err){
      console.warn('Save failed, put into local queue:', err);
      saveToLocalQueue(payload);
      showToast('Offline saved — will sync later', 'info');
    }finally{
      btn?.removeAttribute('disabled');
    }
  });

  // ---- Reset (optional)
  btnReset?.addEventListener('click', ()=>{
    form.reset();
    $$('.chip.is-on', form).forEach(c => c.classList.remove('is-on'));
    category = null; themes.clear(); attrs.clear();
    previewGrid && (previewGrid.innerHTML = '');
    showToast('Cleared');
  });
}
