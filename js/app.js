// js/app.js — CLEAN version (no Tabbar/Router logic)
// --------------------------------------------------
// 只負責：Supabase 初始化、$ $$ 工具、Settings overlay、Dark/A11y switches
// Tabbar 交給獨立的 tabbar.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// === Supabase 初始化（允許未配置時為 null，方便前端先開發） ===
// （保持你現有的 URL/Key，或改成注入的環境變數）
const SUPABASE_URL = 'https://grnslirusehkdmxzxwnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybnNsaXJ1c2Voa2RteHp4d25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTY0MTYsImV4cCI6MjA3NjAzMjQxNn0.-pVf96mDwnJU4a9QndmFjr0f7DWNBAlxkJrzuKKj7WI';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// === $ / $$ 小工具（供本檔使用；需要也可改成 export） ===
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// === 初始化（僅一次） ===
function initApp(){
  if (document.documentElement.dataset.appInited === '1') return;
  document.documentElement.dataset.appInited = '1';

  // ---- Settings 二級/三級（Overlay-style） ----
  (() => {
    const settingsPage = $('#p-settings');
    const btnOpen = $('#btnOpenSettings');
    const btnBack = $('#btnSettingsBack');

    // 第三級集合
    const tertiaryPages = new Map(
      ['settings-language','settings-currency','settings-privacy','settings-policy']
        .map(id => [id, document.getElementById(id)])
    );

    let stacking = []; // ['settings','settings-language',...]

    function openSettings(){
      if (!settingsPage) return;
      settingsPage.hidden = false;
      settingsPage.classList.add('active');
      stacking = ['settings'];
      $('#h-settings')?.focus({preventScroll:true});
    }

    function closeSettings(){
      if (!settingsPage) return;
      settingsPage.classList.remove('active');
      settingsPage.setAttribute('hidden','');
      tertiaryPages.forEach(p => { p.hidden = true; p.classList.remove('active'); });
      stacking = [];
    }

    function openTertiary(id){
      const page = tertiaryPages.get(id);
      if (!page) return;
      page.hidden = false;
      if (document.startViewTransition && matchMedia('(prefers-reduced-motion: no-preference)').matches){
        document.startViewTransition(() => page.classList.add('active'));
      } else {
        page.classList.add('active');
      }
      stacking.push(id);
      page.querySelector('.settings-title')?.focus({preventScroll:true});
    }

    function closeTopTertiary(){
      const top = stacking[stacking.length - 1];
      if (top && top !== 'settings'){
        const page = tertiaryPages.get(top);
        if (page){
          page.classList.remove('active');
          page.setAttribute('hidden','');
          stacking.pop();
          $('#h-settings')?.focus({preventScroll:true});
        }
        return;
      }
      closeSettings();
    }

    btnOpen?.addEventListener('click', openSettings);
    btnBack?.addEventListener('click', closeSettings);

    $$('.set-item[data-target]').forEach(btn=>{
      btn.addEventListener('click', ()=> openTertiary(btn.dataset.target));
    });

    $$('.overlay-page.tertiary .sub-back').forEach(btn=>{
      btn.addEventListener('click', closeTopTertiary);
    });

    window.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape'){
        if (stacking.length > 1) closeTopTertiary();
        else if (stacking.length === 1) closeSettings();
      }
    });
  })();

  // ---- 小開關（Dark / A11y） ----
  (() => {
    const dark = $('#toggleDark');
    dark?.addEventListener('change', (e)=>{
      document.documentElement.classList.toggle('dark', e.target.checked);
    });

    const a11y = $('#toggleA11y');
    a11y?.addEventListener('change', (e)=>{
      document.documentElement.dataset.a11y = e.target.checked ? 'on' : 'off';
    });
  })();
}

// 入口（不再等待 tabbar 注入；tabbar.js 自己會處理）
document.addEventListener('DOMContentLoaded', initApp);