// js/posts.js — Community feed (Trip-like cards)
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ------------------ Small utils ------------------ */
const isArr = (v)=> Array.isArray(v) ? v : [];
const safeStr = (v, fb='')=> (typeof v === 'string' ? v : fb);
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

/* ------------------ Config / State ------------------ */
const SELECT_PRIMARY = 'id,title,body,tags,photos,videos,cover,place_text,created_at,author,views,likes,status';
const SELECT_FALLBACK = 'id,title,body,tags,photos,cover,place_text,created_at,status';

const state = {
  sort: 'latest',   // 'latest' | 'hot'
  tag:  null,
  page: 0,
  limit: 12,
  loading: false,
  done: false,
};

/*const els = {
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
};*/

// 新增：延後再抓
let els = null;
function collectEls() {
  const root = document;
  return {
    list: root.querySelector('#postsList'),
    sk: root.querySelector('#postsSk'),
    err: root.querySelector('#postsError'),
    empty: root.querySelector('#postsEmpty'),
    moreWrap: root.querySelector('#postsMoreWrap'),
    moreBtn: root.querySelector('#btnPostsMore'),
    moreSk: root.querySelector('#postsMoreSk'),
    tagBar: root.querySelector('#postsTagBar'),
    refresh: root.querySelector('#btnPostsRefresh'),
    sentinel: root.querySelector('#postsSentinel'),
  };
}

/* ------------------ Fetch ------------------ */
async function fetchPosts({ page=0, limit=12, sort='latest', tag=null }){
  if (!supabase) return { data: [], error: null };

  const runQuery = async (columns) => {
    let q = supabase.from('posts').select(columns, { count: 'exact' });

    // 只顯示可公開的狀態；若還沒有 status 欄位，fallback 查詢會移除它
    if (columns.includes('status')) {
      q = q.in('status', ['published','approved']).or('status.is.null');
    }

    if (tag && columns.includes('tags')) {
      q = q.contains ? q.contains('tags', [tag]) : q;
    }

    if (sort === 'hot' && columns.includes('views')) {
      q = q.order('views', { ascending: false }).order('created_at', { ascending: false });
    } else if (columns.includes('created_at')) {
      q = q.order('created_at', { ascending: false });
    }

    const from = page * limit;
    const to   = from + limit - 1;
    q = q.range(from, to);

    return await q;
  };

  // 先嘗試完整欄位；若資料庫尚未建立那些欄位/表，退而求其次避免整頁壞掉
  let { data, error } = await runQuery(SELECT_PRIMARY);
  if (error && (error.code === '42703' /* undefined_column */ || error.code === '42P01' /* undefined_table */)) {
    console.warn('[posts] falling back select due to schema:', error);
    ({ data, error } = await runQuery(SELECT_FALLBACK));
  }
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
  if (!tpl) return document.createDocumentFragment();

  const frag = tpl.content.cloneNode(true);
  const el = frag.querySelector('.post');

  const mediaA = frag.querySelector('.post-media');
  const badge  = frag.querySelector('.pm-badge');
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
  if (media.kind === 'video') vidTag.hidden = false;

  // 分類/城市標籤
  const cat = safeStr(post.place_text) || (isArr(post.tags)[0] || '');
  if (cat) {
    badge.textContent = cat.length > 14 ? cat.slice(0,12)+'…' : cat;
    badge.hidden = false;
  }

  // Title
  const title = safeStr(post.title) || safeStr(post.place_text) || 'Untitled Post';
  titleEl.textContent = title;

  // Meta 左側（匿名方案 fallback）
  const a = post.author || {};
  author.textContent = a.display_name || 'Anonymous';
  if (a.avatar_url) {
    ava.src = a.avatar_url;
    ava.alt = a.display_name ? `${a.display_name}'s avatar` : 'avatar';
    ava.hidden = false;
  } else {
    ava.hidden = true;
  }
  timeEl.dateTime = post.created_at || '';
  timeEl.textContent = timeAgo(post.created_at);

  // Meta 右側（views 欄位可能不存在 → 僅當有值時顯示）
  if (post.views != null) {
    views.textContent = numAbbr(post.views);
    views.hidden = false;
  }
  on(likeBtn, 'click', ()=> likeBtn.classList.toggle('is-on'));

  if (post.place_text){
    placeA.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(post.place_text)}`;
    placeA.hidden = false;
  }

  // Tags
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

  // 整張卡片點擊進詳情
  on(el, 'click', (ev)=>{
    if (ev.target.closest('.btn-icon')) return;
    location.hash = `#/posts/${encodeURIComponent(post.id)}`;
  });

  // 先不 observe，待插入 DOM 後在 loadMore() 綁定
  el.dataset.pid = post.id;

  return frag;
}

/* ------------------ Views (+1) ------------------ */
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
    await supabase?.rpc?.('posts_inc_view', {
      p_post_id: postId,
      p_fprint: getDeviceId()
    });
  }catch(e){
    console.warn('[views] inc fail', e);
  }
}

// 在卡片插入 DOM 之後再綁觀察
function observeCardForView(cardEl, postId){
  if (!cardEl) return;
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
  if (!els || !els.list) { console.warn('[posts] els not ready'); return; }
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

  // 插入後再綁觀察（只綁新卡）
  $$('.post:not([data-observed])', els.list).forEach(card=>{
    const pid = card.dataset.pid;
    if (!pid) return;
    observeCardForView(card, pid);
    card.setAttribute('data-observed','1');
  });

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
      const isSame = state.tag === t;
      state.tag = isSame ? null : t;
      $$('.p-tags .tag').forEach(x=> x.classList.toggle('is-on', x === b && !isSame));
      clearList(); loadMore();
    });
    els.tagBar.appendChild(b);
  });
}

/* ------------------ Bootstrap ------------------ */
document.addEventListener('DOMContentLoaded', ()=>{
  console.log('[posts] boot'); 
  const page = document.querySelector('[data-page="posts"].posts');
  if (!page) return;

  // 一定把它打開（避免 hidden 把內容蓋住）
  page.hidden = false;

  // 這裡才抓元素
  els = collectEls();

  // 防呆：若重要容器缺失，直接提示並停下
  if (!els.list) {
    console.warn('[posts] #postsList not found');
    return;
  }

  // 排序切換
  $$('.p-sort .chip').forEach(ch=>{
    on(ch,'click', ()=>{
      $$('.p-sort .chip').forEach(x=> x.classList.remove('is-on'));
      ch.classList.add('is-on');
      state.sort = ch.dataset.sort || 'latest';
      clearList(); loadMore();
    });
  });

  on(els.refresh,'click', ()=>{ clearList(); loadMore(); });
  on(els.moreBtn,'click', loadMore);

  if ('IntersectionObserver' in window && els.sentinel){
    const io = new IntersectionObserver((entries)=>{
      if (entries.some(e=> e.isIntersecting)) loadMore();
    }, { root: null, rootMargin: '800px 0px', threshold: 0 });
    io.observe(els.sentinel);
  }

  renderHotTags(['kuching','food','nature','museum','cafe','viewpoint','sarawak']);

  clearList();
  loadMore();
});


