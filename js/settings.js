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
  const lang    = hlGet(HL_LS.lang)    || HL_DEF.lang;
  const cur     = hlGet(HL_LS.cur)     || HL_DEF.cur;
  const theme   = hlGet(HL_LS.theme)   || HL_DEF.theme;
  const city    = hlGet(HL_LS.city)    || HL_DEF.city;
  const notif   = hlGet(HL_LS.notif)   || HL_DEF.notif;
  const offl    = hlGet(HL_LS.offl)    || HL_DEF.offl;
  const role    = hlGet(HL_LS.role)    || HL_DEF.role;
  const mock    = hlGet(HL_LS.mock)    || HL_DEF.mock;
  const devCity = hlGet(HL_LS.devCity) || HL_DEF.devCity;
  
  const avatar = hlGet('hl.pref.avatar') || 'H';
const pfAvatar = document.getElementById('profileCardAvatar');
if (pfAvatar) pfAvatar.textContent = avatar;
const setAvatar = document.getElementById('hlEditAvatar');
if (setAvatar) setAvatar.textContent = avatar;

  // 🆕 使用者資料（edit profile 會寫進來的）
  const name    = hlGet('hl.pref.name')    || 'Guest User';
  const tagline = hlGet('hl.pref.tagline') || 'Discovering Sarawak';
  const gender  = hlGet('hl.pref.gender')  || 'Prefer not to say';

  // ====== 1. 設定抽屜頭部同步 ======
  const elName = document.querySelector('.hl-set__name');
  const elSub  = document.querySelector('.hl-set__sub');
  if (elName) elName.textContent = name;
  if (elSub)  elSub.textContent  = tagline;

  // ====== 2. 設定面板各欄位同步 ======
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

  if (el.lang)  el.lang.textContent  = lang;
  if (el.cur)   el.cur.textContent   = cur;
  if (el.theme) el.theme.textContent = (theme === 'system' ? 'System' : (theme === 'dark' ? 'Dark' : 'Light'));
  if (el.city)  el.city.textContent  = city;
  if (el.notif) el.notif.checked     = (notif === 'on');
  if (el.offl)  el.offl.checked      = (offl === 'on');
  if (el.role)  el.role.textContent  = role;
  if (el.mock)  el.mock.textContent  = mock;
  if (el.devCity) el.devCity.textContent = devCity;

  // ====== 3. 同步到 Profile 頁的卡片（真正你剛剛說沒變的那裡） ======
  const pfName = document.getElementById('profileCardName');
  const pfTag  = document.getElementById('profileCardTagline');
  const pfGen  = document.getElementById('profileCardGender'); // 有就更新，沒有就忽略
  if (pfName) pfName.textContent = name;
  if (pfTag)  pfTag.textContent  = tagline;
  if (pfGen)  pfGen.textContent  = gender;

  // ====== 4. 套用主題 ======
  hlApplyTheme(theme);

  // ====== 5. 子面板選中狀態 ======
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

window.dispatchEvent(new CustomEvent('hl:userUpdated', {
  detail: {
    name,
    tagline
  }
}));

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
  // 先把其他 sub 關掉
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

// ==== Edit Profile controller ====
(function(){
  const ep = document.getElementById('p-edit-profile');
  if (!ep) return;

  // 1) 開啟：header 或 settings 裡的 edit 鈕都會叫這個
  window.openEditProfile = function(){
    ep.hidden = false;
    ep.classList.add('active');
    ep.querySelector('#h-edit-profile')?.focus({preventScroll:true});
    document.body.classList.add('no-scroll');
  };

  // 2) 關閉
  function closeEditProfile(){
    ep.classList.remove('active');
    ep.setAttribute('hidden','');
    document.body.classList.remove('no-scroll');
    // 關掉所有小 sheet
    ep.querySelectorAll('.hl-subsheet').forEach(s=>{
      s.hidden = true;
      s.classList.remove('is-open');
    });
  }

  document.getElementById('btnEditProfileBack')?.addEventListener('click', closeEditProfile);
  document.getElementById('btnChangeAvatar')?.addEventListener('click', ()=>{
  alert('Change avatar function not implemented yet.');
});
  document.getElementById('btnEditProfileSave')?.addEventListener('click', ()=>{
  const name = document.getElementById('hlEditName')?.value?.trim() || 'Guest User';
  const tagline = document.getElementById('hlEditTagline')?.value?.trim() || '';
  const gender = document.getElementById('hlEditGenderVal')?.textContent?.trim() || '';
  
  // 存進 localStorage（使用你原本的 hlSet）
  hlSet('hl.pref.name', name);
  hlSet('hl.pref.tagline', tagline);
  hlSet('hl.pref.gender', gender);

  // 更新設定抽屜
  hlSyncUI?.();

  closeEditProfile();
});

  // 3) 從 Settings 頁的 "Edit" 叫這個
  document.getElementById('hlSetEditProfile')?.addEventListener('click', () => {
  // 先關掉右側設定抽屜
  hlCloseDrawer?.();
  // 再開編輯頁
  window.openEditProfile?.();
});


  // 4) 開小 sheet
  ep.querySelectorAll('[data-ep-open]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-ep-open');
      // 關其它
      ep.querySelectorAll('.hl-subsheet').forEach(s=>{ s.hidden = true; s.classList.remove('is-open'); });
      const target = document.getElementById('ep-' + id);
      if (target){
        target.hidden = false;
        target.classList.add('is-open');
      }
    });
  });

  // 5) 關小 sheet
  ep.querySelectorAll('.hl-subsheet__close').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sheet = btn.closest('.hl-subsheet');
      sheet.hidden = true;
      sheet.classList.remove('is-open');
    });
  });

  // 6) 選 gender
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

  // 7) 密碼先做假儲存
  document.getElementById('btnEPConfirmPwd')?.addEventListener('click', ()=>{
    const out = document.getElementById('hlEditPwdVal');
    if (out) out.textContent = 'Updated just now';
    const sheet = document.getElementById('ep-password');
    sheet.hidden = true;
    sheet.classList.remove('is-open');
  });
})();
