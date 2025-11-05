// add-post.js — Contribute: Post composer (photos, title, body, #tags, place)
// Requirements: app.js must export `supabase`

import { supabase } from './app.js';

/* ==================== Mini DOM helpers ==================== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ==================== Utils ==================== */
const slug = (s='') => (s||'').toLowerCase().trim()
  .replace(/[#]+/g,'')                // 去掉 # 符號，避免進 id
  .replace(/[^a-z0-9]+/g,'-')
  .replace(/(^-|-$)/g,'');

const autosize = (el)=>{
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(320, el.scrollHeight) + 'px';
};

const nowIso = () => new Date().toISOString();

function showToast(msg, kind='info'){
  const toast = $('#postToast');
  if (!toast){ console[kind==='error'?'error':'log'](msg); return; }
  toast.textContent = msg;
  toast.dataset.kind = kind;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.hidden = true, 2400);
}

const makePostId = (title='post') =>
  `post-${slug(title)||'untitled'}-${Date.now().toString(36).slice(-6)}`;

/* 去掉 null/undefined；保留空陣列/空字串（利於 JSONB） */
function compact(o){
  const out = {};
  for (const [k,v] of Object.entries(o)) if (v !== undefined && v !== null) out[k]=v;
  return out;
}

/* ==================== Photos (max 10) ==================== */
function initPhotos(){
  const btnPick   = $('#btnPostPickPhotos');
  const input     = $('#postPhotosInput');
  const drop      = $('#postDrop');
  const grid      = $('#postPhotosGrid');

  if (!input || !grid || !drop) return;

  const MAX = 10;

  const getFiles = ()=> Array.from(input.files || []);
  const setFiles = (filesArr)=>{
    const dt = new DataTransfer();
    filesArr.slice(0, MAX).forEach(f => dt.items.add(f));
    input.files = dt.files;
  };

  function render(){
    const files = getFiles();
    grid.innerHTML = '';
    files.slice(0,MAX).forEach((file, idx)=>{
      const url = URL.createObjectURL(file);
      const cell = document.createElement('div');
      cell.className = 'ph';
      cell.style.backgroundImage = `url("${url}")`;

      // Cover badge
      if (idx===0){
        const badge = document.createElement('span');
        badge.className = 'ph-badge';
        badge.textContent = 'Cover';
        cell.appendChild(badge);
      }

      // Delete
      const del = document.createElement('button');
      del.className = 'ph-del';
      del.type = 'button';
      del.textContent = '×';
      del.title = 'Remove';
      del.addEventListener('click', ()=>{
        const arr = getFiles().filter((_,i)=> i!==idx);
        setFiles(arr);
        render();
      });
      cell.appendChild(del);

      grid.appendChild(cell);
    });

    // 仍可加上 count 提示
    drop.querySelector('.dz-s')?.replaceChildren(
      document.createTextNode(`JPG / PNG, up to ${MAX} images · ${Math.min(files.length, MAX)}/${MAX}`)
    );
  }

  btnPick?.addEventListener('click', ()=> input.click());
  input.addEventListener('change', render);

  // Drag & drop
  ['dragenter','dragover'].forEach(ev=>{
    drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('is-drag'); }, false);
  });
  ['dragleave','drop'].forEach(ev=>{
    drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('is-drag'); }, false);
  });
  drop.addEventListener('click', ()=> input.click());
  drop.addEventListener('drop', (e)=>{
    const dropped = Array.from(e.dataTransfer?.files || []).filter(f=> f.type.startsWith('image/'));
    if (!dropped.length) return;
    const merged = getFiles().concat(dropped).slice(0, MAX);
    setFiles(merged);
    render();
  });

  // public method (for submit)
  return {
    files: ()=> getFiles().slice(0,MAX),
    clear: ()=> { setFiles([]); render(); },
    render
  };
}

async function uploadPhotos(files){
  const results = [];
  const list = Array.from(files||[]).slice(0,10);
  for (const f of list){
    try{
      if (!supabase){
        results.push({ url: URL.createObjectURL(f) });
        continue;
      }
      const ext = (f.name.split('.').pop()||'jpg').toLowerCase();
      const path = `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase
        .storage.from('post-photos')
        .upload(path, f, { cacheControl: '3600', upsert:false, contentType: f.type || 'image/jpeg' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('post-photos').getPublicUrl(path);
      results.push({ url: pub?.publicUrl || '' });
    }catch(err){
      console.warn('[uploadPhotos]', err);
      results.push({ url: '' });
    }
  }
  return results;
}

/* ==================== Body counter & autosize ==================== */
function initBodyCounter(){
  const ta = $('#postBody');
  const counter = $('#postBodyCount');
  if (!ta || !counter) return;
  const MAX = parseInt(ta.getAttribute('maxlength')||'500',10) || 500;

  const update = ()=>{
    const n = (ta.value || '').length;
    counter.textContent = String(n);
    autosize(ta);
  };
  ta.addEventListener('input', update);
  update();
}

/* ==================== Tags (#chips) ==================== */
function initTags(){
  const box = $('#postTagBox');
  const input = $('#postTagInput');
  const hidden = $('#postTags');
  if (!box || !input || !hidden) return;

  const maxTags = 12;

  const norm = (t)=> {
    let s = (t||'').trim();
    if (!s) return '';
    if (s.startsWith('#')) s = s.slice(1);
    s = s.replace(/\s+/g,'-');
    return slug(s);
  };

  const current = ()=> $$('.tag', box).map(t => t.dataset.tag);

  const renderHidden = ()=> hidden.value = JSON.stringify(current());

  const addTag = (raw)=>{
    const t = norm(raw);
    if (!t) return;
    const has = current().some(x => x.toLowerCase()===t.toLowerCase());
    if (has || current().length >= maxTags) return;
    const chip = document.createElement('span');
    chip.className = 'tag';
    chip.dataset.tag = t;
    chip.innerHTML = `#${t} <button type="button" aria-label="Remove tag">×</button>`;
    chip.querySelector('button').addEventListener('click', ()=>{ chip.remove(); renderHidden(); });
    box.insertBefore(chip, input);
    renderHidden();
  };

  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter'){
      e.preventDefault();
      if (input.value.trim()) addTag(input.value);
      input.value = '';
    }else if (e.key === ' ' && input.value.startsWith('#')){
      // 空白也視為結束一個 tag
      e.preventDefault();
      addTag(input.value);
      input.value = '';
    }else if (e.key === 'Backspace' && !input.value){
      const last = box.querySelector('.tag:last-of-type');
      if (last){ last.remove(); renderHidden(); }
    }
  });

  // 也支援貼上多個（用空白/逗號分割）
  input.addEventListener('paste', (e)=>{
    const txt = (e.clipboardData?.getData('text')||'').trim();
    if (!txt) return;
    const parts = txt.split(/[\s,，]+/).filter(Boolean);
    if (parts.length>1){
      e.preventDefault();
      parts.forEach(p=> addTag(p));
      renderHidden();
    }
  });

  // 初始同步
  renderHidden();
}

/* ==================== Place ==================== */
function initPlace(){
  const input = $('#postPlace');
  const hidden = $('#postPlaceId');
  const btnClr = $('#btnClearPlace');
  if (!input) return;

  // 你之後可以在這裡掛 autocomplete，選中後：
  // hidden.value = merchant.id; input.value = merchant.name; btnClr.hidden = false;

  btnClr?.addEventListener('click', ()=>{
    input.value = '';
    if (hidden) hidden.value = '';
    btnClr.hidden = true;
  });

  input.addEventListener('input', ()=>{
    if (hidden && input.value.trim()!=='' ) hidden.value = ''; // 手改文字即清掉 place_id
    if (btnClr) btnClr.hidden = (input.value.trim()==='');
  });

  // 初始狀態
  if (btnClr) btnClr.hidden = (input.value.trim()==='');
}

/* ==================== Submit / Draft ==================== */
async function handleSubmit(e, ctx){
  e.preventDefault();
  const { photos } = ctx;
  const form = e.currentTarget;

  const title = $('#postTitle')?.value?.trim() || '';
  const body  = $('#postBody')?.value?.trim()  || '';
  const tags  = (()=>{ try{ return JSON.parse($('#postTags')?.value || '[]'); }catch(_){ return []; } })();

  if (!title && !body && photos.files().length===0){
    $('#postTitle')?.focus();
    showToast('至少需要標題、內文或照片其一','error');
    return;
  }
  if ((body||'').length > 500){
    $('#postBody')?.focus();
    showToast('內文最多 500 字','error');
    return;
  }

  // 上傳照片
  let images = [], cover = '';
  try{
    const uploaded = await uploadPhotos(photos.files());
    images = uploaded.map(x=>x.url).filter(Boolean);
    cover  = images[0] || '';
  }catch(err){
    console.warn('[submit] photo upload failed, continue:', err);
  }

  const place_id   = $('#postPlaceId')?.value?.trim() || null;
  const place_text = $('#postPlace')?.value?.trim() || '';

  const payload = compact({
    id: makePostId(title),
    title: title || null,
    body:  body  || null,
    tags,                    // JSONB array
    photos: images,          // JSONB array
    cover: cover || null,
    place_id,
    place_text,
    status: 'pending',       // 也可用 'published' 視你的審核流程
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  // 本地 fallback 佇列
  if (!supabase){
    const key = 'add_queue_posts';
    const q = JSON.parse(localStorage.getItem(key) || '[]');
    q.push(payload);
    localStorage.setItem(key, JSON.stringify(q));
    showToast('已暫存於本地（未連接後端）','success');
    form.reset();
    ctx.reset();
    return;
  }

  try{
    const { error } = await supabase.from('posts').insert(payload);
    if (error) throw error;
    showToast('已發布，等待審核/同步 ✓','success');
    form.reset();
    ctx.reset();
  }catch(err){
    console.error('[submit] save failed:', err);
    showToast(err?.message || '儲存失敗，已加入離線佇列','error');
    const key = 'add_queue_posts';
    const q = JSON.parse(localStorage.getItem(key) || '[]');
    q.push(payload);
    localStorage.setItem(key, JSON.stringify(q));
  }
}

function handleSaveDraft(ctx){
  const title = $('#postTitle')?.value?.trim() || '';
  const body  = $('#postBody')?.value?.trim()  || '';
  const tags  = (()=>{ try{ return JSON.parse($('#postTags')?.value || '[]'); }catch(_){ return []; } })();
  const place_id   = $('#postPlaceId')?.value?.trim() || null;
  const place_text = $('#postPlace')?.value?.trim() || '';

  // 暫存「尚未上傳」的照片檔名不易保存；草稿只存文字/標籤/地點即可
  const draft = compact({
    id: makePostId(title),
    title, body, tags, place_id, place_text,
    _ts: Date.now()
  });
  const key = 'draft_posts_v1';
  const list = JSON.parse(localStorage.getItem(key)||'[]');
  list.unshift(draft);
  localStorage.setItem(key, JSON.stringify(list.slice(0,50)));
  showToast('已存為草稿','success');
}

/* ==================== Bootstrap ==================== */
document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.querySelector('[data-page="add"].add-post');
  if (!page) return;

  // Photos
  const photos = initPhotos();
  photos?.render?.();

  // Body counter + autosize
  initBodyCounter();

  // Tags
  initTags();

  // Place
  initPlace();

  // Form submit
  const form = $('#postForm');
  form?.addEventListener('submit', (e)=> handleSubmit(e, {
    photos,
    reset(){
      photos?.clear?.();
      $('#postBodyCount') && ($('#postBodyCount').textContent = '0');
    }
  }));

  // Save draft
  $('#btnPostSaveDraft')?.addEventListener('click', ()=> handleSaveDraft({}));

  // 讓標題、內文在 iOS 輸入時也有小延遲的視覺回饋
  ['#postTitle','#postBody'].forEach(sel=>{
    const el = $(sel);
    el?.addEventListener('input', ()=> el.classList.add('is-dirty'), { passive:true });
    el?.addEventListener('blur',  ()=> el.classList.remove('is-dirty'));
  });
});
