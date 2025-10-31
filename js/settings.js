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
  const m = matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.classList.toggle('dark', m.matches);
}

function hlSyncUI(){
  const lang    = hlGet(HL_LS.lang)    || HL_DEF.lang;
  const cur     = hlGet(HL_LS.cur)     || HL_DEF.cur;
  const theme   = hlGet(HL_LS.theme)   || HL_DEF.theme;
  const city    = hlGet(HL_LS.city)    || HL_DEF.city;
  const notif   = hlGet(HL_LS.notif)   || HL_DEF.notif;
  const offl    = hlGet(HL_LS.offl)    || HL_DEF.offl;
  const role    = hlGet(HL_LS.role)    || HL_DEF.role;
  const mock    = hlGet(HL_LS.mock)    || HL_DEF.mock;
  const devCity = hlGet(HL_LS.devCity) || HL_DEF.devCity;

  // user profile fields
  const name    = hlGet('hl.pref.name')    || 'Guest User';
  const tagline = hlGet('hl.pref.tagline') || 'Discovering Sarawak';
  const gender  = hlGet('hl.pref.gender')  || 'Prefer not to say';
  const avatar  = hlGet('hl.pref.avatar')  || 'H';

  // 1) 設定抽屜頭部同步
  const elName = document.querySelector('.hl-set__name');
  const elSub  = document.querySelector('.hl-set__sub');
  const elHeadAvatar = document.querySelector('.hl-set__avatar');
  if (elName) elName.textContent = name;
  if (elSub)  elSub.textContent  = tagline;
  if (elHeadAvatar) elHeadAvatar.textContent = avatar;

  // 2) 面板各欄位同步
  const el = {
    lang:    document.getElementById('hlSetLangVal'),
    cur:     document.getElementById('hlSetCurVal'),
    theme:   document.getElementById('hlSetThemeVal'),
    city:    document.getElementById('hlSetCityVal'),
    notif:   document.getElementById('hlSetNotif'),
    offl:    document.getElementById('hlSetOffline'),
    role:    document.getElementById('hlSetRoleVal'),
    mock:    document.getElementById('hlDevMockState'),
    devCity: document.getElementById('hlDevForceCityVal'),
  };

  if (el.lang)   el.lang.textContent   = lang;
  if (el.cur)    el.cur.textContent    = cur;
  if (el.theme)  el.theme.textContent  = (theme === 'system' ? 'System' : (theme === 'dark' ? 'Dark' : 'Light'));
  if (el.city)   el.city.textContent   = city;
  if (el.notif)  el.notif.checked      = (notif === 'on');
  if (el.offl)   el.offl.checked       = (offl === 'on');
  if (el.role)   el.role.textContent   = role;
  if (el.mock)   el.mock.textContent   = mock;
  if (el.devCity) el.devCity.textContent = devCity;

  // 3) 同步到 Profile 頁的卡片
  const pfName   = document.getElementById('profileCardName');
  const pfTag    = document.getElementById('profileCardTagline');
  const pfGen    = document.getElementById('profileCardGender');
  const pfAvatar = document.getElementById('profileCardAvatar');
  if (pfName)   pfName.textContent   = name;
  if (pfTag)    pfTag.textContent    = tagline;
  if (pfGen)    pfGen.textContent    = gender;
  if (pfAvatar) pfAvatar.textContent = avatar;

  // 4) 同步到 Edit Profile 裡面的頭像（左邊大圈圈）
  const editAvatar = document.getElementById('hlEditAvatar');
  if (editAvatar) editAvatar.textContent = avatar;

  // 5) 套用主題
  hlApplyTheme(theme);

  // 6) sub sheet 的選中狀態
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

  // 7) 廣播給別的 js（home / profile / headbar 要聽的話）
  window.dispatchEvent(new CustomEvent('hl:userUpdated', {
    detail: { name, tagline, gender, avatar }
  }));
}

function hlOpenDrawer(){
  const box = document.getElementById('hlSettingsDrawer');
  if (!box) return;
  box.classList.add('is-open');
  box.setAttribute('aria-hidden', 'false');
  box.querySelector('.hl-set__panel')?.focus?.();
}
function hlCloseDrawer(){
  const box = document.getElementById('hlSettingsDrawer');
  if (!box) return;
  box.classList.remove('is-open');
  box.setAttribute('aria-hidden', 'true');
  document.querySelectorAll('.hl-sub.is-open').forEach(s=>{
    s.classList.remove('is-open');
    s.setAttribute('aria-hidden','true');
  });
}

function hlOpenSub(id){
  document.querySelectorAll('.hl-sub.is-open').forEach(s=>{
    s.classList.remove('is-open');
    s.setAttribute('aria-hidden','true');
  });
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

  window.openSettingsPanel = hlOpenDrawer;

  document.getElementById('btnOpenSettings')?.addEventListener('click', hlOpenDrawer);
  document.getElementById('profileCardSettings')?.addEventListener('click', hlOpenDrawer);
  document.getElementById('plOpenSettings')?.addEventListener('click', hlOpenDrawer);

  box.querySelector('.hl-set__backdrop')?.addEventListener('click', hlCloseDrawer);
  box.querySelector('.hl-set__panel')?.addEventListener('click', e=> e.stopPropagation());

  window.addEventListener('keydown', e=>{
    if (e.key === 'Escape'){
      const openSub = document.querySelector('.hl-sub.is-open');
      if (openSub){ hlCloseSub(openSub); return; }
      hlCloseDrawer();
    }
  });

  box.querySelectorAll('[data-hl-set-open]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-hl-set-open');
      hlOpenSub('hlSub-' + name);
    });
  });

  box.querySelectorAll('[data-hl-sub-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sub = btn.closest('.hl-sub');
      if (sub) hlCloseSub(sub);
    });
  });

  // lang
  document.querySelectorAll('#hlSub-lang .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      hlSet(HL_LS.lang, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
    });
  });
  // currency
  document.querySelectorAll('#hlSub-currency .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      hlSet(HL_LS.cur, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
    });
  });
  // theme
  document.querySelectorAll('#hlSub-theme .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      hlSet(HL_LS.theme, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
    });
  });
  // city
  document.querySelectorAll('#hlSub-city .hl-sub__opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.val;
      hlSet(HL_LS.city, val);
      hlSyncUI();
      hlCloseSub(btn.closest('.hl-sub'));
      window.dispatchEvent(new CustomEvent('hl:preferredCityChanged', { detail: { city: val }}));
    });
  });

  // toggles
  document.getElementById('hlSetNotif')?.addEventListener('change', e=>{
    hlSet(HL_LS.notif, e.target.checked ? 'on' : 'off');
  });
  document.getElementById('hlSetOffline')?.addEventListener('change', e=>{
    hlSet(HL_LS.offl, e.target.checked ? 'on' : 'off');
  });
  document.getElementById('hlOfflineClear')?.addEventListener('click', ()=>{
    alert('Offline cache cleared (demo)');
  });

  // dev
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

  // 快速導頁
  document.getElementById('hlGoFavorites')?.addEventListener('click', ()=>{
    location.hash = '#saved';
    hlCloseDrawer();
  });
  document.getElementById('hlForMerchant')?.addEventListener('click', ()=>{
    location.hash = '#add';
    hlCloseDrawer();
  });

  document.getElementById('hlSignInOut')?.addEventListener('click', ()=>{
    const now = hlGet(HL_LS.role) || 'Guest';
    hlSet(HL_LS.role, now === 'Guest' ? 'User' : 'Guest');
    hlSyncUI();
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  hlBindSettings();
  hlSyncUI();
});

// ==== Edit Profile controller ====
(function(){
  const ep = document.getElementById('p-edit-profile');
  if (!ep) return;

  window.openEditProfile = function(){
    ep.hidden = false;
    ep.classList.add('active');
    ep.querySelector('#h-edit-profile')?.focus({preventScroll:true});
    document.body.classList.add('no-scroll');
  };

  function closeEditProfile(){
    ep.classList.remove('active');
    ep.setAttribute('hidden','');
    document.body.classList.remove('no-scroll');
    ep.querySelectorAll('.hl-subsheet').forEach(s=>{
      s.hidden = true;
      s.classList.remove('is-open');
    });
  }

  document.getElementById('btnEditProfileBack')?.addEventListener('click', closeEditProfile);

  // avatar 暫時用 alert
  document.getElementById('btnChangeAvatar')?.addEventListener('click', ()=>{
    alert('Change avatar function not implemented yet.');
  });

  document.getElementById('btnEditProfileSave')?.addEventListener('click', ()=>{
    const name    = document.getElementById('hlEditName')?.value?.trim() || 'Guest User';
    const tagline = document.getElementById('hlEditTagline')?.value?.trim() || 'Discovering Sarawak';
    const gender  = document.getElementById('hlEditGenderVal')?.textContent?.trim() || 'Prefer not to say';
    // 之後如果你做上傳頭像，這裡記得也寫 hl.pref.avatar
    hlSet('hl.pref.name', name);
    hlSet('hl.pref.tagline', tagline);
    hlSet('hl.pref.gender', gender);

    // 重新同步全部 UI
    hlSyncUI();

    closeEditProfile();
  });

  // 設定面板「Edit」進來的
  document.getElementById('hlSetEditProfile')?.addEventListener('click', ()=>{
    hlCloseDrawer?.();
    window.openEditProfile?.();
  });

  // bottom sheets (gender / city / lang / password)
  ep.querySelectorAll('[data-ep-open]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-ep-open');
      ep.querySelectorAll('.hl-subsheet').forEach(s=>{ s.hidden = true; s.classList.remove('is-open'); });
      const target = document.getElementById('ep-' + id);
      if (target){
        target.hidden = false;
        target.classList.add('is-open');
      }
    });
  });

  ep.querySelectorAll('.hl-subsheet__close').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sheet = btn.closest('.hl-subsheet');
      sheet.hidden = true;
      sheet.classList.remove('is-open');
    });
  });

  // gender select
  const genderBox = document.getElementById('ep-gender');
  if (genderBox){
    genderBox.querySelectorAll('.option').forEach(opt=>{
      opt.addEventListener('click', ()=>{
        const val = opt.dataset.gender;
        const out = document.getElementById('hlEditGenderVal');
        if (out) out.textContent = val;
        genderBox.hidden = true;
        genderBox.classList.remove('is-open');
      });
    });
  }

  // password demo
  document.getElementById('btnEPConfirmPwd')?.addEventListener('click', ()=>{
    const out = document.getElementById('hlEditPwdVal');
    if (out) out.textContent = 'Updated just now';
    const sheet = document.getElementById('ep-password');
    sheet.hidden = true;
    sheet.classList.remove('is-open');
  });
})();