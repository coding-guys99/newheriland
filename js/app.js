// js/app.js
// ===== Supabase 初始化（允許未配置時為 null，方便前端先開發） =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ✅ 換成你的正式環境變數或 .env-injected 值
const SUPABASE_URL = 'https://grnslirusehkdmxzxwnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybnNsaXJ1c2Voa2RteHp4d25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTY0MTYsImV4cCI6MjA3NjAzMjQxNn0.-pVf96mDwnJU4a9QndmFjr0f7DWNBAlxkJrzuKKj7WI';

// 若沒填就給 null，讓前端可以先跑、其他頁面用 JSON fallback
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ===== 方便的 $ / $$ =====
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ====== 主初始化：分頁切換 + Settings overlay + 小開關 ======
function initApp(){
  // 已初始化就不再重複
  if (document.documentElement.dataset.appInited === '1') return;
  document.documentElement.dataset.appInited = '1';

  // ---- 主頁分頁（Tabbar） ----
  (() => {
    const PAGES = ["home","explore","map","saved","add"];
    const pages = new Map(PAGES.map(id => [id, document.querySelector(`[data-page="${id}"]`)]));
    const tabs  = $$('.tabbar .tab');

    if (!tabs.length) return; // 沒有 tabbar（例如某些單頁），就跳過

    let active = PAGES[0];
    const scrollMemo = new Map();

    function setAriaSelected(targetId){
      tabs.forEach(t => {
        const on = t.dataset.target === targetId;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if(on) t.setAttribute('aria-current','page'); else t.removeAttribute('aria-current');
      });
    }

    function swapPages(oldId, newId){
      if (oldId){
        const prev = pages.get(oldId);
        if(prev){ prev.classList.remove('active','page--in'); prev.hidden = true; }
      }
      const next = pages.get(newId);
      if(next){ next.hidden = false; next.classList.add('active'); }
    }

    function afterSwap(newId, {push=true} = {}){
      const y = scrollMemo.get(newId) || 0;
      window.scrollTo(0, y);

      setAriaSelected(newId);

      const h1 = pages.get(newId)?.querySelector('[data-focusable-heading]');
      if(h1){ h1.focus({preventScroll:true}); }

      if (push) location.hash = newId;
      active = newId;
    }

    function showPage(id, {push=true} = {}){
      if (!pages.has(id) || active === id) return;
      const oldId = active, newId = id;

      if (oldId){ scrollMemo.set(oldId, window.scrollY || 0); }

      if (oldId){
        const oldIdx = PAGES.indexOf(oldId);
        const newIdx = PAGES.indexOf(newId);
        document.documentElement.dataset.dir = newIdx > oldIdx ? 'forward' : 'reverse';
      } else {
        document.documentElement.dataset.dir = 'forward';
      }

      if (document.startViewTransition && matchMedia('(prefers-reduced-motion: no-preference)').matches){
        const vt = document.startViewTransition(() => swapPages(oldId, newId));
        vt.finished.finally(() => afterSwap(newId, {push}));
      } else {
        swapPages(oldId, newId);
        const next = pages.get(newId);
        if (next){ next.classList.add('page--in'); setTimeout(()=> next.classList.remove('page--in'), 240); }
        afterSwap(newId, {push});
      }
    }

    tabs.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.target;
        showPage(id);
      });
    });

    // deep-link：#explore、#map…
    const initHash = () => {
      const h = (location.hash||'').replace('#','');
      if (PAGES.includes(h)) showPage(h, {push:false});
      else showPage(active, {push:false});
    };
    window.addEventListener('hashchange', initHash);
    initHash();
  })();

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

  // ---- 小開關（示意） ----
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

  // ---- Add 頁（UI-only：chips / autosize / local photo preview）----
  (() => {
    const form = $('#addForm');
    if (!form) return;

    const typeWrap = $('#typeChips');
    const tagWrap  = $('#tagChips');

    typeWrap?.addEventListener('click', (e)=>{
      const btn = e.target.closest('.chip');
      if (!btn) return;
      $$('.chip', typeWrap).forEach(c => c.classList.remove('is-on')); // 單選
      btn.classList.add('is-on');
    });
    tagWrap?.addEventListener('click', (e)=>{
      const btn = e.target.closest('.chip');
      if (!btn) return;
      btn.classList.toggle('is-on'); // 多選
    });

    const desc = $('#fDesc');
    const auto = (el)=>{
      el.style.height = 'auto';
      el.style.height = Math.min(240, el.scrollHeight) + 'px';
    };
    desc?.addEventListener('input', ()=> auto(desc));
    desc && auto(desc);

    const fileInput = $('#fPhotos');
    const grid = $('#previewGrid');

    function renderPreview(files){
      if (!grid) return;
      grid.innerHTML = '';
      const list = Array.from(files).slice(0, 10);
      list.forEach(file=>{
        const url = URL.createObjectURL(file);
        const cell = document.createElement('div');
        cell.className = 'thumb';
        cell.style.backgroundImage = `url("${url}")`;
        const del = document.createElement('button');
        del.type = 'button';
        del.textContent = '×';
        del.addEventListener('click', ()=> cell.remove());
        cell.appendChild(del);
        grid.appendChild(cell);
      });
    }

    fileInput?.addEventListener('change', (e)=>{
      const files = e.target.files || [];
      renderPreview(files);
    });

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      if (!$('#fName').value.trim()){
        $('#fName').focus();
        return;
      }
      alert('UI ready. Save logic comes next ✨');
    });

    $('#btnPreview')?.addEventListener('click', ()=>{
      alert('Preview mock — 之後接真預覽頁');
    });
  })();
}

// ===== 等 partials/tabbar.html 載入完再 init（若沒用 partials 也能自動 fallback） =====
// ===== 稳定触发 init：不再错过 include:loaded =====

// 1) include.js 完成注入时
document.addEventListener('include:loaded', (e) => {
  if (e.detail?.src?.includes('tabbar.html')) initApp();
});

// 2) DOMContentLoaded 时，若 tabbar 已经在页面里，直接 init
document.addEventListener('DOMContentLoaded', () => {
  tryInitWhenTabbarReady();
  // 再加观察者，防止 include 比 app.js 更早执行导致事件丢失
  const obs = new MutationObserver(() => {
    if (document.querySelector('.tabbar .tab')) {
      obs.disconnect();
      initApp();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // 安全兜底：1.5 秒后再检查一次（极端慢网路场景）
  setTimeout(tryInitWhenTabbarReady, 1500);
});

function tryInitWhenTabbarReady() {
  if (document.documentElement.dataset.appInited === '1') return;
  if (document.querySelector('.tabbar .tab')) {
    initApp();
  }
}

