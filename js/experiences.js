// js/experiences.js — 體驗行程列表 + 加到我的體驗

(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // 統一的儲存 key
  const LS_MY_EXP = 'hl.user.experiences';

  // demo 體驗資料（你可以之後換成 Supabase）
  const EXP_DEMO = [
    {
      id: 'exp-heritage-walk',
      title: '老街文化走讀',
      city: 'Kuching',
      dur:  '2hrs',
      price:'RM68',
      type: 'culture',
      img:  'img/exp-heritage.jpg'
    },
    {
      id: 'exp-batik-workshop',
      title: '砂拉越手作雨林蠟染',
      city: 'Kuching',
      dur:  '1.5hrs',
      price:'RM85',
      type: 'culture',
      img:  'img/exp-batik.jpg'
    },
    {
      id: 'exp-kopitiam-food',
      title: '在地 Kopitiam 美食巡禮',
      city: 'Sibu',
      dur:  '3hrs',
      price:'RM55',
      type: 'food',
      img:  'img/exp-food.jpg'
    },
    {
      id: 'exp-wetland-tour',
      title: '濕地生態半日遊',
      city: 'Kuching',
      dur:  '4hrs',
      price:'RM120',
      type: 'outdoor',
      img:  'img/exp-wetland.jpg'
    },
    {
      id: 'exp-family-clay',
      title: '親子陶土體驗',
      city: 'Miri',
      dur:  '2hrs',
      price:'RM75',
      type: 'family',
      img:  'img/exp-clay.jpg'
    }
  ];

  /* ---------- 小工具：讀/寫我的體驗 ---------- */
  function loadMyExperiences(){
    try {
      const raw = localStorage.getItem(LS_MY_EXP);
      return raw ? JSON.parse(raw) : [];
    } catch(e){
      return [];
    }
  }
  function saveMyExperiences(list){
    try {
      localStorage.setItem(LS_MY_EXP, JSON.stringify(list));
    } catch(e){}
    // 通知外面（profile.js 會聽這個）
    window.dispatchEvent(new CustomEvent('hl:myExpUpdated', {
      detail: { list }
    }));
  }

  // 把一筆 demo 換成真正要存的精簡物件
  function toMyExp(exp){
    return {
      id:    exp.id,
      title: exp.title,
      city:  exp.city,
      dur:   exp.dur,
      price: exp.price
    };
  }

  /* ---------- 畫清單 ---------- */
  function renderExpList(filter='all'){
    const wrap = $('#expList');
    const empty = $('#expEmpty');
    if (!wrap) return;

    // 目前已加入的，為了把按鈕狀態打開
    const mine = loadMyExperiences();
    const mineIds = new Set(mine.map(x=>x.id));

    const data = EXP_DEMO.filter(exp => {
      if (filter === 'all') return true;
      return exp.type === filter;
    });

    if (!data.length){
      wrap.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    wrap.innerHTML = data.map(exp=>{
      const isAdded = mineIds.has(exp.id);
      return `
      <article class="exp-card has-thumb" data-exp-id="${exp.id}">
        <div class="exp-thumb" style="background-image:url('${exp.img || ''}')"></div>
        <div class="exp-main">
          <h3>${exp.title}</h3>
          <p class="exp-sub">${exp.city} · ${exp.dur}</p>
          <p class="exp-price">${exp.price}</p>
        </div>
        <div class="exp-actions">
          <button class="exp-btn exp-detail-btn" data-exp-detail="${exp.id}">詳情</button>
          <button class="exp-btn exp-add-btn ${isAdded ? 'is-added':''}" data-exp-add="${exp.id}">
            ${isAdded ? '已在我的體驗' : '+ 加到我的體驗'}
          </button>
        </div>
      </article>
      `;
    }).join('');
  }

  /* ---------- 詳情滑出 ---------- */
  function openExpDetail(expId){
    const exp = EXP_DEMO.find(x=>x.id === expId);
    const box = $('#expDetail');
    const cont = $('#expContent');
    if (!exp || !box || !cont) return;
    cont.innerHTML = `
      <div class="exp-detail__hero">
        <div class="exp-detail__cover" style="background-image:url('${exp.img || ''}')"></div>
        <div class="exp-detail__head">
          <h2>${exp.title}</h2>
          <p>${exp.city} · ${exp.dur}</p>
          <p class="exp-detail__price">${exp.price}</p>
        </div>
      </div>
      <div class="exp-detail__body">
        <h3>活動介紹</h3>
        <p>這裡是活動介紹 demo，之後你可以從資料庫帶出真正的說明。</p>
        <h3>備註</h3>
        <p>可客製、可團體。地點：${exp.city}</p>
        <div class="exp-detail-actions">
          <button class="btn" data-exp-add="${exp.id}">加入我的體驗</button>
          <button class="btn primary" id="btnExpContact">聯繫客服</button>
        </div>
      </div>
    `;
    box.hidden = false;
    box.classList.add('is-open');

    // 在詳情裡面的「加入我的體驗」也要能用
    cont.querySelector('[data-exp-add]')?.addEventListener('click', ()=>{
      toggleMyExp(exp.id);
      // 關掉後重新畫列表
      box.classList.remove('is-open');
      box.hidden = true;
      renderExpList(getCurrentFilter());
    });
  }
  function closeExpDetail(){
    const box = $('#expDetail');
    if (!box) return;
    box.classList.remove('is-open');
    box.hidden = true;
  }

  /* ---------- 加入 / 移除 我的體驗 ---------- */
  function toggleMyExp(expId){
    const exp = EXP_DEMO.find(x=>x.id === expId);
    if (!exp) return;

    const mine = loadMyExperiences();
    const i = mine.findIndex(x=>x.id === expId);
    if (i >= 0){
      // 已存在 → 移除
      mine.splice(i,1);
    } else {
      mine.push(toMyExp(exp));
    }
    saveMyExperiences(mine);
  }

  /* ---------- 取得目前 chip 的過濾值 ---------- */
  function getCurrentFilter(){
    const on = document.querySelector('.filters .chip.is-on');
    return on ? on.dataset.filter : 'all';
  }

  /* ---------- 綁事件 ---------- */
  document.addEventListener('DOMContentLoaded', ()=>{
    // 初次畫
    renderExpList();

    // 篩選 chips
    document.querySelectorAll('.filters .chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        document.querySelectorAll('.filters .chip').forEach(c=> c.classList.remove('is-on'));
        chip.classList.add('is-on');
        renderExpList(chip.dataset.filter || 'all');
      });
    });

    // 清單上的事件（代理）
    $('#expList')?.addEventListener('click', (e)=>{
      const btnDetail = e.target.closest('[data-exp-detail]');
      const btnAdd    = e.target.closest('[data-exp-add]');
      if (btnDetail){
        const id = btnDetail.dataset.expDetail;
        openExpDetail(id);
      }
      if (btnAdd){
        const id = btnAdd.dataset.expAdd;
        toggleMyExp(id);
        // 重畫，讓按鈕狀態更新
        renderExpList(getCurrentFilter());
      }
    });

    // 詳情關閉
    $('#btnCloseExp')?.addEventListener('click', closeExpDetail);

    // 最上面的返回 → 回 home
    $('#btnBackHome')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('home');
      closeExpDetail();
    });
  });

})();