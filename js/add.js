// add-post.js — Contribute: Post composer (photos, title, body, #tags, place)
// Requirements: app.js must export `supabase`
import { supabase } from './app.js';

/* ==================== Mini DOM helpers ==================== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ==================== Utils ==================== */
const slug = (s='') => (s||'').toLowerCase().trim()
  .replace(/[#]+/g,'')
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

function compact(o){
  const out = {};
  for (const [k,v] of Object.entries(o)) if (v !== undefined && v !== null) out[k]=v;
  return out;
}

/* ==================== Media (photos + videos) ==================== */
function initMedia(){
  const btnPick = $('#btnPostPickPhotos');
  const input   = $('#postPhotosInput');
  const drop    = $('#postDrop');
  const grid    = $('#postPhotosGrid');
  if (!input || !grid || !drop) return;

  const MAX = 10;
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
        isCover: state.length === 0 && !state.some(x=>x.isCover)
      });
    }
  }

  const removeById = (id)=>{
    const i = state.findIndex(x=>x.id===id);
    if (i>=0){
      try{ URL.revokeObjectURL(state[i].url); }catch(_){}
      state.splice(i,1);
    }
    if (!state.some(x=>x.isCover) && state.length>0) state[0].isCover = true;
    render();
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

      if (item.kind === 'image') {
        cell.classList.add('ph-img');
        cell.style.backgroundImage = `url("${item.url}")`;
      } else {
        cell.classList.add('ph-vid');
        const v = document.createElement('video');
        v.src = item.url; v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('webkit-playsinline','true'); v.autoplay = true;
        cell.appendChild(v);
      }

      const badge = document.createElement('button');
      badge.className = 'ph-cover'; badge.type='button';
      badge.innerHTML = item.isCover ? '⭐' : '☆';
      badge.title = item.isCover ? '封面' : '設為封面';
      badge.addEventListener('click', ev=>{ ev.stopPropagation(); setCover(item.id); });
      cell.appendChild(badge);

      const del = document.createElement('button');
      del.className = 'ph-del'; del.type='button'; del.textContent='×';
      del.title='移除';
      del.addEventListener('click', ev=>{ ev.stopPropagation(); removeById(item.id); });
      cell.appendChild(del);

      grid.appendChild(cell);
    });

    const s = drop.querySelector('.dz-s');
    if (s) s.textContent = `最多 ${MAX} 個媒體 · ${state.length}/${MAX}`;
  }

  btnPick?.addEventListener('click', ()=> input.click());
  input.addEventListener('change', ()=>{
    addFiles(input.files); input.value=''; render();
  });
  ['dragenter','dragover'].forEach(ev=>{
    drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('is-drag'); }, false);
  });
  ['dragleave','drop'].forEach(ev=>{
    drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('is-drag'); }, false);
  });
  drop.addEventListener('click', ()=> input.click());
  drop.addEventListener('drop', (e)=>{
    const dtf = Array.from(e.dataTransfer?.files || []); addFiles(dtf); render();
  });

  render();
  return {
    files: ()=> state.map(x=>x.file),
    clear: ()=> { state.forEach(x=> URL.revokeObjectURL(x.url)); state=[]; render(); },
    coverLocalUrl: ()=> (state.find(x=>x.isCover)?.url || ''),
    getState: ()=> state,
    render
  };
}

/* ==================== Upload ==================== */
async function uploadMedia(state){
  const results = [];
  const list = Array.from(state||[]).slice(0,10);

  for (const item of list){
    const f = item.file;
    try{
      if (!supabase){
        results.push({ local:item.url, url:item.url, type:f.type, kind:item.kind });
        continue;
      }
      const isVideo = f.type.startsWith('video/');
      const ext = (f.name.split('.').pop() || (isVideo ? 'mp4':'jpg')).toLowerCase();
      const path = `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error:upErr } = await supabase.storage.from('post-media')
        .upload(path, f, { cacheControl:'3600', upsert:false, contentType:f.type || (isVideo?'video/mp4':'image/jpeg') });
      if (upErr) throw upErr;

      const { data:pub } = supabase.storage.from('post-media').getPublicUrl(path);
      results.push({ local:item.url, url:pub?.publicUrl || '', type:f.type, kind:item.kind });
    }catch(err){
      console.warn('[uploadMedia] failed:', err);
      results.push({ local:item.url, url:'', type:f.type, kind:item.kind });
    }
  }
  return results;
}

/* ==================== Body counter / tags / place ==================== */
function initBodyCounter(){
  const ta=$('#postBody'); const counter=$('#postBodyCount'); if(!ta||!counter)return;
  const MAX=parseInt(ta.getAttribute('maxlength')||'500',10);
  const update=()=>{ const n=(ta.value||'').length; counter.textContent=String(n); autosize(ta); };
  ta.addEventListener('input',update); update();
}

function initTags(){
  const box=$('#postTagBox'); const input=$('#postTagInput'); const hidden=$('#postTags');
  if(!box||!input||!hidden)return;
  const maxTags=12;
  const norm=t=>{ let s=(t||'').trim(); if(!s)return''; if(s.startsWith('#'))s=s.slice(1); s=s.replace(/\s+/g,'-'); return slug(s); };
  const current=()=>$$('.tag',box).map(t=>t.dataset.tag);
  const renderHidden=()=> hidden.value=JSON.stringify(current());
  const addTag=(raw)=>{ const t=norm(raw); if(!t)return; if(current().some(x=>x.toLowerCase()===t.toLowerCase())||current().length>=maxTags)return;
    const chip=document.createElement('span'); chip.className='tag'; chip.dataset.tag=t;
    chip.innerHTML=`#${t} <button type="button" aria-label="Remove tag">×</button>`;
    chip.querySelector('button').addEventListener('click',()=>{chip.remove();renderHidden();});
    box.insertBefore(chip,input); renderHidden();
  };
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();if(input.value.trim())addTag(input.value);input.value='';}
    else if(e.key===' '&&input.value.startsWith('#')){e.preventDefault();addTag(input.value);input.value='';}
    else if(e.key==='Backspace'&&!input.value){const last=box.querySelector('.tag:last-of-type');if(last){last.remove();renderHidden();}}
  });
  input.addEventListener('paste',e=>{
    const txt=(e.clipboardData?.getData('text')||'').trim(); if(!txt)return;
    const parts=txt.split(/[\s,，]+/).filter(Boolean);
    if(parts.length>1){e.preventDefault();parts.forEach(p=>addTag(p));renderHidden();}
  });
  renderHidden();
}

function initPlace(){
  const input=$('#postPlace'); const hidden=$('#postPlaceId'); const btnClr=$('#btnClearPlace'); if(!input)return;
  btnClr?.addEventListener('click',()=>{input.value='';if(hidden)hidden.value='';btnClr.hidden=true;});
  input.addEventListener('input',()=>{if(hidden&&input.value.trim()!=='')hidden.value='';if(btnClr)btnClr.hidden=(input.value.trim()==='');});
  if(btnClr)btnClr.hidden=(input.value.trim()==='');
}

/* ==================== Submit / Draft ==================== */
async function handleSubmit(e, ctx){
  // 防呆：事件可能已失效
  if (e?.preventDefault) e.preventDefault();

  // 先取得 form（事件失效就用 DOM 抓）
  const form = e?.currentTarget || document.querySelector('#postForm');
  if (!form) {
    showToast('表單節點不存在（#postForm）','error');
    throw new Error('form-not-found');
  }

  // 取用傳入的 media（可能為 undefined）
  const media = ctx?.media;

  // 讀取欄位
  const title = $('#postTitle')?.value?.trim() || '';
  const body  = $('#postBody')?.value?.trim()  || '';
  const tags  = (()=>{ try{ return JSON.parse($('#postTags')?.value || '[]'); }catch{ return []; } })();

  // 最低條件檢查
  const mediaCount = media?.files?.()?.length || 0;
  if (!title && !body && mediaCount === 0){
    $('#postTitle')?.focus();
    showToast('至少需要標題、內文或照片其一','error');
    throw new Error('empty');
  }
  if (body.length > 500){
    $('#postBody')?.focus();
    showToast('內文最多500字','error');
    throw new Error('too-long');
  }

  // 上傳媒體
  let photos = [], videos = [], cover = '';
  try{
    const state = media?.getState?.() || [];
    const uploaded = await uploadMedia(state);
    photos = uploaded.filter(x => x.kind === 'image' && x.url).map(x => x.url);
    videos = uploaded.filter(x => x.kind === 'video' && x.url).map(x => x.url);

    const coverLocal = state.find(x=>x.isCover)?.url;
    cover = (uploaded.find(u => u.local === coverLocal)?.url) || photos[0] || videos[0] || '';
  }catch(err){
    console.warn('[submit] media upload failed, continue:', err);
  }

  // 地點
  const place_id   = $('#postPlaceId')?.value?.trim() || null;
  const place_text = $('#postPlace')?.value?.trim()   || '';

  // 讀本地暱稱/頭像（你可以做個簡單設定頁先寫入 localStorage）
const pseudoProfile = {
  display_name: localStorage.getItem('hl.display_name') || 'Anonymous',
  avatar_url: localStorage.getItem('hl.avatar_url') || ''
};

  // 組 payload
  const payload = compact({
  id: makePostId(title),
  title: title || null,
  body:  body  || null,
  tags, photos, videos,
  cover: cover || null,
  place_id, place_text,
  author: pseudoProfile,            // ← 新增
  status: 'published',              // 或你原本用的 pending/approved
  created_at: nowIso(),
  updated_at: nowIso(),
});

  // 無後端：暫存本地
  if (!supabase){
    const key = 'add_queue_posts';
    const q = JSON.parse(localStorage.getItem(key) || '[]');
    q.push(payload);
    localStorage.setItem(key, JSON.stringify(q));
    showToast('已暫存於本地（未連接後端）','success');
    form.reset?.();
    media?.clear?.();
    if ($('#postBodyCount')) $('#postBodyCount').textContent = '0';
    return;
  }

  // 寫入資料庫
  const { error } = await supabase.from('posts').insert(payload);
  if (error) throw error;

  // 成功清理
  form.reset?.();
  media?.clear?.();
  if ($('#postBodyCount')) $('#postBodyCount').textContent = '0';
}


function handleSaveDraft(){
  const title=$('#postTitle')?.value?.trim()||''; const body=$('#postBody')?.value?.trim()||'';
  const tags=(()=>{try{return JSON.parse($('#postTags')?.value||'[]');}catch{return[];}})();
  const place_id=$('#postPlaceId')?.value?.trim()||null; const place_text=$('#postPlace')?.value?.trim()||'';
  const draft=compact({id:makePostId(title),title,body,tags,place_id,place_text,_ts:Date.now()});
  const key='draft_posts_v1'; const list=JSON.parse(localStorage.getItem(key)||'[]'); list.unshift(draft);
  localStorage.setItem(key,JSON.stringify(list.slice(0,50))); showToast('已存為草稿','success');
}

/* ==================== Modal Helper ==================== */
const PublishModal = {
  open(state='confirm'){ $('#modalBackdrop').hidden=false; $('#publishModal').hidden=false;
    document.documentElement.classList.add('modal-open'); document.body.classList.add('modal-open'); setState(state); },
  progress(txt='Publishing…'){ $('#pmProgressText').textContent=txt; setState('progress'); },
  success(){ setState('success'); },
  error(msg='Failed'){ $('#pmErrText').textContent=msg; setState('error'); },
  close(){ $('#modalBackdrop').hidden=true; $('#publishModal').hidden=true;
    document.documentElement.classList.remove('modal-open'); document.body.classList.remove('modal-open'); }
};
function setState(name){
  document.querySelectorAll('#publishModal [data-state]').forEach(n=>{
    n.hidden=(n.getAttribute('data-state')!==name);
  });
}

/* ==================== Bootstrap ==================== */
document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.querySelector('[data-page="add"].add-post');
  if (!page) return;

  const media = initMedia();
  const form  = $('#postForm');
  let lastForm = null;   // ✅ 改這裡

  // 攔截 submit，只開啟確認視窗
  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    lastForm = form;      // ✅ 保存 form 節點
    PublishModal.open('confirm');
  });

  // Modal 關閉鈕
  $('#pmCancel')?.addEventListener('click', ()=> PublishModal.close());
  $('#pmDone')?.addEventListener('click', ()=> PublishModal.close());
  $('#pmCloseErr')?.addEventListener('click', ()=> PublishModal.close());

  // Modal 的 Publish → 真正送出
  $('#pmOk')?.addEventListener('click', async ()=>{
    try{
      PublishModal.progress('Uploading…');

      const state = media?.getState?.() || [];
      const total = state.length || 0;
      let done = 0;

      async function uploadWithStep(s){
        const results = [];
        for (const it of s){
          const r = await uploadMedia([it]);
          results.push(...r);
          done++;
          PublishModal.progress(`Uploading ${done}/${total}…`);
        }
        return results;
      }

      const orig = window.uploadMedia;
      window.uploadMedia = (s)=> uploadWithStep(s);

      PublishModal.progress('Publishing…');

      // ✅ 人工建立一個帶有 currentTarget 的事件物件
      const fakeEvent = { currentTarget: lastForm, preventDefault(){} };
      await handleSubmit(fakeEvent, { media });

      window.uploadMedia = orig;
      PublishModal.success();
    }catch(err){
      console.error(err);
      PublishModal.error(err?.message || 'Publish failed');
    }
  });

  // Save draft 保持原樣
  $('#btnPostSaveDraft')?.addEventListener('click', ()=> handleSaveDraft());

  // 初始化其他功能
  initBodyCounter();
  initTags();
  initPlace();

  ['#postTitle','#postBody'].forEach(sel=>{
    const el = $(sel);
    el?.addEventListener('input', ()=> el.classList.add('is-dirty'), { passive:true });
    el?.addEventListener('blur',  ()=> el.classList.remove('is-dirty'));
  });
});

