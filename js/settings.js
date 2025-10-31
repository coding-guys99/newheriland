// js/settings.js — HeriLand new settings drawer
const LS_KEYS = {
  lang: 'hl.pref.lang',
  cur:  'hl.pref.cur',
  dark: 'hl.pref.dark',
  a11y: 'hl.pref.a11y'
};
const DEF = {
  lang: 'English',
  cur:  'USD',
  dark: 'system',
  a11y: 'off'
};

function lsGet(k, fb){ try { return localStorage.getItem(k) ?? fb; } catch(_) { return fb; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(_){} }

function applyDark(mode){
  if (mode === 'on'){ document.documentElement.classList.add('dark'); return; }
  if (mode === 'off'){ document.documentElement.classList.remove('dark'); return; }
  const m = matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.classList.toggle('dark', m.matches);
}

function openDrawer(){
  const box = document.getElementById('hlSettingsDrawer');
  if (!box) return;
  box.classList.add('is-open');
  box.setAttribute('aria-hidden','false');
  box.querySelector('.hl-set__panel')?.focus?.();
}
function closeDrawer(){
  const box = document.getElementById('hlSettingsDrawer');
  if (!box) return;
  box.classList.remove('is-open');
  box.setAttribute('aria-hidden','true');
  // 關掉所有子 sheet
  document.querySelectorAll('.hl-sub').forEach(s=>{
    s.classList.remove('is-open');
    s.setAttribute('aria-hidden','true');
  });
}
function openSheet(name){
  const s = document.getElementById('hlSetSheet-'+name);
  if (!s) return;
  s.classList.add('is-open');
  s.setAttribute('aria-hidden','false');
}
function closeSheet(node){
  node.classList.remove('is-open');
  node.setAttribute('aria-hidden','true');
}

function syncSettingsUI(){
  const lang = lsGet(LS_KEYS.lang, DEF.lang);
  const cur  = lsGet(LS_KEYS.cur,  DEF.cur);
  const dark = lsGet(LS_KEYS.dark, DEF.dark);
  const a11y = lsGet(LS_KEYS.a11y, DEF.a11y);

  const langLbl = document.getElementById('hlSetLangVal');
  const curLbl  = document.getElementById('hlSetCurVal');
  if (langLbl) langLbl.textContent = lang;
  if (curLbl)  curLbl.textContent  = cur;

  const darkChk = document.getElementById('hlSetDark');
  if (darkChk) darkChk.checked = (dark === 'on');

  const a11yChk = document.getElementById('hlSetA11y');
  if (a11yChk) a11yChk.checked = (a11y === 'on');

  applyDark(dark);
  document.documentElement.dataset.a11y = (a11y === 'on') ? 'on' : 'off';

  // 標記 sub 裡面選到哪一個
  document.querySelectorAll('#hlSetSheet-lang .hl-sub__opt').forEach(btn=>{
    btn.classList.toggle('is-current', btn.dataset.val === lang);
  });
  document.querySelectorAll('#hlSetSheet-currency .hl-sub__opt').forEach(btn=>{
    btn.classList.toggle('is-current', btn.dataset.val === cur);
  });
}

function bindSettings(){
  const box = document.getElementById('hlSettingsDrawer');
  if (!box) return;

  // 背景 & 上方返回
  box.querySelectorAll('[data-hl-set-close]').forEach(btn=>{
    btn.addEventListener('click', closeDrawer);
  });

  // 內部點擊不要關
  box.querySelector('.hl-set__panel')?.addEventListener('click', e=> {
    e.stopPropagation();
  });

  // 真的點到 backdrop 才關
  box.addEventListener('click', e=>{
    if (e.target === box) closeDrawer();
  });

  // 二級 → 子頁
  box.querySelectorAll('[data-hl-set-open]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-hl-set-open');
      openSheet(name);
    });
  });

  // 子頁關閉
  box.querySelectorAll('[data-hl-sub-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const s = btn.closest('.hl-sub');
      if (s) closeSheet(s);
    });
  });

  // 語言選擇
  document.querySelectorAll('#hlSetSheet-lang .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      lsSet(LS_KEYS.lang, val);
      syncSettingsUI();
      closeSheet(btn.closest('.hl-sub'));
    });
  });

  // 貨幣
  document.querySelectorAll('#hlSetSheet-currency .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      lsSet(LS_KEYS.cur, val);
      syncSettingsUI();
      closeSheet(btn.closest('.hl-sub'));
    });
  });

  // Dark
  document.getElementById('hlSetDark')?.addEventListener('change', e=>{
    const on = e.target.checked;
    const mode = on ? 'on' : 'system';
    lsSet(LS_KEYS.dark, mode);
    applyDark(mode);
  });

  // A11y
  document.getElementById('hlSetA11y')?.addEventListener('change', e=>{
    const on = e.target.checked ? 'on' : 'off';
    lsSet(LS_KEYS.a11y, on);
    document.documentElement.dataset.a11y = on;
  });

  // Esc
  window.addEventListener('keydown', e=>{
    if (e.key === 'Escape'){
      // 若子頁開著先關子頁
      const opened = document.querySelector('.hl-sub.is-open');
      if (opened){ closeSheet(opened); return; }
      closeDrawer();
    }
  });

  // ===== 外部入口 =====
  // Header 那顆
  document.getElementById('btnOpenSettings')?.addEventListener('click', openDrawer);
  // Profile 卡片上的齒輪
  document.getElementById('profileCardSettings')?.addEventListener('click', openDrawer);
  // Profile 列表「開啟設定」
  document.getElementById('plOpenSettings')?.addEventListener('click', openDrawer);

  // tabbar.js 可能會呼叫 #settings
  window.openSettingsPanel = openDrawer;
}

document.addEventListener('DOMContentLoaded', ()=>{
  bindSettings();
  syncSettingsUI();
});