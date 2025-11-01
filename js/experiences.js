// js/experiences.js — list + add to my experiences

document.addEventListener('DOMContentLoaded', () => {
  const listWrap = document.getElementById('expList');
  const btnBack  = document.getElementById('btnBackHome');
  const detail   = document.getElementById('expDetail');
  const btnCloseDetail = document.getElementById('btnCloseExp');

  // demo 資料，你原本的可放別的地方
  const EXP_DATA = [
    {
      id: 'exp-1',
      title: '老街文化走讀',
      city: 'Kuching',
      duration: '2hrs',
      price: 'RM68',
      cover: 'img/exp-1.jpg'
    },
    {
      id: 'exp-2',
      title: '砂拉越手作雨林蠟染',
      city: 'Kuching',
      duration: '1.5hrs',
      price: 'RM85',
      cover: 'img/exp-2.jpg'
    },
    {
      id: 'exp-3',
      title: '在地 Kopitiam 美食巡禮',
      city: 'Sibu',
      duration: '3hrs',
      price: 'RM55',
      cover: 'img/exp-3.jpg'
    }
  ];

  // 渲染清單
  function renderList(data) {
    if (!listWrap) return;
    listWrap.innerHTML = data
      .map(
        (exp) => `
        <article class="exp-card has-thumb" data-id="${exp.id}" data-city="${exp.city}" data-dur="${exp.duration}">
          <div class="exp-thumb" style="background-image:url('${exp.cover || ''}')"></div>
          <div class="exp-main">
            <h3>${exp.title}</h3>
            <p class="exp-sub">${exp.city} · ${exp.duration}</p>
            <p class="exp-price">${exp.price}</p>
          </div>
          <div class="exp-actions">
            <button class="exp-btn exp-detail-btn" data-detail="${exp.id}">詳情</button>
            <button class="exp-btn exp-add-btn" data-add="${exp.id}">+ 加到我的體驗</button>
          </div>
        </article>
      `
      )
      .join('');
  }

  renderList(EXP_DATA);

  // 返回按鈕
  btnBack?.addEventListener('click', () => {
    if (window.showPage) window.showPage('home');
  });

  // 詳情關閉
  btnCloseDetail?.addEventListener('click', () => {
    detail?.classList.remove('is-open');
    detail?.setAttribute('hidden', '');
  });

  // 事件代理：詳情 + 加入
  listWrap?.addEventListener('click', (e) => {
    const detailBtn = e.target.closest('[data-detail]');
    const addBtn    = e.target.closest('[data-add]');

    // 打開詳情
    if (detailBtn) {
      const id = detailBtn.dataset.detail;
      const exp = EXP_DATA.find((x) => x.id === id);
      if (!exp) return;
      const content = document.getElementById('expContent');
      if (content) {
        content.innerHTML = `
          <div class="exp-detail__hero">
            <div class="exp-detail__cover" style="background-image:url('${exp.cover || ''}')"></div>
            <div class="exp-detail__head">
              <h2>${exp.title}</h2>
              <p>${exp.city} · ${exp.duration}</p>
              <p class="exp-detail__price">${exp.price}</p>
            </div>
          </div>
          <div class="exp-detail__body">
            <h3>體驗重點</h3>
            <p>這裡放體驗的詳細說明、行程安排、集合地點等，之後可從後台帶資料。</p>
          </div>
        `;
      }
      detail?.classList.add('is-open');
      detail?.removeAttribute('hidden');
    }

    // 加到我的體驗
    if (addBtn) {
      const id = addBtn.dataset.add;
      const card = addBtn.closest('.exp-card');
      const exp = EXP_DATA.find((x) => x.id === id);

      // 組要存的物件
      const item = {
        id: exp?.id || id,
        title: exp?.title || card?.querySelector('h3')?.textContent?.trim() || '未命名體驗',
        city: exp?.city || card?.dataset.city || '',
        duration: exp?.duration || card?.dataset.dur || '',
        price: exp?.price || card?.querySelector('.exp-price')?.textContent?.trim() || ''
      };

      // 讀舊的
      let old = [];
      try {
        old = JSON.parse(localStorage.getItem('hl.myExperiences') || '[]');
      } catch (err) {
        old = [];
      }

      // 不重複才加
      const exists = old.some((x) => x.id === item.id);
      if (!exists) {
        old.push(item);
        localStorage.setItem('hl.myExperiences', JSON.stringify(old));
      }

      // 切換按鈕樣式
      addBtn.classList.add('is-added');
      addBtn.textContent = '已加入';

      // 通知 profile 重畫
      window.dispatchEvent(new CustomEvent('hl:myExpChanged'));
    }
  });
});