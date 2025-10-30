// experiences.js — list + filters + detail overlay

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// 假資料（之後換 Supabase experiences 表）
const EXPERIENCES = [
  {
    id: 'sarawak-food-trail',
    title: '古晉在地美食走讀',
    cover: 'https://picsum.photos/640/360?exp1',
    city: 'Kuching',
    tags: ['food','culture'],
    summary: '半日體驗，帶你吃到道地砂拉越風味。',
    highlights: [
      '老師傅麵攤與在地小吃介紹',
      '河岸散步 + 老街故事',
      '可延伸到夜市行程'
    ],
    desc: '這是一條很適合第一次來古晉的輕體驗路線，從早餐開始一路吃到下午茶，不走觀光店，主要以在地人愛去的小店為主。',
    link: '#explore?city=kuching'
  },
  {
    id: 'sibu-handmade',
    title: '詩巫手作藤編下午',
    cover: 'https://picsum.photos/640/360?exp2',
    city: 'Sibu',
    tags: ['handmade','culture'],
    summary: '小班制 4-6 人，適合情侶 / 小組。',
    highlights: [
      '在地老師教你基本編織',
      '現場可加購茶飲',
      '成品可帶走'
    ],
    desc: '藤編工藝是當地很有代表性的手作，課程會從入門開始做一個小托盤或杯墊，難度不高，重點是氛圍很chill。',
    link: '#explore?city=sibu'
  },
  {
    id: 'miri-sunset',
    title: '美里黃昏海邊拍照散步',
    cover: 'https://picsum.photos/640/360?exp3',
    city: 'Miri',
    tags: ['outdoor','photo'],
    summary: '適合 2-8 人同行，可搭配餐廳。',
    highlights: [
      '日落打卡點建議',
      '教你拍 3 種構圖',
      '結束可串到夜市'
    ],
    desc: '如果你是帶朋友來美里，這條超好用，時間落在傍晚，光線漂亮、又不會太熱，拍完去吃海鮮剛剛好。',
    link: '#explore?city=miri'
  },
  {
    id: 'family-weekend',
    title: '親子週末在地農場體驗',
    cover: 'https://picsum.photos/640/360?exp4',
    city: 'Mukah',
    tags: ['family','outdoor'],
    summary: '看動物、做小點心、放電剛剛好。',
    highlights: [
      '小朋友互動區',
      '簡單農事體驗',
      '附建議路線'
    ],
    desc: '給本地家庭或回鄉探親的人一個半天的行程，不用自己查，就照這張表單跑。',
    link: '#explore?city=mukah'
  },
];

// 狀態
const expState = {
  filter: 'all'
};

function filterExperiences(list){
  if (expState.filter === 'all') return list;
  return list.filter(x => x.tags?.includes(expState.filter));
}

function cardHTML(e){
  const firstTag = e.tags?.[0] || '體驗';
  return `
    <article class="exp-card" data-id="${e.id}">
      <div class="exp-thumb" style="background-image:url('${e.cover}')"></div>
      <div class="exp-body">
        <h3 class="exp-title">${e.title}</h3>
        <div class="exp-meta">
          <span>📍 ${e.city}</span>
          <span class="exp-tag">${firstTag}</span>
        </div>
        <p class="exp-summary">${e.summary}</p>
        <div class="exp-foot">
          <span style="font-size:11px;color:#94a3b8;">約 1.5 ~ 3 小時</span>
          <button class="exp-cta" type="button" data-id="${e.id}">看體驗介紹</button>
        </div>
      </div>
    </article>
  `;
}

function renderExpList(){
  const box = $('#expList');
  const empty = $('#expEmpty');
  if (!box) return;

  const list = filterExperiences(EXPERIENCES);
  if (!list.length){
    box.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  box.innerHTML = list.map(cardHTML).join('');
}

function openExpDetail(id){
  const e = EXPERIENCES.find(x => x.id === id);
  if (!e) return;
  const panel = $('#expDetail');
  const cont  = $('#expContent');

  $('#expTitle').textContent = '體驗詳情';

  const tagsHTML = (e.tags||[]).map(t=>`<span class="exp-badge">${t}</span>`).join('');

  const highlightsHTML = (e.highlights||[]).map(h=>`<li>${h}</li>`).join('');

  cont.innerHTML = `
    <div class="exp-hero" style="background-image:url('${e.cover}')"></div>
    <h2 class="exp-title-lg">${e.title}</h2>
    <div class="exp-meta-lg">
      <span class="exp-badge city">📍 ${e.city}</span>
      ${tagsHTML}
      <span>🕒 建議時長 1.5 ~ 3 小時</span>
    </div>
    <p class="exp-desc">${e.desc}</p>
    <p class="exp-section-title">你會做到的：</p>
    <ul class="exp-points">
      ${highlightsHTML}
    </ul>
    <div class="exp-detail-actions">
      <button class="btn" data-exp-share>分享給朋友</button>
      <a class="btn primary" href="${e.link}">去這個城市</a>
    </div>
  `;

  panel.hidden = false;
  panel.classList.add('active');
  document.body.classList.add('no-scroll');

  cont.querySelector('[data-exp-share]')?.addEventListener('click', async ()=>{
    try{
      await navigator.share?.({ title: e.title, text: e.summary, url: location.href });
    }catch(_){}
  });
}

function closeExpDetail(){
  const panel = $('#expDetail');
  if (!panel) return;
  panel.classList.remove('active');
  panel.setAttribute('hidden','');
  document.body.classList.remove('no-scroll');
}

function bindExpUI(){
  // 篩選
  $$('#expMain .filters [data-filter]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('#expMain .filters [data-filter]').forEach(b=>{
        const on = (b===btn);
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on?'true':'false');
      });
      expState.filter = btn.dataset.filter;
      renderExpList();
    });
  });

  // 卡片 CTA
  $('#expList')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.exp-cta'); if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.id;
    if (id) openExpDetail(id);
  });

  // 關閉詳情
  $('#btnCloseExp')?.addEventListener('click', closeExpDetail);

  // 空狀態重新整理
  $('#btnExpRetry')?.addEventListener('click', renderExpList);
}

document.addEventListener('DOMContentLoaded', ()=>{
  // 如果這頁是獨立 html，就會直接跑
  if (document.querySelector('#expMain')){
    bindExpUI();
    renderExpList();
  }
});

// 返回首頁
document.querySelector('#btnBackHome')?.addEventListener('click', ()=>{
  location.href = 'index.html#home';
});

// 開啟設定
document.querySelector('#btnOpenSettings')?.addEventListener('click', ()=>{
  const settings = document.querySelector('#p-settings');
  if(settings){
    settings.hidden = false;
    settings.classList.add('active');
  }
});