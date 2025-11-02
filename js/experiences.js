// js/experiences.js — 體驗行程列表 + 加入/移除「我的體驗」
(function(){
  const EXP_KEY = 'hl.myExperiences';
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  // ===== 假資料（跟 trips.js 同一份） =====
  const EXPERIENCES = [
    {
      id: 'exp-001',
      title: '古晉老街文化走讀',
      city: 'Kuching',
      tag: 'culture',
      tagLabel: '文化走讀',
      time: '2hrs',
      price: 'RM68',
      shortDesc: '跟著導覽老師漫步老城區，聽建築與人文故事。',
      detail: '走訪古晉的老街與河岸區...',
      includes: ['專業導覽解說', '老街地圖一份', '當地咖啡體驗券'],
      meetup: '古晉 Waterfront 觀景塔前集合（08:30）',
      notice: '行程需步行約 2 公里...',
      cover: 'img/exp1.jpg'
    },
    {
      id: 'exp-002',
      title: '雨林蠟染手作體驗',
      city: 'Kuching',
      tag: 'culture',
      tagLabel: '手作體驗',
      time: '1.5hrs',
      price: 'RM85',
      shortDesc: '體驗傳統蠟染藝術...',
      detail: '在當地藝術家的帶領下...',
      includes: ['蠟染材料包', '作品收納袋', '指導老師費用'],
      meetup: 'Kuching Art Space（Green Hill 區）',
      notice: '染料容易沾衣...',
      cover: 'img/exp2.jpg'
    },
    {
      id: 'exp-003',
      title: 'Sibu Kopitiam 美食巡禮',
      city: 'Sibu',
      tag: 'food',
      tagLabel: '在地美食',
      time: '3hrs',
      price: 'RM55',
      shortDesc: '一次造訪三間人氣咖啡店...',
      detail: '由美食嚮導帶路...',
      includes: ['三家咖啡店餐點', '導覽講解', '飲品體驗'],
      meetup: 'Sibu Central Market 正門集合（09:00）',
      notice: '餐點包含雞蛋與奶製品...',
      cover: 'img/exp3.jpg'
    },
    {
      id: 'exp-004',
      title: '濕地生態半日遊',
      city: 'Kuching',
      tag: 'outdoor',
      tagLabel: '戶外體驗',
      time: '4hrs',
      price: 'RM120',
      shortDesc: '搭乘觀光船深入濕地...',
      detail: '由當地生態導覽帶領...',
      includes: ['觀光船票', '導覽解說', '飲用水一瓶'],
      meetup: 'Kuching Wetland Park 遊客中心（07:30）',
      notice: '行程受潮汐影響...',
      cover: 'img/exp4.jpg'
    },
    {
      id: 'exp-005',
      title: '親子陶土手作坊',
      city: 'Miri',
      tag: 'family',
      tagLabel: '親子友善',
      time: '2hrs',
      price: 'RM75',
      shortDesc: '和孩子一起動手玩陶...',
      detail: '在工作坊老師指導下...',
      includes: ['陶土材料', '師資指導', '燒製與寄送服務'],
      meetup: 'Miri Clay Studio（市區工坊）',
      notice: '每組最多 3 人...',
      cover: 'img/exp5.jpg'
    }
  ];

  // ===== localStorage =====
  function getMy(){
    try { return JSON.parse(localStorage.getItem(EXP_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function setMy(list){
    try { localStorage.setItem(EXP_KEY, JSON.stringify(list)); }
    catch(e){}
    // 通知「我的體驗」頁重畫
    window.dispatchEvent(new CustomEvent('hl:myExpChanged'));
  }

  let currentFilter = 'all';

  // ===== 列表渲染 =====
  function renderExperiences(filter='all'){
    const wrap  = document.getElementById('expList');
    const empty = document.getElementById('expEmpty');
    if (!wrap) return;

    const mine  = new Set(getMy());
    const items = EXPERIENCES.filter(x => filter === 'all' ? true : x.tag === filter);

    wrap.innerHTML = '';

    if (!items.length){
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    items.forEach(exp=>{
      const isAdded = mine.has(exp.id);
      const card = document.createElement('article');
      card.className = 'exp-card has-thumb';
      card.innerHTML = `
        <div class="exp-thumb" style="background-image:url(${exp.cover || 'img/placeholder.jpg'})"></div>
        <div class="exp-main">
          <div class="exp-tagline">
            <span class="exp-pill">${exp.tagLabel || exp.tag || '體驗'}</span>
            <span class="exp-meta">${exp.city} · ${exp.time}</span>
          </div>
          <h3>${exp.title}</h3>
          <p class="exp-short">${exp.shortDesc || ''}</p>
          <p class="exp-price">${exp.price}</p>
        </div>
        <div class="exp-actions">
          <button class="exp-btn exp-detail-btn" data-id="${exp.id}">詳情</button>
          <button class="exp-btn exp-add-btn ${isAdded ? 'is-added' : ''}" data-add="${exp.id}">
            ${isAdded ? '已加入（點可移除）' : '＋ 加入'}
          </button>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  // ===== 詳情 =====
  function openDetail(id){
    const page = document.getElementById('expDetail');
    const cont = document.getElementById('expContent');
    const item = EXPERIENCES.find(x => x.id === id);
    if (!page || !cont || !item) return;

    const mine   = new Set(getMy());
    const isMine = mine.has(item.id);

    cont.innerHTML = `
      <div class="exp-detail__hero">
        <div class="exp-detail__cover" style="background-image:url(${item.cover || 'img/placeholder.jpg'})"></div>
        <div class="exp-detail__head">
          <h2>${item.title}</h2>
          <p class="exp-detail__meta">${item.city} · ${item.time} · <strong>${item.price}</strong></p>
          <p class="exp-detail__short">${item.shortDesc || '這個體驗還沒有補上描述。'}</p>
        </div>
      </div>
      <div class="exp-detail__body">
        <h3>體驗介紹</h3>
        <p>${item.detail || '體驗內容待補，請以實際活動為準。'}</p>

        <div class="exp-detail__group">
          <h4>活動包含</h4>
          <ul class="exp-detail__list">
            ${(item.includes || ['導覽服務','當地嚮導']).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        <div class="exp-detail__group">
          <h4>集合地點</h4>
          <p>${item.meetup || '活動前一日會另行通知集合點。'}</p>
        </div>

        <div class="exp-detail__group">
          <h4>注意事項</h4>
          <p>${item.notice || '請穿著輕便服裝，攜帶飲水與防曬用品。'}</p>
        </div>
      </div>
      <button id="btnExpAddFromDetail"
              data-add="${item.id}"
              class="${isMine ? 'is-added' : ''}"
              ${isMine ? 'disabled' : ''}>
        ${isMine ? '已加入我的體驗' : '＋ 加入我的體驗'}
      </button>
    `;

    page.hidden = false;
    page.classList.add('is-open');
    page.style.display = 'block';
  }

  function closeDetail(){
    const page = document.getElementById('expDetail');
    if (!page) return;
    page.classList.remove('is-open');
    page.hidden = true;
    page.style.display = 'none';
  }

  // ===== 新增/移除 =====
  function toggleMy(id){
    const list = getMy();
    const idx  = list.indexOf(id);
    let added = false;

    if (idx === -1){
      list.push(id);
      added = true;
    } else {
      list.splice(idx,1);
    }
    setMy(list);
    renderExperiences(currentFilter);

    // 詳情頁同步
    const detailBtn = document.getElementById('btnExpAddFromDetail');
    if (detailBtn && detailBtn.dataset.add === id){
      const mine = new Set(getMy());
      const isAdded = mine.has(id);
      detailBtn.textContent = isAdded ? '已加入我的體驗' : '＋ 加入我的體驗';
      detailBtn.disabled = isAdded;
    }

    // 可選：提醒
    // alert(added ? '已加入「我的體驗」。' : '已從「我的體驗」移除。');
  }

  // ===== 返回處理 =====
  function goBackFromExperiences(){
    if (typeof window.showPage === 'function') {
      window.showPage('home');
    } else if (document.referrer) {
      history.back();
    } else {
      location.href = 'index.html';
    }
  }

  // ===== 綁定 =====
  document.addEventListener('DOMContentLoaded', ()=>{
    const expMain = document.getElementById('expMain');
    if (!expMain) return;           // ✅ 沒這頁就不要繼續
    expMain.hidden = false;

    renderExperiences('all');

    // ✅ 範圍鎖在這一頁
    $$('#expMain .filters .chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        $$('#expMain .filters .chip').forEach(c=>c.classList.remove('is-on'));
        chip.classList.add('is-on');
        currentFilter = chip.dataset.filter || 'all';
        renderExperiences(currentFilter);
      });
    });

    // 列表代理
    document.getElementById('expList')?.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.id)  openDetail(btn.dataset.id);
      if (btn.dataset.add) toggleMy(btn.dataset.add);
    });

    // 詳情關閉
    document.getElementById('btnCloseExp')?.addEventListener('click', closeDetail);

    // 詳情內加入
    document.body.addEventListener('click', (e)=>{
      const btn = e.target.closest('#btnExpAddFromDetail');
      if (!btn) return;
      const id = btn.dataset.add;
      toggleMy(id);
    });

    // 空狀態重整
    document.getElementById('btnExpRetry')?.addEventListener('click', ()=>{
      renderExperiences(currentFilter);
    });

    // 返回
    document.getElementById('btnExpBack')?.addEventListener('click', goBackFromExperiences);

    // 設定
    document.getElementById('btnExpSettings')?.addEventListener('click', ()=>{
      if (window.hlOpenDrawer) window.hlOpenDrawer();
    });
  });

})();