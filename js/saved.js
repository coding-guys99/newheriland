// js/saved.js — 我的收藏頁面邏輯

(function(){
  const $  = (s,r=document)=>r.querySelector(s);

  function renderSaved(){
    const list = JSON.parse(localStorage.getItem('hl.saved') || '[]');
    const grid = $('#savedGrid');
    const empty = $('#savedEmpty');
    if (!grid || !empty) return;

    grid.innerHTML = '';

    if (list.length === 0){
      empty.hidden = false;
      grid.hidden = true;
      return;
    }

    empty.hidden = true;
    grid.hidden = false;

    list.forEach(item=>{
      const card = document.createElement('div');
      card.className = 'saved-card';
      card.innerHTML = `
        <img src="${item.img || 'img/placeholder.jpg'}" alt="">
        <div class="info">
          <div class="title">${item.title}</div>
          <div class="meta">${item.city || ''}</div>
        </div>`;
      card.addEventListener('click', ()=>{
        alert('打開收藏項目詳情（demo）');
      });
      grid.appendChild(card);
    });
  }

  // demo: 假資料
  if (!localStorage.getItem('hl.saved')){
    localStorage.setItem('hl.saved', JSON.stringify([
      { title: '古晉貓博物館', city: 'Kuching', img: 'https://placekitten.com/400/250' },
      { title: '詩巫中央市場', city: 'Sibu', img: 'https://placehold.co/400x250/orange/white?text=Market' }
    ]));
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    renderSaved();

    // 返回 Profile
    $('#btnSavedBack')?.addEventListener('click', ()=>{
      document.querySelector('[data-page="saved"]').hidden = true;
      document.querySelector('[data-page="profile"]').hidden = false;
    });
  });

  // 從 Profile 叫這頁
   window.openMyFavorites = function(){
  if (window.showPage) window.showPage('saved');
  renderSaved();
};
})();