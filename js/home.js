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

/* -------------------- features：從 Supabase 抓 -------------------- */
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

/* -------------------- hero：從 Supabase 抓 -------------------- */
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

    return data.map(b => {
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

  const heroData = await fetchHeroFromSupabase();

  track.innerHTML = heroData.map(h =>
    `<a class="hero" href="${h.href}" role="listitem">
       <img src="${h.img}" alt="${h.title || ''}">
       <div class="hero-txt">${h.title || ''}</div>
     </a>`).join('');

  dots.innerHTML = heroData.map((_,i)=>
    `<button type="button" ${i===0 ? 'aria-current="true"' : ''} data-idx="${i}"></button>`
  ).join('');

  const updateDots = ()=>{
    const w = track.clientWidth || 1;
    const gap = 10;
    const cardW = w * 0.85 + gap;
    const idx = Math.round(track.scrollLeft / cardW);
    [...dots.children].forEach((b,i)=> b.setAttribute('aria-current', i===idx ? 'true':'false'));
  };
  track.addEventListener('scroll', ()=> requestAnimationFrame(updateDots));

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

/* -------------------- combo left + right：從 Supabase 抓 -------------------- */
async function fetchComboLeftFromSupabase(){
  try {
    const { data, error } = await supabase
      .from('hl_combo_left')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    if (!data?.length) return HOME_DATA.comboLeft;

    return data.map(row => ({
      img: row.image_url,
      title: row.title || '',
      href: row.href
    }));
  } catch (err) {
    console.warn('fetchComboLeftFromSupabase failed, use fallback', err);
    return HOME_DATA.comboLeft;
  }
}

async function fetchComboRightFromSupabase(){
  try {
    const { data, error } = await supabase
      .from('hl_combo_right')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    if (!data?.length) return HOME_DATA.comboRight;

    return data.map(row => ({
      title: row.title,
      sub: row.subtitle || '',
      href: row.href
    }));
  } catch (err) {
    console.warn('fetchComboRightFromSupabase failed, use fallback', err);
    return HOME_DATA.comboRight;
  }
}

async function renderCombo(){
  const left  = $('#comboLeft');
  const cdots = $('#comboDots');
  const right = $('#comboRight');

  // 左邊輪播（Supabase）
  if (left && cdots) {
    const comboLeft = await fetchComboLeftFromSupabase();

    left.innerHTML = comboLeft.map(s =>
      `<a class="slide" href="${s.href}" role="listitem">
         <img src="${s.img}" alt="${s.title || ''}">
       </a>`
    ).join('');

    cdots.innerHTML = comboLeft.map((_,i)=>
      `<button type="button" ${i===0 ? 'aria-current="true"' : ''} data-idx="${i}"></button>`
    ).join('');

    const update = ()=>{
      const w = left.clientWidth || 1;
      const idx = Math.round(left.scrollLeft / (w));
      [...cdots.children].forEach((b,i)=> b.setAttribute('aria-current', i===idx ? 'true':'false'));
    };
    left.addEventListener('scroll', ()=> requestAnimationFrame(update));

    [...cdots.children].forEach(btn => {
      btn.addEventListener('click', ()=>{
        const i = Number(btn.dataset.idx || 0);
        const w = left.clientWidth || 1;
        left.scrollTo({
          left: i * w,
          behavior: 'smooth'
        });
      });
    });
  }

  // 右邊列表（Supabase）
  if (right) {
    const comboRight = await fetchComboRightFromSupabase();

    right.innerHTML = comboRight.map(r =>
      `<a href="${r.href}">
         <div>${r.title}</div>
         <span class="sub">${r.sub || ''}</span>
       </a>`
    ).join('');
  }
}
/* -------------------- /combo left + right -------------------- */

/* -------------------- cities：從 Supabase 抓 -------------------- */
async function fetchCitiesFromSupabase(){
  try {
    const { data, error } = await supabase
      .from('hl_cities')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data?.length) return HOME_DATA.cities;   // fallback

    return data.map(c => {
      // 有寫 href 就用資料庫的，沒寫就自己拼
      const href = c.href && c.href.trim()
        ? c.href
        : `#explore?city=${encodeURIComponent(c.slug || '')}`;

      return {
        name: c.name,
        img: c.image_url,
        href
      };
    });
  } catch (err) {
    console.warn('fetchCitiesFromSupabase failed, use fallback', err);
    return HOME_DATA.cities;
  }
}

async function renderCities(){
  const row = $('#cityRow');
  if (!row) return;

  const cities = await fetchCitiesFromSupabase();

  row.innerHTML = cities.map(c =>
    `<a class="card" href="${c.href}">
       <img src="${c.img}" alt="${c.name}">
       <div class="ttl">${c.name}</div>
     </a>`
  ).join('');
}
/* -------------------- /cities -------------------- */

/* -------------------- ad：從 Supabase 抓（含檔期） -------------------- */
async function fetchAdFromSupabase(place='home-main'){
  try {
    const { data, error } = await supabase
      .from('hl_ads')
      .select('*')
      .eq('placement', place)
      .eq('is_active', true)
      .lte('starts_at', new Date().toISOString())
      .gte('ends_at', new Date().toISOString())
      .order('sort_order', { ascending: true })
      .limit(1);

    if (error) throw error;
    if (!data?.length) return HOME_DATA.ad; // fallback

    const ad = data[0];
    return {
      img: ad.image_url,
      href: ad.href
    };
  } catch (err) {
    console.warn('fetchAdFromSupabase failed, use fallback', err);
    return HOME_DATA.ad;
  }
}

async function renderAd(){
  const a = $('#adSlot');
  if(!a) return;

  const ad = await fetchAdFromSupabase('home-main');
  a.href = ad.href;
  a.querySelector('img').src = ad.img;
}
/* -------------------- /ad -------------------- */

/* -------------------- collections：從 Supabase 抓 -------------------- */
async function fetchCollectionsFromSupabase(){
  try {
    const { data, error } = await supabase
      .from('hl_collections')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data?.length) {
      // 老資料是純字串，這裡轉成你原本吃的格式
      return HOME_DATA.collections.map(c => ({
        name: c,
        slug: c,  // 沒 slug 就先用字
        icon: ''
      }));
    }

    return data.map(c => ({
      name: c.name,
      slug: c.slug,
      icon: c.icon || ''
    }));
  } catch (err) {
    console.warn('fetchCollectionsFromSupabase failed, use fallback', err);
    return HOME_DATA.collections.map(c => ({
      name: c,
      slug: c,
      icon: ''
    }));
  }
}

async function renderCollections(){
  const row = $('#colRow'); 
  if(!row) return;

  const cols = await fetchCollectionsFromSupabase();

  row.innerHTML = cols.map(c =>
    `<a class="tag" href="#explore?collection=${encodeURIComponent(c.slug)}">
       ${c.icon ? `<span class="ico">${c.icon}</span>` : ''}${c.name}
     </a>`
  ).join('');
}
/* -------------------- /collections -------------------- */

/* -------------------- group themes：從 Supabase 抓 -------------------- */
async function fetchGroupThemesFromSupabase(){
  try {
    const { data, error } = await supabase
      .from('hl_group_themes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data?.length) {
      // fallback：轉你原本的 HOME_DATA.groups
      return HOME_DATA.groups.map(g => ({
        name: g.name,
        img: g.img,
        href: g.href
      }));
    }

    return data.map(g => {
      const href = g.href && g.href.trim()
        ? g.href
        : `#explore?theme=${encodeURIComponent(g.slug)}`;
      return {
        name: g.name,
        img: g.image_url,
        href
      };
    });
  } catch (err) {
    console.warn('fetchGroupThemesFromSupabase failed, use fallback', err);
    return HOME_DATA.groups.map(g => ({
      name: g.name,
      img: g.img,
      href: g.href
    }));
  }
}

async function renderGroups(){
  const row = $('#groupRow'); 
  if (!row) return;

  const groups = await fetchGroupThemesFromSupabase();

  row.innerHTML = groups.map(g =>
    `<a class="card" href="${g.href}">
       <img src="${g.img}" alt="${g.name}">
       <div class="ttl">${g.name}</div>
     </a>`
  ).join('');
}
/* -------------------- /group themes -------------------- */

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

  $('#homeSearchBtn')?.addEventListener('click', ()=> location.hash = '#explore');

  await renderFeatures();
  await renderHero();
  await renderCombo();
  await renderCities();
  await renderAd();
  await renderCollections();
  await renderGroups();
  renderSpotlight();
  renderGoods();
});