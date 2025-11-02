// ===================== Home (Landing) =====================
// 這支要用 <script type="module" src="js/home.js"></script>
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// 可被 window.HOME_DATA 覆蓋（運營可改）
const HOME_DATA = Object.assign({
  features: [
    { ico:'🎁', label:'優惠活動', href:'deals.html' },
    { ico:'📍', label:'城市館',   href:'#explore' },
    { ico:'👥', label:'多人推薦', href:'group.html' },
    { ico:'🛍️', label:'精選店家', href:'featured.html' },
    { ico:'🌿', label:'體驗行程', href:'experiences.html' },
  ],
  // 這裡保留當 fallback
  hero: [
    { img:'https://picsum.photos/1200/600?1', title:'Mid-Autumn Specials', href:'#explore?collection=mid-autumn' },
    { img:'https://picsum.photos/1200/600?2', title:'Sarawak Food Week',   href:'#explore?collection=food' },
    { img:'https://picsum.photos/1200/600?3', title:'Hidden Gems',          href:'#explore?tag=Instagram' },
  ],
  comboLeft: [
    { img:'https://picsum.photos/1200/600?4', title:'Emirates 商務艙抽獎', href:'#explore?event=emirates' },
    { img:'https://picsum.photos/1200/600?5', title:'花草茶季節活動',       href:'#explore?event=teafest' },
  ],
  comboRight: [
    { title:'Dyson 聯名週', sub:'最高送14%',  href:'#explore?brand=dyson' },
    { title:'3M 專區',     sub:'登記送200',  href:'#explore?brand=3m' },
    { title:'花草茶節',    sub:'人氣專題',    href:'#explore?collection=tea' },
    { title:'小農市集',    sub:'本週上新',    href:'#explore?collection=market' },
  ],
  cities: [
    { name:'Kuching 城市探險', img:'https://picsum.photos/800/500?6', href:'#explore?city=kuching' },
    { name:'Sibu 河畔文化',   img:'https://picsum.photos/800/500?7', href:'#explore?city=sibu' },
    { name:'Miri 海邊體驗',   img:'https://picsum.photos/800/500?8', href:'#explore?city=miri' },
    { name:'Mukah 傳統市集', img:'https://picsum.photos/800/500?9', href:'#explore?city=mukah' },
  ],
  ad: { img:'https://picsum.photos/1200/300?10', href:'#explore?ad=mid' },
  collections: ['夜貓人最愛','親子出遊','情侶約會','Team Building','打卡聖地','在地早餐'],
  groups: [
    { name:'三五好友聚會', img:'https://picsum.photos/800/500?11', href:'#explore?theme=friends' },
    { name:'公司團建',   img:'https://picsum.photos/800/500?12', href:'#explore?theme=company' },
    { name:'教會小組',   img:'https://picsum.photos/800/500?13', href:'#explore?theme=church' },
  ],
  spotlight: [
    { name:'@SarawakFoodie',  avatar:'https://i.pravatar.cc/100?img=1', href:'curator.html?id=sarawak-foodie' },
    { name:'@LocalTraveler',  avatar:'https://i.pravatar.cc/100?img=2', href:'curator.html?id=local-traveler' },
    { name:'@TeaMaker',       avatar:'https://i.pravatar.cc/100?img=3', href:'curator.html?id=TeaMaker' },
  ],
  goods: [
    { name:'手作香氛蠟燭', price:'$9.9', href:'#' },
    { name:'乾花小束',     price:'$6.5', href:'#' },
    { name:'手工果乾茶',   price:'$7.2', href:'#' },
    { name:'竹編袋',       price:'$12.0', href:'#' },
  ],
}, window.HOME_DATA || {});

/* -------------------- features 專用：從 Supabase 抓 -------------------- */
async function fetchFeaturesFromSupabase(){
  try {
    const { data, error } = await supabase
      .from('hl_features')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data?.length) return HOME_DATA.features;

    return data.map(f => ({
      ico: f.icon,
      label: f.label,
      href: f.href
    }));
  } catch (err) {
    console.warn('fetchFeaturesFromSupabase failed, use fallback', err);
    return HOME_DATA.features;
  }
}

async function renderFeatures(){
  const box = $('#homeFeatures');
  if(!box) return;

  const features = await fetchFeaturesFromSupabase();

  box.innerHTML = features.map(f =>
    `<a class="feat" href="${f.href}">
       <i>${f.ico}</i><span class="txt">${f.label}</span>
     </a>`).join('');
}
/* -------------------- /features -------------------- */


function renderFeatures(){
  const box = $('#homeFeatures'); if(!box) return;
  box.innerHTML = HOME_DATA.features.map(f =>
    `<a class="feat" href="${f.href}">
      <i>${f.ico}</i><span class="txt">${f.label}</span>
     </a>`).join('');
}

/* -------------------- hero 專用：先去 Supabase 抓 -------------------- */
async function fetchHeroFromSupabase(){
  try {
    const { data, error } = await supabase
      .from('hl_banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data || !data.length) {
      return HOME_DATA.hero; // 沒資料就用原本假資料
    }

    // 把資料轉成前端原本吃的格式
    return data.map(b => {
      // 把 target_type 轉成真正的 href
      let href = '#';
      if (b.target_type === 'url') {
        href = b.target_value || '#';
      } else if (b.target_type === 'city') {
        href = `#explore?city=${encodeURIComponent(b.target_value || '')}`;
      } else if (b.target_type === 'experience') {
        href = `#experience/${b.target_value}`;
      } else if (b.target_type === 'merchant') {
        href = `#merchant/${b.target_value}`;
      }
      return {
        img: b.image_url,
        title: b.title,
        href
      };
    });

  } catch (err) {
    console.warn('fetchHeroFromSupabase failed, use fallback', err);
    return HOME_DATA.hero;
  }
}

async function renderHero(){
  const track = $('#heroTrack'), dots = $('#heroDots'); 
  if(!track || !dots) return;

  // 1) 先去抓真的資料
  const heroData = await fetchHeroFromSupabase();

  // 2) 塞進 DOM
  track.innerHTML = heroData.map(h =>
    `<a class="hero" href="${h.href}" role="listitem">
       <img src="${h.img}" alt="${h.title || ''}">
       <div class="hero-txt">${h.title || ''}</div>
     </a>`).join('');

  dots.innerHTML = heroData.map((_,i)=>
    `<button type="button" ${i===0 ? 'aria-current="true"' : ''} data-idx="${i}"></button>`
  ).join('');

  // 3) 原本的 scroll → dot 邏輯還是保留
  const updateDots = ()=>{
    const w = track.clientWidth || 1;
    const gap = 10;
    const cardW = w * 0.85 + gap;     // 你原本算 85% 的那個
    const idx = Math.round(track.scrollLeft / cardW);
    [...dots.children].forEach((b,i)=> b.setAttribute('aria-current', i===idx ? 'true':'false'));
  };
  track.addEventListener('scroll', ()=> requestAnimationFrame(updateDots));

  // 4) 點 dot 可以跳到對應卡片
  [...dots.children].forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = Number(btn.dataset.idx || 0);
      const w = track.clientWidth || 1;
      const gap = 10;
      const cardW = w * 0.85 + gap;
      track.scrollTo({
        left: i * cardW,
        behavior: 'smooth'
      });
    });
  });
}
/* -------------------- /hero -------------------- */

function renderCombo(){
  const left = $('#comboLeft'), cdots = $('#comboDots'), right = $('#comboRight');
  if(left && cdots){
    left.innerHTML = HOME_DATA.comboLeft.map(s =>
      `<a class="slide" href="${s.href}" role="listitem"><img src="${s.img}" alt=""></a>`
    ).join('');
    cdots.innerHTML = HOME_DATA.comboLeft.map((_,i)=>
      `<button type="button" ${i===0 ? 'aria-current="true"' : ''}></button>`
    ).join('');
    const update = ()=>{
      const w = left.clientWidth || 1;
      const idx = Math.round(left.scrollLeft / (w));
      [...cdots.children].forEach((b,i)=> b.setAttribute('aria-current', i===idx ? 'true':'false'));
    };
    left.addEventListener('scroll', ()=> requestAnimationFrame(update));
  }
  if(right){
    right.innerHTML = HOME_DATA.comboRight.map(r =>
      `<a href="${r.href}">
         <div>${r.title}</div>
         <span class="sub">${r.sub||''}</span>
       </a>`).join('');
  }
}

function renderCities(){
  const row = $('#cityRow'); if(!row) return;
  row.innerHTML = HOME_DATA.cities.map(c =>
    `<a class="card" href="${c.href}">
       <img src="${c.img}" alt=""><div class="ttl">${c.name}</div>
     </a>`).join('');
}

function renderAd(){
  const a = $('#adSlot'); if(!a) return;
  a.href = HOME_DATA.ad.href;
  a.querySelector('img').src = HOME_DATA.ad.img;
}

function renderCollections(){
  const row = $('#colRow'); if(!row) return;
  row.innerHTML = HOME_DATA.collections.map(t =>
    `<a class="tag" href="#explore?collection=${encodeURIComponent(t)}">${t}</a>`
  ).join('');
}

function renderGroups(){
  const row = $('#groupRow'); if(!row) return;
  row.innerHTML = HOME_DATA.groups.map(g =>
    `<a class="card" href="${g.href}">
       <img src="${g.img}" alt=""><div class="ttl">${g.name}</div>
     </a>`).join('');
}

function renderSpotlight(){
  const row = $('#spotlightRow'); if(!row) return;
  row.innerHTML = HOME_DATA.spotlight.map(p =>
    `<a class="avatar" href="${p.href}">
       <img src="${p.avatar}" alt=""><span>${p.name}</span>
     </a>`).join('');
}

function renderGoods(){
  const row = $('#goodsRow'); if(!row) return;
  row.innerHTML = HOME_DATA.goods.map(g =>
    `<a class="goods" href="${g.href}">
      <div class="ph"></div>
      <div class="meta">
        <div class="name">${g.name}</div>
        <div class="price">${g.price}</div>
      </div>
    </a>`).join('');
}

document.addEventListener('DOMContentLoaded', async ()=>{
  if (!document.querySelector('[data-page="home"]')) return;

  // 搜尋只是導向 Explore（之後可換成真正搜尋）
  $('#homeSearchBtn')?.addEventListener('click', ()=> location.hash = '#explore');

  await renderFeatures();
  await renderHero();     // 👈 hero 要等它抓資料
  renderCombo();
  renderCities();
  renderAd();
  renderCollections();
  renderGroups();
  renderSpotlight();
  renderGoods();
});