// js/curator.js

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// 假資料：之後換成 supabase from('curators').select(...)
const CURATORS = {
  "sarawak-foodie": {
    id: "sarawak-foodie",
    name: "Sarawak Foodie",
    handle: "@SarawakFoodie",
    avatar: "https://picsum.photos/200?foodie",
    tagline: "砂拉越吃貨帶你走進巷子裡的味道",
    stats: { trips: 8, places: 26, saves: 143 },
    trips: [
      { id:"kch-street-food", title:"Kuching 老街吃到飽", cover:"https://picsum.photos/600/360?kch1", count:5, city:"Kuching" },
      { id:"seafood-sibu", title:"Sibu 海鮮半日遊", cover:"https://picsum.photos/600/360?sib1", count:3, city:"Sibu" }
    ],
    places: [
      { name:"阿貓貓 Laksa", city:"Kuching" },
      { name:"河畔早餐 Kolo Mee", city:"Kuching" },
      { name:"民宿小院", city:"Sibu" },
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
      { id:"sibu-river", title:"Sibu 河畔散步", cover:"https://picsum.photos/600/360?sibu", count:4, city:"Sibu" },
    ],
    places: [
      { name:"河景咖啡", city:"Sibu" },
      { name:"港式茶餐室", city:"Sibu" }
    ],
    videos: []
  }
};

// 讀 URL ?id=
function getCuratorId(){
  const url = new URL(location.href);
  return url.searchParams.get('id') || 'sarawak-foodie';
}

function renderCurator(c){
  // top
  $('#curatorName').textContent = c.name;
  $('#curatorAvatar').src = c.avatar;
  $('#curatorDisplay').textContent = c.name;
  $('#curatorTagline').textContent = c.tagline;
  $('#statTrips').textContent  = c.stats.trips;
  $('#statPlaces').textContent = c.stats.places;
  $('#statSaves').textContent  = c.stats.saves;

  // trips
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

  // places
  const placeBox = $('#placeList');
  placeBox.innerHTML = c.places?.length
    ? c.places.map(p=>`
        <article class="place-card">
          <h3 class="place-title">${p.name}</h3>
          <p class="place-city">${p.city}</p>
        </article>
      `).join('')
    : `<p style="color:#94a3b8;font-size:13px;">暫無推薦店家</p>`;

  // videos
  const videoBox = $('#videoList');
  videoBox.innerHTML = c.videos?.length
    ? c.videos.map(v=>`
        <figure class="video-card" data-video="${v.id}" style="background-image:url('${v.thumb}')">
        </figure>
      `).join('')
    : `<p style="color:#94a3b8;font-size:13px;">暫無影音</p>`;
}

function bindEvents(){
  $('#btnBack')?.addEventListener('click', ()=>{
    // 回上一頁，如果沒上一頁就回首頁
    if (history.length > 1) history.back();
    else location.href = 'index.html#home';
  });

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

  $('#tripList')?.addEventListener('click', (e)=>{
  const card = e.target.closest('.trip-card'); 
  if (!card) return;

  const tripId = card.dataset.trip;   // 例如 "kch-street-food"

  // 1) 先從目前這個 curator 的資料裡把這篇 trip 找出來
  const curatorId = getCuratorId();
  const curator = CURATORS[curatorId] || CURATORS['sarawak-foodie'];
  const tripData = curator.trips.find(t => t.id === tripId);

  // 2) 組成「文章型」的資料，丟給 curation.js
  // 這裡我先硬塞一個簡單版，之後你可以真的從 supabase 抓回來再塞
  const richData = {
    id: tripData.id,
    hero: tripData.cover,
    title: tripData.title,
    author: curator.name,
    authorAvatar: curator.avatar,
    city: tripData.city,
    date: new Date().toISOString().slice(0,10),
    intro: `${curator.name} 推的 ${tripData.city} 路線，這篇是示意。`,
    blocks: [
      {
        type: 'text',
        title: '怎麼逛',
        body: '先從老街開始，拍完再往河邊走，如果遇到下雨就換室內咖啡館。'
      },
      {
        type: 'place',
        placeId: 'demo-place-1',
        name: '街口咖啡 Kok Pi',
        city: tripData.city,
        thumb: 'https://picsum.photos/200/200?coffee',
        note: '這家是他特別寫的 → 點了就去 detail'
      }
    ]
  };

  // 3) 真正開啟 overlay
  if (window.openCuration) {
    window.openCuration(richData);
  } else {
    console.warn('curation.js 還沒載到');
  }
});
}

document.addEventListener('DOMContentLoaded', ()=>{
  const id = getCuratorId();
  const data = CURATORS[id] || CURATORS['sarawak-foodie'];
  renderCurator(data);
  bindEvents();
});