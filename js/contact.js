// js/contact.js — HeriLand 聯繫客服
(function(){
  const $ = (s,r=document)=>r.querySelector(s);

  function initContact(){
    // 返回鍵
    $('#btnContactBack')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('profile');
    });

    // 點擊外部連結
    document.querySelectorAll('.c-link').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const link = btn.dataset.link;
        if (link) window.open(link, '_blank');
      });
    });

    // 表單送出
    $('#contactForm')?.addEventListener('submit', e=>{
      e.preventDefault();
      const name = $('#ctName')?.value.trim() || '未留名';
      const msg  = $('#ctMsg')?.value.trim();
      if (!msg){
        alert('請輸入訊息內容');
        return;
      }

      // demo: 之後接 API 或郵件服務
      alert(`感謝您的留言！\n\n姓名：${name}\n訊息：${msg}\n\n我們將盡快回覆您。`);

      e.target.reset();
      if (window.showPage) window.showPage('profile');
    });
  }

  document.addEventListener('DOMContentLoaded', initContact);
})();