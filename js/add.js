// add.js — integrated & fixed to match your HTML (tags, categories, photos, hours, cities)
// Requirements: app.js must export `supabase`

import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ========================= Helpers ========================= */
const slug = (s='') => (s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const autosize = (el)=>{ if(!el) return; el.style.height='auto'; el.style.height = Math.min(240, el.scrollHeight)+'px'; };

function showToast(msg, kind='info'){
  const toast = $('#addToast');
  if (!toast){ console[kind==='error'?'error':'log'](msg); return; }
  toast.textContent = msg;
  toast.dataset.kind = kind;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.hidden = true, 2400);
}

const makeId = (cityId, name) => `${(cityId||'xx').toLowerCase()}-${slug(name)}-${Date.now().toString(36).slice(-5)}`;

// 移除 null/undefined 的鍵，保留空陣列（給 JSONB）
function compact(obj){
  const out = {};
  for (const [k,v] of Object.entries(obj)){
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/* ========================= Cities ========================= */
async function populateCitySelect(){
  const sel = $('#fCity');
  if (!sel) return;
  sel.innerHTML = `<option value="" disabled selected>Loading…</option>`;
  try{
    const { data, error } = await supabase
      .from('cities')
      .select('id,name,sort_order')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) throw new Error('No cities');
    sel.innerHTML = `<option value="" disabled selected>Select a city</option>` +
      rows.map(c => `<option value="${c.id}">${c.name || c.id}</option>`).join('');
  }catch(e){
    const fallback = [
      {id:'kuching', name:'Kuching'},
      {id:'miri',    name:'Miri'},
      {id:'sibu',    name:'Sibu'},
      {id:'mukah',   name:'Mukah'},
    ];
    sel.innerHTML = `<option value="" disabled selected>Select a city</option>` +
      fallback.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}

/* ========================= Tags input ========================= */
// <div id="tagBox"><input id="fTagInput"></div> + hidden <input id="fTags">
function initTagInput(){
  const box = $('#tagBox'); const input = $('#fTagInput'); const hidden = $('#fTags');
  if (!box || !input || !hidden) return;

  function renderHidden(){
    const tags = $$('.tag', box).map(ch => ch.dataset.tag || ch.textContent.trim()).filter(Boolean);
    hidden.value = JSON.stringify(tags);
  }
  function addTag(txt){
    const t = (txt||'').trim();
    if (!t) return;
    const exists = $$('.tag', box).some(ch => (ch.dataset.tag||ch.textContent).toLowerCase() === t.toLowerCase());
    if (exists) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag';
    chip.dataset.tag = t;
    chip.innerHTML = `${t} <span aria-hidden="true">×</span>`;
    chip.addEventListener('click', ()=>{ chip.remove(); renderHidden(); });
    box.insertBefore(chip, input);
    renderHidden();
  }
  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter'){
      e.preventDefault();
      addTag(input.value);
      input.value = '';
    }else if (e.key === 'Backspace' && !input.value){
      const last = box.querySelector('.tag:last-of-type');
      if (last){ last.remove(); renderHidden(); }
    }
  });
}

/* ========================= Category chips ========================= */
// <div id="catChips"> + hidden <input id="fCategory">
function initCategoryChips(){
  const wrap = $('#catChips'); const hidden = $('#fCategory');
  if (!wrap || !hidden) return;
  wrap.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if (!btn) return;
    $$('.chip', wrap).forEach(c=> c.classList.remove('is-on'));
    btn.classList.add('is-on');
    hidden.value = btn.dataset.cat || btn.textContent.trim();
  });
}

/* ========================= Photos ========================= */
// #btnPickPhotos -> #fPhotos (hidden) -> preview in #photoGrid (max 10)
function initPhotos(){
  const pick = $('#btnPickPhotos');
  const input = $('#fPhotos');
  const grid  = $('#photoGrid');
  if (!input || !grid) return;

  pick?.addEventListener('click', ()=> input.click());

  function render(files){
    grid.innerHTML = '';
    Array.from(files||[]).slice(0,10).forEach((file, idx)=>{
      const url = URL.createObjectURL(file);
      const cell = document.createElement('div');
      cell.className = 'thumb';
      cell.style.backgroundImage = `url("${url}")`;
      const del = document.createElement('button');
      del.type='button'; del.className='del'; del.textContent='×';
      del.addEventListener('click', ()=>{
        const dt = new DataTransfer();
        Array.from(input.files).forEach((f,i)=>{ if(i!==idx) dt.items.add(f); });
        input.files = dt.files;
        render(input.files);
      });
      cell.appendChild(del);
      if (idx===0){
        const badge = document.createElement('span');
        badge.className='cover-badge'; badge.textContent='Cover';
        cell.appendChild(badge);
      }
      grid.appendChild(cell);
    });
  }
  input.addEventListener('change', ()=> render(input.files));
}

async function uploadPhotos(files){
  const results = [];
  const arr = Array.from(files||[]).slice(0,10);
  for (const f of arr){
    if (!supabase){
      results.push({ url: URL.createObjectURL(f) });
      continue;
    }
    try{
      const ext = (f.name.split('.').pop()||'jpg').toLowerCase();
      const path = `merchants/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('merchant-photos').upload(path, f, {
        cacheControl: '3600', upsert: false, contentType: f.type || 'image/jpeg'
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('merchant-photos').getPublicUrl(path);
      results.push({ url: pub?.publicUrl || '' });
    }catch(err){
      console.error('upload error:', err);
      results.push({ url: URL.createObjectURL(f) });
    }
  }
  return results;
}

/* ========================= Opening Hours (Google-like) ========================= */
// IMPORTANT: never set <input type="time"> to 24:00. Use 23:59 for UI; serialize back to 24:00.
function ohMakeChip(open='09:00', close='18:00'){
  const chip = document.createElement('span');
  chip.className = 'oh-chip';
  chip.innerHTML = `
    <input type="time" class="oh-open" value="${open}">
    <span>–</span>
    <input type="time" class="oh-close" value="${close}">
    <button type="button" class="oh-del" title="Remove">×</button>
  `;
  chip.querySelector('.oh-del').addEventListener('click', ()=> chip.remove());
  return chip;
}
function ohSetRowMode(row, mode){
  const box  = row.querySelector('.oh-ranges');
  const note = row.querySelector('.oh-note');
  if (mode==='open' || mode==='special'){
    box.innerHTML = '';
    const add = document.createElement('button');
    add.type='button'; add.className='oh-add'; add.textContent='＋ Add range';
    add.addEventListener('click', ()=>{
      if (box.querySelectorAll('.oh-chip').length>=3) return;
      box.insertBefore(ohMakeChip(), add);
    });
    box.append(ohMakeChip(), add);
    note.disabled = (mode!=='special');
    if (mode!=='special') note.value='';
  }else if(mode==='24h'){
    box.innerHTML='';
    const c = ohMakeChip('00:00','23:59'); // UI 用 23:59，序列化時轉回 24:00
    c.querySelectorAll('input').forEach(i=> i.disabled=true);
    box.appendChild(c);
    note.disabled = true; note.value='';
  }else{ // closed
    box.innerHTML = '<em style="color:#666">Closed</em>';
    note.disabled = true; note.value='';
  }
}
function initHoursEditor(root = $('#ohTable')){
  if (!root) return;
  root.querySelectorAll('.oh-row').forEach(row=>{
    const sel = row.querySelector('.oh-mode');
    ohSetRowMode(row, sel.value || 'open');
    sel.addEventListener('change', ()=> ohSetRowMode(row, sel.value));
  });

  const setAll = (fn)=> root.querySelectorAll('.oh-row').forEach(fn);

  $('#btnOH247')?.addEventListener('click', ()=>{
    setAll(row=>{
      row.querySelector('.oh-mode').value='24h';
      ohSetRowMode(row,'24h');
    });
  });
  $('#btnOHWeekday')?.addEventListener('click', ()=>{
    setAll(row=>{
      const d = row.getAttribute('data-day');
      if (['mon','tue','wed','thu','fri'].includes(d)){
        row.querySelector('.oh-mode').value='open';
        ohSetRowMode(row,'open');
        const chip = row.querySelector('.oh-chip');
        chip.querySelector('.oh-open').value = '09:00';
        chip.querySelector('.oh-close').value = '19:00';
      }
    });
  });
  $('#btnOHWeekend')?.addEventListener('click', ()=>{
    setAll(row=>{
      const d = row.getAttribute('data-day');
      if (['sat','sun'].includes(d)){
        row.querySelector('.oh-mode').value='open';
        ohSetRowMode(row,'open');
        const chip = row.querySelector('.oh-chip');
        chip.querySelector('.oh-open').value = '09:00';
        chip.querySelector('.oh-close').value = '13:00';
      }
    });
  });
  $('#btnOHClear')?.addEventListener('click', ()=>{
    setAll(row=>{
      row.querySelector('.oh-mode').value='closed';
      ohSetRowMode(row,'closed');
    });
  });
}
function getOpenDaysJSON(root = $('#ohTable')){
  if (!root) return {};
  const out = {};
  root.querySelectorAll('.oh-row').forEach(row=>{
    const day  = row.getAttribute('data-day');
    const mode = row.querySelector('.oh-mode').value;
    const note = row.querySelector('.oh-note').value.trim();

    if (mode==='closed'){ out[day]={closed:true, ranges:[]}; return; }
    if (mode==='24h'){ out[day]={closed:false, ranges:[{open:'00:00',close:'24:00'}]}; return; }

    const ranges=[];
    row.querySelectorAll('.oh-chip').forEach(c=>{
      const o = c.querySelector('.oh-open')?.value;
      let cl = c.querySelector('.oh-close')?.value;
      if (cl === '24:00') cl = '23:59'; // 保護 UI 值
      if (o && cl) ranges.push({open:o, close:cl});
    });
    out[day]={closed:false, ranges};
    if (mode==='special' && note) out[day].note = note;
  });
  return out;
}

/* ========================= Submit ========================= */
async function handleSubmit(e){
  e.preventDefault();
  const form = e.currentTarget;

  const name   = $('#fName')?.value?.trim();
  const city   = $('#fCity')?.value?.trim();
  const addr   = $('#fAddress')?.value?.trim();
  if (!name){ $('#fName')?.focus(); showToast('請輸入商家名稱','error'); return; }
  if (!city){ $('#fCity')?.focus(); showToast('請選擇城市','error'); return; }
  if (!addr){ $('#fAddress')?.focus(); showToast('請輸入地址','error'); return; }

  // Category & Tags
  const category = $('#fCategory')?.value || '';
  const tagsJSON = $('#fTags')?.value || '[]';
  let tags = [];
  try{ tags = JSON.parse(tagsJSON); }catch(_){}

  // Socials
  const socials = {
    instagram: $('#fIG')?.value?.trim() || '',
    facebook:  $('#fFB')?.value?.trim() || '',
    tiktok:    $('#fTT')?.value?.trim() || '',
    youtube:   $('#fYT')?.value?.trim() || ''
  };

  // Hours JSON
  const open_days = getOpenDaysJSON();
  $('#fOpenDays') && ($('#fOpenDays').value = JSON.stringify(open_days));

  // Photos
  const fileInput = $('#fPhotos');
  let images = [], cover = '';
  try{
    if (fileInput?.files?.length){
      const uploaded = await uploadPhotos(fileInput.files);
      images = uploaded.map(x => x.url).filter(Boolean);
      cover = images[0] || '';
    }
  }catch(err){
    console.warn('photo upload failed (continue):', err);
  }

  // 讀 WhatsApp（如果你在 HTML 增加了 #fWhatsApp）
  const whatsapp = $('#fWhatsApp')?.value?.trim() || null;

  // Build payload（刪掉 featured，避免 400）
  let payload = {
    id: makeId(city, name),
    name,
    city_id: city,
    category: category || null,
    tags,                             // JSONB (array of strings)
    address: addr,
    // 你目前以「地址為主」→ 不送 lat/lng（避免 NOT NULL 錯誤）
    cover: cover || null,
    images,                           // JSONB
    open_days,                        // JSONB (new structure)
    rating: null,
    // 目前沒有價格欄位，先不送；若你未來加價位再補
    phone: $('#fPhone')?.value?.trim() || '',
    whatsapp: whatsapp || undefined,  // 有填才送欄位
    website: $('#fWebsite')?.value?.trim() || '',
    socials,                          // JSONB
    description: $('#fDesc')?.value?.trim() || '',
    status: 'pending',
    updated_at: new Date().toISOString()
  };

  // 壓縮掉 null/undefined 欄位
  payload = compact(payload);

  if (!supabase){
    const key = 'add_queue_merchants';
    const q = JSON.parse(localStorage.getItem(key) || '[]');
    q.push(payload);
    localStorage.setItem(key, JSON.stringify(q));
    showToast('已暫存於本地（未連接後端）', 'success');
    form.reset();
    $('#photoGrid') && ($('#photoGrid').innerHTML = '');
    return;
  }

  try{
    const { error } = await supabase.from('merchants').insert(payload);
    if (error) throw error;
    showToast('已送出，待審核上架 ✓', 'success');
    form.reset();
    $('#photoGrid') && ($('#photoGrid').innerHTML = '');
  }catch(err){
    console.error('Save failed:', err);
    showToast(err?.message || '儲存失敗，已加入離線佇列', 'error');
    const key = 'add_queue_merchants';
    const q = JSON.parse(localStorage.getItem(key) || '[]');
    q.push(payload);
    localStorage.setItem(key, JSON.stringify(q));
  }
}

/* ========================= Bootstrap ========================= */
document.addEventListener('DOMContentLoaded', ()=>{
  // Only run on Add page
  if (!document.querySelector('[data-page="add"]')) return;

  populateCitySelect();
  initCategoryChips();
  initTagInput();
  initPhotos();
  initHoursEditor();

  const form = $('#addForm');
  form?.addEventListener('submit', handleSubmit);

  // auto-resize desc
  const fDesc = $('#fDesc');
  if (fDesc){ autosize(fDesc); fDesc.addEventListener('input', ()=> autosize(fDesc)); }
});