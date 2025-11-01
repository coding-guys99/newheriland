// js/terms.js — Terms / Privacy overlay controller
document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('p-terms');
  const btnBack = document.getElementById('btnTermsBack');
  if (!panel) return;

  /* ===== 開啟 ===== */
  function openTerms() {
    // 解除 hidden + 顯示動畫
    panel.hidden = false;
    panel.classList.add('active');

    // 若有全域 router，記錄目前頁面狀態
    if (typeof window.showPage === 'function') {
      try {
        window.history.pushState({ page: 'terms' }, '', '#terms');
      } catch (e) {}
    }

    // 停止背景滾動
    document.body.style.overflow = 'hidden';
  }

  /* ===== 關閉 ===== */
  function closeTerms() {
    panel.classList.remove('active');
    // 延遲一點再隱藏，避免 transition 卡頓
    setTimeout(() => {
      panel.hidden = true;
      document.body.style.overflow = '';
    }, 200);

    // 若是獨立頁或有 router，就回上一頁 / profile
    if (typeof window.showPage === 'function') {
      window.showPage('profile');
    } else if (document.referrer) {
      history.back();
    }
  }

  /* ===== 綁定返回鈕 ===== */
  if (btnBack) {
    btnBack.addEventListener('click', closeTerms);
  }

  /* ===== 全域接口，給 profile.js 用 ===== */
  window.hlOpenTerms = openTerms;
  window.hlCloseTerms = closeTerms;

  /* ===== 保險機制：若外部 router 發出事件 ===== */
  document.addEventListener('hl:showPage', (ev) => {
    const page = ev.detail?.page;
    if (page === 'terms') openTerms();
    else if (!panel.hidden) closeTerms();
  });
});