// js/app.js — CLEAN base for all pages
// ----------------------------------------------------
// 功能：
// 1. 建立 Supabase client（可以讓其他模組 import 用）
// 2. 提供 $ / $$ 工具
// 3. 如果頁面上有 Settings，就幫你處理開/關與第 3 層
// 4. 不做 router、不動 tabbar、不改 data-page

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ====== 你原本的 Supabase 設定 ======
const SUPABASE_URL = 'https://grnslirusehkdmxzxwnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybnNsaXJ1c2Voa2RteHp4d25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTY0MTYsImV4cCI6MjA3NjAzMjQxNn0.-pVf96mDwnJU4a9QndmFjr0f7DWNBAlxkJrzuKKj7WI';

// 對外可以拿到 supabase
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// 共用工具（也 export）
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function initAppBase(){
  // 防止重複初始化（有些頁你會多載 app.js）
  if (document.documentElement.dataset.appInited === '1') return;
  document.documentElement.dataset.appInited = '1';

  // ------------------------------------------------
  // 1) Settings 主頁（第二層）
  // ------------------------------------------------
  const settingsPage = $('#p-settings');        // <section id="p-settings" ...>
  const btnOpen      = $('#btnOpenSettings');   // 右上齒輪
  const btnBack      = $('#btnSettingsBack');   // 設定頁上的「←」

  // 2) 所有「第三層」設定頁：class="overlay-page tertiary"
  //    你原本是固定幾個 id，我這裡改成掃全部
  const tertiaryPages = Array.from(document.querySelectorAll('.overlay-page.tertiary'));

  // 用一個 stack 記目前打開的頁
  let stacking = [];   // e.g. ['settings', 'settings-language']

  function openSettings(){
    if (!settingsPage) return;
    settingsPage.hidden = false;
    settingsPage.classList.add('active');
    stacking = ['settings'];
    // 若有標題就聚焦
    const h = settingsPage.querySelector('.settings-title, #h-settings');
    h?.focus?.({ preventScroll: true });
  }

  function closeSettings(){
    if (!settingsPage) return;
    settingsPage.classList.remove('active');
    settingsPage.setAttribute('hidden', '');
    // 關掉所有 tertiary
    tertiaryPages.forEach(p => {
      p.classList.remove('active');
      p.setAttribute('hidden','');
    });
    stacking = [];
  }

  function openTertiaryById(id){
    const page = document.getElementById(id);
    if (!page) return;
    page.hidden = false;
    // 有支援 viewTransition 就加一下
    if (document.startViewTransition && matchMedia('(prefers-reduced-motion: no-preference)').matches){
      document.startViewTransition(() => page.classList.add('active'));
    } else {
      page.classList.add('active');
    }
    stacking.push(id);
    page.querySelector('.settings-title')?.focus?.({ preventScroll: true });
  }

  function closeTopTertiary(){
    const top = stacking[stacking.length - 1];
    if (!top || top === 'settings'){
      // 沒有更上層，關掉設定
      closeSettings();
      return;
    }
    const page = document.getElementById(top);
    if (page){
      page.classList.remove('active');
      page.setAttribute('hidden','');
    }
    stacking.pop();
    // 回到設定首頁焦點
    const h = settingsPage?.querySelector('.settings-title, #h-settings');
    h?.focus?.({ preventScroll: true });
  }

  // 綁定開關（如果頁面有的話）
  btnOpen?.addEventListener('click', openSettings);
  btnBack?.addEventListener('click', closeSettings);

  // 所有「會打開第三層」的按鈕：.set-item[data-target="settings-language"]
  $$('.set-item[data-target]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      openTertiaryById(btn.dataset.target);
    });
  });

  // 第三層自己的返回鍵：.sub-back
  $$('.overlay-page.tertiary .sub-back').forEach(btn=>{
    btn.addEventListener('click', closeTopTertiary);
  });

  // Esc 關閉邏輯
  window.addEventListener('keydown', (e)=>{
    if (e.key !== 'Escape') return;
    if (!stacking.length) return;
    // 有第三層 → 先關第三層
    if (stacking.length > 1) {
      closeTopTertiary();
    } else {
      // 只剩 settings 本身
      closeSettings();
    }
  });

  // ------------------------------------------------
  // 2) Dark / A11y 的小開關（有才綁）
  // ------------------------------------------------
  const darkToggle = $('#toggleDark');
  darkToggle?.addEventListener('change', (e)=>{
    document.documentElement.classList.toggle('dark', e.target.checked);
  });

  const a11yToggle = $('#toggleA11y');
  a11yToggle?.addEventListener('change', (e)=>{
    document.documentElement.dataset.a11y = e.target.checked ? 'on' : 'off';
  });

  // 到這裡就結束，不動 router、不動 tabbar
}

// 啟動
document.addEventListener('DOMContentLoaded', initAppBase);