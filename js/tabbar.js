// tabbar.js — fixed bottom translucent tabbar controller (hash-aware, a11y ready)
(function(){
  const SEL = {
    nav: '.tabbar',
    tabs: '.tabbar .tab',
    spacer: '.tabbar-spacer',
    pages: '[data-page]',
  };

  // 你的 tab 對應的 hash（可視需求改）
  const TAB_TO_HASH = {
  home:    '#home',
  explore: '#explore',
  map:     '#map',
  profile: '#profile',
  add:     '#add',
};

  // 一些路由別名 → 指到哪個 tab
  const HASH_TO_TAB_ALIAS = {
    detail:  'explore',   // #detail/xxx 算 explore 的延伸
    settings:'home',      // #settings 開在 home 之上
  };

  // 若你想讓 tabbar 直接切頁（不依賴既有 router），把這行設成 true
  // window.__TABBAR_SIMPLE_SWITCH = true;
  const SIMPLE_SWITCH = !!window.__TABBAR_SIMPLE_SWITCH;

  let inited = false;

  // 解析目前 hash 的主段（#detail/abc?x=1 → 'detail'）
  function currentSegment(){
  const h = (location.hash || '').replace(/^#\/?/, '');
  if (!h) return 'home';
  return h.split(/[?\/]/)[0] || 'home';
}


  function segToTab(seg){
    if (TAB_TO_HASH[seg]) return seg;               // home/explore/map/saved/add
    if (HASH_TO_TAB_ALIAS[seg]) return HASH_TO_TAB_ALIAS[seg]; // detail → explore...
    // 其它未知路由 → 回退 home
    return 'home';
  }

  function tabNameFromBtn(btn){
    return btn?.getAttribute('data-target') || '';
  }

  function setActiveTab(tabName){
    const nav = document.querySelector(SEL.nav);
    if (!nav) return;

    const btns = nav.querySelectorAll(SEL.tabs);
    btns.forEach(b=>{
      const on = tabNameFromBtn(b) === tabName;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
  }

  function ensureSpacer(){
    const nav = document.querySelector(SEL.nav);
    if (!nav) return;
    const next = nav.nextElementSibling;
    if (!(next && next.matches(SEL.spacer))){
      const s = document.createElement('div');
      s.className = 'tabbar-spacer';
      nav.parentNode.insertBefore(s, nav.nextSibling);
    }
  }

  // （可選）簡易切換：直接 hidden 顯示的 data-page
  function simpleSwitchTo(tab){
    if (!SIMPLE_SWITCH) return;
    const pages = Array.from(document.querySelectorAll(SEL.pages));
    if (!pages.length) return;
    pages.forEach(sec=>{
      const name = sec.getAttribute('data-page');
      const show = name === tab;  // 單純比對 data-page
      if (show) sec.removeAttribute('hidden');
      else sec.setAttribute('hidden','');
    });
    // 聚焦目前頁面的可聚焦標題
    const head = document.querySelector(`[data-page="${tab}"] [data-focusable-heading]`);
    if (head) head.focus?.();
  }

  function onTabClick(e){
    const btn = e.target.closest(SEL.tabs);
    if (!btn) return;
    const tab = tabNameFromBtn(btn);
    if (!tab) return;
    e.preventDefault();

    // 更新 hash（交給你的 router 處理內容切換）
    const targetHash = TAB_TO_HASH[tab] || `#${tab}`;
    if (location.hash !== targetHash){
      location.hash = targetHash;
    }else{
      // 若 hash 相同，仍觸發一次自定事件（給需要的邏輯重載）
      window.dispatchEvent(new CustomEvent('route:repeat', { detail:{ tab, hash: targetHash }}));
    }

    setActiveTab(tab);
    simpleSwitchTo(tab);
  }

  function onHashChange(){
  const seg = currentSegment();
  const tab = segToTab(seg);
  setActiveTab(tab);
  simpleSwitchTo(tab);

  // ← 新增這段
  if (seg === 'settings' && typeof window.openSettingsPanel === 'function') {
    window.openSettingsPanel();
  }
}


  // 鍵盤導覽（左右切換）
  function onKeydown(e){
    const nav = document.querySelector(SEL.nav);
    if (!nav) return;
    if (!['ArrowLeft','ArrowRight'].includes(e.key)) return;

    const btns = Array.from(nav.querySelectorAll(SEL.tabs));
    const curIdx = btns.findIndex(b => b.classList.contains('is-active'));
    if (curIdx < 0) return;
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = btns[(curIdx + dir + btns.length) % btns.length];
    next?.focus();
    next?.click();
  }

  function initOnce(){
    if (inited) return;
    const nav = document.querySelector(SEL.nav);
    if (!nav) return;
    inited = true;

    ensureSpacer();

    nav.addEventListener('click', onTabClick);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('keydown', onKeydown, { passive: true });

    // 初始狀態
    onHashChange();
  }

  // 支援 partial 動態注入（如 include.js 之後才有 nav）
  const mo = new MutationObserver(()=> initOnce());
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // DOM 就緒嘗試一次
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initOnce, { once:true });
  }else{
    initOnce();
  }
})();
