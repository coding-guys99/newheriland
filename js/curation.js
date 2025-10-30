// curation.js — 在地策展（文章型）

const CURATION_SAMPLE = {
  id: 'kch-weekend-01',
  hero: 'https://picsum.photos/1200/700?c=1',
  title: '週末在古晉這樣玩：老街 → 咖啡 → 河畔夜拍',
  author: '@SarawakFoodie',
  authorAvatar: 'https://i.pravatar.cc/100?img=4',
  city: 'Kuching',
  date: '2025-10-30',
  intro: '給第一次來古晉、但又不想跟團的人。下面每一段都是可以獨立拆開走的。',
  blocks: [
    {
      type: 'text',
      title: '1. 早上先繞老街',
      body: '09:30 前人比較少，路邊小吃可以慢慢拍。記得先吃一點，不然後面幾個點會排隊。'
    },
    {
      type: 'place',
      placeId: 'cat-laksa',
      name: '老街砂拉越叻沙',
      city: 'Kuching Old Town',
      thumb: 'https://picsum.photos/200/200?food=1',
      note: '只吃一碗就吃這家'
    },
    {
      type: 'text',
      title: '2. 下午去河畔拍 vlog',
      body: '沿河這段的光線 15:30~16:30 最漂亮，想拍 Reels 可以抓這段時間。'
    },
    {
      type: 'tip',
      body: '假日建議 16:00 前到，不然人多、背景會亂。'
    },
    {
      type: 'place',
      placeId: 'river-diner',
      name: 'Riverside Diner',
      city: 'Waterfront',
      thumb: 'https://picsum.photos/200/200?cafe=2'
    }
  ]
};

function renderCuration(data = CURATION_SAMPLE){
  const wrap = document.getElementById('curationBody');
  if (!wrap) return; // 保護

  wrap.innerHTML = `
    <div class="curation-hero" style="background-image:url('${data.hero||''}')"></div>
    <h2 class="curation-title" id="curationTitleH">${data.title||''}</h2>
    <div class="curation-meta">
      <span class="author">
        ${data.authorAvatar ? `<img src="${data.authorAvatar}" alt="">` : ''}
        ${data.author||'Local curator'}
      </span>
      ${data.city ? `<span>📍 ${data.city}</span>` : ''}
      ${data.date ? `<span>🗓️ ${data.date}</span>` : ''}
    </div>
    ${data.intro ? `<p class="curation-block-text">${data.intro}</p>` : ''}
    <div class="curation-blocks">
      ${(data.blocks||[]).map(b => {
        if (b.type === 'text'){
          return `
            <article class="curation-block">
              ${b.title ? `<h3 class="curation-block-title">${b.title}</h3>` : ''}
              ${b.body ? `<p class="curation-block-text">${b.body}</p>` : ''}
            </article>`;
        }
        if (b.type === 'place'){
          return `
            <article class="curation-block">
              <div class="curation-place" data-place-id="${b.placeId||''}">
                <div class="curation-place-thumb" style="background-image:url('${b.thumb||''}')"></div>
                <div class="curation-place-meta">
                  <div class="curation-place-name">${b.name||'未命名店家'}</div>
                  <div class="curation-place-city">${b.city||''}</div>
                </div>
                <button type="button" class="curation-place-btn" data-open-place="${b.placeId||''}">
                  查看店家
                </button>
              </div>
              ${b.note ? `<p class="curation-block-text" style="margin-top:4px">${b.note}</p>` : ''}
            </article>`;
        }
        if (b.type === 'tip'){
          return `
            <article class="curation-tip">
              <strong>小提醒</strong>
              <span>${b.body||''}</span>
            </article>`;
        }
        return '';
      }).join('')}
    </div>
    <div class="curation-actions">
      <button class="btn" id="btnCurationShare">分享</button>
      <button class="btn primary" id="btnCurationFav">收藏這篇</button>
    </div>
  `;

  // 查看店家 → 之後可接你的 detail
  wrap.querySelectorAll('[data-open-place]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const pid = btn.dataset.openPlace;
      if (window.showPlaceDetail) {
        window.showPlaceDetail(pid);
      } else {
        alert(`之後開店家詳情：${pid || '（無 id）'}`);
      }
    });
  });

  // 分享
  document.getElementById('btnCurationShare')?.addEventListener('click', async ()=>{
    try{
      await navigator.share?.({ title: data.title, text: data.intro, url: location.href });
    }catch(_){}
  });

  // 收藏
  document.getElementById('btnCurationFav')?.addEventListener('click', ()=>{
    alert('已加入收藏（示意）');
  });
}

function openCuration(data = CURATION_SAMPLE){
  const panel = document.getElementById('curationDetail');
  const titleBar = document.getElementById('curationTitle');

  if (!panel) {
    console.warn('curationDetail not found in DOM');
    return;
  }

  renderCuration(data);

  if (titleBar) titleBar.textContent = data.title || '策展內容';

  panel.hidden = false;
  panel.classList.add('active');
  document.body.classList.add('no-scroll');
}

function closeCuration(){
  const panel = document.getElementById('curationDetail');
  if (!panel) return;
  panel.classList.remove('active');
  panel.hidden = true;
  document.body.classList.remove('no-scroll');
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('btnCurationBack')?.addEventListener('click', closeCuration);
  document.getElementById('btnCurationMore')?.addEventListener('click', ()=>{
    alert('之後可以放：編輯 / 分享 / 刪除 / 複製連結');
  });
});

// 給外面呼叫
window.openCuration = openCuration;
window.closeCuration = closeCuration;