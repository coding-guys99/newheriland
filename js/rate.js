// js/rate.js
document.addEventListener('DOMContentLoaded', () => {
  const modal   = document.getElementById('rateAppModal');
  const btnYes  = document.getElementById('btnRateYes');
  const btnNo   = document.getElementById('btnRateCancel');

  // 真正開啟
  function openRateModal() {
    if (!modal) return;
    modal.hidden = false;
  }

  // 關閉
  function closeRateModal() {
    if (!modal) return;
    modal.hidden = true;
  }

  // 點背景也關
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeRateModal();
      }
    });
  }

  // 去商店
  if (btnYes) {
    btnYes.addEventListener('click', () => {
      // 這裡先做 demo，用你的實際商店連結再換
      // iOS / Android 判斷之後可以再加
      window.open('https://example.com/heriland-app', '_blank');
      closeRateModal();
    });
  }

  // 下次再說
  if (btnNo) {
    btnNo.addEventListener('click', () => {
      closeRateModal();
    });
  }

  // 🔴 最重要這兩行：把函式丟回全域，給 profile.js 用
  window.openRateModal = openRateModal;
  window.closeRateModal = closeRateModal;
});