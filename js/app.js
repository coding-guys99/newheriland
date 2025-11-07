// js/app.js — CLEAN base for all pages
// 1) 建立 Supabase client（可 import，也掛到 window 方便 Console 偵錯）
// 2) 匯出 $ / $$ 工具
// 3) 設定頁（第二層＋第三層）開關基礎行為
// 4) 不動 router / tabbar / data-page

// 建議用 jsDelivr 的 +esm（穩定、快）
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ---- 你的專案參數 ----
const SUPABASE_URL = 'https://grnslirusehkdmxzxwnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybnNsaXJ1c2Voa2RteHp4d25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTY0MTYsImV4cCI6MjA3NjAzMjQxNn0.-pVf96mDwnJU4a9QndmFjr0f7DWNBAlxkJrzuKKj7WI';

// ---- 建立 client（供其他模組 import）----
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// 同步掛到全域，方便你在 Console 檢查（type: "module" 情況下預設不會有 global）
if (typeof window !== 'undefined') {
  window.supabase = supabase; // ← 現在在 Console 輸入 typeof supabase 會是 "object"
}

// 共用工具
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function initAppBase(){
  // 防重複
  if (document.documentElement.dataset.appInited === '1') return;
  document.documentElement.dataset.appInited = '1';

  // ---------------- Settings 第二層 ----------------
  const settingsPage = $('#p-settings');        // <section id="p-settings">
  const btnOpen      = $('#btnOpenSettings');   // 右上齒輪
  const btnBack      = $('#btnSettingsBack');   // 設定頁「←」

  // 第三層頁面
  const tertiaryPages = Array.from(document.querySelectorAll('.overlay-page.tertiary'));
  let stacking = [];   // ['settings','settings-language']

  const openSettings = ()=>{
    if (!settingsPage) return;
    settingsPage.hidden = false;
    settingsPage.classList.add('active');
    stacking = ['settings'];
    settingsPage.querySelector('.settings-title, #h-settings')?.focus?.({ preventScroll:true });
  };

  const closeSettings = ()=>{
    if (!settingsPage) return;
    settingsPage.classList.remove('active');
    settingsPage.setAttribute('hidden','');
    tertiaryPages.forEach(p => { p.classList.remove('active'); p.setAttribute('hidden',''); });
    stacking = [];
  };

  const openTertiaryById = (id)=>{
    const page = document.getElementById(id);
    if (!page) return;
    page.hidden = false;
    if (document.startViewTransition && matchMedia('(prefers-reduced-motion: no-preference)').matches){
      document.startViewTransition(()=> page.classList.add('active'));
    } else {
      page.classList.add('active');
    }
    stacking.push(id);
    page.querySelector('.settings-title')?.focus?.({ preventScroll:true });
  };

  const closeTopTertiary = ()=>{
    const top = stacking[stacking.length - 1];
    if (!top || top === 'settings') return closeSettings();
    const page = document.getElementById(top);
    if (page) { page.classList.remove('active'); page.setAttribute('hidden',''); }
    stacking.pop();
    settingsPage?.querySelector('.settings-title, #h-settings')?.focus?.({ preventScroll:true });
  };

  btnOpen?.addEventListener('click', openSettings);
  btnBack?.addEventListener('click', closeSettings);
  $$('.set-item[data-target]').forEach(btn=>{
    btn.addEventListener('click', ()=> openTertiaryById(btn.dataset.target));
  });
  $$('.overlay-page.tertiary .sub-back').forEach(btn=>{
    btn.addEventListener('click', closeTopTertiary);
  });
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && stacking.length) {
      if (stacking.length > 1) closeTopTertiary(); else closeSettings();
    }
  });

  // ---------------- 小開關 ----------------
  $('#toggleDark')?.addEventListener('change', (e)=>{
    document.documentElement.classList.toggle('dark', e.target.checked);
  });
  $('#toggleA11y')?.addEventListener('change', (e)=>{
    document.documentElement.dataset.a11y = e.target.checked ? 'on' : 'off';
  });
}

document.addEventListener('DOMContentLoaded', initAppBase);

// 若沒填 URL/KEY，給開發時的提醒
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[app] Supabase 未配置，後端功能會停用');
}

