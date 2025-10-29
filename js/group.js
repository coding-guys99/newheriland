// group.js — 多人推薦：資料、篩選、清單、詳情

// 小工具
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// 假資料（之後可換成 Supabase）
const GROUPS = [
  {
    id: 'friends-cafe-art',
    title: '三五好友｜咖啡散步 + 市集 + 小展覽',
    city: 'kuching',
    people_min: 3, people_max: 5,
    slot: 'afternoon',         // morning / afternoon / evening / fullday
    budget: '$$',              // $, $$, $$$
    cover: 'https://picsum.photos/800/450?gp1',
    tags: ['friends','walk','indoor'],
    metrics: { favorites: 42, completions: 18 },
    summary: '輕鬆半日散步，適合 3–5 人聊天放鬆。',
    stops: [
      { title:'Old Town Café', note:'集合＋咖啡，預估 45–60 分鐘' },
      { title:'周末小市集',   note:'手作攤位逛逛，預估 60–90 分鐘' },
      { title:'巷弄小展覽',   note:'拍照聊天，預估 30–45 分鐘' },
    ]
  },
  {
    id: 'company-teambuild',
    title: '公司團建｜解謎體驗 + 團體餐',
    city: 'sibu',
    people_min: 6, people_max: 12,
    slot: 'evening',
    budget: '$$',
    cover: 'https://picsum.photos/800/450?gp2',
    tags: ['company','indoor'],
    metrics: { favorites: 28, completions: 21 },
    summary: '2 小時密室解謎，之後一起晚餐交流。',
    stops: [
      { title:'密室逃脫館', note:'分組挑戰，預估 120 分鐘' },
      { title:'預約餐廳',   note:'共食交流，預估 90 分鐘' },
    ]
  },
  {
    id: 'church-youth',
    title: '教會小組｜河畔散策 + 戶外分享',
    city: 'miri',
    people_min: 8, people_max: 15,
    slot: 'morning',
    budget: '$',
    cover: 'https://picsum.photos/800/450?gp3',
    tags: ['church','outdoor'],
    metrics: { favorites: 35, completions: 12 },
    summary: '河邊走走，簡單點心，分享與禱告。',
    stops: [
      { title:'河畔步道', note:'散步＋破冰，預估 60 分鐘' },
      { title:'草地交流', note:'分組分享，預估 45 分鐘' },
      { title:'輕食補給', note:'飲水與點心，預估 30 分鐘' },
    ]
  },
  {
    id: 'couple-full',
    title: '情侶整日｜市區文化 + 景觀日落',
    city: 'kuching',
    people_min: 2, people_max: 2,
    slot: 'fullday',
    budget: '$$$',
    cover: 'https://picsum.photos/800/450?gp4',
    tags: ['couple','scenery'],
    metrics: { favorites: 51, completions: 17 },
    summary: '市區文化散步、藝廊、黃昏景觀餐廳。',
    stops: [
      { title:'文化街散步', note:'傳統點心＋拍照，90 分鐘' },
      { title:'小型藝廊',   note:'展覽＋咖啡，60 分鐘' },
      { title:'景觀晚餐',   note:'看夕陽＋用餐，120 分鐘' },
    ]
  }
];

// 狀態
const state = {
  people: 'any',   // 'any' | '2-3' | '3-5' | '6-10' | '10+'
  slot: 'any',     // 'any' | 'morning' | 'afternoon' | 'evening' | 'fullday'
  budget: 'any',   // 'any' | '$' | '$$' | '$$$'
  city: 'any',     // 'any' | 'kuching' | 'sibu' | 'miri' | 'mukah'
};

// 篩選
function fitsPeople(g){
  if (state.people === 'any') return true;
  const [a,b] = state.people === '10+' ? [10, 999] : state.people.split('-').map(n=>+n);
  return g.people_min <= b && g.people_max >= a;
}
function applyFilter(list){
  return list.filter(g=>{
    if (!fitsPeople(g)) return false;
    if (state.slot   !== 'any' && g.slot   !== state.slot) return false;
    if (state.budget !== 'any' && g.budget !== state.budget) return false;
    if (state.city   !== 'any' && g.city   !== state.city) return false;
    return true;
  });
}

// 排序（MVP 規則）— 完成數*2 + 收藏 + 輕微隨機抖動
function score(g){
  const s = (g.metrics?.completions||0)*2 + (g.metrics?.favorites||0);
  const jitter = Math.random()*0.5;
  return s + jitter;
}

// 清單卡 HTML
function cardHTML(g){
  const quick = (g.stops||[]).slice(0,3).map(s=>`<span class="stop-pill">${s.title}</span>`).join('');
  return `
  <article class="gp-card" aria-label="${g.title}">
    <div class="gp-thumb" style="background-image:url('${g.cover}')"></div>
    <div class="gp-body">
      <h3 class="gp-title">${g.title}</h3>
      <div class="gp-meta">
        <span>👥 ${g.people_min}–${g.people_max} 人</span>
        <span>🕒 ${labelSlot(g.slot)}</span>
        <span>💲 ${g.budget}</span>
        <span>📍 ${cap(g.city)}</span>
      </div>
      <div class="gp-quickstops">${quick}</div>
      <div class="gp-foot">
        <button class="gp-cta" data-id="${g.id}">查看行程</button>
        <span class="gp-stats">❤️ ${g.metrics.favorites}・✅ ${g.metrics.completions}</span>
      </div>
    </div>
  </article>`;
}
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
function labelSlot(k){
  return k==='morning'?'上午' : k==='afternoon'?'下午' : k==='evening'?'晚上' : k==='fullday'?'整日' : '—';
}

// 渲染清單
function renderList(){
  const box = $('#gpList'); const empty = $('#gpEmpty');
  if (!box) return;
  const list = applyFilter([...GROUPS]).sort((a,b)=> score(b)-score(a));
  if (!list.length){
    box.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  box.setAttribute('aria-busy','true');
  box.innerHTML = list.map(cardHTML).join('');
  box.removeAttribute('aria-busy');
}

// 詳情
function openDetail(id){
  const g = GROUPS.find(x=>x.id===id);
  if (!g) return;
  const panel = $('#gpDetail'); const cont = $('#gpContent');
  $('#gpTitle').textContent = '行程詳情';
  const steps = (g.stops||[]).map((s,i)=>`
    <div class="ti">
      <span class="dot" aria-hidden="true"></span>
      <div class="content">
        <div class="title">Step ${i+1}｜${s.title}</div>
        <p class="note">${s.note||''}</p>
      </div>
    </div>
    ${i<g.stops.length-1?'<span class="line" aria-hidden="true"></span>':''}
  `).join('');

  cont.innerHTML = `
    <div class="gp-hero" style="background-image:url('${g.cover}')"></div>
    <h3 class="gp-h1">${g.title}</h3>
    <div class="gp-submeta">
      <span>👥 ${g.people_min}–${g.people_max} 人</span>
      <span>🕒 ${labelSlot(g.slot)}</span>
      <span>💲 ${g.budget}</span>
      <span>📍 ${cap(g.city)}</span>
    </div>
    <p style="margin:.2rem 0 .4rem">${g.summary||''}</p>

    <div class="timeline">${steps}</div>

    <div class="gp-actions">
      <button class="btn" data-fav>收藏</button>
      <button class="btn primary" data-clone>改編到我的行程</button>
    </div>
  `;

  panel.hidden = false;
  panel.classList.add('active');
  document.body.classList.add('no-scroll');

  cont.querySelector('[data-fav]')?.addEventListener('click', ()=>{
    // MVP：先本地提示即可；之後接 Supabase events
    alert('已收藏（示意）');
  });
  cont.querySelector('[data-clone]')?.addEventListener('click', ()=>{
    alert('已複製成我的行程（示意）');
  });
}
function closeDetail(){
  const panel = $('#gpDetail');
  if (!panel) return;
  panel.classList.remove('active');
  panel.setAttribute('hidden','');
  document.body.classList.remove('no-scroll');
}

// 綁定
function bindFilters(){
  // 單選 chips 群組：點誰就誰 is-on，並設 aria-selected
  function makeSingle(selector, onPick){
    $$(selector).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const wrapBtns = $$(selector);
        wrapBtns.forEach(b=>{
          const on = b===btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-selected', on?'true':'false');
        });
        onPick(btn);
        renderList();
      });
    });
  }
  makeSingle('#groupMain [data-people]', (btn)=> state.people = btn.dataset.people);
  makeSingle('#groupMain [data-slot]',   (btn)=> state.slot   = btn.dataset.slot);
  makeSingle('#groupMain [data-budget]', (btn)=> state.budget = btn.dataset.budget);
  makeSingle('#groupMain [data-city]',   (btn)=> state.city   = btn.dataset.city);
}

function bindListActions(){
  $('#gpList')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.gp-cta'); if (!btn) return;
    e.stopPropagation();
    openDetail(btn.dataset.id);
  });
  $('#btnCloseGp')?.addEventListener('click', closeDetail);
  $('#btnGpRetry')?.addEventListener('click', ()=>{
    // 清篩選回預設
    state.people='any'; state.slot='any'; state.budget='any'; state.city='any';
    ['[data-people]','[data-slot]','[data-budget]','[data-city]'].forEach(sel=>{
      const btns = $(`#groupMain ${sel}.is-on`)?.parentElement?.querySelectorAll(sel) || [];
      btns.forEach(b=>{ b.classList.remove('is-on'); b.removeAttribute('aria-selected'); });
    });
    // 重設 chips UI
    ['[data-people="any"]','[data-slot="any"]','[data-budget="any"]','[data-city="any"]'].forEach(q=>{
      const b = $(`#groupMain ${q}`); if (b){ b.classList.add('is-on'); b.setAttribute('aria-selected','true'); }
    });
    renderList();
  });

  // 返回首頁（或history.back）
  $('#btnBackHome')?.addEventListener('click', ()=> location.href='index.html#home');
}

// 啟動
document.addEventListener('DOMContentLoaded', ()=>{
  bindFilters();
  bindListActions();
  renderList();
});