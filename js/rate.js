// js/rate.js
document.addEventListener('DOMContentLoaded', () => {
  const modal   = document.getElementById('rateAppModal');
  const btnYes  = document.getElementById('btnRateYes');
  const btnNo   = document.getElementById('btnRateCancel');

  function openRateModal() {
    if (!modal) return;
    modal.hidden = false;
  }

  function closeRateModal() {
    if (!modal) return;
    modal.hidden = true;
  }

  // 點背景也關
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeRateModal();
    });
  }

  // 去商店（之後換成實際連結）
  if (btnYes) {
    btnYes.addEventListener('click', () => {
      window.open('https://example.com/heriland-app', '_blank');
      closeRateModal();
    });
  }

  // 下次再說
  if (btnNo) {
    btnNo.addEventListener('click', closeRateModal);
  }

  // ⭕ 用 globalThis 而不是 window，保證 module 或非 module 都能取到
  globalThis.openRateModal = openRateModal;
  globalThis.closeRateModal = closeRateModal;
});