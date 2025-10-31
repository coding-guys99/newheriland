// js/settings.js
// Settings Drawer + 子頁 + 偏好

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const LS = {
  lang:     'pref.lang',
  currency: 'pref.currency',
  dark:     'pref.dark',
  a11y:     'pref.a11y',
};

const DEFAULTS = {
  lang: 'English',
  currency: 'USD',
  dark: 'system',
  a11y: 'off',
};

function loadPref(key, fallback){
  try { return localStorage.getItem(key) ?? fallback; } catch(_) { return fallback; }
}
function savePref(key, val){
  try { localStorage.setItem(key, val); } catch(_) {}
}

function applyDarkMode(mode){
  if (mode === 'on'){
    document.documentElement.classList.add('dark');
    return;
  }
  if (mode === 'off'){
    document.documentElement.classList.remove('dark');
    return;
  }
  // system
  const m = matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.classList.toggle('dark', m.matches);
}

function markCurrentInPanel(panelSel, currentText){
  const panel = $(panelSel); if (!panel) return;
  $$('.option', panel).forEach(btn=>{
    btn.classList.toggle('is-current', btn.textContent.trim() === currentText);
  });
}

function syncUIFromPrefs(){
  const lang = loadPref(LS.lang, DEFAULTS.lang);
  const cur  = loadPref(LS.currency, DEFAULTS.currency);
  const dark = loadPref(LS.dark, DEFAULTS.dark);
  const a11y = loadPref(LS.a11y, DEFAULTS.a11y);

  const langRow = $('#p-settings .set-item[data-target="settings-language"] .value');
  const curRow  = $('#p-settings .set-item[data-target="settings-currency"] .value');
  if (langRow) langRow.textContent = lang;
  if (curRow)  curRow.textContent  = cur;

  const darkChk = $('#toggleDark');
  if (darkChk) darkChk.checked = (dark === 'on');

  const a11yChk = $('#toggleA11y');
  if (a11yChk) a11yChk.checked = (a11y === 'on');

  applyDarkMode(dark);
  document.documentElement.dataset.a11y = (a11y === 'on') ? 'on' : 'off';

  markCurrentInPanel('#settings-language', lang);
  markCurrentInPanel('#settings-currency', cur);
}

/* ---------- Drawer 開/關 ---------- */
window.openSettingsPanel = function(){
  const el = document.getElementById('p-settings');
  if (!el) return;
  el.classList.add('is-open');
  el.hidden = false;
  const head = document.getElementById('h-settings');
  head && head.focus?.({preventScroll:true});
};

window.closeSettingsPanel = function(){
  const el = document.getElementById('p-settings');
  if (!el) return;
  el.classList.remove('is-open');
  // 動畫 280ms 後再藏
  setTimeout(()=> {
    el.hidden = true;
  }, 280);

  // 關掉所有三級
  ['#settings-language','#settings-currency','#settings-privacy','#settings-policy'].forEach(id=>{
    const page = $(id);
    if (page){
      page.classList.remove('active');
      page.setAttribute('hidden','');
    }
  });
};

/* ---------- 開子頁 ---------- */
function openTertiary(id){
  const page = document.getElementById(id); if (!page) return;
  page.hidden = false;
  page.classList.add('active');
  page.querySelector('.settings-title')?.focus({preventScroll:true});
}

/* ---------- 綁事件 ---------- */
function bindEvents(){
  // 頂部齒輪
  const topBtn = document.getElementById('btnOpenSettings');
  if (topBtn){
    topBtn.addEventListener('click', ()=> window.openSettingsPanel());
  }

  // Drawer 裡的返回鍵
  const backBtn = document.getElementById('btnSettingsBack');
  if (backBtn){
    backBtn.addEventListener('click', ()=> window.closeSettingsPanel());
  }

  // 點背景關閉
  document.addEventListener('click', (e)=>{
    if (e.target.matches('.settings-backdrop')){
      window.closeSettingsPanel();
    }
  });

  // 二級 → 第三級
  $$('#p-settings .set-item[data-target]').forEach(btn=>{
    btn.addEventListener('click', ()=> openTertiary(btn.dataset.target));
  });

  // 第三級返回
  $$('.overlay-page.tertiary .sub-back').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const page = e.target.closest('.overlay-page');
      if (page){
        page.classList.remove('active');
        page.setAttribute('hidden','');
        $('#h-settings')?.focus({preventScroll:true});
      }
    });
  });

  // 語言
  $$('#settings-language .option').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.textContent.trim();
      savePref(LS.lang, val);
      syncUIFromPrefs();
    });
  });

  // 幣別
  $$('#settings-currency .option').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.textContent.trim();
      savePref(LS.currency, val);
      syncUIFromPrefs();
    });
  });

  // Dark
  $('#toggleDark')?.addEventListener('change', (e)=>{
    const on = e.target.checked;
    const mode = on ? 'on' : 'system';
    savePref(LS.dark, mode);
    applyDarkMode(mode);
  });

  // A11y
  $('#toggleA11y')?.addEventListener('change', (e)=>{
    const on = e.target.checked ? 'on' : 'off';
    savePref(LS.a11y, on);
    document.documentElement.dataset.a11y = (on === 'on') ? 'on' : 'off';
  });

  // ESC
  window.addEventListener('keydown', (e)=>{
    if (e.key !== 'Escape') return;

    const openedT = $$('.overlay-page.tertiary.active');
    if (openedT.length){
      const page = openedT[openedT.length-1];
      page.classList.remove('active');
      page.setAttribute('hidden','');
      $('#h-settings')?.focus({preventScroll:true});
      return;
    }

    const drawer = document.getElementById('p-settings');
    if (drawer && !drawer.hidden){
      window.closeSettingsPanel();
    }
  });

  // Profile 卡片上的齒輪（如果有放這個 id）
  const cardBtn = document.getElementById('profileCardSettings');
  if (cardBtn){
    cardBtn.addEventListener('click', ()=> window.openSettingsPanel());
  }

  // Profile 裡那行「開啟設定」（如果你有加 id）
  const listBtn = document.getElementById('plOpenSettings');
  if (listBtn){
    listBtn.addEventListener('click', ()=> window.openSettingsPanel());
  }

  // 系統深色變化
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', ()=>{
    const dark = loadPref(LS.dark, DEFAULTS.dark);
    if (dark === 'system') applyDarkMode('system');
  });
}

/* ---------- 初始化 ---------- */
function safeInit(){
  if (!$('#p-settings')) return false;
  syncUIFromPrefs();
  bindEvents();
  return true;
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (safeInit()) return;
  const obs = new MutationObserver(()=>{ if (safeInit()) obs.disconnect(); });
  obs.observe(document.body, { childList:true, subtree:true });
});
document.addEventListener('include:loaded', ()=> safeInit());
