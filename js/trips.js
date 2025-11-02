// js/trips.js — 我的體驗頁（跟 experiences.js 對齊版）
(function () {
  const KEY_NEW = 'hl.myExperiences';     // ✅ 現在行程頁在用的
  const KEY_OLD = 'hl.my.experiences';    // ✅ 你舊版 trips.js 用的，做相容

  const bodyBox  = document.getElementById('myExpBody');
  const emptyBox = document.getElementById('myExpEmpty');
  const btnGoExp = document.getElementById('myExpGoExp');

  // 跟 experiences.js 保持同一份假資料（分頁載入所以這裡再貼一次）
  const EXPERIENCES = [
    {
      id: 'exp-001',
      title: '古晉老街文化走讀',
      city: 'Kuching',
      time: '2hrs',
      price: 'RM68',
      shortDesc: '跟著導覽老師漫步老城區，聽建築與人文故事。',
      cover: 'img/exp1.jpg'
    },
    {
      id: 'exp-002',
      title: '雨林蠟染手作體驗',
      city: 'Kuching',
      time: '1.5hrs',
      price: 'RM85',
      shortDesc: '體驗傳統蠟染藝術，親手繪出雨林植物的紋理。',
      cover: 'img/exp2.jpg'
    },
    {
      id: 'exp-003',
      title: 'Sibu Kopitiam 美食巡禮',
      city: 'Sibu',
      time: '3hrs',
      price: 'RM55',
      shortDesc: '一次造訪三間人氣咖啡店，認識砂勞越人的早餐文化。',
      cover: 'img/exp3.jpg'
    },
    {
      id: 'exp-004',
      title: '濕地生態半日遊',
      city: 'Kuching',
      time: '4hrs',
      price: 'RM120',
      shortDesc: '搭乘觀光船深入濕地，觀察紅樹林與海上生態。',
      cover: 'img/exp4.jpg'
    },
    {
      id: 'exp-005',
      title: '親子陶土手作坊',
      city: 'Miri',
      time: '2hrs',
      price: 'RM75',
      shortDesc: '和孩子一起動手玩陶，從泥土中創造屬於自己的作品。',
      cover: 'img/exp5.jpg'
    }
  ];

  // 幫它做一份索引，之後用 id 查比較快
  const EXP_INDEX = EXPERIENCES.reduce((acc, x) => {
    acc[x.id] = x;
    return acc;
  }, {});

  // 讀「新的」ID 清單
  function getNewIds() {
    try {
      return JSON.parse(localStorage.getItem(KEY_NEW) || '[]');
    } catch (e) {
      return [];
    }
  }

  // 嘗試吃「舊的」物件清單
  // 舊的格式是 [{name:'..', city:'..', ...}]
  function getLegacy() {
    try {
      return JSON.parse(localStorage.getItem(KEY_OLD) || '[]');
    } catch (e) {
      return [];
    }
  }

  function renderMyExperiences() {
    const ids = getNewIds();
    const legacy = getLegacy();

    bodyBox.innerHTML = '';

    // 兩個都沒有 → 顯示空狀態
    if (!ids.length && !legacy.length) {
      emptyBox.hidden = false;
      return;
    }
    emptyBox.hidden = true;

    // 1) 先畫「新格式（ID）」的
    ids.forEach(id => {
      const exp = EXP_INDEX[id];
      // 有可能你後來換了一份 experiences.js，找不到這個 id，就跳過
      if (!exp) return;

      const card = document.createElement('article');
      card.className = 'myexp-card';
      card.innerHTML = `
        <div class="myexp-thumb" style="background-image:url(${exp.cover || 'img/placeholder-trip.jpg'})"></div>
        <div class="myexp-main">
          <h3>${exp.title}</h3>
          <p class="myexp-short">${exp.shortDesc || ''}</p>
          <p class="myexp-meta">${exp.city || 'Sarawak'} · ${exp.time || ''} · <strong>${exp.price || ''}</strong></p>
        </div>
      `;
      bodyBox.appendChild(card);
    });

    // 2) 再畫「舊格式」的（如果有）
    legacy.forEach(row => {
      const card = document.createElement('article');
      card.className = 'myexp-card';
      card.innerHTML = `
        <div class="myexp-thumb" style="background-image:url(${row.img || 'img/placeholder-trip.jpg'})"></div>
        <div class="myexp-main">
          <h3>${row.name || '未命名體驗'}</h3>
          <p class="myexp-short">${row.desc || ''}</p>
          <p class="myexp-meta">${row.city || '未知地點'} · ${row.date || '時間待定'}</p>
        </div>
      `;
      bodyBox.appendChild(card);
    });
  }

  // 「去看體驗」→ 回到 experiences 那一頁
  btnGoExp?.addEventListener('click', () => {
    if (typeof window.showPage === 'function') {
      window.showPage('experiences.html');
    } else {
      // 分頁版就導回 index
      location.href = 'experiences.html';
    }
  });

  // 這個是 experiences.js 在 toggleMy() 裡面有發的事件
  // experiences.js 裡有這行：window.dispatchEvent(new CustomEvent('hl:myExpChanged'));
  window.addEventListener('hl:myExpChanged', renderMyExperiences);

  // 初始化
  renderMyExperiences();

  // 給別人手動叫
  window.refreshMyExperiences = renderMyExperiences;
})();