// js/experiences.js — 體驗行程列表 + 加入「我的體驗」整合 profile.js 流程

(function(){
  const EXP_KEY = 'hl.myExperiences';
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  /* ======== 假資料（之後可換 Supabase） ======== */
  const EXPERIENCES = [
    { id: 'exp-001', title: '老街文化走讀', city: 'Kuching', tag: 'culture', time: '2hrs', price: 'RM68', cover: 'img/exp1.jpg' },
    { id: 'exp-002', title: '砂拉越手作雨林蠟染', city: 'Kuching', tag: 'culture', time: '1.5hrs', price: 'RM85', cover: 'img/exp2.jpg' },
    { id: 'exp-003', title: '在地 Kopitiam 美食巡禮', city: 'Sibu', tag: 'food', time: '3hrs', price: 'RM55', cover: 'img/exp3.jpg' },
    { id: 'exp-004', title: '濕地生態半日遊', city: 'Kuching', tag: 'outdoor', time: '4hrs', price: 'RM120', cover: 'img/exp4.jpg' },
    { id: 'exp-005', title: '親子陶土體驗', city: 'Miri', tag: 'family', time: '2hrs', price: 'RM75', cover: 'img/exp5.jpg' }
  ];

  /* ======== localStorage I/O ======== */
  function getMy(){
    try { return JSON.parse(localStorage.getItem(EXP_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function setMy(list){
    try { localStorage.setItem(EXP_KEY, JSON.stringify(list)); }
    catch(e){}
    // 通知 profile.js 更新
    window.dispatchEvent(new CustomEvent('hl:myExpChanged'));
  }

  /* ======== 主清單渲染 ======== */
  let currentFilter = 'all';
  function renderExperiences(filter='all'){
    const wrap = $('#expList');
    const empty = $('#expEmpty');
    if (!wrap) return;

    const myList = new Set(getMy());
    const items = EXPERIENCES.filter(x => filter==='all' ? true : x.tag===filter);

    wrap.innerHTML = '';
    if (!items.length){
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    items.forEach(exp=>{
      const isAdded = myList.has(exp.id);
      const card = document.createElement('article');
      card.className = 'exp-card has-thumb';
      card.innerHTML = `
        <div class="exp-thumb" style="background-image:url(${exp.cover || 'img/placeholder.jpg'})"></div>
        <div class="exp-main">
          <h3>${exp.title}</h3>
          <p class="exp-sub">${exp.city} · ${exp.time}</p>
          <p class="exp-price">${exp.price}</p>
        </div>
        <div class="exp-actions">
          <button class="exp-btn exp-detail-btn" data-id="${exp.id}">詳情</button>
          <button class="exp-btn exp-add-btn ${isAdded?'is-added':''}" data-add="${exp.id}">
            ${isAdded ? '已加入' : '＋ 加入'}
          </button>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  /* ======== 詳情 Overlay ======== */
  function openDetail(id){
    const page = $('#expDetail');
    const cont = $('#expContent');
    const item = EXPERIENCES.find(x=>x.id===id);
    if (!page || !cont || !item) return;

    const myList = new Set(getMy());
    const isAdded = myList.has(item.id);

    cont.innerHTML = `
      <div class="exp-detail__hero">
        <div class="exp-detail__cover" style="background-image:url(${item.cover || 'img/placeholder.jpg'})"></div>
        <div class="exp-detail__head">
          <h2>${item.title}</h2>
          <p>${item.city} · ${item.time}</p>
          <div class="exp-detail__price">${item.price}</div>
        </div>
      </div>
      <div class="exp-detail__body">
        <h3>體驗介紹</h3>
        <p>（這裡可放行程介紹、集合地點、注意事項...）</p>
      </div>
      <button id="btnExpAddFromDetail" data-add="${item.id}" ${isAdded ? 'disabled' : ''}>
        ${isAdded ? '已加入我的體驗' : '＋ 加入我的體驗'}
      </button>
    `;
    page.hidden = false;
    page.classList.add('is-open');
  }

  function closeDetail(){
    const page = $('#expDetail');
    if (!page) return;
    page.classList.remove('is-open');
    page.hidden = true;
  }

  /* ======== 新增 / 移除 ======== */
  function addToMy(id){
    const list = getMy();
    if (!list.includes(id)){
      list.push(id);
      setMy(list);
    }
    renderExperiences(currentFilter);
    alert('已加入「我的體驗」。');
  }

  /* ======== 綁定事件 ======== */
  document.addEventListener('DOMContentLoaded', ()=>{
    // 初始
    renderExperiences('all');

    // 篩選
    $$('.filters .chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        $$('.filters .chip').forEach(c=>c.classList.remove('is-on'));
        chip.classList.add('is-on');
        currentFilter = chip.dataset.filter || 'all';
        renderExperiences(currentFilter);
      });
    });

    // 列表代理：詳情 / 加入
    $('#expList')?.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.id) openDetail(btn.dataset.id);
      if (btn.dataset.add) addToMy(btn.dataset.add);
    });

    // 詳情關閉
    $('#btnCloseExp')?.addEventListener('click', closeDetail);

    // 詳情內「加入我的體驗」
    document.body.addEventListener('click', (e)=>{
      const btn = e.target.closest('#btnExpAddFromDetail');
      if (!btn) return;
      const id = btn.dataset.add;
      addToMy(id);
      btn.textContent = '已加入我的體驗';
      btn.disabled = true;
    });

    // 空狀態重整
    $('#btnExpRetry')?.addEventListener('click', ()=> renderExperiences(currentFilter));

    // Profile 頁的「去看體驗」
    $('#myExpGoExp')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('experiences');
    });
  });

})();