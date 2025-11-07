// js/post-detail.js — show one post by id from hash "#/posts/:id"
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* utils */
const isArr = v => Array.isArray(v) ? v : [];
const safe  = (v, fb='') => (typeof v === 'string' ? v : fb);
const num   = n => Number(n||0);
const timeAgo = (iso)=>{
  const d = new Date(iso||Date.now());
  const diff = (Date.now()-d.getTime())/1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff/86400)}d`;
  return d.toISOString().slice(0,10);
};

/* els (lazy) */
let els = null;
function collectEls(){
  return {
    page: $('#postDetail'),
    sk:   $('#pdSk'),
    err:  $('#pdErr'),
    body: $('#pdBody'),
    media: $('#pdMedia'),
    title: $('#pdTitle'),
    avatar: $('#pdAvatar'),
    author: $('#pdAuthor'),
    time:  $('#pdTime'),
    views: $('#pdViews'),
    likes: $('#pdLikes'),
    content: $('#pdContent'),
    place: $('#pdPlace'),
    tags:  $('#pdTags'),
    likeBtn: $('#pdLikeBtn'),
    shareBtn: $('#pdShareBtn'),
    backBtn: $('#pdBack'),
    refresh: $('#pdRefresh'),
    retry:   $('#pdRetry'),
  };
}

/* data */
async function fetchPostById(id){
  if (!supabase) return { data:null, error:null };
  const columns = 'id,title,body,tags,photos,videos,cover,place_text,created_at,author,views,likes,status';
  const { data, error } = await supabase
    .from('posts')
    .select(columns)
    .eq('id', id)
    .limit(1)
    .single();
  return { data, error };
}

function buildMediaSlides({ photos=[], videos=[], cover='' }){
  const list = [];
  if (cover) list.push({ kind: 'image', url: cover });
  isArr(photos).forEach(u => list.push({ kind:'image', url:u }));
  isArr(videos).forEach(u => list.push({ kind:'video', url:u }));

  // 去重：避免 cover 與第一張重複
  const seen = new Set();
  return list.filter(x=>{
    const k = `${x.kind}:${x.url}`;
    if (seen.has(k)) return false;
    seen.add(k); return !!x.url;
  });
}

/* render */
function renderPost(p){
  els.body.hidden = false;
  els.err.hidden  = true;
  els.sk.hidden   = true;

  // Title
  els.title.textContent = safe(p.title) || safe(p.place_text) || 'Untitled Post';

  // Meta
  const a = p.author || {};
  if (a.avatar_url){ els.avatar.src = a.avatar_url; els.avatar.alt = a.display_name || 'avatar'; els.avatar.hidden = false; }
  else els.avatar.hidden = true;
  els.author.textContent = a.display_name || 'Anonymous';
  els.time.dateTime = p.created_at || '';
  els.time.textContent = timeAgo(p.created_at);

  // Stats
  if (p.views != null){ els.views.textContent = `${p.views} views`; els.views.hidden = false; } else els.views.hidden = true;
  if (p.likes != null){ els.likes.textContent = `${p.likes} likes`; els.likes.hidden = false; } else els.likes.hidden = true;

  // Content
  els.content.textContent = safe(p.body);

  // Place
  if (p.place_text){
    els.place.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.place_text)}`;
    els.place.textContent = p.place_text;
    els.place.hidden = false;
  }else els.place.hidden = true;

  // Tags
  els.tags.innerHTML = '';
  isArr(p.tags).forEach(t=>{
    const s = document.createElement('span');
    s.className = 'tag'; s.textContent = `#${t}`;
    els.tags.appendChild(s);
  });

  // Media (carousel）
  els.media.innerHTML = '';
  const slides = buildMediaSlides(p);
  if (slides.length === 0){
    const ph = document.createElement('figure');
    ph.style.background = '#e9eef5'; ph.style.aspectRatio='4/5';
    els.media.appendChild(ph);
  } else {
    const figWrap = document.createDocumentFragment();
    slides.forEach((m,i)=>{
      const fg = document.createElement('figure');
      if (m.kind === 'video'){
        const v = document.createElement('video');
        v.src = m.url; v.controls = true; v.playsInline = true;
        fg.appendChild(v);
      }else{
        const img = document.createElement('img');
        img.src = m.url; img.loading='lazy'; img.decoding='async';
        fg.appendChild(img);
      }
      // dots
      const dots = document.createElement('div');
      dots.className = 'pd-dotbar';
      slides.forEach((_,j)=>{
        const d = document.createElement('span');
        d.className = 'pd-dot' + (j===i?' is-on':'');
        dots.appendChild(d);
      });
      fg.appendChild(dots);
      figWrap.appendChild(fg);
    });
    els.media.appendChild(figWrap);
  }
}

/* views +1（可選） */
function getDeviceId(){
  let id = localStorage.getItem('hl.device_id');
  if (!id){ id = (crypto.randomUUID?.() || (Date.now()+Math.random()).toString(36)); localStorage.setItem('hl.device_id', id); }
  return id;
}
async function bumpView(id){
  try{
    await supabase?.rpc?.('posts_inc_view', { p_post_id:id, p_fprint:getDeviceId() });
  }catch(_){}
}

/* like（前端假裝；有需要可換成 DB 寫入） */
function toggleLikeUI(){
  const on = els.likeBtn.classList.toggle('is-on');
  els.likeBtn.textContent = on ? '♥ Liked' : '♡ Like';
}

/* routing */
function parseHash(){
  // 支援 "#/posts/xxx"
  const h = location.hash || '';
  const m = h.match(/^#\/posts\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}
async function showDetailByHash(){
  const id = parseHash();
  if (!id) return;            // 不是詳情路由就不處理

  els = els || collectEls();
  els.page.hidden = false;
  els.body.hidden = true;
  els.err.hidden  = true;
  els.sk.hidden   = false;

  const { data, error } = await fetchPostById(id);
  if (error || !data){
    els.err.hidden = false; els.sk.hidden = true; els.body.hidden = true; return;
  }
  renderPost(data);
  bumpView(id);
}

/* bootstrap */
document.addEventListener('DOMContentLoaded', ()=>{
  els = collectEls();
  if (!els.page) return;

  // 事件
  els.backBtn?.addEventListener('click', ()=> history.back());
  els.refresh?.addEventListener('click', showDetailByHash);
  els.retry?.addEventListener('click', showDetailByHash);
  els.likeBtn?.addEventListener('click', toggleLikeUI);

  // 首次與 hash 變化
  window.addEventListener('hashchange', showDetailByHash);
  showDetailByHash();
});
