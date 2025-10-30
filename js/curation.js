// js/curation.js — 在地策展文章（使用共用 detail-overlay 浮層）

import { openDetailView } from './detail-overlay.js';

//
// 範例資料（可替換為 Supabase 內容）
//
const CURATION_SAMPLE = {
  id: 'kch-weekend-01',
  hero: 'https://picsum.photos/1200/700?c=1',
  title: '週末在古晉這樣玩：老街 → 咖啡 → 河畔夜拍',
  author: 'Sarawak Foodie',
  authorAvatar: 'https://i.pravatar.cc/100?img=4',
  city: 'Kuching',
  date: '2025-10-30',
  intro: '給第一次來古晉、但又不想跟團的人。下面每一段都是可以獨立拆開走的。',
  blocks: [
    { type: 'h2', text: '1. 早上先繞老街' },
    { type: 'p',  text: '09:30 前人比較少，路邊小吃可以慢慢拍。記得先吃一點，不然後面幾個點會排隊。' },
    { type: 'place-inline',
      placeId: 'cat-laksa',
      name: '老街砂拉越叻沙',
      city: 'Kuching Old Town',
      note: '只吃一碗就吃這家'
    },
    { type: 'p',  text: '吃完可以往河邊走，路上會經過一段老房子，很好拍。' },
    { type: 'tip', text: '假日 16:00 前到，不然背景會亂。' },
    { type: 'h2', text: '2. 下午去河畔拍 vlog' },
    { type: 'p',  text: '沿河這段的光線 15:30~16:30 最漂亮，想拍 Reels 可以抓這段時間。' },
    { type: 'place-inline',
      placeId: 'river-diner',
      name: 'Riverside Diner',
      city: 'Waterfront'
    }
  ]
};

//
// 將 curation blocks 轉成 HTML 片段
//
function renderCurationToHTML(data){
  let html = '';

  // 導言區
  html += `
    <div class="meta-line" style="margin-bottom:8px">
      ${data.authorAvatar ? `<img src="${data.authorAvatar}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover">` : ''}
      <span>${data.author||'Local Curator'}</span>
      ${data.city ? `<span>📍${data.city}</span>` : ''}
      ${data.date ? `<span>🗓️${data.date}</span>` : ''}
    </div>
    ${data.intro ? `<p class="desc">${data.intro}</p>` : ''}
    <hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:10px 0;">`;

  // 主體內容
  (data.blocks||[]).forEach(b=>{
    if (b.type === 'h2'){
      html += `<h2 style="font-size:17px;font-weight:800;margin:14px 0 6px;">${b.text}</h2>`;
    }
    else if (b.type === 'p'){
      html += `<p class="desc" style="margin-bottom:8px;">${b.text}</p>`;
    }
    else if (b.type === 'tip'){
      html += `
        <div style="background:rgba(46,94,78,.08);padding:8px 10px;border-radius:10px;font-size:13px;margin:8px 0;">
          <strong>小提醒：</strong>${b.text}
        </div>`;
    }
    else if (b.type === 'place-inline'){
      html += `
        <div class="curation-inline-place" data-open-place="${b.placeId||''}" 
             style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f8fafc;border-radius:10px;margin:8px 0;cursor:pointer;">
          <div style="flex:1;">
            <div style="font-weight:700;">${b.name||'未命名店家'}</div>
            <div style="font-size:13px;color:#6b7280;">${b.city||''}</div>
            ${b.note ? `<div style="font-size:13px;color:#374151;">${b.note}</div>` : ''}
          </div>
          <div style="font-size:13px;color:#2563eb;">查看</div>
        </div>`;
    }
  });

  // 綁定「查看店家」事件
  setTimeout(()=>{
    document.querySelectorAll('[data-open-place]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const pid = btn.dataset.openPlace;
        if (window.showPlaceDetail) window.showPlaceDetail(pid);
        else alert(`之後會開啟店家詳情：${pid || '（無 id）'}`);
      });
    });
  },50);

  return html;
}

//
// 封裝：開啟策展詳情浮層
//
export function openCuration(data = CURATION_SAMPLE){
  const html = renderCurationToHTML(data);
  openDetailView({
    headerTitle: '在地策展',
    hero: data.hero,
    bodyHTML: `
      <div class="title-lg">${data.title}</div>
      ${html}
    `,
    actions: [
      {
        id: 'share',
        label: '分享',
        onClick: async ()=>{
          try {
            await navigator.share?.({ title: data.title, text: data.intro, url: location.href });
          } catch(_){}
        }
      },
      {
        id: 'fav',
        label: '收藏這篇',
        primary: true,
        onClick: ()=>alert('已加入收藏（示意）')
      }
    ]
  });
}

// 給外部（例如 curator.js）呼叫
window.openCuration = openCuration;