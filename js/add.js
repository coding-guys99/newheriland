// add.js
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ---------- Refs ---------- */
const form = $('#addForm');
if (!form) return;

const citySel = $('#fCity');
const catWrap = $('#catChips'); const catHidden = $('#fCategory');
const tagBox  = $('#tagBox');  const tagInput  = $('#fTagInput'); const tagsHidden = $('#fTags');

const ohTable = $('#ohTable'); const ohHidden = $('#fOpenHours');
const btnOH247 = $('#btnOH247'); const btnOHWeekday = $('#btnOHWeekday');
const btnOHWeekend = $('#btnOHWeekend'); const btnOHClear = $('#btnOHClear');

const pickBtn = $('#btnPickPhotos'); const fileInput = $('#fPhotos'); const grid = $('#photoGrid');
const toast = $('#addToast');

// Params
const DRAFT_KEY = 'addDraftV1';
const STORAGE_BUCKET = 'public';        // <- 你已建立的公開 bucket
const MAX_PHOTOS = 10;

// State
let tags = [];
let photos = []; // {file, url, cover:boolean}

/* ---------- Utils ---------- */
function showToast(msg){ if(!toast) return; toast.textContent = msg; toast.hidden=false; setTimeout(()=>toast.hidden=true, 1800); }
function err(el,msg){ const s = $(`small[data-err-for="${el}"]`); if (s) s.textContent = msg||''; }
function clearErr(){ $$('.err').forEach(x=> x.textContent=''); }
function toSlug(s){ return (s||'').toLowerCase().trim().replace(/[^\w]+/g,'-').replace(/(^-|-$)/g,''); }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function normURL(s){ if(!s) return ''; if(!/^https?:\/\//i.test(s)) return 'https://' + s; return s; }

/* ---------- Load cities ---------- */
async function loadCities(){
  try{
    const { data, error } = await supabase.from('cities').select('id,name').order('sort_order');
    if (error) throw error;
    citySel.innerHTML = data.map(c=> `<option value="${c.id}">${c.name||c.id}</option>`).join('');
  }catch(e){
    citySel.innerHTML = ['kuching','miri','sibu','bintulu','sarikei','limbang','lawas','mukah','kapit','betong','samarahan','serian']
      .map(id=>`<option value="${id}">${id[0].toUpperCase()+id.slice(1)}</option>`).join('');
  }
}

/* ---------- Category chips ---------- */
catWrap.addEventListener('click', (e)=>{
  const btn = e.target.closest('.chip'); if(!btn) return;
  $$('.chip', catWrap).forEach(b=> b.classList.remove('is-on'));
  btn.classList.add('is-on');
  catHidden.value = btn.dataset.cat;
});

/* ---------- Tags (chips + input) ---------- */
function renderTags(){
  // remove chips except input
  tagBox.querySelectorAll('.tag').forEach(x=> x.remove());
  tags.forEach((t,i)=>{
    const el = document.createElement('span');
    el.className = 'tag';
    el.innerHTML = `<span>${t}</span><button type="button" aria-label="Remove">×</button>`;
    el.querySelector('button').addEventListener('click', ()=>{
      tags.splice(i,1); renderTags(); syncTagsHidden();
    });
    tagBox.insertBefore(el, tagInput);
  });
}
function syncTagsHidden(){ tagsHidden.value = JSON.stringify(tags); }
tagInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){
    e.preventDefault();
    const v = tagInput.value.trim();
    if(!v) return;
    if(!tags.includes(v) && tags.length < 8){ tags.push(v); renderTags(); syncTagsHidden(); }
    tagInput.value = '';
  }
});

/* ---------- Opening hours editor ---------- */
const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABEL = {mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'};

function makeRangeRow() {
  const wrap = document.createElement('div');
  wrap.className = 'oh-range';
  wrap.innerHTML = `
    <input type="time" class="oh-open" value="09:00" />
    <span>–</span>
    <input type="time" class="oh-close" value="18:00" />
    <button type="button" class="del" aria-label="Remove">×</button>
  `;
  wrap.querySelector('.del').addEventListener('click', ()=> wrap.remove());
  return wrap;
}

function buildOH(){
  ohTable.innerHTML = '';
  DAYS.forEach(d=>{
    const row = document.createElement('div');
    row.className = 'oh-row';
    row.dataset.day = d;
    row.innerHTML = `
      <div class="oh-day">${DAY_LABEL[d]}</div>
      <div>
        <div class="oh-switch">
          <label><input type="checkbox" class="oh-opened" checked /> Open</label>
          <button type="button" class="btn ghost btn-add-range">Add range</button>
        </div>
        <div class="oh-ranges"></div>
      </div>
    `;
    const ranges = row.querySelector('.oh-ranges');
    ranges.appendChild(makeRangeRow());

    row.querySelector('.btn-add-range').addEventListener('click', ()=> {
      if (ranges.children.length >= 4) return;
      ranges.appendChild(makeRangeRow());
    });
    row.querySelector('.oh-opened').addEventListener('change', (e)=>{
      const on = e.target.checked;
      row.querySelector('.btn-add-range').disabled = !on;
      ranges.style.opacity = on ? 1 : .5;
    });
    ohTable.appendChild(row);
  });
}

function readOH(){
  const obj = {};
  $$('.oh-row', ohTable).forEach(row=>{
    const day = row.dataset.day;
    const opened = row.querySelector('.oh-opened').checked;
    const ranges = [...row.querySelectorAll('.oh-range')].map(r=>{
      const o = r.querySelector('.oh-open').value || '09:00';
      const c = r.querySelector('.oh-close').value || '18:00';
      return { open:o, close:c };
    });
    obj[day] = { open: opened, ranges: opened ? ranges : [] };
  });
  return obj;
}
function writeOH(obj){
  $$('.oh-row', ohTable).forEach(row=>{
    const d = row.dataset.day;
    const conf = obj?.[d] || {open:false, ranges:[]};
    const opened = row.querySelector('.oh-opened');
    const rangesWrap = row.querySelector('.oh-ranges');
    opened.checked = !!conf.open;
    rangesWrap.innerHTML = '';
    if (conf.open && Array.isArray(conf.ranges) && conf.ranges.length){
      conf.ranges.forEach(r=>{
        const rr = makeRangeRow();
        rr.querySelector('.oh-open').value = r.open || '09:00';
        rr.querySelector('.oh-close').value = r.close || '18:00';
        rangesWrap.appendChild(rr);
      });
    } else {
      rangesWrap.appendChild(makeRangeRow());
      opened.checked = false;
      rangesWrap.style.opacity = .5;
      row.querySelector('.btn-add-range').disabled = true;
    }
  });
}

// 快捷
btnOH247.addEventListener('click', ()=>{
  const cfg = {}; DAYS.forEach(d => cfg[d] = {open:true, ranges:[{open:'00:00', close:'23:59'}]});
  writeOH(cfg);
});
btnOHWeekday.addEventListener('click', ()=>{
  const cfg = {}; DAYS.forEach(d => cfg[d] = {open:false, ranges:[]});
  ['mon','tue','wed','thu','fri'].forEach(d => cfg[d] = {open:true, ranges:[{open:'09:00', close:'18:00'}]});
  writeOH(cfg);
});
btnOHWeekend.addEventListener('click', ()=>{
  const cfg = {}; DAYS.forEach(d => cfg[d] = {open:false, ranges:[]});
  ['sat','sun'].forEach(d => cfg[d] = {open:true, ranges:[{open:'10:00', close:'16:00'}]});
  writeOH(cfg);
});
btnOHClear.addEventListener('click', ()=>{
  const cfg = {}; DAYS.forEach(d => cfg[d] = {open:false, ranges:[]}); writeOH(cfg);
});

/* ---------- Photos: pick / preview / cover / reorder ---------- */
pickBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', (e)=>{
  const files = [...(e.target.files||[])].slice(0, MAX_PHOTOS - photos.length);
  files.forEach(f=>{
    const url = URL.createObjectURL(f);
    photos.push({ file:f, url, cover:false });
  });
  if (!photos.some(p=>p.cover) && photos.length) photos[0].cover = true;
  renderPhotos();
});

function renderPhotos(){
  grid.innerHTML = '';
  photos.forEach((p,idx)=>{
    const cell = document.createElement('div');
    cell.className = 'pcell';
    cell.innerHTML = `
      ${p.cover ? '<div class="badge">Cover</div>': ''}
      <div class="img" style="background-image:url('${p.url}')"></div>
      <div class="bar">
        <button type="button" class="mini" data-act="cover">Set cover</button>
        <span>
          <button type="button" class="mini" data-act="up">↑</button>
          <button type="button" class="mini" data-act="down">↓</button>
          <button type="button" class="mini" data-act="del">Delete</button>
        </span>
      </div>`;
    cell.addEventListener('click', (e)=>{
      const act = e.target?.dataset?.act; if(!act) return;
      if (act==='cover'){ photos.forEach(x=>x.cover=false); p.cover=true; }
      if (act==='up'){ const i = clamp(idx-1, 0, photos.length-1); const tmp=photos[i]; photos[i]=photos[idx]; photos[idx]=tmp; }
      if (act==='down'){ const i = clamp(idx+1, 0, photos.length-1); const tmp=photos[i]; photos[i]=photos[idx]; photos[idx]=tmp; }
      if (act==='del'){ URL.revokeObjectURL(p.url); photos.splice(idx,1); if (!photos.some(x=>x.cover)&&photos[0]) photos[0].cover=true; }
      renderPhotos();
    });
    grid.appendChild(cell);
  });
}

/* ---------- Draft (autosave) ---------- */
function saveDraft(){
  const payload = collectPayload(false); // no upload, just shape
  localStorage.setItem(DRAFT_KEY, JSON.stringify({...payload, _localPhotos: photos.map(p=>p.url)}));
  showToast('Draft saved');
}
function loadDraft(){
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  try{
    const d = JSON.parse(raw);
    $('#fName').value = d.name || '';
    $('#fAddress').value = d.address || '';
    $('#fPhone').value = d.phone || '';
    $('#fWebsite').value = d.website || '';
    $('#fDesc').value = d.description || '';
    if (d.city_id) citySel.value = d.city_id;

    // category
    if (d.category){
      const btn = catWrap.querySelector(`.chip[data-cat="${d.category}"]`);
      btn?.classList.add('is-on'); catHidden.value = d.category;
    }
    // tags
    tags = Array.isArray(d.tags) ? d.tags : [];
    renderTags(); syncTagsHidden();

    // hours
    writeOH(d.open_hours);

    // photos (local preview only)
    photos = (d._localPhotos||[]).map(u=>({file:null, url:u, cover:false}));
    if (photos[0]) photos[0].cover = true;
    renderPhotos();
  }catch(_){}
}
$('#btnSaveDraft')?.addEventListener('click', saveDraft);

/* ---------- Collect & Validate ---------- */
function collectPayload(forSubmit=true){
  const name = $('#fName').value.trim();
  const city_id = citySel.value;
  const category = $('#fCategory').value.trim();
  const address = $('#fAddress').value.trim();
  const description = $('#fDesc').value.trim();

  const phone = $('#fPhone').value.trim();
  const website = normURL($('#fWebsite').value.trim());
  const socials = {
    instagram: normURL($('#fIG').value.trim()),
    facebook:  normURL($('#fFB').value.trim()),
    tiktok:    normURL($('#fTT').value.trim()),
    youtube:   normURL($('#fYT').value.trim()),
  };
  Object.keys(socials).forEach(k=>{ if(!socials[k] || socials[k]==='https://') socials[k]=''; });

  const open_hours = readOH();
  ohHidden.value = JSON.stringify(open_hours);

  return {
    id: '', // will be set when submitting
    city_id, name, description, category,
    tags: [...tags],
    address,
    phone, website,
    socials,
    images: [], cover: '',
    open_hours,
    status: 'active'
  };
}

function validate(payload){
  clearErr();
  let ok = true;
  if (!payload.name){ err('name','Required'); ok=false; }
  if (!payload.city_id){ err('city_id','Required'); ok=false; }
  if (!payload.category){ err('category','Pick a category'); ok=false; }
  if (!payload.address){ err('address','Required'); ok=false; }
  return ok;
}

/* ---------- Upload: images -> storage, then insert row ---------- */
async function uploadPhotos(newId){
  // 壓縮再上傳（簡版：直接傳原檔；可後續加 canvas 壓縮）
  const pubUrls = [];
  for (let i=0; i<photos.length; i++){
    const p = photos[i];
    if (!p.file) continue; // 可能是草稿載入的 blob url
    const path = `merchants/${newId}/${Date.now()}-${i}.jpg`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, p.file, { upsert: true, contentType: p.file.type || 'image/jpeg' });
    if (error) throw error;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    pubUrls.push({ url: data.publicUrl, cover: !!p.cover });
  }
  // 若沒有新上傳，但有本地預覽（草稿），就忽略；由使用者重新挑選
  return pubUrls;
}

async function insertMerchant(payload){
  const { data, error } = await supabase.from('merchants')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/* ---------- Submit ---------- */
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    const payload = collectPayload(true);

    // 產 id
    const base = `${payload.city_id}-${toSlug(payload.name)}`;
    const uniq = base + '-' + Math.random().toString(36).slice(2,7);
    payload.id = base.length > 16 ? uniq : base; // 盡量短一點

    if (!validate(payload)) {
      showToast('Please fix errors');
      return;
    }

    // 先上傳圖片 → 產生 images/cover
    const uploaded = await uploadPhotos(payload.id);
    if (uploaded.length){
      payload.images = uploaded.map(x=>x.url);
      const coverObj = uploaded.find(x=>x.cover) || uploaded[0];
      payload.cover = coverObj?.url || '';
    }

    // 寫入 merchants
    await insertMerchant(payload);

    // 清草稿＋UI
    localStorage.removeItem(DRAFT_KEY);
    form.reset();
    tags = []; renderTags(); syncTagsHidden();
    photos = []; renderPhotos();
    buildOH(); // reset hours
    $$('.chip', catWrap).forEach(b=> b.classList.remove('is-on'));
    catHidden.value = '';

    showToast('Published');
    // 跳轉預覽
    location.hash = `#detail/${payload.id}`;

  }catch(err){
    console.error('Save failed:', err);
    showToast('Failed to publish. Saved as draft.');
    saveDraft();
  }
});

/* ---------- Init ---------- */
(async function init(){
  await loadCities();
  buildOH();
  loadDraft();
})();