// js/experiences.js — Home / Explore 的「體驗行程」頁

// 假資料（之後你要接 Supabase 再換掉這裡）
const HL_EXPERIENCES = [
  {
    id: 'exp-1',
    title: '老街文化走讀',
    city: 'Kuching',
    dur: '2hrs',
    price: 'RM68',
    cat: 'culture',
    desc: '跟著在地導覽員走一圈老城區，認識華人、馬來與原住民文化的交會。'
  },
  {
    id: 'exp-2',
    title: '砂拉越手作雨林蠟染',
    city: 'Kuching',
    dur: '1.5hrs',
    price: 'RM85',
    cat: 'culture',
    desc: '體驗傳統蠟染工藝，完成一塊可以帶回家的作品。'
  },
  {
    id: 'exp-3',
    title: '在地 Kopitiam 美食巡禮',
    city: 'Sibu',
    dur: '3hrs',
    price: 'RM55',
    cat: 'food',
    desc: '一次吃完幾家在地人會去的 Kopitiam，配在地飲品。'
  },
  {
    id: 'exp-4',
    title: '濕地生態半日遊',
    city: 'Kuching',
    dur: '4hrs',
    price: 'RM120',
    cat: 'outdoor',
    desc: '進入濕地保護區，看猴子、鳥類，適合親子。'
  },
  {
    id: 'exp-5',
    title: '親子陶土體驗',
    city: 'Miri',
    dur: '2hrs',
    price: 'RM75',
    cat: 'family',
    desc: '親子一起做陶，老師會幫忙燒製。'
  }
];

// 小工具：存「我的體驗」
function getMyExperiences() {
  try {
    return JSON.parse(localStorage.getItem('hl.my.exps') || '[]');
  } catch(e){
    return [];
  }
}
function saveMyExperiences(arr) {
  try {
    localStorage.setItem('hl.my.exps', JSON.stringify(arr));
  } catch(e){}
}

// 渲染清單
function renderExperiences(filter = 'all') {
  const box = document.getElementById('expList');
  const empty = document.getElementById('expEmpty');
  if (!box) return;

  const list = HL_EXPERIENCES.filter(exp => {
    if (filter === 'all') return true;
    return exp.cat === filter;
  });

  if (!list.length) {
    box.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  const myExpIds = getMyExperiences();

  box.innerHTML = list.map(exp => {
    const isAdded = myExpIds.includes(exp.id);
    return `
      <article class="exp-card" data-id="${exp.id}">
        <div class="exp-meta">
          <h3 class="exp-t">${exp.title}</h3>
          <p class="exp-sub">${exp.city} · ${exp.dur}</p>
          <p class="exp-price">${exp.price}</p>
        </div>
        <div class="exp-actions">
          <button type="button"
                  class="exp-btn exp-detail-btn"
                  data-id="${exp.id}">詳情</button>
          <button type="button"
                  class="exp-btn exp-add-btn ${isAdded ? 'is-added' : ''}"
                  data-id="${exp.id}">
            ${isAdded ? '已加入' : '+ 加到我的體驗'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function openExperienceDetail(id){
  const data = HL_EXPERIENCES.find(x => x.id === id);
  if (!data) return;
  const sheet = document.getElementById('expDetail');
  const body  = document.getElementById('expContent');
  if (!sheet || !body) return;

  body.innerHTML = `
    <div class="exp-detail__hero">
      <h2>${data.title}</h2>
      <p>${data.city} · ${data.dur}</p>
      <p class="exp-detail__price">${data.price}</p>
    </div>
    <div class="exp-detail__body">
      <p>${data.desc || '這個行程還沒有詳細說明。'}</p>
    </div>
  `;

  sheet.hidden = false;
  requestAnimationFrame(()=> {
    sheet.classList.add('is-open');
  });
}

function closeExperienceDetail(){
  const sheet = document.getElementById('expDetail');
  if (!sheet) return;
  sheet.classList.remove('is-open');
  // transition 結束再隱藏
  setTimeout(()=> {
    sheet.hidden = true;
  }, 200);
}

function bindExpPage(){
  const backBtn = document.getElementById('btnBackHome');
  if (backBtn){
    backBtn.addEventListener('click', ()=>{
      // 你有自己的 router 就用它
      if (window.showPage){
        window.showPage('home');
      } else {
        // 沒有的話就退回上一頁
        history.back();
      }
    });
  }

  // 篩選 chips
  document.querySelectorAll('.filters .chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('.filters .chip').forEach(c=> c.classList.remove('is-on'));
      chip.classList.add('is-on');
      const filter = chip.dataset.filter || 'all';
      renderExperiences(filter);
    });
  });

  // list 掛事件代理：詳情 / 加入
  const list = document.getElementById('expList');
  if (list){
    list.addEventListener('click', (e)=>{
      const detailBtn = e.target.closest('.exp-detail-btn');
      const addBtn    = e.target.closest('.exp-add-btn');

      // 詳情
      if (detailBtn){
        const id = detailBtn.dataset.id;
        openExperienceDetail(id);
        return;
      }

      // 加入我的體驗
      if (addBtn){
        const id = addBtn.dataset.id;
        const mine = getMyExperiences();
        if (!mine.includes(id)){
          mine.push(id);
          saveMyExperiences(mine);
          addBtn.classList.add('is-added');
          addBtn.textContent = '已加入';
        } else {
          // 可做成取消，這裡先不刪除
        }
        return;
      }
    });
  }

  // 詳情裡的返回
  const closeBtn = document.getElementById('btnCloseExp');
  if (closeBtn){
    closeBtn.addEventListener('click', closeExperienceDetail);
  }
  // 點背景也可以關（如果你想）
  const detail = document.getElementById('expDetail');
  if (detail){
    detail.addEventListener('click', (e)=>{
      if (e.target === detail){
        closeExperienceDetail();
      }
    });
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', ()=>{
  // 只有這頁存在時才跑
  if (document.getElementById('expList')){
    renderExperiences('all');
    bindExpPage();
  }
});