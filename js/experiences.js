// js/experiences.js — 體驗行程列表 + 加入/移除「我的體驗」
(function(){
  const EXP_KEY = 'hl.myExperiences';
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  // ===== 假資料 =====
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
      detail: '走訪古晉的老街與河岸區，從殖民建築到傳統商號，導覽員會用生動故事介紹這座城市的變遷。中途將停留品嚐一杯道地的咖啡，體驗老店氛圍。非常適合第一次造訪古晉的旅人。',
      includes: ['專業導覽解說', '老街地圖一份', '當地咖啡體驗券'],
      meetup: '古晉 Waterfront 觀景塔前集合（08:30）',
      notice: '行程需步行約 2 公里，建議穿輕便鞋裝；若遇午後大雨可能視情況縮短路線。',
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
      shortDesc: '體驗傳統蠟染藝術，親手繪出雨林植物的紋理。',
      detail: '在當地藝術家的帶領下，學習如何用蠟筆勾勒圖案、染色上色。完成後可帶回屬於自己的蠟染作品。活動中還會講解砂拉越特有植物如何成為天然染料的來源。',
      includes: ['蠟染材料包', '作品收納袋', '指導老師費用'],
      meetup: 'Kuching Art Space（Green Hill 區）',
      notice: '染料容易沾衣，請穿著可弄髒的服裝；六歲以上可參加。',
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
      shortDesc: '一次造訪三間人氣咖啡店，認識砂勞越人的早餐文化。',
      detail: '由美食嚮導帶路，體驗傳統 Kopitiam 的多層次風味。從咖椰吐司到砂拉越叻沙，聽每道料理背後的故事。最後還會學習如何自己沖出一杯經典 Kopi O。',
      includes: ['三家咖啡店餐點', '導覽講解', '飲品體驗'],
      meetup: 'Sibu Central Market 正門集合（09:00）',
      notice: '餐點包含雞蛋與奶製品，素食者可事先告知；請自備水瓶。',
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
      shortDesc: '搭乘觀光船深入濕地，觀察紅樹林與海上生態。',
      detail: '由當地生態導覽帶領，觀察紅樹林中的鳥類與魚群。途中可登岸走木棧道、拍照、學習如何識別常見植物。若運氣好還能看見長鼻猴或海豚。適合親子、自然愛好者參加。',
      includes: ['觀光船票', '導覽解說', '飲用水一瓶'],
      meetup: 'Kuching Wetland Park 遊客中心（07:30）',
      notice: '行程受潮汐影響，請準時集合；請自備防曬用品與蚊液。',
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
      shortDesc: '和孩子一起動手玩陶，從泥土中創造屬於自己的作品。',
      detail: '在工作坊老師指導下，學習陶土塑形與上釉技巧。可共同製作小杯、小盤或動物造型。課後作品由工作室代為燒製，兩週後寄送。過程輕鬆有趣，是家庭旅遊最佳選擇。',
      includes: ['陶土材料', '師資指導', '燒製與寄送服務'],
      meetup: 'Miri Clay Studio（市區工坊）',
      notice: '每組最多 3 人；小孩需家長陪同；請準時到場避免影響作品乾燥。',
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
    // 告訴 profile 那邊重畫
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

    const mine  = new Set(getMy());
    const isMine = mine.has(item.id);

    const short   = item.shortDesc || '這個體驗還沒有補上描述。';
    const detail  = item.detail || '體驗內容待補，請以實際活動為準。';
    const includes= item.includes || ['導覽服務', '當地嚮導'];
    const meetup  = item.meetup   || '活動前一日會另行通知集合點。';
    const notice  = item.notice   || '請穿著輕便服裝，攜帶飲水與防曬用品。';

    cont.innerHTML = `
      <div class="exp-detail__hero">
        <div class="exp-detail__cover" style="background-image:url(${item.cover || 'img/placeholder.jpg'})"></div>
        <div class="exp-detail__head">
          <h2>${item.title}</h2>
          <p class="exp-detail__meta">${item.city} · ${item.time} · <strong>${item.price}</strong></p>
          <p class="exp-detail__short">${short}</p>
        </div>
      </div>
      <div class="exp-detail__body">
        <h3>體驗介紹</h3>
        <p>${detail}</p>

        <div class="exp-detail__group">
          <h4>活動包含</h4>
          <ul class="exp-detail__list">
            ${includes.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        <div class="exp-detail__group">
          <h4>集合地點</h4>
          <p>${meetup}</p>
        </div>

        <div class="exp-detail__group">
          <h4>注意事項</h4>
          <p>${notice}</p>
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
    let msg = '';
    if (idx === -1){
      list.push(id);
      msg = '已加入「我的體驗」。';
    } else {
      list.splice(idx,1);
      msg = '已從「我的體驗」移除。';
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

    alert(msg);
  }

  // ===== 返回處理（支援 SPA + 獨立頁） =====
  function goBackFromExperiences(){
    // 1) SPA 模式
    if (typeof window.showPage === 'function') {
      window.showPage('home');
      return;
    }

    // 2) 有前一頁，通常是從 index 點進來的
    if (document.referrer && document.referrer !== '') {
      history.back();
      return;
    }

    // 3) 直接打開這頁 → 導回首頁
    location.href = 'index.html';
  }

  // ===== 綁定 =====
  document.addEventListener('DOMContentLoaded', ()=>{
    // 頁面一進來先顯示
    const expMain = document.getElementById('expMain');
    if (expMain) expMain.hidden = false;

    renderExperiences('all');

    // 篩選 chip
    $$('.filters .chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        $$('.filters .chip').forEach(c=>c.classList.remove('is-on'));
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

    // ✅ 返回（DOM 一載入就綁）
    document.getElementById('btnExpBack')?.addEventListener('click', goBackFromExperiences);

    // ⚙️ 開設定
    document.getElementById('btnExpSettings')?.addEventListener('click', ()=>{
      if (window.hlOpenDrawer) window.hlOpenDrawer();
    });
  });

  // ✅ 全域保底：如果 header 是動態插入的，這個也會抓到
  document.addEventListener('click', (e)=>{
    const backBtn = e.target.closest('#btnExpBack');
    if (backBtn) goBackFromExperiences();
  });

})();