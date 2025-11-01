// js/profile.js — HeriLand profile page actions (with My Experiences)

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // 跟 settings 同一套路
  function lsGet(k, fb = null) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fb : v;
    } catch (e) {
      return fb;
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (_) {}
  }

  // 🟢 統一 key，給 experiences.js 也用這個
  const LS_MY_EXP = 'hl.myExperiences';

  function getMyExperiences() {
    const raw = lsGet(LS_MY_EXP, '[]');
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  function setMyExperiences(list) {
    lsSet(LS_MY_EXP, JSON.stringify(list || []));
  }

  // 把目前使用者資料灌回 Profile 畫面
  function fillProfileFromStorage() {
    const name = lsGet('hl.pref.name', 'Guest User');
    const tagline = lsGet('hl.pref.tagline', 'Discovering Sarawak');
    const avatar = lsGet('hl.pref.avatar', 'H');

    const elName = $('#profileCardName');
    const elTag = $('#profileCardTagline');
    const elAva = $('#profileCardAvatar');

    if (elName) elName.textContent = name;
    if (elTag) elTag.textContent = tagline;
    if (elAva) elAva.textContent = (avatar || 'H').toString().slice(0, 1).toUpperCase();
  }

  /* =============================
     我的體驗頁（profile 裡那一頁）
     ============================= */
  function renderMyExperiencesPage() {
    const page = document.getElementById('p-my-experiences');
    if (!page) return;

    const body = page.querySelector('.myexp-body');
    if (!body) return;

    const list = getMyExperiences();

    if (!list.length) {
      body.innerHTML = `
        <p class="empty-myexp">目前還沒有加入體驗 👣</p>
        <p class="empty-myexp-sub">請到「體驗行程」頁按「+ 加到我的體驗」</p>
      `;
      return;
    }

    // 有資料
    body.innerHTML = list
      .map(
        (item, idx) => `
        <div class="myexp-row" data-idx="${idx}">
          <div>
            <div class="m-title">${item.title || '未命名體驗'}</div>
            <div class="m-meta">${item.city || ''} ${item.duration ? '· ' + item.duration : ''} ${
          item.price || ''
        }</div>
          </div>
          <button type="button" class="m-remove" data-del="${idx}">移除</button>
        </div>
      `
      )
      .join('');
  }

  // 開啟「我的體驗」這一頁
  function openMyExperiences() {
    if (window.showPage) window.showPage('my-experiences');
    renderMyExperiencesPage();
  }

  // ====== 點擊行為們 ======
  function bindProfileActions() {
    // 1) 卡片上的齒輪 → 開設定
    $('#profileCardSettings')?.addEventListener('click', () => {
      if (window.hlOpenDrawer) window.hlOpenDrawer();
    });

    // 2) 上方 4 個快捷鍵
    $('#pQuickFavs')?.addEventListener('click', () => openMyFavorites());
    $('#pQuickReviews')?.addEventListener('click', () => openMyReviews());
    $('#pQuickCoupons')?.addEventListener('click', () => openCoupons());
    $('#pQuickPost')?.addEventListener('click', () => openPhotoSubmit());

    // 3) 「我的內容」三個
    $('#pMyFavs')?.addEventListener('click', () => openMyFavorites());
    $('#pMyReviews')?.addEventListener('click', () => openMyReviews());
    // 這裡原本 alert，我們改成真的頁面
    $('#pMyTrips')?.addEventListener('click', ()=> {
  if (window.showPage) window.showPage('my-experiences');
});

    // 4) 平台互動
    $('#pPhotoSubmit')?.addEventListener('click', () => openPhotoSubmit());
    $('#pFeedback')?.addEventListener('click', () => openFeedback());
    $('#pContact')?.addEventListener('click', () => contactSupport());
    $('#pForMerchant')?.addEventListener('click', () => openMerchantJoin());

    // 5) 下方 4 格卡
    $('#pAboutHL')?.addEventListener('click', () => openAbout());
    $('#pRateHL')?.addEventListener('click', () => {
      if (window.openRateModal) window.openRateModal();
    });
    $('#pTerms')?.addEventListener('click', () => openTerms());
    $('#plOpenSettings')?.addEventListener('click', () => {
      if (window.hlOpenDrawer) window.hlOpenDrawer();
    });

    // 6) 登出
    $('#pLogout')?.addEventListener('click', () => doLogout());

    // 7) 🟢「我的體驗」頁面的返回鍵
    // 你 HTML 應該有 <button id="btnMyExpBack">←</button>
    document.getElementById('btnMyExpBack')?.addEventListener('click', () => {
      if (window.showPage) window.showPage('profile');
    });

    // 8) 🟢「我的體驗」頁面的刪除
    const myExpPage = document.getElementById('p-my-experiences');
    if (myExpPage) {
      myExpPage.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-del]');
        if (!btn) return;
        const idx = Number(btn.dataset.del);
        const list = getMyExperiences();
        list.splice(idx, 1);
        setMyExperiences(list);
        renderMyExperiencesPage();
      });
    }
  }

  // ====== 實際行為（之後你要換成真的頁面，就改這邊） ======
  function openMyFavorites() {
    if (window.showPage) window.showPage('saved');
  }

  function openMyReviews() {
    if (window.showPage) window.showPage('reviews');
  }

  function openCoupons() {
    alert('優惠券 / 任務功能尚未開放（demo）');
  }

  function openPhotoSubmit() {
    if (window.showPage) window.showPage('photo-submit');
  }

  function openFeedback() {
    if (window.showPage) window.showPage('feedback');
  }

  function contactSupport() {
    if (window.showPage) window.showPage('contact');
  }

  function openMerchantJoin() {
    if (window.showPage) window.showPage('merchant');
  }

  function openAbout() {
    if (window.showPage) window.showPage('about');
  }

  function openTerms() {
    if (window.showPage) window.showPage('terms');
  }

  function doLogout() {
    const ok = confirm('確定要登出嗎？');
    if (!ok) return;

    lsSet('hl.pref.name', 'Guest User');
    lsSet('hl.pref.tagline', 'Discovering Sarawak');
    lsSet('hl.pref.role', 'Guest');
    lsSet('hl.pref.avatar', 'H');

    if (window.hlSyncUI) window.hlSyncUI();
    fillProfileFromStorage();

    alert('已登出（demo）');
  }

  // ====== 讓別的地方改資料時，這頁也會跟著變 ======
  window.addEventListener('hl:userUpdated', () => {
    fillProfileFromStorage();
  });

  // 🟢 體驗清單有變動時，也要更新這一頁
  window.addEventListener('hl:myExpChanged', () => {
    // 只有在那一頁才重畫，省一點
    const pageVisible = document.querySelector('[data-page="my-experiences"]:not([hidden])');
    if (pageVisible) renderMyExperiencesPage();
  });

  // ====== 初始化 ======
  document.addEventListener('DOMContentLoaded', () => {
    fillProfileFromStorage();
    bindProfileActions();
  });
})();