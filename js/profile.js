// js/profile.js — HeriLand profile page actions (safe, no optional chaining)
(function () {
  // ===== 工具函式 =====
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }

  function lsGet(k, fb) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fb : v;
    } catch (e) {
      return fb;
    }
  }

  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (_) {}
  }

  // ===== Profile 資料灌入 =====
  function fillProfileFromStorage() {
    const name    = lsGet('hl.pref.name', 'Guest User');
    const tagline = lsGet('hl.pref.tagline', 'Discovering Sarawak');
    const avatar  = lsGet('hl.pref.avatar', 'H');

    const elName = document.getElementById('profileCardName');
    const elTag  = document.getElementById('profileCardTagline');
    const elAva  = document.getElementById('profileCardAvatar');

    if (elName) elName.textContent = name;
    if (elTag)  elTag.textContent  = tagline;
    if (elAva)  elAva.textContent  = (avatar || 'H').toString().slice(0, 1).toUpperCase();
  }

  // ===== 各頁導航（統一在這裡） =====
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
  // 🔴 重點：條款先走 overlay，再走 router
  function openTerms() {
    if (typeof window.hlOpenTerms === 'function') {
      window.hlOpenTerms();       // 開 overlay
    } else if (window.showPage) {
      window.showPage('terms');   // 備援：有真正的 data-page="terms" 才會看到
    } else {
      alert('Terms page not available in this build.');
    }
  }
  // rate 一樣防呆
  function openRate() {
    if (typeof window.openRateModal === 'function') {
      window.openRateModal();
    } else {
      alert('Rate modal not loaded yet.');
    }
  }

  // ===== 綁定所有按鈕 =====
  function bindProfileActions() {
    const btnGear       = document.getElementById('profileCardSettings');
    const btnFavs       = document.getElementById('pQuickFavs');
    const btnReviews    = document.getElementById('pQuickReviews');
    const btnCoupons    = document.getElementById('pQuickCoupons');
    const btnPost       = document.getElementById('pQuickPost');

    const btnMyFavs     = document.getElementById('pMyFavs');
    const btnMyReviews  = document.getElementById('pMyReviews');
    const btnMyTrips    = document.getElementById('pMyTrips');

    const btnPhotoSubmit= document.getElementById('pPhotoSubmit');
    const btnFeedback   = document.getElementById('pFeedback');
    const btnContact    = document.getElementById('pContact');
    const btnMerchant   = document.getElementById('pForMerchant');

    const btnAbout      = document.getElementById('pAboutHL');
    const btnRate       = document.getElementById('pRateHL');
    const btnTerms      = document.getElementById('pTerms');
    const btnSettings   = document.getElementById('plOpenSettings');
    const btnLogout     = document.getElementById('pLogout');

    // 卡片齒輪
    if (btnGear) {
      btnGear.addEventListener('click', function () {
        if (window.hlOpenDrawer) window.hlOpenDrawer();
      });
    }

    // 快捷四格
    if (btnFavs)    btnFavs.addEventListener('click', openMyFavorites);
    if (btnReviews) btnReviews.addEventListener('click', openMyReviews);
    if (btnCoupons) btnCoupons.addEventListener('click', openCoupons);
    if (btnPost)    btnPost.addEventListener('click', openPhotoSubmit);

    // 「我的內容」三個
    if (btnMyFavs)    btnMyFavs.addEventListener('click', openMyFavorites);
    if (btnMyReviews) btnMyReviews.addEventListener('click', openMyReviews);
    if (btnMyTrips)   btnMyTrips.addEventListener('click', function () {
      if (window.showPage) window.showPage('my-experiences');
    });

    // 平台互動
    if (btnPhotoSubmit) btnPhotoSubmit.addEventListener('click', openPhotoSubmit);
    if (btnFeedback)    btnFeedback.addEventListener('click', openFeedback);
    if (btnContact)     btnContact.addEventListener('click', contactSupport);
    if (btnMerchant)    btnMerchant.addEventListener('click', openMerchantJoin);

    // 關於 / 評分 / 條款 / 設定
    if (btnAbout)    btnAbout.addEventListener('click', openAbout);
    if (btnRate)     btnRate.addEventListener('click', openRate);
    if (btnTerms)    btnTerms.addEventListener('click', openTerms);
    if (btnSettings) btnSettings.addEventListener('click', function () {
      if (window.hlOpenDrawer) window.hlOpenDrawer();
    });

    // 登出
    if (btnLogout) {
      btnLogout.addEventListener('click', doLogout);
    }
  }

  // ===== 登出 =====
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

  // ===== 事件監聽 =====
  window.addEventListener('hl:userUpdated', fillProfileFromStorage);

  // ===== 初始化 =====
  document.addEventListener('DOMContentLoaded', function () {
    fillProfileFromStorage();
    bindProfileActions();
  });
})();