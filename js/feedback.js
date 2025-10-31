// js/feedback.js — HeriLand 意見回饋頁
(function(){
  const $ = (s,r=document)=>r.querySelector(s);

  function initFeedback(){
    const form = $('#feedbackForm');
    if (!form) return;

    // 返回
    $('#btnFeedbackBack')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('profile');
    });

    // 送出
    form.addEventListener('submit', (e)=>{
      e.preventDefault();

      const type    = $('#fbType')?.value || 'other';
      const title   = $('#fbTitle')?.value.trim();
      const content = $('#fbContent')?.value.trim();
      const contact = $('#fbContact')?.value.trim();
      const needRep = $('#fbNeedReply')?.checked || false;

      if (!title || !content){
        alert('請輸入主旨與說明');
        return;
      }

      // demo: 這裡以後轉成 fetch 到你的 API
      alert(
        '已收到你的回饋，謝謝！\n\n' +
        `類型：${type}\n` +
        `主旨：${title}\n` +
        (contact ? `聯絡：${contact}\n` : '') +
        (needRep ? '※ 你希望我們回覆你\n' : '')
      );

      // 重置
      form.reset();
      // 回 profile
      if (window.showPage) window.showPage('profile');
    });
  }

  document.addEventListener('DOMContentLoaded', initFeedback);
})();