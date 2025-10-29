// featured.js — 渲染精選（含 Supabase 直連 + 假資料 fallback）
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ============== 假資料（可先上線視覺） ============== */
const MOCK = {
  hero: [
    { id:'kch-river', name:'河畔早午餐', note:'河景第一排・必點可頌', img:'https://picsum.photos/1200/675?hero1' },
    { id:'sibu-noodle', name:'道地乾撈麵', note:'在地 40 年老店', img:'https://picsum.photos/1200/675?hero2' },
    { id:'miri-sunset', name:'海邊日落吧', note:'黃昏限定 happy hour', img:'https://picsum.photos/1200/675?hero3' },
  ],
  weekly: [
    { id:'a1', name:'晨光咖啡', sub:'手沖冠軍・早午餐', cover:'https://picsum.photos/600/400?a1', city:'Kuching', rating:4.7, tags:['Brunch','Coffee'] },
    { id:'a2', name:'夜貓拉麵', sub:'宵夜限定・鹽味湯頭', cover:'https://picsum.photos/600/400?a2', city:'Sibu', rating:4.6, tags:['Ramen','Late'] },
    { id:'a3', name:'峇迪手作', sub:'沙勞越圖騰工坊', cover:'https://picsum.photos/600/400?a3', city:'Miri', rating:4.8, tags:['Craft','Gift'] },
    { id:'a4', name:'河岸散步店', sub:'甜點・咖啡', cover:'https://picsum.photos/600/400?a4', city:'Kuching', rating:4.5, tags:['Dessert'] },
  ],
  top: [
    { id:'t1', name:'老宅餐館', sub:'米其林必比登', cover:'https://picsum.photos/400/400?t1', city:'Kuching', rating:4.9, tags:['Local'] },
    { id:'t2', name:'叢林戶外', sub:'半日體驗營', cover:'https://picsum.photos/400/400?t2', city:'Miri', rating:4.8, tags:['Experience'] },
    { id:'t3', name:'河畔音樂吧', sub:'週末 Live', cover:'https://picsum.photos/400/400?t3', city:'Sibu', rating:4.8, tags:['Bar'] },
  ],
  news: [
    { id:'n1', name:'小農早市', sub:'週末限定', cover:'https://picsum.photos/600/400?n1', city:'Mukah', rating:4.4 },
    { id:'n2', name:'城市攝影點', sub:'新開景點', cover:'https://picsum.photos/600/400?n2', city:'Kuching', rating:4.3 },
    { id:'n3', name:'花園甜點', sub:'招牌巴斯克', cover:'https://picsum.photos/600/400?n3', city:'Sibu', rating:4.2 },
    { id:'n4', name:'峇迪體驗', sub:'親子手作', cover:'https://picsum.photos/600/400?n4', city:'Miri', rating:4.1 },
  ],
  city: [
    { id:'kuching', name:'Kuching 合輯', sub:'嚴選 12 間', cover:'https://picsum.photos/600/400?c1' },
    { id:'sibu',    name:'Sibu 合輯',    sub:'嚴選 9 間',  cover:'https://picsum.photos/600/400?c2' },
    { id:'miri',    name:'Miri 合輯',    sub:'嚴選 8 間',  cover:'https://picsum.photos/600/400?c3' },
  ],
};

/* ============== Supabase 查詢（可隨時切換） ============== */
async function fetchFeatured(kind){
  // kind: 'hero' | 'weekly' | 'top' | 'new' | 'city'
  if (!supabase) return null;

  try{
    if (kind === 'weekly'){
      const { data, error } = await supabase
        .from('merchants')
        .select('id,name,cover,images,city_id,rating,tags,editor_note,featured_rank')
        .eq('status','active').eq('featured', true)
        .order('featured_rank', { ascending: true })
        .limit(12);
      if (error) throw error;
      return (data||[]).map(x=>({
        id:x.id, name:x.name, sub:x.editor_note||'', cover: x.cover || (x.images?.[0]||''), city:x.city_id, rating:x.rating || null, tags:x.tags||[]
      }));
    }

    if (kind === 'top'){
      const { data, error } = await supabase
        .rpc('featured_top_hot'); // 建議用 view 或 rpc 預先算好 hot_score
      if (error) throw error;
      return (data||[]).map(x=>({
        id:x.id, name:x.name, sub:x.editor_note||'', cover: x.cover || (x.images?.[0]||''), city:x.city_id, rating:x.rating||null, tags:x.tags||[]
      }));
    }

    if (kind === 'new'){
      const { data, error } = await supabase
        .from('merchants')
        .select('id,name,cover,images,city_id,rating,tags,editor_note,published_at')
        .eq('status','active')
        .gte('published_at', new Date(Date.now()-30*864e5).toISOString())
        .order('published_at', { ascending:false })
        .limit(12);
      if (error) throw error;
      return (data||[]).map(x=>({
        id:x.id, name:x.name, sub:x.editor_note||'新上架', cover:x.cover || (x.images?.[0]||''), city:x.city_id, rating:x.rating||null, tags:x.tags||[]
      }));
    }

    if (kind === 'city'){
      // 這裡示意：各城取 3 家，實務可用 view 聚合
      const { data, error } = await supabase
        .from('merchants')
        .select('id,name,cover,images,city_id,rating')
        .eq('status','active')
        .in('city_id',['kuching','sibu','miri'])
        .order('featured_rank', { ascending:true })
        .limit(9);
      if (error) throw error;
      // 聚合成城市卡（此處簡化）
      return [
        { id:'kuching', name:'Kuching 合輯', sub:`嚴選 ${data.filter(x=>x.city_id==='kuching').length} 間`, cover: data.find(x=>x.city_id==='kuching')?.cover || MOCK.city[0].cover },
        { id:'sibu',    name:'Sibu 合輯',    sub:`嚴選 ${data.filter(x=>x.city_id==='sibu').length} 間`,    cover: data.find(x=>x.city_id==='sibu')?.cover || MOCK.city[1].cover },
        { id:'miri',    name:'Miri 合輯',    sub:`嚴選 ${data.filter(x=>x.city_id==='miri').length} 間`,    cover: data.find(x=>x.city_id==='miri')?.cover || MOCK.city[2].cover },
      ];
    }

    if (kind === 'hero'){
      // 建議用 featured=true 並加 spotlight_until
      const { data, error } = await supabase
        .from('merchants')
        .select('id,name,cover,images,editor_note,spotlight_until')
        .eq('status','active').eq('featured',true)
        .not('spotlight_until','is',null)
        .order('spotlight_until',{ ascending:false })
        .limit(5);
      if (error) throw error;
      if (!data?.length) return null;
      return data.map(x=>({
        id:x.id, name:x.name, note:x.editor_note||'', img:x.cover || (x.images?.[0]||'')
      }));
    }

    return null;
  }catch(e){
    console.warn('[featured] fetch error', kind, e);
    return null;
  }
}

/* ============== Render ============== */
function heroHTML(h){
  return `<a class="hero" href="index.html#detail/${h.id}">
    <img src="${h.img}" alt="">
    <div class="hero-txt">${h.name} · ${h.note||''}</div>
  </a>`;
}
function cardVHTML(m){
  const rating = (m.rating!=null) ? `★ ${Number(m.rating).toFixed(1)}` : '';
  const tags   = (m.tags||[]).slice(0,2).map(t=>`<span class="pill">${t}</span>`).join('');
  return `<article class="card-v" data-id="${m.id}">
    <div class="thumb" style="background-image:url('${m.cover||''}')"></div>
    <div class="body">
      <h3 class="name">${m.name}</h3>
      <div class="sub">${m.sub||''}</div>
      <div class="meta">
        ${rating?`<span class="rate">${rating}</span>`:''}
        ${m.city?`<span>📍 ${m.city}</span>`:''}
      </div>
    </div>
    <div class="foot">
      <button class="btn" data-id="${m.id}">查看詳情</button>
    </div>
  </article>`;
}
function itemHHTML(m){
  const rating = (m.rating!=null) ? `★ ${Number(m.rating).toFixed(1)}` : '';
  return `<article class="item-h" data-id="${m.id}">
    <div class="thumb" style="background-image:url('${m.cover||''}')"></div>
    <div>
      <h3 class="name">${m.name}</h3>
      <div class="sub">${m.sub||''}</div>
      <div class="meta">${rating?`<span>${rating}</span>`:''}${m.city?`<span>📍 ${m.city}</span>`:''}</div>
    </div>
    <button class="btn" data-id="${m.id}">查看詳情</button>
  </article>`;
}
function cityHTML(c){
  return `<a class="city-card" href="index.html#explore?city=${encodeURIComponent(c.id)}">
    <div class="thumb" style="background-image:url('${c.cover||''}')"></div>
    <div class="body">
      <h3 class="name">${c.name}</h3>
      <div class="sub">${c.sub||''}</div>
    </div>
  </a>`;
}

/* ============== 綁定 ============== */
function bindHeroDots(track, dots){
  const update = ()=>{
    const w = track.clientWidth || 1;
    const idx = Math.round(track.scrollLeft / (w*0.8 + 10)); // 80%寬 + gap
    [...dots.children].forEach((b,i)=> b.setAttribute('aria-current', i===idx?'true':'false'));
  };
  track.addEventListener('scroll', ()=> requestAnimationFrame(update));
  update();
}
function bindCardsClicks(root){
  root.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn'); if (!btn) return;
    const id = btn.dataset.id; if (!id) return;
    location.href = `index.html#detail/${id}`;
  });
}

/* ============== 主流程 ============== */
async function renderHero(){
  const track = $('#heroTrack'), dots = $('#heroDots');
  if (!track || !dots) return;
  const data = await fetchFeatured('hero') || MOCK.hero;
  track.innerHTML = data.map(heroHTML).join('');
  dots.innerHTML  = data.map((_,i)=>`<button ${i===0?'aria-current="true"':''}></button>`).join('');
  bindHeroDots(track, dots);
}

async function fillSection(kind, targetId, tmpl){
  const box = $(targetId); if (!box) return;
  const data = await fetchFeatured(kind) || MOCK[kind==='new'?'news':kind] || [];
  if (!data.length){ box.closest('.blk')?.setAttribute('hidden',''); return; }
  if (box.classList.contains('cards')){
    box.innerHTML = data.map(tmpl).join('');
  }else if (box.classList.contains('list')){
    box.innerHTML = data.map(tmpl).join('');
  }else if (box.classList.contains('scroller')){
    box.innerHTML = data.map(tmpl).join('');
  }
  bindCardsClicks(box);
}

function lazyLoadSections(){
  const io = new IntersectionObserver((ents)=>{
    ents.forEach(async ent=>{
      if (!ent.isIntersecting) return;
      const el = ent.target;
      const kind = el.dataset.lazy;
      if (!kind) return;
      io.unobserve(el);
      if (kind==='weekly') await fillSection('weekly', '#row-weekly', cardVHTML);
      if (kind==='top')    await fillSection('top',    '#row-top',    itemHHTML);
      if (kind==='new')    await fillSection('new',    '#row-new',    cardVHTML);
      if (kind==='city')   await fillSection('city',   '#row-city',   cityHTML);
    });
  }, { rootMargin: '120px 0px' });

  $$('#p-featured [data-lazy]').forEach(el => io.observe(el));
}

function bindChips(){
  const chips = $$('#featChips .chip');
  chips.forEach(ch=>{
    ch.addEventListener('click', ()=>{
      chips.forEach(c=> c.classList.toggle('is-on', c===ch));
      const q = ch.dataset.q;
      // 直接滾到對應區塊
      const map = { weekly:'#blk-weekly', top:'#blk-top', new:'#blk-new', value:'#blk-top', date:'#blk-weekly', family:'#blk-weekly', group:'#blk-weekly' };
      const sel = map[q] || '#blk-weekly';
      $(sel)?.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
}

/* ============== 啟動 ============== */
document.addEventListener('DOMContentLoaded', ()=>{
  $('#btnBackHome')?.addEventListener('click', ()=> location.href = 'index.html#home');

  renderHero();
  lazyLoadSections();
  bindChips();
});