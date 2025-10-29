// js/xp-detail.js
const $ = (s,r=document)=>r.querySelector(s);

// 暫時與入口同樣資料；之後可改成從 Supabase 以 id 讀取
const DATA = [
  { id:'xp-sarawak-museum',
    title:'砂拉越博物館：穿越百年的人類學收藏',
    cover:'https://picsum.photos/800/450?museum',
    city:'Kuching',
    tags:['culture','family','weekend'],
    summary:'東南亞頂尖的人類學與天然史館藏，一次走讀砂拉越百年歷史。',
    description:'以輕導覽為主，推薦親子與第一次到古晉的旅人。',
    steps:[{title:'導覽參觀',subtitle:'歷史展區、自然展區約 1.5 小時'},
           {title:'互動體驗',subtitle:'民族服飾區拍照留念'}] },
  { id:'xp-kampung-foodwalk',
    title:'甘榜美食散步：在地早餐與早市文化',
    cover:'https://picsum.photos/800/450?food',
    city:'Sibu',
    tags:['food','culture','weekend'],
    summary:'跟著在地人走早市，米糕、乾盤麵、傳統糕點一路吃。',
    description:'無需預約；清晨集合，路線 1.5–2 小時。',
    steps:[{title:'市場集合',subtitle:'介紹當地食材與故事'},
           {title:'早餐巡禮',subtitle:'乾盤麵＋米糕＋傳統甜品'}] },
  { id:'xp-sunset-kayak',
    title:'紅樹林黃昏獨木舟',
    cover:'https://picsum.photos/800/450?kayak',
    city:'Miri',
    tags:['outdoor','weekend','family'],
    summary:'在導教陪同下，安全體驗潟湖水道與夕陽金光。',
    description:'適合初學者，救生衣與基本裝備包含在內。',
    steps:[{title:'簡介與訓練',subtitle:'安全講解＋基本動作'},
           {title:'日落划行',subtitle:'欣賞黃昏光影與紅樹林'}] },
];

function q(key){return new URL(location.href).searchParams.get(key);}
function stepItem(s,i){ return `
  <div class="detail-step">
    <div class="dot"></div>
    <div class="step-body">
      <div class="step-title">Step ${i+1}｜${s.title}</div>
      ${s.subtitle?`<div class="step-sub">${s.subtitle}</div>`:''}
    </div>
  </div>`; }

function render(x){
  document.title = `${x.title} | HeriLand`;
  $('#detailRoot').innerHTML = `
    <div class="detail-card">
      <div class="detail-hero" style="background-image:url('${x.cover}')"></div>
      <div class="detail-body">
        <h2 class="detail-h2">${x.title}</h2>
        <div class="detail-meta">
          <span>👥 建議：2–6 人</span>
          <span>📍 ${x.city}</span>
          <span>${x.tags.map(t=>`#${t}`).join(' ')}</span>
        </div>
        <p class="detail-summary">${x.description || x.summary || ''}</p>
        <div class="detail-steps">
          ${(x.steps||[]).map(stepItem).join('')}
        </div>
        <div class="detail-actions">
          <button class="btn" id="btnFav">收藏</button>
          <a class="btn primary" href="explore.html#city=${x.city.toLowerCase()}">去城市館</a>
        </div>
      </div>
    </div>`;
  $('#btnFav')?.addEventListener('click',()=>alert('已收藏'));
}

const id = q('id');
const xp = DATA.find(d=>d.id===id);
if(!xp){
  $('#detailRoot').innerHTML = `<p style="text-align:center;color:#64748b">找不到這個體驗。</p>`;
}else{
  render(xp);
}