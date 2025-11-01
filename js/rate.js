function rateApp(){
  const modal = document.getElementById('rateAppModal');
  if (!modal) return;
  modal.hidden = false;

  const btnYes = document.getElementById('btnRateYes');
  const btnCancel = document.getElementById('btnRateCancel');

  const iosUrl = 'https://apps.apple.com/app/idXXXXXXXX'; // ←換成你的 App Store 連結
  const androidUrl = 'https://play.google.com/store/apps/details?id=com.heriland.app'; // ←換成你的 Google Play 連結
  const webFallback = 'https://heriland.app';

  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  btnYes.onclick = ()=>{
    if (isIOS) window.open(iosUrl, '_blank');
    else if (isAndroid) window.open(androidUrl, '_blank');
    else window.open(webFallback, '_blank');
    modal.hidden = true;
  };

  btnCancel.onclick = ()=> modal.hidden = true;
  modal.addEventListener('click', e=>{
    if (e.target === modal) modal.hidden = true;
  });
}