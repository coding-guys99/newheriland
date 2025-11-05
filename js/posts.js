// posts.js — Community feed (works with your Posts HTML)
import { supabase } from './app.js';

const $  = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

/* ---------------- State ---------------- */
let cursor = null;              // keyset cursor: { key: ISO string }
let sort   = 'latest';          // 'latest' | 'hot'
let tag    = null;              // active #tag
let busy   = false;             // loading guard

/* ---------------- Small utils ---------------- */
const fmtDate = (iso) => {
  try{
    const d = new Date(iso || Date.now());
    return d.toLocaleDateString();
  }catch{ return ''; }
};
const has = (arr) => Array.isArray(arr) && arr.length>0;
const isVideoUrl = (u='') => /\.(mp4|webm|mov)(\?|$)/i.test(u);

/* ---------------- Rendering ---------------- */
function cardHTML(p){
  // 取封面：cover > photos[0] > videos[0]
  const cov = p.cover || (has(p.photos) ? p.photos[0] : '') || (has(p.videos) ? p.videos[0] : '') || '';
  const isVideo = has(p.videos) && (p.videos.includes(cov) || isVideoUrl(cov));

  const place = p.place_text || '';
  const time  = fmtDate(p.created_at || p.updated_at);
  const tags  = Array.isArray(p.tags) ? p.tags : [];

  const mediaHTML = cov
    ? (isVideo
        ? `<video src="${cov}" muted playsinline preload="metadata"></video>`
        : `<img src="${cov}" alt="">`)
    : `<div class="p-media-ph">No media</div>`;

  return `
  <article class="p-card" data-id="${p.id}">
    <a class="p-media" href="#post/${p.id}" aria-label="Open post">
      ${mediaHTML}
      ${isVideo ? `<span class="p-badge">Video</span>` : ``}
    </a>
    <div class="p-body">
      <h3 class="p-titleline">${p.title ? escapeHtml(p.title) : '—'}</h3>
      <div class="p-meta">
        ${place ? `<span>${escapeHtml(place)}</span><span class="dot"></span>` : ``}
        <span>${time}</span>
      </div>
      ${tags.length ? `<div class="p-tagsline">
        ${tags.slice(0,3).map(t=>`<span class="t">#${escapeHtml(String(t))}</span>`).join('')}
      </div>` : ``}
    </div>
  </article>`;
}

function renderPosts(items, { append=false } = {}){
  const list = $('#postsList');
  if (!list) return;
  if (!append) list.innerHTML = '';
  if (!items.length && !append){
    $('#postsEmpty')?.removeAttribute('hidden');
    return;
  }
  list.insertAdjacentHTML('beforeend', items.map(cardHTML).join(''));
}

/* ---------------- Data ---------------- */
async function fetchPosts({ cursor:cur=null, sort:sv='latest', tag:tg=null } = {}){
  // UI 狀態
  if (!cur) { $('#postsSk')?.removeAttribute('hidden'); }
  else { $('#postsMoreSk')?.removeAttribute('hidden'); $('#btnPostsMore')?.setAttribute('disabled','true'); }
  $('#postsError')?.setAttribute('hidden','true');
  $('#postsEmpty')?.setAttribute('hidden','true');

  try{
    // 本地 demo
    if (!supabase){
      await new Promise(r=>setTimeout(r,500));
      const mock = Array.from({length: 8}, (_,i)=>({
        id:`m-${Date.now()}-${i}`,
        title:`Demo post #${i+1}`,
        cover:'https://picsum.photos/seed/'+(Math.random()*9999|0)+'/800/1000',
        tags:['demo','food','travel'].slice(0, (i%3)+1),
        place_text: ['Kuching','Miri','Sibu'][i%3],
        created_at: new Date(Date.now()-i*6e5).toISOString(),
        updated_at: new Date(Date.now()-i*6e5).toISOString(),
        status:'published'
      }));
      return { ok:true, items: mock, nextCursor: { key: mock.at(-1)?.created_at } };
    }

    const PAGE = 12;
    // 依排序選用 key（保持 order 與 cursor 一致）
    const orderKey = (sv === 'hot') ? 'updated_at' : 'created_at';

    let q = supabase
      .from('posts')
      .select('id,title,cover,photos,videos,tags,place_text,created_at,updated_at,status')
      .eq('status','published')
      .order(orderKey, { ascending:false })
      .limit(PAGE);

    // tag 過濾：若為 jsonb[]
    if (tg && typeof q.contains === 'function'){
      q = q.contains('tags', [tg]);
    }

    // keyset：比 cursor 更舊
    if (cur && cur.key){
      q = q.lt(orderKey, cur.key);
    }

    const { data, error } = await q;
    if (error) throw error;

    const items = data || [];
    const last = items[items.length-1];
    const nextCursor = last ? { key: last[orderKey] } : null;

    return { ok:true, items, nextCursor };
  }catch(err){
    console.warn('[posts] fetch error:', err);
    return { ok:false, error: err };
  }finally{
    $('#postsSk')?.setAttribute('hidden','true');
    $('#postsMoreSk')?.setAttribute('hidden','true');
    $('#btnPostsMore')?.removeAttribute('disabled');
  }
}

/* ---------------- Wire up ---------------- */
async function loadFirst(){
  if (busy) return; busy = true;
  const res = await fetchPosts({ sort, tag:null });
  busy = false;

  if (!res.ok){
    $('#postsError')?.removeAttribute('hidden');
    $('#postsList') && ( $('#postsList').innerHTML = '' );
    $('#postsMoreWrap')?.setAttribute('hidden','true');
    return;
  }
  renderPosts(res.items, { append:false });
  cursor = res.nextCursor;
  $('#postsMoreWrap')?.toggleAttribute('hidden', !cursor);
}

async function loadMore(){
  if (busy || !cursor) return;
  busy = true;
  const res = await fetchPosts({ cursor, sort, tag });
  busy = false;
  if (!res.ok) return;
  renderPosts(res.items, { append:true });
  cursor = res.nextCursor;
  $('#postsMoreWrap')?.toggleAttribute('hidden', !cursor);
}

/* 可選：無限捲動 */
function setupInfiniteScroll(){
  const more = $('#btnPostsMore');
  const sentinel = document.createElement('div');
  sentinel.id = 'postsSentinel';
  sentinel.style.height = '1px';
  $('#postsMoreWrap')?.before(sentinel);

  if (!('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver((entries)=>{
    const en = entries[0];
    if (en.isIntersecting && !busy && cursor){
      loadMore();
    }
  }, { rootMargin: '400px 0px' });

  io.observe(sentinel);
  // 仍保留按鈕 fallback
  more?.addEventListener('click', loadMore);
}

/* Escape for texts */
function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ---------------- Boot ---------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const sec = document.querySelector('[data-page="posts"]');
  if (!sec) return;

  // 排序
  $$('.p-sort .chip', sec).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.p-sort .chip', sec).forEach(b=>{
        b.classList.remove('is-on'); b.setAttribute('aria-pressed','false');
      });
      btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
      sort = btn.dataset.sort || 'latest';
      cursor = null;
      loadFirst();
    });
  });

  // 標籤（先靜態幾個，之後可由後端熱門標籤填充）
  const tagbar = $('#postsTagBar');
  if (tagbar){
    ['food','travel','culture','local'].forEach(t=>{
      const b = document.createElement('button');
      b.className = 'tag'; b.dataset.tag = t; b.textContent = '#'+t;
      b.addEventListener('click', ()=>{
        $$('.p-tags .tag', sec).forEach(x=> x.classList.toggle('is-on', x===b));
        tag = t; cursor = null; loadFirst();
      });
      tagbar.appendChild(b);
    });
  }

  // 更多/重試/刷新
  $('#btnPostsMore')?.addEventListener('click', loadMore);
  $('#btnPostsRetry')?.addEventListener('click', loadFirst);
  $('#btnPostsRefresh')?.addEventListener('click', ()=>{ cursor=null; loadFirst(); });

  // 初次進來若就是 #posts，載入一次
  const runIfActive = ()=>{
    const seg = (location.hash || '#home').replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
    if (seg === 'posts'){
      // 你的全域 router 會切頁；這裡保險顯示
      document.querySelectorAll('[data-page]').forEach(p=> p.hidden = (p!==sec));
      loadFirst();
    }
  };
  window.addEventListener('hashchange', runIfActive);
  runIfActive();

  // 無限捲動（可關）
  setupInfiniteScroll();
});