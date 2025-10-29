// 通用詳情模板：開/關 + 注入資料
const $  = (s, r=document) => r.querySelector(s);

export function openDetailTemplate(data){
  const ov  = $('#detailOverlay');
  const hero= $('#detailHero');
  const h2  = $('#detailH2');
  const meta= $('#detailMeta');
  const sum = $('#detailSummary');
  const steps = $('#detailSteps');
  const pBtn = $('#detailPrimary');
  const sBtn = $('#detailSecondary');

  // 基本文案
  $('#detailTitle').textContent = data.headerTitle || '詳情';
  h2.textContent = data.title || '';
  hero.style.backgroundImage = `url('${data.hero||''}')`;
  sum.textContent = data.summary || '';

  // Meta（icon + text 陣列）
  meta.innerHTML = (data.meta||[]).map(m => `<span>${m}</span>`).join('');

  // Steps / 亮點
  steps.innerHTML = (data.steps||[]).map(st => `
    <div class="step">
      <i class="dot"></i>
      <div>
        <div class="t">${st.title||''}</div>
        ${st.subtitle ? `<div class="s">${st.subtitle}</div>` : ''}
      </div>
    </div>
  `).join('');

  // CTA
  if (data.primary){
    pBtn.textContent = data.primary.text || '前往';
    pBtn.href = data.primary.href || '#';
    pBtn.target = data.primary.target || '_self';
    pBtn.style.display = '';
  }else{
    pBtn.style.display = 'none';
  }
  if (data.onSecondary){
    sBtn.textContent = data.secondaryText || '收藏';
    sBtn.onclick = e => data.onSecondary?.(e);
    sBtn.style.display = '';
  }else{
    sBtn.style.display = '';
    sBtn.onclick = null;
  }

  // 開啟
  ov.hidden = false;
  requestAnimationFrame(()=>{
    ov.classList.add('active');
    document.body.classList.add('no-scroll');
  });
}

export function closeDetailTemplate(){
  const ov = $('#detailOverlay');
  ov.classList.remove('active');
  ov.setAttribute('hidden','');
  document.body.classList.remove('no-scroll');
}

// 綁定關閉
document.addEventListener('DOMContentLoaded', ()=>{
  $('#btnDetailClose')?.addEventListener('click', closeDetailTemplate);
});