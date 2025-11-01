// js/experiences.js
// 體驗行程列表 + 加入「我的體驗」

const EXP_STORAGE_KEY = 'hl.my.exps';

// demo 資料：你可以換成從 Supabase 撈的
const EXPERIENCES_DATA = [
  { id: 'exp-001', title: '老街文化走讀', city: 'Kuching', tag: 'culture', time: '2hrs', price: 'RM68' },
  { id: 'exp-002', title: '砂拉越手作雨林蠟染', city: 'Kuching', tag: 'culture', time: '1.5hrs', price: 'RM85' },
  { id: 'exp-003', title: '在地 Kopitiam 美食巡禮', city: 'Sibu', tag: 'food', time: '3hrs', price: 'RM55' },
  { id: 'exp-004', title: '濕地生態半日遊', city: 'Kuching', tag: 'outdoor', time: '4hrs', price: 'RM120' },
  { id: 'exp-005', title: '親子陶土體驗', city: 'Miri', tag: 'family', time: '2hrs', price: 'RM75' }
];

function expLoadMy() {
  try {
    const raw = localStorage.getItem(EXP_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch(e) {
    return [];
  }
}
function expSaveMy(list) {
  try {
    localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(list));
  } catch(e) {}
}

function renderExperiences(filter='all') {
  const wrap = document.getElementById('expList');
  const empty = document.getElementById('expEmpty');
  if (!wrap) return;

  const mine = new Set(expLoadMy());

  const items = EXPERIENCES_DATA.filter(exp => {
    if (filter === 'all') return true;
    return exp.tag === filter;
  });

  wrap.innerHTML = '';

  if (!items.length) {
    empty?.removeAttribute('hidden');
    return;
  } else {
    empty?.setAttribute('hidden','');
  }

  items.forEach(exp => {
    const isSaved = mine.has(exp.id);
    const div = document.createElement('div');
    div.className = 'exp-card';
    div.innerHTML = `
      <div class="exp-main">
        <h3 class="exp-title">${exp.title}</h3>
        <p class="exp-meta">${exp.city} · ${exp.time}</p>
        <p class="exp-price">${exp.price}</p>
      </div>
      <div class="exp-actions">
        <button class="exp-btn-detail" data-id="${exp.id}">詳情</button>
        <button class="exp-btn-save ${isSaved ? 'is-on' : ''}" data-id="${exp.id}">
          ${isSaved ? '已加入' : '＋ 加到我的體驗'}
        </button>
      </div>
    `;
    wrap.appendChild(div);
  });
}

function openExperienceDetail(id) {
  const page = document.getElementById('expDetail');
  const cont = document.getElementById('expContent');
  const item = EXPERIENCES_DATA.find(x => x.id === id);
  if (!page || !cont || !item) return;
  cont.innerHTML = `
    <h2>${item.title}</h2>
    <p>${item.city} · ${item.time} · ${item.price}</p>
    <p>（這裡可以放圖、行程說明、集合地點、注意事項）</p>
    <button id="expDetailAdd" class="exp-btn-primary">加入我的體驗</button>
  `;
  page.hidden = false;
  page.classList.add('active');

  // 詳情裡的加入也要能加
  document.getElementById('expDetailAdd')?.addEventListener('click', ()=>{
    addExperienceToMy(item.id);
  });
}

function closeExperienceDetail() {
  const page = document.getElementById('expDetail');
  if (!page) return;
  page.classList.remove('active');
  page.setAttribute('hidden','');
}

function addExperienceToMy(id) {
  const list = expLoadMy();
  if (!list.includes(id)) {
    list.push(id);
    expSaveMy(list);
  }
  // 重刷主列表（讓按鈕變成已加入）
  renderExperiences(currentFilter);
  // 同時更新「我的體驗」頁
  renderMyExperiences();
  alert('已加入「我的體驗」。');
}

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', ()=>{
  // 初始渲染
  renderExperiences('all');

  // 篩選
  document.querySelectorAll('.filters .chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('.filters .chip').forEach(c=> c.classList.remove('is-on'));
      chip.classList.add('is-on');
      currentFilter = chip.dataset.filter || 'all';
      renderExperiences(currentFilter);
    });
  });

  // 列表代理點擊
  document.getElementById('expList')?.addEventListener('click', (e)=>{
    const t = e.target;
    if (t.matches('.exp-btn-detail')) {
      openExperienceDetail(t.dataset.id);
    }
    if (t.matches('.exp-btn-save')) {
      addExperienceToMy(t.dataset.id);
    }
  });

  // 關閉詳情
  document.getElementById('btnCloseExp')?.addEventListener('click', closeExperienceDetail);

  // 空狀態刷新
  document.getElementById('btnExpRetry')?.addEventListener('click', ()=>{
    renderExperiences(currentFilter);
  });

  // 「我的體驗」頁的按鈕：去體驗行程
  document.getElementById('myExpGoExp')?.addEventListener('click', ()=>{
    if (window.showPage) window.showPage('experiences');
  });

  // 頁面載入的時候也產一次「我的體驗」
  renderMyExperiences();
});


// ====== 「我的體驗」頁面的渲染 ======
function renderMyExperiences() {
  const body = document.getElementById('myExpBody');
  const empty = document.getElementById('myExpEmpty');
  if (!body) return;

  const ids = expLoadMy();
  body.innerHTML = '';

  if (!ids.length) {
    empty?.removeAttribute('hidden');
    return;
  } else {
    empty?.setAttribute('hidden','');
  }

  ids.forEach(id=>{
    const item = EXPERIENCES_DATA.find(x => x.id === id);
    if (!item) return;
    const row = document.createElement('div');
    row.className = 'myexp-row';
    row.innerHTML = `
      <div class="m-title">${item.title}</div>
      <div class="m-meta">${item.city} · ${item.time}</div>
      <button class="m-remove" data-id="${item.id}">移除</button>
    `;
    body.appendChild(row);
  });

  // 刪除
  body.addEventListener('click', (e)=>{
    const t = e.target;
    if (t.matches('.m-remove')) {
      const targetId = t.dataset.id;
      const list = expLoadMy().filter(x => x !== targetId);
      expSaveMy(list);
      renderMyExperiences();
      // 同時讓主列表按鈕恢復
      renderExperiences(currentFilter);
    }
  }, { once: true });
}