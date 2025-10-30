// js/detail-overlay.js
const $  = (s, r=document) => r.querySelector(s);

function fillDetailView(opts = {}){
  const shell  = $('#ui-detail-shell');
  const hero   = $('#ui-detail-hero');
  const body   = $('#ui-detail-body');
  const acts   = $('#ui-detail-actions');
  const titleEl= $('#ui-detail-title');

  if (!shell || !body) return;

  // 標題列文字
  titleEl.textContent = opts.headerTitle || '詳情';

  // Hero
  if (opts.hero) {
    hero.hidden = false;
    hero.style.backgroundImage = `url("${opts.hero}")`;
  } else {
    hero.hidden = true;
    hero.style.backgroundImage = '';
  }

  // 內容：給你三種組合，最常用的是 bodyHTML
  if (opts.bodyHTML) {
    body.innerHTML = opts.bodyHTML;
  } else {
    body.innerHTML = `
      ${opts.title ? `<div class="title-lg">${opts.title}</div>` : ''}
      ${opts.meta ? `<div class="meta-line">${opts.meta}</div>` : ''}
      ${opts.desc ? `<p class="desc">${opts.desc}</p>` : ''}
    `;
  }

  // 按鈕
  if (opts.actions && opts.actions.length){
    acts.hidden = false;
    acts.innerHTML = opts.actions.map(a => `
      <button class="btn ${a.primary ? 'primary':''}" data-act="${a.id || ''}">
        ${a.label || 'Action'}
      </button>
    `).join('');
  } else {
    acts.hidden = true;
    acts.innerHTML = '';
  }

  // 綁定 action click
  acts.querySelectorAll('[data-act]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.act;
      const match = opts.actions.find(x => x.id === id);
      match?.onClick?.();
    });
  });
}

export function openDetailView(opts = {}){
  const layer = $('#ui-detail-overlay');
  if (!layer) return;
  fillDetailView(opts);
  layer.hidden = false;
  layer.classList.add('active');
  document.body.classList.add('no-scroll');
  // header focus
  $('#ui-detail-title')?.focus({ preventScroll: true });
}

export function closeDetailView(){
  const layer = $('#ui-detail-overlay');
  if (!layer) return;
  layer.classList.remove('active');
  layer.setAttribute('hidden','');
  document.body.classList.remove('no-scroll');
}

// 初始：關閉鈕、背景 ESC
document.addEventListener('DOMContentLoaded', ()=>{
  $('#ui-detail-close')?.addEventListener('click', closeDetailView);
  // 按 ESC 關
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape'){
      closeDetailView();
    }
  });
});