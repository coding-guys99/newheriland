// js/terms.js
document.addEventListener('DOMContentLoaded', () => {
  const terms = document.getElementById('p-terms');
  const btnBack = document.getElementById('btnTermsBack');

  function openTerms() {
    terms.hidden = false;
    terms.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeTerms() {
    terms.classList.remove('active');
    terms.hidden = true;
    document.body.style.overflow = '';
  }

  btnBack?.addEventListener('click', closeTerms);
  globalThis.openTerms = openTerms;
});