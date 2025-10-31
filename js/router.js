// js/router.js
window.showPage = function(id){
  document.querySelectorAll('[data-page]').forEach(sec => sec.hidden = true);
  const target = document.querySelector(`[data-page="${id}"]`);
  if (target) target.hidden = false;
  else console.warn('Page not found:', id);
};