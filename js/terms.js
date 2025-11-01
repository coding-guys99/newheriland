// js/terms.js
document.addEventListener('DOMContentLoaded', () => {
  const terms = document.getElementById('p-terms');
  const btnBack = document.getElementById('btnTermsBack');

  function openTerms() {
    if (!terms) return;
    terms.hidden = false;
    terms.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeTerms() {
    if (!terms) return;
    terms.classList.remove('active');
    terms.hidden = true;
    document.body.style.overflow = '';
  }

  btnBack?.addEventListener('click', closeTerms);

  // 將函式暴露給全域，給 profile.js 用
  window.openTerms = openTerms;
});