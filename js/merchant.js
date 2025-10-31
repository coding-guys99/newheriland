// js/merchant.js — HeriLand 商家合作頁
(function(){
  const $ = (s,r=document)=>r.querySelector(s);

  function initMerchant(){
    // 返回
    $('#btnMerchantBack')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('profile');
    });

    // 點擊外部聯繫方式
    document.querySelectorAll('.m-link').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const link = btn.dataset.link;
        if (link) window.open(link, '_blank');
      });
    });

    // 表單送出（demo）
    $('#merchantForm')?.addEventListener('submit', e=>{
      e.preventDefault();
      const name = $('#mName')?.value.trim();
      const type = $('#mType')?.value;
      const contact = $('#mContact')?.value.trim();
      if (!name || !type || !contact){
        alert('請填寫完整的基本資料');
        return;
      }

      const note = $('#mNote')?.value.trim() || '(無補充)';
      alert(`感謝您的申請！\n\n商家名稱：${name}\n類型：${type}\n聯絡方式：${contact}\n補充說明：${note}\n\n我們將盡快與您聯繫。`);

      e.target.reset();
      if (window.showPage) window.showPage('profile');
    });
  }

  document.addEventListener('DOMContentLoaded', initMerchant);
})();