// js/my-experiences.js — 我的體驗頁
document.addEventListener('DOMContentLoaded', () => {
  const bodyBox   = document.getElementById('myExpBody');
  const emptyBox  = document.getElementById('myExpEmpty');
  const btnGoExp  = document.getElementById('myExpGoExp');

  // 渲染「我的體驗」清單
  function renderMyExperiences() {
    const exps = JSON.parse(localStorage.getItem('hl.my.experiences') || '[]');
    bodyBox.innerHTML = '';

    if (!exps.length) {
      emptyBox.hidden = false;
      return;
    }

    emptyBox.hidden = true;

    exps.forEach(exp => {
      const card = document.createElement('div');
      card.className = 'myexp-card';
      card.innerHTML = `
        <img src="${exp.img || 'img/placeholder-trip.jpg'}" alt="">
        <div class="myexp-info">
          <h3>${exp.name || '未命名體驗'}</h3>
          <p>${exp.desc || '無描述'}</p>
          <div class="myexp-meta">
            <span>📍 ${exp.city || '未知地點'}</span>
            <span>🕒 ${exp.date || '待定日期'}</span>
          </div>
        </div>
      `;
      bodyBox.appendChild(card);
    });
  }

  // 返回 Profile（這個按鈕已經有 data-back-to，不一定要 JS 控制，但保留以防萬一）
  document.querySelector('[data-back-to="profile"]')?.addEventListener('click', () => {
    showPage('profile');
  });

  // 去「體驗行程」頁
  btnGoExp?.addEventListener('click', () => {
    showPage('experiences');
  });

  // 初始化
  renderMyExperiences();

  // 給外部頁面用（例如加入新體驗後重新整理）
  window.refreshMyExperiences = renderMyExperiences;
});