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
/* ==================== Media (photos + videos, max 10, append not override) ==================== */
function initMedia(){
  const btnPick = $('#btnPostPickPhotos');
  const input   = $('#postPhotosInput');
  const drop    = $('#postDrop');
  const grid    = $('#postPhotosGrid');
  if (!input || !grid || !drop) return;

  const MAX = 10;
  /** @type {Array<{id:string,file:File,kind:'image'|'video',url:string,isCover:boolean}>} */
  let state = [];

  const kindOf = (file)=> file.type.startsWith('video/') ? 'video' : 'image';

  function addFiles(files){
    const fresh = Array.from(files || []);
    for (const f of fresh){
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) continue;
      if (state.length >= MAX) break;
      state.push({
        id: crypto.randomUUID ? crypto.randomUUID() : (Date.now() + Math.random()).toString(36),
        file: f,
        kind: kindOf(f),
        url: URL.createObjectURL(f),
        isCover: state.length === 0 && !state.some(x=>x.isCover) // 第一張自動封面
      });
    }
  }

  const removeById = (id)=>{
    const i = state.findIndex(x=>x.id===id);
    if (i>=0){
      try{ URL.revokeObjectURL(state[i].url); }catch(_){}
      state.splice(i,1);
    }
    // 若刪掉的是封面，轉移封面給第一個
    if (!state.some(x=>x.isCover) && state.length>0) state[0].isCover = true;
  };

  const setCover = (id)=>{
    state.forEach(x=> x.isCover = (x.id===id));
    render();
  };

  function render(){
    grid.innerHTML = '';
    state.slice(0,MAX).forEach((item)=>{
      const cell = document.createElement('div');
      cell.className = 'ph';
      cell.dataset.id = item.id;

      if (item.kind === 'image'){
        cell.style.backgroundImage = `url("${item.url}")`;
        cell.classList.add('ph-img');
      }else{
        cell.classList.add('ph-vid');
        const v = document.createElement('video');
        v.src = item.url;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.autoplay = true;
        cell.appendChild(v);
      }

      // 封面徽章
      const badge = document.createElement('button');
      badge.className = 'ph-cover';
      badge.type = 'button';
      badge.innerHTML = item.isCover ? '⭐' : '☆';
      badge.title = item.isCover ? '封面' : '設為封面';
      badge.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        setCover(item.id);
      });
      cell.appendChild(badge);

      // 刪除按鈕
      const del = document.createElement('button');
      del.className = 'ph-del';
      del.type = 'button';
      del.textContent = '×';
      del.title = '移除';
      del.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        removeById(item.id);
        render();
      });
      cell.appendChild(del);

      grid.appendChild(cell);
    });

    const s = drop.querySelector('.dz-s');
    if (s) s.textContent = `最多 ${MAX} 個媒體 · ${state.length}/${MAX}`;
  }

  // 點擊選取
  btnPick?.addEventListener('click', ()=> input.click());
  // 選擇檔案（追加）
  input.addEventListener('change', ()=>{
    addFiles(input.files);
    input.value = ''; // 重置以允許同名檔案再選
    render();
  });
  // 拖放
  ['dragenter','dragover'].forEach(ev=>{
    drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('is-drag'); }, false);
  });
  ['dragleave','drop'].forEach(ev=>{
    drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('is-drag'); }, false);
  });
  drop.addEventListener('click', ()=> input.click());
  drop.addEventListener('drop', (e)=>{
    const dtf = Array.from(e.dataTransfer?.files || []);
    addFiles(dtf);
    render();
  });

  return {
    files: ()=> state.map(x=>x.file),
    clear: ()=> { state.forEach(x=> URL.revokeObjectURL(x.url)); state=[]; render(); },
    coverUrl: ()=> (state.find(x=>x.isCover)?.url || ''),
    render,
    getState: ()=> state
  };
}

async function uploadMedia(files){
  const results = [];
  const list = Array.from(files||[]).slice(0,10);

  for (const f of list){
    try{
      if (!supabase){
        // 未接后端时：直接回传 Blob URL（仅预览用，发布不会有公网 URL）
        results.push({ url: URL.createObjectURL(f), type: f.type });
        continue;
      }
      const isVideo = f.type.startsWith('video/');
      const ext = (f.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase();
      const dir = 'posts';
      const path = `${dir}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      // 建议你在 Supabase 里创建 bucket：post-media（统一图片/影片）
      const { error: upErr } = await supabase
        .storage.from('post-media')
        .upload(path, f, {
          cacheControl: '3600',
          upsert: false,
          contentType: f.type || (isVideo ? 'video/mp4' : 'image/jpeg')
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('post-media').getPublicUrl(path);
      results.push({ url: pub?.publicUrl || '', type: f.type });
    }catch(err){
      console.warn('[uploadMedia] failed:', err);
      results.push({ url: '', type: f.type });
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

// 依赖：supabase、showToast、compact、makePostId、nowIso、uploadMedia
// 以及页面初始化时传进来的 ctx：{ media }  —— ctx.media 是 initMedia() 的返回对象
async function handleSubmit(e, ctx){
  e.preventDefault();

  // 1) 取 DOM
  const form  = e.currentTarget;
  const media = ctx?.media;                 // ← 关键：用 ctx.media，不要再用 ctx.photos
  const title = $('#postTitle')?.value?.trim() || '';
  const body  = $('#postBody')?.value?.trim()  || '';
  const tags  = (()=>{ try{ return JSON.parse($('#postTags')?.value || '[]'); }catch{ return []; } })();

  // 2) 基本校验
  const mediaCount = media?.files()?.length || 0;
  if (!title && !body && mediaCount === 0){
    $('#postTitle')?.focus();
    showToast('至少需要標題、內文或照片其一','error');
    return;
  }
  if (body.length > 500){
    $('#postBody')?.focus();
    showToast('內文最多 500 字','error');
    return;
  }

  // 3) 上傳媒體
let photos = [], videos = [], cover = '';
try{
  const uploaded = await uploadMedia(media.files());
  photos = uploaded.filter(x => /^image\//.test(x.type)).map(x => x.url).filter(Boolean);
  videos = uploaded.filter(x => /^video\//.test(x.type)).map(x => x.url).filter(Boolean);

  // 找對應封面的 URL
  const coverLocalUrl = media.getState().find(x=>x.isCover)?.url;
  const matched = uploaded.find(u => u.url === coverLocalUrl);
  cover = matched ? matched.url : (photos[0] || videos[0] || '');
}catch(err){
  console.warn('[submit] media upload failed, continue:', err);
}

  // 4) 地點（可選）
  const place_id   = $('#postPlaceId')?.value?.trim() || null;
  const place_text = $('#postPlace')?.value?.trim()   || '';

  // 5) 組 payload（自動去掉 null/undefined）
  const payload = compact({
    id: makePostId(title),
    title: title || null,
    body:  body  || null,
    tags,                     // JSONB array
    photos,                   // JSONB array (圖片)
    videos,                   // JSONB array (影片) —— 若表里沒有此欄位就刪掉
    cover: cover || null,
    place_id,
    place_text,
    status: 'pending',        // 看你的審核流程
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  // 6) 無後端時：本地佇列
  if (!supabase){
    const key = 'add_queue_posts';
    const q = JSON.parse(localStorage.getItem(key) || '[]');
    q.push(payload);
    localStorage.setItem(key, JSON.stringify(q));
    showToast('已暫存於本地（未連接後端）','success');
    form.reset();
    ctx?.media?.clear?.();
    return;
  }

  // 7) 寫入資料庫
  try{
    const { error } = await supabase.from('posts').insert(payload);
    if (error) throw error;
    showToast('已發布，等待審核/同步 ✓','success');
    form.reset();
    ctx?.media?.clear?.();
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
  const media = initMedia();
  photos?.render?.();
  // 绑定提交（把 media 放进 ctx 传进去）
document.getElementById('postForm')?.addEventListener('submit', (e)=> handleSubmit(e, { media }));

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
      media?.clear?.();
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
