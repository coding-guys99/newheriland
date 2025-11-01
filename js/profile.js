// js/profile.js — HeriLand profile page actions
(function () {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function lsGet(k, fb=null){ try{ const v=localStorage.getItem(k); return v===null?fb:v; }catch(e){return fb;} }
  function lsSet(k,v){ try{ localStorage.setItem(k,v);}catch(_){} }

  function fillProfileFromStorage(){
    const name    = lsGet('hl.pref.name','Guest User');
    const tagline = lsGet('hl.pref.tagline','Discovering Sarawak');
    const avatar  = lsGet('hl.pref.avatar','H');
    $('#profileCardName')?.textContent = name;
    $('#profileCardTagline')?.textContent = tagline;
    $('#profileCardAvatar')?.textContent = (avatar||'H').toString().slice(0,1).toUpperCase();
  }

  function bindProfileActions(){
    // 齒輪
    $('#profileCardSettings')?.addEventListener('click',()=>window.hlOpenDrawer?.());

    // 快捷鍵
    $('#pQuickFavs')?.addEventListener('click',()=>openMyFavorites());
    $('#pQuickReviews')?.addEventListener('click',()=>openMyReviews());
    $('#pQuickCoupons')?.addEventListener('click',()=>openCoupons());
    $('#pQuickPost')?.addEventListener('click',()=>openPhotoSubmit());

    // 我的內容
    $('#pMyFavs')?.addEventListener('click',()=>openMyFavorites());
    $('#pMyReviews')?.addEventListener('click',()=>openMyReviews());
    $('#pMyTrips')?.addEventListener('click',()=>showPage('my-experiences')); // ✅ 只保留這一行

    // 平台互動
    $('#pPhotoSubmit')?.addEventListener('click',()=>openPhotoSubmit());
    $('#pFeedback')?.addEventListener('click',()=>openFeedback());
    $('#pContact')?.addEventListener('click',()=>contactSupport());
    $('#pForMerchant')?.addEventListener('click',()=>openMerchantJoin());

    // 下方四格
    $('#pAboutHL')?.addEventListener('click',()=>openAbout());
    $('#pRateHL')?.addEventListener('click',()=>window.openRateModal?.());
    $('#pTerms')?.addEventListener('click',()=>openTerms());
    $('#plOpenSettings')?.addEventListener('click',()=>window.hlOpenDrawer?.());

    // 登出
    $('#pLogout')?.addEventListener('click',()=>doLogout());
  }

  function openMyFavorites(){ showPage('saved'); }
  function openMyReviews(){ showPage('reviews'); }
  function openCoupons(){ alert('優惠券 / 任務功能尚未開放（demo）'); }
  function openPhotoSubmit(){ showPage('photo-submit'); }
  function openFeedback(){ showPage('feedback'); }
  function contactSupport(){ showPage('contact'); }
  function openMerchantJoin(){ showPage('merchant'); }
  function openAbout(){ showPage('about'); }
  function openTerms(){ showPage('terms'); }

  function doLogout(){
    if(!confirm('確定要登出嗎？'))return;
    lsSet('hl.pref.name','Guest User');
    lsSet('hl.pref.tagline','Discovering Sarawak');
    lsSet('hl.pref.role','Guest');
    lsSet('hl.pref.avatar','H');
    window.hlSyncUI?.();
    fillProfileFromStorage();
    alert('已登出（demo）');
  }

  window.addEventListener('hl:userUpdated',fillProfileFromStorage);
  document.addEventListener('DOMContentLoaded',()=>{ fillProfileFromStorage(); bindProfileActions(); });
})();