// js/posts.js — Community feed (Trip-like cards)
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ------------------ Small utils ------------------ */
const isArr = (v)=> Array.isArray(v) ? v : [];
const safeStr = (v, fb='')=> (typeof v === 'string' ? v : fb);
const clamp = (n, a, b)=> Math.max(a, Math.min(b, n));
const numAbbr = (n)=>{
  n = Number(n||0);
  if (n < 1000) return String(n);
  if (n < 1e6)  return (n/1e3).toFixed(n%1e3 ? 1:0).replace(/\.0$/,'') + 'K';
  if (n < 1e9)  return (n/1e6).toFixed(n%1e6 ? 1:0).replace(/\.0$/,'') + 'M';
  return (n/1e9).toFixed(n%1e9 ? 1:0).replace(/\.0$/,'') + 'B';
};
const timeAgo = (iso)=>{
  const d = new Date(iso||Date.now());
  const diff = (Date.now() - d.getTime())/1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff/86400)}d`;
  return d.toISOString().slice(0,10);
};
const on = (el, ev, fn, opt)=> el && el.addEventListener(ev, fn, opt);

/* ------------------ State ------------------ */
const state = {
  sort: 'latest',   // 'latest' | 'hot'
  tag:  null,       // '#tag'
  page: 0,
  limit: 12,
  loading: false,
  done: false,
};

const els = {
  list: $('#postsList'),
  sk: $('#postsSk'),
  err: $('#postsError'),
  empty: $('#postsEmpty'),
  moreWrap: $('#postsMoreWrap'),
  moreBtn: $('#btnPostsMore'),
  moreSk: $('#postsMoreSk'),
  tagBar: $('#postsTagBar'),
  refresh: $('#btnPostsRefresh'),
  sentinel: $('#postsSentinel'),
};

/* ------------------ Fetch ------------------ */
async function fetchPosts({ page=0, limit=12, sort='latest', tag=null }){
  if (!supabase) {
    // fallback: no backend
    return { data: [], error: null };
  }

  // 欄位：依你 earlier schema
  let query = supabase
    .from('posts')
    .select('id,title,body,tags,photos,videos,cover,place_text,created_at,author,views,likes,status', { count: 'exact' })

  // 只顯示可公開的狀態（你若用 pending/approved 可自行調整）
  query = query.in('status', ['published','approved']).or('status.is.null');

  // Tag 篩選
  if (tag) {
    // 假設 tags 為 text[] 或 jsonb[] → 用包含字串的方式過濾
    // 若用 jsonb，請在 DB 端建立對應的索引；這裡採最穩的包含法
    query = query.contains ? query.contains('tags', [tag]) : query;
  }

  // 排序
  if (sort === 'hot') {
    query = query.order('views', { ascending: false }).order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const from = page * limit;
  const to   = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  return { data: data || [], error };
}

/* ------------------ Render helpers ------------------ */
function pickMedia(post){
  const photos = isArr(post.photos);
  const videos = isArr(post.videos);
  const cover  = safeStr(post.cover);
  if (cover) return { url: cover, kind: 'image' };
  if (photos[0]) return { url: photos[0], kind: 'image' };
  if (videos[0]) return { url: videos[0], kind: 'video' };
  return { url: '', kind: 'image' };
}

function mkTagChip(t){
  const span = document.createElement('span');
  span.className = 'tag';
  span.textContent = `#${t}`;
  return span;
}

function lazyImg(img, src){
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = img.alt || '';
  img.src = src;
  if (img.complete) {
    img.setAttribute('data-loaded', '1');
  } else {
    img.addEventListener('load', ()=> img.setAttribute('data-loaded','1'), { once:true });
    img.addEventListener('error', ()=> img.setAttribute('data-loaded','1'), { once:true });
  }
}

function renderPostCard(post){
  const tpl = $('#postCardTpl');
  const frag = tpl.content.cloneNode(true);
  const el = frag.querySelector('.post');

  const mediaA = frag.querySelector('.post-media');
  const badge  = frag.querySelector('.pm-badge');
  const sticker= frag.querySelector('.pm-sticker');
  const vidTag = frag.querySelector('.pm-vid');
  const titleEl= frag.querySelector('.post-title');
  const ava    = frag.querySelector('.post-avatar');
  const author = frag.querySelector('.post-author');
  const timeEl = frag.querySelector('.post-time');
  const views  = frag.querySelector('.post-views');
  const likeBtn= frag.querySelector('.btn-like');
  const placeA = frag.querySelector('.btn-place');
  const tagsBox= frag.querySelector('.post-tags');

  // Media
  const media = pickMedia(post);
  mediaA.href = `#/posts/${encodeURIComponent(post.id)}`;
  mediaA.setAttribute('aria-label', safeStr(post.title, 'View post'));

  if (media.url){
    const img = document.createElement('img');
    lazyImg(img, media.url);
    mediaA.appendChild(img);
  }
  if (media.kind === 'video') {
    vidTag.hidden = false;
  }

  // 可選：分類/城市標籤
  const cat = safeStr(post.place_text) || (isArr(post.tags)[0] || '');
  if (cat) {
    badge.textContent = cat.length > 14 ? cat.slice(0,12)+'…' : cat;
    badge.hidden = false;
  }

  // 右下貼紙（預留：若你要顯示 AI / 活動）
  // sticker.textContent = 'AI'; sticker.hidden = false; // 視需求打開

  // Title（兩行截斷）
  const title = safeStr(post.title) || safeStr(post.place_text) || 'Untitled Post';
  titleEl.textContent = title;

  // Meta 左側
  const a = post.author || {};
author.textContent = a.display_name || 'Anonymous';
if (a.avatar_url) {
  ava.src = a.avatar_url;
  ava.alt = a.display_name ? `${a.display_name}'s avatar` : 'avatar';
  ava.hidden = false;
} else {
  ava.hidden = true;
}

  author.textContent = a?.display_name || 'Anonymous';
  timeEl.dateTime = post.created_at || '';
  timeEl.textContent = timeAgo(post.created_at);

  // Meta 右側
  if (post.views != null){
    views.textContent = numAbbr(post.views);
    views.hidden = false;
  }
  on(likeBtn, 'click', ()=>{
    likeBtn.classList.toggle('is-on');
    // 這裡可追加：調用 /rpc 或資料表更新 likes（節流/防抖）
  });

  if (post.place_text){
    placeA.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(post.place_text)}`;
    placeA.hidden = false;
  }

  // Tags（最多 2 顆 +n）
  const tags = isArr(post.tags).slice(0, 8);
  if (tags.length){
    const max = 2;
    tags.slice(0, max).forEach(t => tagsBox.appendChild(mkTagChip(t)));
    const more = tags.length - max;
    if (more > 0){
      const moreChip = document.createElement('span');
      moreChip.className = 'tag more';
      moreChip.textContent = `+${more}`;
      tagsBox.appendChild(moreChip);
    }
  }

  // 整張卡片點擊進詳情（若不要就移除這段）
  on(el, 'click', (ev)=>{
    // 避免在點按鈕時觸發
    if (ev.target.closest('.btn-icon')) return;
    location.hash = `#/posts/${encodeURIComponent(post.id)}`;
  });

  return frag;

  const cardRoot = frag.querySelector('.post');
observeCardForView(cardRoot, post.id);

}

// 生成/取得裝置指紋（存在 localStorage）
function getDeviceId(){
  let id = localStorage.getItem('hl.device_id');
  if (!id){
    id = (crypto.randomUUID?.() || (Date.now()+Math.random()).toString(36));
    localStorage.setItem('hl.device_id', id);
  }
  return id;
}

// 觸發 +1（節流：每張卡片只打一次）
const seenSet = new Set();

async function bumpView(postId){
  if (!postId || seenSet.has(postId)) return;
  seenSet.add(postId);
  try{
    await supabase.rpc('posts_inc_view', {
      p_post_id: postId,
      p_fprint: getDeviceId()
    });
  }catch(e){
    console.warn('[views] inc fail', e);
  }
}

// 例：在卡片渲染後，等圖片載入或卡片進入 viewport 時呼叫
function observeCardForView(cardEl, postId){
  if (!('IntersectionObserver' in window)) {
    bumpView(postId); return;
  }
  const io = new IntersectionObserver((entries, obs)=>{
    if (entries.some(e=> e.isIntersecting)){
      bumpView(postId);
      obs.unobserve(cardEl);
    }
  }, { root:null, rootMargin:'200px 0px', threshold: 0.1 });
  io.observe(cardEl);
}


/* ------------------ List control ------------------ */
function setLoading(on){
  state.loading = !!on;
  els.sk.hidden = !on && state.page > 0;
  els.moreSk.hidden = !on || state.page === 0;
}
function setError(on){
  els.err.hidden = !on;
}
function setEmpty(on){
  els.empty.hidden = !on;
}
function clearList(){
  els.list.innerHTML = '';
  state.page = 0;
  state.done = false;
}

async function loadMore(){
  if (state.loading || state.done) return;
  setLoading(true); setError(false);

  const { data, error } = await fetchPosts({
    page: state.page,
    limit: state.limit,
    sort: state.sort,
    tag: state.tag,
  });

  setLoading(false);

  if (error){
    console.error('[posts] fetch error:', error);
    if (state.page === 0) setError(true);
    return;
  }

  if (state.page === 0 && (!data || data.length === 0)){
    setEmpty(true);
    return;
  } else {
    setEmpty(false);
  }

  const frag = document.createDocumentFragment();
  data.forEach(p => frag.appendChild( renderPostCard(p) ));
  els.list.appendChild(frag);

  if (!data || data.length < state.limit){
    state.done = true;
    els.moreWrap.hidden = true;
  } else {
    state.page += 1;
    els.moreWrap.hidden = false;
  }
}

/* ------------------ Tag bar (optional demo) ------------------ */
function renderHotTags(hot=[]) {
  els.tagBar.innerHTML = '';
  hot.slice(0, 12).forEach(t=>{
    const b = document.createElement('button');
    b.className = 'tag';
    b.textContent = `#${t}`;
    on(b,'click', ()=>{
      // 切換 tag
      const isSame = state.tag === t;
      state.tag = isSame ? null : t;
      // UI 樣式
      $$('.p-tags .tag').forEach(x=> x.classList.toggle('is-on', x === b && !isSame));
      // 重新載入
      clearList(); loadMore();
    });
    els.tagBar.appendChild(b);
  });
}

/* ------------------ Bootstrap ------------------ */
document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.querySelector('[data-page="posts"].posts');
  if (!page) return;

  // 排序切換
  $$('.p-sort .chip').forEach(ch=>{
    on(ch,'click', ()=>{
      $$('.p-sort .chip').forEach(x=> x.classList.remove('is-on'));
      ch.classList.add('is-on');
      state.sort = ch.dataset.sort || 'latest';
      clearList(); loadMore();
    });
  });

  // Refresh
  on(els.refresh,'click', ()=>{ clearList(); loadMore(); });

  // Load more（按鈕）
  on(els.moreBtn,'click', loadMore);

  // 無限滾動（sentinel）
  if ('IntersectionObserver' in window && els.sentinel){
    const io = new IntersectionObserver((entries)=>{
      if (entries.some(e=> e.isIntersecting)) loadMore();
    }, { root: null, rootMargin: '800px 0px', threshold: 0 });
    io.observe(els.sentinel);
  }

  // 熱門標籤（可改成從後端抓）
  renderHotTags(['kuching','food','nature','museum','cafe','viewpoint','sarawak']);

  // 首次載入
  clearList();
  loadMore();
});
