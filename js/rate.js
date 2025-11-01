// js/rate.js — HeriLand Rate App Modal
document.addEventListener('DOMContentLoaded', () => {
  const modal   = document.getElementById('rateAppModal');
  const btnYes  = document.getElementById('btnRateYes');
  const btnNo   = document.getElementById('btnRateCancel');

  // ===== 開啟 =====
  function openRateModal() {
    if (!modal) return;

    // 顯示 modal
    modal.hidden = false;
    modal.classList.add('is-open');

    // 禁止背景滾動
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }

  // ===== 關閉 =====
  function closeRateModal() {
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.hidden = true;

    // 恢復滾動
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }

  // 點背景關閉
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeRateModal();
    });
  }

  // 前往商店
  if (btnYes) {
    btnYes.addEventListener('click', () => {
      // 🟢 這裡可替換成實際商店連結
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        window.open('https://apps.apple.com/app/idXXXXXXXXX', '_blank'); // App Store
      } else if (/android/.test(ua)) {
        window.open('https://play.google.com/store/apps/details?id=com.heriland.app', '_blank'); // Google Play
      } else {
        window.open('https://example.com/heriland-app', '_blank'); // 其他平台 fallback
      }
      closeRateModal();
    });
  }

  // 下次再說
  if (btnNo) {
    btnNo.addEventListener('click', closeRateModal);
  }

  // 讓 profile.js 可以叫用
  globalThis.openRateModal = openRateModal;
  globalThis.closeRateModal = closeRateModal;
});