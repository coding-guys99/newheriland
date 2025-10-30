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

  // 點 trip 進 overlay：先 alert 代替
  $('#tripList')?.addEventListener('click', (e)=>{
    const card = e.target.closest('.trip-card'); if (!card) return;
    alert('這裡可以開剛剛那種玻璃詳情，顯示這條路線的點');
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  const id = getCuratorId();
  const data = CURATORS[id] || CURATORS['sarawak-foodie'];
  renderCurator(data);
  bindEvents();
});