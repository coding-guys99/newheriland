import { openDetailTemplate } from './detail.js';

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

const EXPERIENCES = [
  {
    id:'xp-sarawak-museum',
    title:'砂拉越博物館：穿越百年的人類學收藏',
    cover:'https://picsum.photos/800/450?museum',
    city:'Kuching',
    tags:['culture','family','weekend'],
    summary:'東南亞頂尖的人類學與天然史館藏，一次走讀砂拉越百年歷史。',
    description:'以輕導覽為主，推薦親子與第一次到古晉的旅人。',
    steps:[
      {title:'導覽參觀',subtitle:'歷史展區、自然展區約 1.5 小時'},
      {title:'互動體驗',subtitle:'民族服飾區拍照留念'}
    ]
  },
  {
    id:'xp-kampung-foodwalk',
    title:'甘榜美食散步：在地早餐與早市文化',
    cover:'https://picsum.photos/800/450?food',
    city:'Sibu',
    tags:['food','culture','weekend'],
    summary:'跟著在地人走早市，米糕、乾盤麵、傳統糕點一路吃。',
    description:'無需預約；清晨集合，路線 1.5–2 小時。',
    steps:[
      {title:'市場集合',subtitle:'介紹當地食材與故事'},
      {title:'早餐巡禮',subtitle:'乾盤麵＋米糕＋傳統甜品'}
    ]
  },
  {
    id:'xp-sunset-kayak',
    title:'紅樹林黃昏獨木舟',
    cover:'https://picsum.photos/800/450?kayak',
    city:'Miri',
    tags:['outdoor','weekend','family'],
    summary:'在導教陪同下，安全體驗潟湖水道與夕陽金光。',
    description:'適合初學者，救生衣與基本裝備包含在內。',
    steps:[
      {title:'簡介與訓練',subtitle:'安全講解＋基本動作'},
      {title:'日落划行',subtitle:'欣賞黃昏光影與紅樹林'}
    ]
  }
];

// 狀態
const state={ tags:new Set(['culture','food','outdoor','handcraft','family','weekend']),
               cities:new Set(['kuching','sibu','miri','mukah']) };

function applyFilter(){
  return EXPERIENCES.filter(x=>{
    const hitTag = x.tags.some(t=>state.tags.has(t));
    const hitCity = state.cities.has(x.city.toLowerCase());
    return hitTag && hitCity;
  });
}

function renderList(){
  const box=$('#xpList'); const list=applyFilter();
  if(!list.length){ box.innerHTML=''; $('#xpEmpty').hidden=false; return; }
  $('#xpEmpty').hidden=true;
  box.innerHTML=list.map(x=>`
    <article class="xp-card" data-id="${x.id}">
      <div class="xp-cover" style="background-image:url('${x.cover}')"></div>
      <div class="xp-body">
        <h3 class="xp-title">${x.title}</h3>
        <div class="xp-meta">📍 ${x.city}</div>
        <p class="xp-sum">${x.summary}</p>
        <div class="xp-foot">
          <button class="xp-btn" data-act="share" data-id="${x.id}">分享</button>
          <button class="xp-btn primary" data-act="detail" data-id="${x.id}">看介紹</button>
        </div>
      </div>
    </article>
  `).join('');
}

// 綁定
document.addEventListener('DOMContentLoaded',()=>{
  $$('#xpMain [data-tag]').forEach(chip=>{
    chip.addEventListener('click',()=>{
      const on=chip.classList.toggle('is-on');
      chip.setAttribute('aria-pressed',on);
      const tag=chip.dataset.tag;
      if(on) state.tags.add(tag); else state.tags.delete(tag);
      renderList();
    });
  });
  $$('#xpMain [data-city]').forEach(chip=>{
    chip.addEventListener('click',()=>{
      const on=chip.classList.toggle('is-on');
      chip.setAttribute('aria-pressed',on);
      const city=chip.dataset.city;
      if(on) state.cities.add(city); else state.cities.delete(city);
      renderList();
    });
  });
  $('#xpList').addEventListener('click',e=>{
    const btn=e.target.closest('.xp-btn'); if(!btn) return;
    const id=btn.dataset.id; const act=btn.dataset.act;
    const xp=EXPERIENCES.find(x=>x.id===id);
    if(!xp) return;
    // 原本：openDetailTemplate({...})
if (act === 'detail' && id) {
  location.href = `./partial/xp-detail.html?id=${encodeURIComponent(id)}`;
}
    }
    if(act==='share'){
      navigator.share?.({title:xp.title,text:xp.summary,url:location.href});
    }
  });
  renderList();
});