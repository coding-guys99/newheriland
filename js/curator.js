// js/curator.js

// ====== 小工具 ======
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ====== 假資料（之後可改成 supabase.from('curators').select(...) ）======
const CURATORS = {
  "sarawak-foodie": {
    id: "sarawak-foodie",
    name: "Sarawak Foodie",
    handle: "@SarawakFoodie",
    avatar: "https://picsum.photos/200?foodie",
    tagline: "砂拉越吃貨帶你走進巷子裡的味道",
    stats: { trips: 8, places: 26, saves: 143 },
    trips: [
      {
        id: "kch-weekend-01",
        title: "Kuching 老街吃到飽",
        cover: "https://picsum.photos/600/360?kch1",
        count: 5,
        city: "Kuching"
      },
      {
        id: "seafood-sibu",
        title: "Sibu 海鮮半日遊",
        cover: "https://picsum.photos/600/360?sib1",
        count: 3,
        city: "Sibu"
      }
    ],
    places: [
      { name: "阿貓貓 Laksa",      city: "Kuching" },
      { name: "河畔早餐 Kolo Mee", city: "Kuching" },
      { name: "民宿小院",          city: "Sibu" }
    ],
    videos: [
      { id:"v1", thumb:"https://picsum.photos/640/360?v=1", title:"Kuching 1-day" },
      { id:"v2", thumb:"https://picsum.photos/640/360?v=2", title:"Best Laksa" }
    ]
  },

  "local-traveler": {
    id: "local-traveler",
    name: "Local Traveler",
    handle: "@LocalTraveler",
    avatar: "https://picsum.photos/200?trav",
    tagline: "週末帶朋友亂跑的在地路線",
    stats: { trips: 5, places: 12, saves: 88 },
    trips: [
      {
        id: "sibu-river",
        title: "Sibu 河畔散步",
        cover: "https://picsum.photos/600/360?sibu",
        count: 4,
        city: "Sibu"
      }
    ],
    places: [
      { name: "河景咖啡",   city: "Sibu" },
      { name: "港式茶餐室", city: "Sibu" }
    ],
    videos: []
  }
};

// ====== 讀 URL ?id= ======
function getCuratorId(){
  const url = new URL(location.href);
  // 預設給你 sarawak-foodie
  return url.searchParams.get('id') || 'sarawak-foodie';
}

// ====== 畫頁面 ======
function renderCurator(c){
  // header
  $('#curatorName').textContent   = c.name;
  $('#curatorAvatar').src         = c.avatar;
  $('#curatorDisplay').textContent= c.name;
  $('#curatorTagline').textContent= c.tagline;

  // stats
  $('#statTrips').textContent   = c.stats.trips;
  $('#statPlaces').textContent  = c.stats.places;
  $('#statSaves').textContent   = c.stats.saves;

  // 精選策展（trips）
  const tripBox = $('#tripList');
  tripBox.innerHTML = c.trips?.length
    ? c.trips.map(t => `
        <article class="trip-card" data-trip="${t.id}">
          <div class="trip-thumb" style="background-image:url('${t.cover}')"></div>
          <div class="trip-body">
            <h3 class="trip-title">${t.title}</h3>
            <p class="trip-meta">${t.city} · ${t.count} 個點</p>
          </div>
        </article>
      `).join('')
    : `<p style="color:#94a3b8;font-size:13px;">尚未建立策展</p>`;

  // 他推薦的店家
  const placeBox = $('#placeList');
  placeBox.innerHTML = c.places?.length
    ? c.places.map(p=>`
        <article class="place-card">
          <h3 class="place-title">${p.name}</h3>
          <p class="place-city">${p.city}</p>
        </article>
      `).join('')
    : `<p style="color:#94a3b8;font-size:13px;">暫無推薦店家</p>`;

  // 最近影音
  const videoBox = $('#videoList');
  videoBox.innerHTML = c.videos?.length
    ? c.videos.map(v=>`
        <figure class="video-card" data-video="${v.id}" style="background-image:url('${v.thumb}')">
        </figure>
      `).join('')
    : `<p style="color:#94a3b8;font-size:13px;">暫無影音</p>`;
}

// ====== 綁事件 ======
function bindEvents(){
  // 返回
  $('#btnBack')?.addEventListener('click', ()=>{
    if (history.length > 1) history.back();
    else location.href = 'index.html#home';
  });

  // 分享這個策展人
  $('#btnShare')?.addEventListener('click', async ()=>{
    const id = getCuratorId();
    try{
      await navigator.share?.({
        title: 'HeriLand 在地策展',
        text: '看看這個在地人整理的路線',
        url: location.origin + location.pathname + '?id=' + id
      });
    }catch(_){}
  });

  // 點「精選策展」→ 打開文章流 overlay
  $('#tripList')?.addEventListener('click', (e)=>{
    const card = e.target.closest('.trip-card');
    if (!card) return;

    const tripId    = card.dataset.trip;
    const curatorId = getCuratorId();
    const curator   = CURATORS[curatorId] || CURATORS['sarawak-foodie'];

    // 從當前策展人裡找這一篇策展
    const tripData = curator.trips?.find(t => t.id === tripId);
    if (!tripData) {
      console.warn('trip not found:', tripId);
      return;
    }

    // 組成「文章型」資料，給 curation.js 用
    const articleData = {
      id: tripData.id,
      hero: tripData.cover,
      title: tripData.title,
      author: curator.name,
      authorAvatar: curator.avatar,
      city: tripData.city,
      date: new Date().toISOString().slice(0,10),
      intro: `${curator.name} 推的 ${tripData.city} 路線，這篇是示意。`,
      // 這是「文章流」：H 標題、段落、文中店家
      blocks: [
        { type: 'h2', text: '怎麼逛' },
        {
          type: 'p',
          text: '先從老街開始，拍完再往河邊走，如果遇到下雨就換室內咖啡館。'
        },
        {
          type: 'place-inline',
          placeId: 'demo-place-1',
          name: '街口咖啡 Kok Pi',
          city: tripData.city,
          note: '這家是他特別寫的 → 點了就去 detail'
        },
        {
          type: 'p',
          text: '如果你是帶外地朋友，這段可以跟晚餐換一下，時間比較彈性。'
        },
        {
          type: 'tip',
          text: '周末人比較多，建議 16:00 前到河邊，就可以拍到比較乾淨的畫面。'
        }
      ]
    };

    // 真正打開 overlay
    if (window.openCuration) {
      window.openCuration(articleData);
    } else {
      console.warn('curation.js 還沒載到，請確認載入順序');
    }
  });

  // 影音的點擊你之後要接 video player 的話也可以在這裡綁
  $('#videoList')?.addEventListener('click', (e)=>{
    const v = e.target.closest('.video-card');
    if (!v) return;
    alert('之後這裡開你的影片播放器：' + v.dataset.video);
  });
}

// ====== 啟動 ======
document.addEventListener('DOMContentLoaded', ()=>{
  const id   = getCuratorId();
  const data = CURATORS[id] || CURATORS['sarawak-foodie'];
  renderCurator(data);
  bindEvents();
});