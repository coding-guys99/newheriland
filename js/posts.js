//在你的頁尾 scripts 加載（app.js / explore.js 之後）
import { supabase } from './app.js';

const $  = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

const page = document.querySelector('[data-page="posts"]');
if (!page) { /* 不在這頁就不跑 */ }

/* ---------------- State ---------------- */
let cursor = null;            // 用 created_at & id 做 keyset 的 cursor
let sort   = 'latest';        // 'latest' | 'hot'
let tag    = null;            // #tag 過濾
let busy   = false;

/* ---------------- Rendering ---------------- */
function cardHTML(p){
  const cov = p.cover || p.photos?.[0] || p.videos?.[0] || '';
  const isVideo = (p.videos?.length||0) > 0 && cov === p.videos[0];
  const place = p.place_text || '';
  const time  = new Date(p.created_at || p.updated_at || Date.now()).toLocaleDateString();
  const tags  = Array.isArray(p.tags) ? p.tags : [];
  return `
  <article class="p-card" data-id="${p.id}">
    <a class="p-media" href="#post/${p.id}" aria-label="Open post">
      ${isVideo
        ? `<video src="${cov}" muted playsinline preload="metadata"></video>`
        : `<img src="${cov}" alt="">`}
      ${isVideo ? `<span class="p-badge">Video</span>` : ``}
    </a>
    <div class="p-body">
      <h3 class="p-titleline">${p.title || '—'}</h3>
      <div class="p-meta">
        ${place ? `<span>${place}</span><span class="dot"></span>` : ``}
        <span>${time}</span>
      </div>
      ${tags.length ? `<div class="p-tagsline">${tags.slice(0,3).map(t=>`<span class="t">#${t}</span>`).join('')}</div>` : ``}
    </div>
  </article>`;
}

function renderPosts(items, { append=false } = {}){
  const list = $('#postsList');
  if (!list) return;
  if (!append) list.innerHTML = '';
  list.insertAdjacentHTML('beforeend', items.map(cardHTML).join(''));
}

/* ---------------- Data ---------------- */
async function fetchPosts({ cursor:cur=null, sort:sv='latest', tag:tg=null } = {}){
  // 先顯示骨架或載入更多 spinner
  if (!cur) { $('#postsSk')?.removeAttribute('hidden'); }
  else { $('#postsMoreSk')?.removeAttribute('hidden'); $('#btnPostsMore')?.setAttribute('disabled','true'); }
  $('#postsError')?.setAttribute('hidden','true');
  $('#postsEmpty')?.setAttribute('hidden','true');

  try{
    if (!supabase){
      // 假資料（無後端時的展示）
      await new Promise(r=>setTimeout(r,600));
      const mock = Array.from({length: 8}, (_,i)=>({
        id:`m-${Date.now()}-${i}`,
        title:`Demo post #${i+1}`,
        cover:'https://picsum.photos/seed/'+(Math.random()*9999|0)+'/800/1000',
        tags:['demo','food','travel'].slice(0, (i%3)+1),
        place_text: ['Kuching','Miri','Sibu'][i%3],
        created_at: new Date().toISOString()
      }));
      return { ok:true, items: mock, nextCursor: 'demo-next' };
    }

    // Supabase 真實查詢：請依你實際 schema 調整欄位/索引
    const PAGE = 12;
    let q = supabase
      .from('posts')
      .select('id,title,cover,photos,videos,tags,place_text,created_at,updated_at,status')
      .eq('status','published')
      .order('created_at', { ascending:false })
      .limit(PAGE);

    if (sv === 'hot'){
      // 你若有 like_count/score 可改用它排序
      q = q.order('updated_at', { ascending:false });
    }
    if (tg){
      // 假設 tags 為 text[] 或 jsonb array，請依實際加 where 條件或 rpc
      q = q.contains ? q.contains('tags', [tg]) : q; // 若是 jsonb[]
    }
    if (cur && cur.created_at){
      // keyset：拿比 cursor 更舊的
      q = q.lt('created_at', cur.created_at);
    }

    const { data, error } = await q;
    if (error) throw error;

    const items = data || [];
    // 下一頁游標：最後一筆
    const nextCursor = items.length ? { created_at: items[items.length-1].created_at } : null;
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

/* ---------------- Wiring ---------------- */
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
  if (!res.items.length){
    $('#postsEmpty')?.removeAttribute('hidden');
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

/* 事件綁定 */
document.addEventListener('DOMContentLoaded', ()=>{
  const sec = document.querySelector('[data-page="posts"]'); if (!sec) return;

  // tab 切換到 #posts 時載入
  const runIfActive = ()=>{
    const hash = location.hash || '#home';
    if (hash === '#posts' && sec.hidden !== false) {
      // 顯示頁面（你的全域 router 應該會處理；這裡是保險）
      document.querySelectorAll('[data-page]').forEach(p=> p.hidden = (p!==sec));
      loadFirst();
    }
  };
  window.addEventListener('hashchange', runIfActive);
  runIfActive();

  // 排序
  $$('.p-sort .chip', sec).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.p-sort .chip', sec).forEach(b=>{ b.classList.remove('is-on'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('is-on'); btn.setAttribute('aria-pressed','true');
      sort = btn.dataset.sort || 'latest';
      cursor = null;
      loadFirst();
    });
  });

  // tag bar（若你要靜態先塞幾個）
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

  // 其他按鈕
  $('#btnPostsMore')?.addEventListener('click', loadMore);
  $('#btnPostsRetry')?.addEventListener('click', loadFirst);
  $('#btnPostsRefresh')?.addEventListener('click', ()=>{ cursor=null; loadFirst(); });
});