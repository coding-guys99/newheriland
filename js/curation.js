// curation.js — 在地策展（文章型）

// 1) 範例資料（之後你要從 supabase 撈就丟進 openCuration(...)）
const CURATION_SAMPLE = {
  id: 'kch-weekend-01',
  hero: 'https://picsum.photos/1200/700?c=1',
  title: '週末在古晉這樣玩：老街 → 咖啡 → 河畔夜拍',
  author: '@SarawakFoodie',
  authorAvatar: 'https://i.pravatar.cc/100?img=4',
  city: 'Kuching',
  date: '2025-10-30',
  intro: '給第一次來古晉、但又不想跟團的人。下面每一段都是可以獨立拆開走的。',
  // ✅ 這裡已經是「文章型」的型別
  blocks: [
    { type: 'h2', text: '1. 早上先繞老街' },
    { type: 'p',  text: '09:30 前人比較少，路邊小吃可以慢慢拍。記得先吃一點，不然後面幾個點會排隊。' },
    {
      type: 'place-inline',
      placeId: 'cat-laksa',
      name: '老街砂拉越叻沙',
      city: 'Kuching Old Town',
      note: '只吃一碗就吃這家'
    },
    { type: 'p',  text: '吃完可以往河邊走，路上會經過一段老房子，很好拍。' },
    { type: 'tip', text: '假日 16:00 前到，不然背景會亂。' },
    { type: 'h2', text: '2. 下午去河畔拍 vlog' },
    { type: 'p',  text: '沿河這段的光線 15:30~16:30 最漂亮。' },
    {
      type: 'place-inline',
      placeId: 'river-diner',
      name: 'Riverside Diner',
      city: 'Waterfront'
    }
  ]
};


// 2) 真正畫面渲染
function renderCuration(data = CURATION_SAMPLE){
  const wrap = document.getElementById('curationBody');
  if (!wrap) return;

  // 先畫上面固定那幾塊
  let html = `
    <div class="curation-hero" style="background-image:url('${data.hero || ''}')"></div>
    <h2 class="curation-title" id="curationTitleH">${data.title || ''}</h2>
    <div class="curation-meta">
      <span class="author">
        ${data.authorAvatar ? `<img src="${data.authorAvatar}" alt="">` : ''}
        ${data.author || 'Local curator'}
      </span>
      ${data.city ? `<span>📍 ${data.city}</span>` : ''}
      ${data.date ? `<span>🗓️ ${data.date}</span>` : ''}
    </div>
    ${data.intro ? `<p class="curation-intro">${data.intro}</p>` : ''}
    <div class="curation-article" id="curationArticle">
  `;

  // 再把 blocks 一個一個塞進去（文章流）
  (data.blocks || []).forEach(b => {
    if (!b || !b.type) return;

    // 1) 大標段
    if (b.type === 'h2') {
      html += `<h3 class="curation-h2">${b.text || ''}</h3>`;
      return;
    }

    // 2) 內文段落
    if (b.type === 'p') {
      html += `<p class="curation-p">${b.text || ''}</p>`;
      return;
    }

    // 3) 文中店家卡
    if (b.type === 'place-inline') {
      html += `
        <article class="curation-place-inline" data-place-id="${b.placeId || ''}">
          <div class="cpi-thumb" style="${b.thumb ? `background-image:url('${b.thumb}')` : ''}"></div>
          <div class="cpi-meta">
            <div class="cpi-name">${b.name || '未命名店家'}</div>
            ${b.city ? `<div class="cpi-city">${b.city}</div>` : ''}
            ${b.note ? `<div class="cpi-note">${b.note}</div>` : ''}
          </div>
          <button type="button" class="cpi-btn" data-open-place="${b.placeId || ''}">查看店家</button>
        </article>
      `;
      return;
    }

    // 4) 小提醒
    if (b.type === 'tip') {
      html += `
        <div class="curation-tip">
          <span class="ct-badge">小提醒</span>
          <span class="ct-text">${b.text || ''}</span>
        </div>
      `;
      return;
    }

    // 5) 圖片（你之後要加）
    if (b.type === 'img') {
      html += `
        <figure class="curation-img">
          <img src="${b.src}" alt="${b.alt || ''}">
          ${b.caption ? `<figcaption>${b.caption}</figcaption>` : ''}
        </figure>
      `;
      return;
    }
  });

  // 收尾
  html += `
    </div>
    <div class="curation-actions">
      <button class="btn" id="btnCurationShare">分享</button>
      <button class="btn primary" id="btnCurationFav">收藏這篇</button>
    </div>
  `;

  wrap.innerHTML = html;

  // 綁「查看店家」
  wrap.querySelectorAll('[data-open-place]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.openPlace;
      if (window.showPlaceDetail) {
        window.showPlaceDetail(pid);
      } else {
        alert(`之後開店家詳情：${pid || '（無 id）'}`);
      }
    });
  });

  // 分享
  document.getElementById('btnCurationShare')?.addEventListener('click', async () => {
    try {
      await navigator.share?.({
        title: data.title,
        text: data.intro,
        url: location.href
      });
    } catch (_) {}
  });

  // 收藏
  document.getElementById('btnCurationFav')?.addEventListener('click', () => {
    alert('已加入收藏（示意）');
  });
}


// 3) 開 / 關 Overlay
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


// 4) 初始綁定（top bar）
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnCurationBack')?.addEventListener('click', closeCuration);
  document.getElementById('btnCurationMore')?.addEventListener('click', () => {
    alert('之後可以放：編輯 / 分享 / 刪除 / 複製連結');
  });
});

// 5) 提供給別的檔用
window.openCuration = openCuration;
window.closeCuration = closeCuration;