// js/settings.js — HeriLand new settings + developer tools
const HL_LS = {
  lang:  'hl.pref.lang',
  cur:   'hl.pref.cur',
  theme: 'hl.pref.theme',
  city:  'hl.pref.city',
  notif: 'hl.pref.notif',
  offl:  'hl.pref.offline',
  role:  'hl.pref.role',
  mock:  'hl.dev.mock',
  devCity: 'hl.dev.city'
};

const HL_DEF = {
  lang:  'English',
  cur:   'MYR',
  theme: 'system',
  city:  'Kuching',
  notif: 'on',
  offl:  'off',
  role:  'Guest',
  mock:  'off',
  devCity: 'auto'
};

function hlGet(k){ try { return localStorage.getItem(k); } catch(_) { return null; } }
function hlSet(k,v){ try { localStorage.setItem(k,v); } catch(_){} }

function hlApplyTheme(mode){
  if (mode === 'dark'){ document.documentElement.classList.add('dark'); return; }
  if (mode === 'light'){ document.documentElement.classList.remove('dark'); return; }
  // system
  const m = matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.classList.toggle('dark', m.matches);
}

function hlSyncUI(){
  const lang  = hlGet(HL_LS.lang)  || HL_DEF.lang;
  const cur   = hlGet(HL_LS.cur)   || HL_DEF.cur;
  const theme = hlGet(HL_LS.theme) || HL_DEF.theme;
  const city  = hlGet(HL_LS.city)  || HL_DEF.city;
  const notif = hlGet(HL_LS.notif) || HL_DEF.notif;
  const offl  = hlGet(HL_LS.offl)  || HL_DEF.offl;
  const role  = hlGet(HL_LS.role)  || HL_DEF.role;
  const mock  = hlGet(HL_LS.mock)  || HL_DEF.mock;
  const devCity = hlGet(HL_LS.devCity) || HL_DEF.devCity;

  const el = {
    lang: document.getElementById('hlSetLangVal'),
    cur:  document.getElementById('hlSetCurVal'),
    theme:document.getElementById('hlSetThemeVal'),
    city: document.getElementById('hlSetCityVal'),
    notif:document.getElementById('hlSetNotif'),
    offl: document.getElementById('hlSetOffline'),
    role: document.getElementById('hlSetRoleVal'),
    mock: document.getElementById('hlDevMockState'),
    devCity: document.getElementById('hlDevForceCityVal'),
  };

  if (el.lang) el.lang.textContent = lang;
  if (el.cur)  el.cur.textContent  = cur;
  if (el.theme) el.theme.textContent = theme === 'system' ? 'System' : (theme === 'dark' ? 'Dark' : 'Light');
  if (el.city) el.city.textContent = city;
  if (el.notif) el.notif.checked = (notif === 'on');
  if (el.offl) el.offl.checked = (offl === 'on');
  if (el.role) el.role.textContent = role;
  if (el.mock) el.mock.textContent = mock;
  if (el.devCity) el.devCity.textContent = devCity;

  hlApplyTheme(theme);

  // 標記 sub sheet 當前選項
  document.querySelectorAll('#hlSub-lang .hl-sub__opt').forEach(btn=>{
    btn.classList.toggle('is-current', btn.dataset.val === lang);
  });
  document.querySelectorAll('#hlSub-currency .hl-sub__opt').forEach(btn=>{
    btn.classList.toggle('is-current', btn.dataset.val === cur);
  });
  document.querySelectorAll('#hlSub-theme .hl-sub__opt').forEach(btn=>{
    btn.classList.toggle('is-current', btn.dataset.val === theme);
  });
  document.querySelectorAll('#hlSub-city .hl-sub__opt').forEach(btn=>{
    btn.classList.toggle('is-current', btn.dataset.val === city);
  });
  document.querySelectorAll('#hlSub-forceCity .hl-sub__opt').forEach(btn=>{
    btn.classList.toggle('is-current', btn.dataset.devCity === devCity);
  });
}

function hlOpenDrawer(){
  const box = document.getElementById('hlSettingsDrawer');
  if (!box) return;
  box.classList.add('is-open');
  box.setAttribute('aria-hidden', 'false');
  // focus panel
  box.querySelector('.hl-set__panel')?.focus?.();
}
function hlCloseDrawer(){
  const box = document.getElementById('hlSettingsDrawer');
  if (!box) return;
  box.classList.remove('is-open');
  box.setAttribute('aria-hidden', 'true');
  // 關所有 sub
  document.querySelectorAll('.hl-sub.is-open').forEach(s=>{
    s.classList.remove('is-open');
    s.setAttribute('aria-hidden','true');
  });
}

function hlOpenSub(id){
  const sub = document.getElementById(id);
  if (!sub) return;
  sub.classList.add('is-open');
  sub.setAttribute('aria-hidden','false');
}
function hlCloseSub(node){
  node.classList.remove('is-open');
  node.setAttribute('aria-hidden','true');
}

function hlBindSettings(){
  const box = document.getElementById('hlSettingsDrawer');
  if (!box) return;

  // 讓外部也可以叫
  window.openSettingsPanel = hlOpenDrawer;

  // 頂部齒輪（你 index 原本就有）
  document.getElementById('btnOpenSettings')?.addEventListener('click', hlOpenDrawer);
  // profile 卡片上的
  document.getElementById('profileCardSettings')?.addEventListener('click', hlOpenDrawer);
  // profile 列表上的
  document.getElementById('plOpenSettings')?.addEventListener('click', hlOpenDrawer);

  // 點背景關閉
  box.querySelector('.hl-set__backdrop')?.addEventListener('click', hlCloseDrawer);
  // 面板擋冒泡
  box.querySelector('.hl-set__panel')?.addEventListener('click', e=> e.stopPropagation());
  // ESC
  window.addEventListener('keydown', e=>{
    if (e.key === 'Escape'){
      const openSub = document.querySelector('.hl-sub.is-open');
      if (openSub){ hlCloseSub(openSub); return; }
      hlCloseDrawer();
    }
  });

  // 開 sub
  box.querySelectorAll('[data-hl-set-open]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-hl-set-open');
      hlOpenSub('hlSub-' + name);
    });
  });

  // 關 sub
  box.querySelectorAll('[data-hl-sub-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sub = btn.closest('.hl-sub');
      if (sub) hlCloseSub(sub);
    });
  });

  // 語言選擇
  document.querySelectorAll('#hlSub-lang .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      hlSet(HL_LS.lang, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
    });
  });

  // 幣別
  document.querySelectorAll('#hlSub-currency .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      hlSet(HL_LS.cur, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
    });
  });

  // 主題
  document.querySelectorAll('#hlSub-theme .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      hlSet(HL_LS.theme, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
    });
  });

  // 城市
  document.querySelectorAll('#hlSub-city .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      hlSet(HL_LS.city, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
      // 這裡你可以 dispatch 事件給 home/explore
      window.dispatchEvent(new CustomEvent('hl:preferredCityChanged', { detail: { city: val }}));
    });
  });

  // 通知 toggle
  document.getElementById('hlSetNotif')?.addEventListener('change', e=>{
    hlSet(HL_LS.notif, e.target.checked ? 'on' : 'off');
  });

  // Offline toggle
  document.getElementById('hlSetOffline')?.addEventListener('change', e=>{
    hlSet(HL_LS.offl, e.target.checked ? 'on' : 'off');
  });

  // Offline clear
  document.getElementById('hlOfflineClear')?.addEventListener('click', ()=>{
    alert('Offline cache cleared (demo)');
  });

  // 開發者工具
  document.getElementById('hlDevToggleMock')?.addEventListener('click', ()=>{
    const cur = hlGet(HL_LS.mock) || HL_DEF.mock;
    const next = cur === 'on' ? 'off' : 'on';
    hlSet(HL_LS.mock, next);
    hlSyncUI();
  });
  document.getElementById('hlDevForceCity')?.addEventListener('click', ()=>{
    hlOpenSub('hlSub-forceCity');
  });
  document.querySelectorAll('#hlSub-forceCity .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.devCity;
      hlSet(HL_LS.devCity, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
      // 通知外面
      window.dispatchEvent(new CustomEvent('hl:devForceCity', { detail: { city: val }}));
    });
  });
  document.getElementById('hlDevResetHome')?.addEventListener('click', ()=>{
    window.dispatchEvent(new CustomEvent('hl:resetHome'));
    alert('Home demo data re-seeded (demo)');
  });
  document.getElementById('hlDevDump')?.addEventListener('click', ()=>{
    const out = {};
    for (let i=0; i<localStorage.length; i++){
      const key = localStorage.key(i);
      if (key && key.startsWith('hl.')){
        out[key] = localStorage.getItem(key);
      }
    }
    alert('HeriLand storage:\n' + JSON.stringify(out, null, 2));
  });
  document.getElementById('hlDevClearAll')?.addEventListener('click', ()=>{
    const keys = [];
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith('hl.')) keys.push(k);
    }
    keys.forEach(k=> localStorage.removeItem(k));
    hlSyncUI();
    alert('All HeriLand keys cleared.');
  });

  // 假的我的收藏 → 跳到 saved
  document.getElementById('hlGoFavorites')?.addEventListener('click', ()=>{
    location.hash = '#saved';
    hlCloseDrawer();
  });
  // 假的「我要投稿」
  document.getElementById('hlForMerchant')?.addEventListener('click', ()=>{
    location.hash = '#add';
    hlCloseDrawer();
  });

  // 登入登出（先做假的）
  document.getElementById('hlSignInOut')?.addEventListener('click', ()=>{
    const now = hlGet(HL_LS.role) || 'Guest';
    if (now === 'Guest'){
      hlSet(HL_LS.role, 'User');
    } else {
      hlSet(HL_LS.role, 'Guest');
    }
    hlSyncUI();
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  hlBindSettings();
  hlSyncUI();
});
