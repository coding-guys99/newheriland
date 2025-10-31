// js/photo-submit.js — HeriLand 照片投稿頁
(function(){
  const $  = (s,r=document)=>r.querySelector(s);

  function initPhotoSubmit(){
    const form = $('#photoForm');
    const fileInput = $('#photoFile');
    const preview = $('#photoPreview');

    if (!form) return;

    // 點預覽框開檔案選擇
    preview?.addEventListener('click', ()=> fileInput?.click());

    // 預覽選擇的圖片
    fileInput?.addEventListener('change', e=>{
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev=>{
        preview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    });

    // 送出表單
    form.addEventListener('submit', e=>{
      e.preventDefault();

      const title = $('#photoTitle')?.value?.trim();
      const desc  = $('#photoDesc')?.value?.trim();
      const city  = $('#photoCity')?.value?.trim();
      if (!title){
        alert('請輸入標題');
        return;
      }

      alert(`感謝投稿！\n\n標題：${title}\n地點：${city || '未填'}\n\n（這裡將連接後端上傳）`);

      // 重設表單
      form.reset();
      preview.innerHTML = `<p>尚未選擇圖片</p>`;

      // 回到 Profile 頁
      if (window.showPage) window.showPage('profile');
    });

    // 返回上一頁
    $('#btnPhotoBack')?.addEventListener('click', ()=>{
      if (window.showPage) window.showPage('profile');
    });
  }

  document.addEventListener('DOMContentLoaded', initPhotoSubmit);
})();