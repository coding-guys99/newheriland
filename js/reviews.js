// js/reviews.js — HeriLand 我的評論頁（暫用假資料）
(function(){
  const $ = (s,r=document)=>r.querySelector(s);

  function initReviews(){
    $('#btnReviewsBack')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('profile');
    });

    $('#btnGoExplore')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('explore');
    });

    // 模擬：之後可從 localStorage 或 supabase 撈資料
    const list = document.querySelectorAll('.review-card');
    const empty = $('.reviews-empty');
    if (list.length === 0 && empty){
      empty.hidden = false;
    }
  }

  document.addEventListener('DOMContentLoaded', initReviews);
})();