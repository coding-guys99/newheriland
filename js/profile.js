// js/profile.js — HeriLand profile page actions (skeleton)

(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // 安全讀/寫（跟 settings 一樣寫法）
  function lsGet(k, fb=null){ try { return localStorage.getItem(k) ?? fb; } catch(e){ return fb; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

  // 把目前使用者資料灌回 Profile 畫面
  function fillProfileFromStorage(){
    const name    = lsGet('hl.pref.name', 'Guest User');
    const tagline = lsGet('hl.pref.tagline', 'Discovering Sarawak');
    const avatar  = lsGet('hl.pref.avatar', 'H');

    const elName = $('#profileCardName');
    const elTag  = $('#profileCardTagline');
    const elAva  = $('#profileCardAvatar');

    if (elName) elName.textContent = name;
    if (elTag)  elTag.textContent  = tagline;
    if (elAva)  elAva.textContent  = avatar ? avatar.toString().slice(0,1).toUpperCase() : 'H';
  }

  // ====== 點擊行為們 ======
  function bindProfileActions(){
    // 1) 卡片上的齒輪 → 開設定
    $('#profileCardSettings')?.addEventListener('click', ()=>{
      if (window.hlOpenDrawer) window.hlOpenDrawer();
    });

    // 2) 上方 4 個快捷鍵
    $('#pQuickFavs')?.addEventListener('click', ()=> openMyFavorites());
    $('#pQuickReviews')?.addEventListener('click', ()=> openMyReviews());
    $('#pQuickCoupons')?.addEventListener('click', ()=> openCoupons());
    $('#pQuickPost')?.addEventListener('click', ()=> openPhotoSubmit());

    // 3) 「我的內容」三個
    $('#pMyFavs')?.addEventListener('click', ()=> openMyFavorites());
    $('#pMyReviews')?.addEventListener('click', ()=> openMyReviews());
    $('#pMyTrips')?.addEventListener('click', ()=> {
      alert('行程 / 體驗功能尚未開放（demo）');
    });

    // 4) 平台互動
    $('#pPhotoSubmit')?.addEventListener('click', ()=> openPhotoSubmit());
    $('#pFeedback')?.addEventListener('click', ()=> openFeedback());
    $('#pContact')?.addEventListener('click', ()=> contactSupport());
    $('#pForMerchant')?.addEventListener('click', ()=> openMerchantJoin());

    // 5) 下方 4 格卡
    $('#pAboutHL')?.addEventListener('click', ()=> openAbout());
    $('#pRateHL')?.addEventListener('click', ()=> rateApp());
    $('#pTerms')?.addEventListener('click', ()=> openTerms());
    $('#plOpenSettings')?.addEventListener('click', ()=>{
      if (window.hlOpenDrawer) window.hlOpenDrawer();
    });

    // 6) 登出
    $('#pLogout')?.addEventListener('click', ()=> doLogout());
  }

  // ====== 實際行為（之後你要換成真的頁面，就改這邊） ======

  function openMyFavorites(){
  showPage('saved');      // ← 你自己的 router 名字
}


  function openMyReviews(){
  showPage('reviews');
}


  function openCoupons(){
    alert('優惠券 / 任務功能尚未開放（demo）');
  }

  function openPhotoSubmit(){
  showPage('photo-submit');
}


  function openFeedback(){
    alert('開啟意見回饋表單（demo）');
  }

  function contactSupport(){
  showPage('contact');
}

  function openMerchantJoin(){
    alert('導向「我要合作 / 成為商家」頁（demo）');
  }

  function openAbout(){
    alert('HeriLand 是砂拉越在地旅遊 / 商家探索工具（demo 純文案）');
  }

  function rateApp(){
    alert('感謝支持！正式版會開啟商店評分連結。');
  }

  function openTerms(){
    alert('這裡會打開「使用條款 / 隱私權政策」頁（demo）');
  }

  function doLogout(){
    const ok = confirm('確定要登出嗎？');
    if (!ok) return;

    // demo：把幾個跟使用者有關的鍵清掉
    lsSet('hl.pref.name', 'Guest User');
    lsSet('hl.pref.tagline', 'Discovering Sarawak');
    lsSet('hl.pref.role', 'Guest');
    // avatar 也可以回預設
    lsSet('hl.pref.avatar', 'H');

    // 讓 settings + profile 都重新渲染
    if (window.hlSyncUI) window.hlSyncUI();
    fillProfileFromStorage();

    alert('已登出（demo）');
  }

  // ====== 讓別的地方改資料時，這頁也會跟著變 ======
  window.addEventListener('hl:userUpdated', (ev)=>{
    // ev.detail 可能有 name / tagline
    fillProfileFromStorage();
  });

  // ====== 初始化 ======
  document.addEventListener('DOMContentLoaded', ()=>{
    fillProfileFromStorage();
    bindProfileActions();
  });

})();