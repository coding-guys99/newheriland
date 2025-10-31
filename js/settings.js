// js/settings.js
// 單一來源負責 Settings：開/關、子頁導覽、偏好持久化（localStorage）與回填

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

function loadPref(key, fallback){ try { return localStorage.getItem(key) ?? fallback; } catch(_) { return fallback; } }
function savePref(key, val){ try { localStorage.setItem(key, val); } catch(_) {} }

function applyDarkMode(mode){
  // mode: 'on' | 'off' | 'system'
  if (mode === 'on'){ document.documentElement.classList.add('dark');  return; }
  if (mode === 'off'){document.documentElement.classList.remove('dark'); return; }
  // system
  const m = matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.classList.toggle('dark', m.matches);
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
  langRow && (langRow.textContent = lang);
  curRow  && (curRow.textContent  = cur);

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

function markCurrentInPanel(panelSel, currentText){
  const panel = $(panelSel); if (!panel) return;
  $$('.option', panel).forEach(btn => {
    btn.classList.toggle('is-current', btn.textContent.trim() === currentText);
  });
}

function openSettings(){
  const p = $('#p-settings'); if (!p) return;
  p.hidden = false;
  p.classList.add('active');
  $('#h-settings')?.focus({preventScroll:true});
}

function closeSettings(){
  const p = $('#p-settings'); if (!p) return;
  p.classList.remove('active');
  p.setAttribute('hidden','');
  // 關掉已開的三級頁
  ['#settings-language','#settings-currency','#settings-privacy','#settings-policy'].forEach(id=>{
    const page = $(id);
    if (page){ page.classList.remove('active'); page.setAttribute('hidden',''); }
  });
}

function openTertiary(id){
  const page = document.getElementById(id); if (!page) return;
  page.hidden = false;
  page.classList.add('active');
  page.querySelector('.settings-title')?.focus({preventScroll:true});
}

function bindEvents(){
  // 開關入口
  $('#btnOpenSettings')?.addEventListener('click', openSettings);
  $('#btnSettingsBack')?.addEventListener('click', closeSettings);

  // 二級 -> 第三級
  $$('#p-settings .set-item[data-target]').forEach(btn=>{
    btn.addEventListener('click', ()=> openTertiary(btn.dataset.target));
  });

  // 第三級返回
  $$('.overlay-page.tertiary .sub-back').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const page = e.target.closest('.overlay-page');
      if (page){ page.classList.remove('active'); page.setAttribute('hidden',''); $('#h-settings')?.focus({preventScroll:true}); }
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
    if (e.key === 'Escape'){
      // 若有任何 tertiary 開啟，先關 tertiary
      const opened = $$('.overlay-page.tertiary.active');
      if (opened.length){
        const page = opened[opened.length-1];
        page.classList.remove('active'); page.setAttribute('hidden',''); $('#h-settings')?.focus({preventScroll:true});
        return;
      }
      // 否則關閉二級
      const s = $('#p-settings');
      if (s && !s.hidden) closeSettings();
    }
  });

  // 當系統深淺色改變時，若是 system 模式就跟著變
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', ()=>{
    const dark = loadPref(LS.dark, DEFAULTS.dark);
    if (dark === 'system') applyDarkMode('system');
  });
}

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

const btnProfileCardSettings = document.getElementById('profileCardSettings');
if (btnProfileCardSettings) {
  btnProfileCardSettings.addEventListener('click', () => {
    // 方式 1：走 hash（tabbar.js 會幫你叫 openSettingsPanel）
    location.hash = '#settings';

    // 方式 2：你等下要做的 drawer，可以直接叫
    // if (window.openSettingsPanel) window.openSettingsPanel();
  });
}