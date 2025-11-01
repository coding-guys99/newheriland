// js/rate.js
document.addEventListener('DOMContentLoaded', () => {
  const modal   = document.getElementById('rateAppModal');
  const btnYes  = document.getElementById('btnRateYes');
  const btnNo   = document.getElementById('btnRateCancel');

  function openRateModal() {
    if (!modal) return;
    modal.hidden = false;
    modal.classList.add('is-open');   // ✅ 新增：讓 CSS 生效
  }

  function closeRateModal() {
    if (!modal) return;
    modal.classList.remove('is-open'); // ✅ 拿掉顯示用 class
    modal.hidden = true;
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeRateModal();
    });
  }

  if (btnYes) {
    btnYes.addEventListener('click', () => {
      window.open('https://example.com/heriland-app', '_blank');
      closeRateModal();
    });
  }

  if (btnNo) {
    btnNo.addEventListener('click', closeRateModal);
  }

  // 讓 profile.js 可用
  globalThis.openRateModal = openRateModal;
  globalThis.closeRateModal = closeRateModal;
});