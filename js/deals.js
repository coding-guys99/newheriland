// js/deals.js — 優惠活動獨立頁 + 可被 SPA 重用
(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // 看 body 有沒有 data-page="deals" 就知道是不是你這種分開的 html
  const IS_STANDALONE = document.body && document.body.dataset.page === 'deals';

  // ---- 假資料 ----
  const DEALS = [
    {
      id: 'mid-autumn',
      title: '中秋城市聯動｜餐飲 85 折',
      cover: 'https://picsum.photos/640/360?mid',
      status: 'ongoing',
      tags: ['food','travel'],
      city: 'Kuching',
      dateRange: '10/01 – 10/15',
      summary: '指定商家餐飲 85 折，滿 50 再送在地小禮。',
      details: [
        '活動期間內於合作餐廳消費滿 RM50 即享 15% 折扣，並可獲贈「在地限定月餅」乙份。',
        '參與商家包含：The Local Kitchen、Taste Garden、Urban Brew 等 30+ 間店家。',
        '部分餐廳需提前預約，敬請留意公告。'
      ],
      // 在 SPA 裡就是去 #explore...
      url: '#explore?collection=mid-autumn'
    },
    {
      id: 'dyson-week',
      title: 'Dyson 聯名週｜最高送 14%',
      cover: 'https://picsum.photos/640/360?dy',
      status: 'ongoing',
      tags: ['travel'],
      city: 'Sibu',
      dateRange: '10/08 – 10/20',
      summary: '電器專區滿額送；活動內容以現場公告為準。',
      url: '#explore?brand=dyson'
    },
    {
      id: '3m-zone',
      title: '3M 專區｜登記送 200',
      cover: 'https://picsum.photos/640/360?3m',
      status: 'upcoming',
      tags: ['family','group'],
      city: 'Miri',
      dateRange: '10/25 – 11/05',
      summary: '指定商品結帳回饋，數量有限先到先得。',
      url: '#explore?brand=3m'
    },
    {
      id: 'tea-fest',
      title: '花草茶節｜人氣專題',
      cover: 'https://picsum.photos/640/360?tea',
      status: 'ended',
      tags: ['food','couple'],
      city: 'Mukah',
      dateRange: '09/10 – 09/25',
      summary: '在地茶飲展售與課程，下一檔預計 12 月回歸。',
      url: '#explore?collection=tea'
    }
  ];

  // ---- 篩選狀態 ----
  const state = {
    status: 'ongoing',
    tags: new Set()
  };

  function applyFilter(list) {
    return list.filter(d => {
      if (state.status && d.status !== state.status) return false;
      if (state.tags.size) {
        const hit = d.tags?.some(t => state.tags.has(t));
        if (!hit) return false;
      }
      return true;
    });
  }

  function cardHTML(d) {
    const badge =
      d.status === 'ongoing'
        ? `<span class="badge ok">進行中</span>`
        : d.status === 'upcoming'
        ? `<span class="badge soon">即將開跑</span>`
        : `<span class="badge end">已結束</span>`;

    return `
      <article class="deal-card" data-id="${d.id}">
        <div class="deal-thumb" style="background-image:url('${d.cover || ''}')"></div>
        <div class="deal-body">
          <h3 class="deal-title">${d.title}</h3>
          <div class="deal-meta">
            ${badge}
            <span>📍 ${d.city}</span>
            <span>🗓️ ${d.dateRange}</span>
          </div>
          <div class="deal-foot">
            <span>${d.summary || ''}</span>
            <button class="deal-cta" type="button" data-id="${d.id}">前往</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderList() {
    const box     = $('#dealList');
    const empty   = $('#dealEmpty');
    const endHint = $('#dealEndHint');
    if (!box) return;

    const list = applyFilter(DEALS);

    if (!list.length) {
      box.innerHTML = '';
      if (empty) empty.hidden = false;
      if (endHint) endHint.hidden = true;
      return;
    }

    if (empty)   empty.hidden = true;
    if (endHint) endHint.hidden = false;

    box.innerHTML = list.map(cardHTML).join('');
    box.removeAttribute('aria-busy');
  }

  function openDetail(id) {
    const d = DEALS.find(x => x.id === id);
    if (!d) return;

    const panel = $('#dealDetail');
    const cont  = $('#dealContent');

    // 如果這頁根本沒有 overlay，就直接導走
    if (!panel || !cont) {
      goDealTarget(d);
      return;
    }

    const statusLabel =
      d.status === 'ongoing'
        ? '進行中'
        : d.status === 'upcoming'
        ? '即將開跑'
        : '已結束';

    const targetHref = buildTargetHref(d);

    cont.innerHTML = `
      <div class="deal-hero" style="background-image:url('${d.cover || ''}')"></div>
      <h3>${d.title}</h3>
      <div class="detail-meta">
        <span class="badge ${d.status==='ongoing'?'ok':d.status==='upcoming'?'soon':'end'}">${statusLabel}</span>
        <span>📍 ${d.city}</span>
        <span>🗓️ ${d.dateRange}</span>
      </div>
      <p>${d.summary || ''}</p>
      <div class="detail-actions">
        <button class="btn" data-share>分享</button>
        <a class="btn primary" href="${targetHref}">前往專區</a>
      </div>
      ${d.details && d.details.length ? `
        <section class="deal-section">
          <h4>活動內容</h4>
          <ul>${d.details.map(t => `<li>${t}</li>`).join('')}</ul>
        </section>
      ` : ''}
    `;

    panel.hidden = false;
    panel.classList.add('active');
    document.body.classList.add('no-scroll');

    cont.querySelector('[data-share]')?.addEventListener('click', async () => {
      try {
        await navigator.share?.({
          title: d.title,
          text: d.summary,
          url: targetHref
        });
      } catch (_) {}
    });
  }

  // 把 url 變成正確的（獨立頁要補 index.html）
  function buildTargetHref(d) {
    if (!d.url) return '#';
    if (IS_STANDALONE) {
      // d.url 多半是 "#explore..." → 要變成 "index.html#explore..."
      if (d.url.startsWith('#')) return 'index.html' + d.url;
      return d.url;
    }
    // SPA/內嵌狀況直接用就好
    return d.url;
  }

  function goDealTarget(d) {
    const target = buildTargetHref(d);
    if (target === '#') return;
    location.href = target;
  }

  function closeDetail() {
    const panel = $('#dealDetail');
    if (!panel) return;
    panel.classList.remove('active');
    panel.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  document.addEventListener('DOMContentLoaded', () => {
    // 篩選：狀態
    $$('#dealsMain [data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('#dealsMain [data-filter]').forEach(c => {
          c.classList.toggle('is-on', c === chip);
          c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
        });
        state.status = chip.dataset.filter;
        renderList();
      });
    });

    // 篩選：tag（多選）
    $$('#dealsMain [data-tag]').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        const on = chip.classList.toggle('is-on');
        if (on) state.tags.add(tag);
        else state.tags.delete(tag);
        renderList();
      });
    });

    // 列表 → 詳情
    $('#dealList')?.addEventListener('click', e => {
      const btn = e.target.closest('.deal-cta');
      if (!btn) return;
      const id = btn.dataset.id;
      if (id) openDetail(id);
    });

    // 詳情關閉
    $('#btnCloseDeal')?.addEventListener('click', closeDetail);

    // 返回首頁（獨立頁才真的導頁）
    $('#btnBackHome')?.addEventListener('click', () => {
      if (typeof window.showPage === 'function') {
        window.showPage('home');
      } else {
        location.href = 'index.html#home';
      }
    });

    // 空/錯誤重整
    $('#btnDealRetry')?.addEventListener('click', renderList);
    $('#btnDealRetry2')?.addEventListener('click', renderList);

    // 一開始畫一次
    renderList();

    // 給別的 js 呼叫
    window.hlOpenDeal = openDetail;
  });
})();