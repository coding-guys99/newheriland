// js/settings.js
// 單一來源負責 Settings：開/關（右側 drawer）、子頁導覽、偏好持久化（localStorage）與回填

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const LS = {
  lang:     'pref.lang',
  currency: 'pref.currency',
  dark:     'pref.dark',    // 'on' | 'off' | 'system'
  a11y:     'pref.a11y',    // 'on' | 'off'
};

const DEFAULTS = {
  lang: 'English',
  currency: 'USD',
  dark: 'system',  // 跟隨系統
  a11y: 'off',
};

function loadPref(key, fallback){
  try { return localStorage.getItem(key) ?? fallback; } catch(_) { return fallback; }
}
function savePref(key, val){
  try { localStorage.setItem(key, val); } catch(_) {}
}

function applyDarkMode(mode){
  // mode: 'on' | 'off' | 'system'
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
  $$('.option', panel).forEach(btn => {
    btn.classList.toggle('is-current', btn.textContent.trim() === currentText);
  });
}

function syncUIFromPrefs(){
  // 把值回填到二級頁的 value 欄位、開關狀態
  const lang = loadPref(LS.lang, DEFAULTS.lang);
  const cur  = loadPref(LS.currency, DEFAULTS.currency);
  const dark = loadPref(LS.dark, DEFAULTS.dark);
  const a11y = loadPref(LS.a11y, DEFAULTS.a11y);

  // PREFERENCES 卡上的 value
  const langRow = $('#p-settings .set-item[data-target="settings-language"] .value');
  const curRow  = $('#p-settings .set-item[data-target="settings-currency"] .value');
  if (langRow) langRow.textContent = lang;
  if (curRow)  curRow.textContent  = cur;

  // Dark Mode：用開關代表是否「強制開啟」
  const darkChk = $('#toggleDark');
  if (darkChk) darkChk.checked = (dark === 'on');

  // A11y
  const a11yChk = $('#toggleA11y');
  if (a11yChk) a11yChk.checked = (a11y === 'on');

  // 應用 Dark 到根節點
  applyDarkMode(dark);
  // A11y 標記
  document.documentElement.dataset.a11y = (a11y === 'on') ? 'on' : 'off';

  // 第三級頁的目前選擇打勾
  markCurrentInPanel('#settings-language', lang);
  markCurrentInPanel('#settings-currency', cur);
}

/* ======================
   Drawer 開/關
   ====================== */

// 全域開啟（給 tabbar.js 用）
window.openSettingsPanel = function(){
  const el = document.getElementById('p-settings');
  if (!el) return;
  el.classList.add('is-open');
  el.hidden = false;
  // 聚焦主標題
  const head = document.getElementById('h-settings');
  head && head.focus?.({ preventScroll: true });
};

// 全域關閉
window.closeSettingsPanel = function(){
  const el = document.getElementById('p-settings');
  if (!el) return;
  el.classList.remove('is-open');
  // 動畫跑完再真正 hidden
  setTimeout(()=> {
    el.hidden = true;
  }, 280);

  // 關掉已開的第 3 級
  ['#settings-language','#settings-currency','#settings-privacy','#settings-policy'].forEach(id=>{
    const page = $(id);
    if (page){
      page.classList.remove('active');
      page.setAttribute('hidden','');
    }
  });
};

/* ======================
   第三級開啟
   ====================== */
function openTertiary(id){
  const page = document.getElementById(id); if (!page) return;
  page.hidden = false;
  page.classList.add('active');
  page.querySelector('.settings-title')?.focus({preventScroll:true});
}

/* ======================
   綁定事件
   ====================== */
function bindEvents(){
  // 頂部的設定鈕（header 那顆）
  $('#btnOpenSettings')?.addEventListener('click', window.openSettingsPanel);

  // Drawer 裡的返回鍵
  $('#btnSettingsBack')?.addEventListener('click', window.closeSettingsPanel);

  // 點背景關閉
  document.addEventListener('click', (e)=>{
    if (e.target.matches('.settings-backdrop')) {
      window.closeSettingsPanel();
    }
  });

  // 二級 → 第三級
  $$('#p-settings .set-item[data-target]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      openTertiary(btn.dataset.target);
    });
  });

  // 第三級返回
  $$('.overlay-page.tertiary .sub-back').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const page = e.target.closest('.overlay-page');
      if (page){
        page.classList.remove('active');
        page.setAttribute('hidden','');
        // 回到 drawer 標題
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
      // TODO：若你有 i18n，這裡觸發 i18n 切換
    });
  });

  // 幣別
  $$('#settings-currency .option').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.textContent.trim();
      savePref(LS.currency, val);
      syncUIFromPrefs();
      // TODO：觸發價格顯示刷新
    });
  });

  // Dark：勾代表「強制開啟」，取消代表「跟隨系統」
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

  // Esc 關閉
  window.addEventListener('keydown', (e)=>{
    if (e.key !== 'Escape') return;

    // 先關第 3 級
    const opened = $$('.overlay-page.tertiary.active');
    if (opened.length){
      const page = opened[opened.length-1];
      page.classList.remove('active');
      page.setAttribute('hidden','');
      $('#h-settings')?.focus({preventScroll:true});
      return;
    }

    // 否則關閉 drawer
    const s = $('#p-settings');
    if (s && !s.hidden){
      window.closeSettingsPanel();
    }
  });

  // 系統深淺色改變時同步
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', ()=>{
    const dark = loadPref(LS.dark, DEFAULTS.dark);
    if (dark === 'system') applyDarkMode('system');
  });

  // Profile 卡片上的那顆小齒輪（若有）
  const btnProfileCardSettings = document.getElementById('profileCardSettings');
  if (btnProfileCardSettings) {
    btnProfileCardSettings.addEventListener('click', () => {
      // 你也可以改成 location.hash = '#settings'
      window.openSettingsPanel();
    });
  }

  // Profile 裡列表那行「開啟設定」如果你有給 id
  const plOpenSettings = document.getElementById('plOpenSettings');
  if (plOpenSettings){
    plOpenSettings.addEventListener('click', () => {
      window.openSettingsPanel();
    });
  }
}

/* ======================
   初始化
   ====================== */
function safeInit(){
  // 確保 DOM 上已經有 settings 結構（若你曾用 <include>）
  if (!$('#p-settings')) return false;
  syncUIFromPrefs();
  bindEvents();
  return true;
}

// 初始化：支援直接在頁面內、也支援 include.js 動態插入
document.addEventListener('DOMContentLoaded', ()=>{
  if (safeInit()) return;
  const obs = new MutationObserver(()=>{ if (safeInit()) obs.disconnect(); });
  obs.observe(document.body, { childList:true, subtree:true });
});
document.addEventListener('include:loaded', ()=> safeInit());
