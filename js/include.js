// 極簡 HTML partial 注入器
// 使用：<div data-include="partials/tabbar.html"></div>
(function () {
  async function inject(el) {
    const src = el.getAttribute('data-include');
    if (!src) return;
    try {
      const res = await fetch(src, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(res.status + ' ' + src);
      const html = await res.text();
      el.innerHTML = html;
      el.removeAttribute('data-include');
      // 讓應用可以知道 partial 已就緒（可選）
      el.dispatchEvent(new CustomEvent('include:loaded', { bubbles: true, detail: { src } }));
    } catch (err) {
      console.warn('[include] failed:', err);
      el.innerHTML = `<!-- include failed: ${src} -->`;
    }
  }

  function run() {
    const nodes = document.querySelectorAll('[data-include]');
    if (!nodes.length) return;
    nodes.forEach(inject);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
