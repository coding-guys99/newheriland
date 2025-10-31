// js/about.js — HeriLand 關於頁
(function(){
  const $ = (s,r=document)=>r.querySelector(s);

  function initAbout(){
    $('#btnAboutBack')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('profile');
    });
  }

  document.addEventListener('DOMContentLoaded', initAbout);
})();