// js/group.js — 多人推薦列表 + 篩選 + 詳情 overlay (fixed)
document.addEventListener('DOMContentLoaded', () => {
  // 小工具
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // 你這頁才要跑
  const page = document.body.dataset.page || '';
  if (page !== 'group') {
    // 你那行是 data-page=“group” (直角引號) 也會進不來，記得改成 "group"
    // 這裡先容錯一下
    if ((document.body.getAttribute('data-page') || '').includes('group') === false) {
      return;
    }
  }

  // ===== 假資料 =====
  const GROUP_PLANS = [
    {
      id: 'gp-001',
      title: '古晉老街 + 河岸散步',
      people: '2-3',
      slot: 'afternoon',
      budget: '$',
      city: 'kuching',
      short: '適合小團出遊，拍照+咖啡+老街導覽一次完成。',
      detail: '行程包含老街導覽、河岸散步、咖啡小歇，約 3 小時，交通自理。',
    },
    {
      id: 'gp-002',
      title: '濕地 + 手作半日團',
      people: '3-5',
      slot: 'morning',
      budget: '$$',
      city: 'kuching',
      short: '三到五人最佳，含導覽與手作體驗。',
      detail: '上午濕地導覽＋中場手作體驗，含基本材料，適合朋友或小家庭。',
    },
    {
      id: 'gp-003',
      title: 'Sibu 美食路線',
      people: '6-10',
      slot: 'evening',
      budget: '$$',
      city: 'sibu',
      short: '多人吃比較划算，串三家在地推薦。',
      detail: '晚上串三家在地名店，可加價包車，適合 6–10 人團。',
    },
    {
      id: 'gp-004',
      title: 'Miri 海邊整日團',
      people: '10+',
      slot: 'fullday',
      budget: '$$$',
      city: 'miri',
      short: '公司/教會/社團戶外活動首選。',
      detail: '海邊活動＋餐飲＋車輛可客製，整日行程，建議 10 人以上。',
    },
    {
      id: 'gp-005',
      title: 'Mukah 輕旅行',
      people: 'any',
      slot: 'any',
      budget: 'any',
      city: 'mukah',
      short: '不想想太多就選這個，時間跟預算都彈性。',
      detail: '依照季節調整的 Mukah 體驗行程，適合剛到沙勞越的旅客。'
    }
  ];

  // ===== 篩選狀態 =====
  const state = {
    people: 'any',
    slot: 'any',
    budget: 'any',
    city: 'any'
  };

  // ===== 渲染列表 =====
  function renderList() {
    const box   = $('#gpList');
    const empty = $('#gpEmpty');
    if (!box) return;

    const list = GROUP_PLANS.filter(p => {
      if (state.people !== 'any' && p.people !== state.people) return false;
      if (state.slot   !== 'any' && p.slot   !== state.slot)   return false;
      if (state.budget !== 'any' && p.budget !== state.budget) return false;
      if (state.city   !== 'any' && p.city   !== state.city)   return false;
      return true;
    });

    // 沒資料
    if (!list.length) {
      box.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    box.innerHTML = list.map(p => {
      return `
        <article class="gp-card" data-id="${p.id}">
          <div class="gp-info">
            <h3>${p.title}</h3>
            <p class="gp-short">${p.short || ''}</p>
            <div class="gp-meta">
              <span>${labelPeople(p.people)}</span>
              <span>${labelSlot(p.slot)}</span>
              <span>${labelBudget(p.budget)}</span>
              <span>${labelCity(p.city)}</span>
            </div>
          </div>
          <div class="gp-act">
            <button type="button" class="gp-cta" data-id="${p.id}">查看行程</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function labelPeople(v){
    return v === 'any' ? '不限人數'
         : v === '2-3' ? '2–3人'
         : v === '3-5' ? '3–5人'
         : v === '6-10' ? '6–10人'
         : '10人以上';
  }
  function labelSlot(v){
    return v === 'any' ? '任一時段'
         : v === 'morning' ? '上午'
         : v === 'afternoon' ? '下午'
         : v === 'evening' ? '晚上'
         : '整日';
  }
  function labelBudget(v){
    return v === 'any' ? '不限預算' : `預算 ${v}`;
  }
  function labelCity(v){
    if (v === 'any') return '全部城市';
    const m = { kuching: 'Kuching', sibu: 'Sibu', miri: 'Miri', mukah: 'Mukah' };
    return m[v] || v;
  }

  // ===== 打開詳情 =====
  function openDetail(id){
    const panel = $('#gpDetail');
    const cont  = $('#gpContent');
    const item  = GROUP_PLANS.find(p => p.id === id);
    if (!panel || !cont || !item) return;

    cont.innerHTML = `
      <div class="gp-hero"></div>
      <h2>${item.title}</h2>
      <p>${item.detail || item.short || ''}</p>
      <ul class="gp-pill-list">
        <li>${labelPeople(item.people)}</li>
        <li>${labelSlot(item.slot)}</li>
        <li>${labelBudget(item.budget)}</li>
        <li>${labelCity(item.city)}</li>
      </ul>
    `;

    panel.hidden = false;
    panel.classList.add('active');
    document.body.classList.add('no-scroll');
  }

  // ===== 關閉詳情 =====
  function closeDetail(){
    const panel = $('#gpDetail');
    if (!panel) return;
    panel.classList.remove('active');
    panel.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  // ===== 綁定：篩選 chips =====
  // 人數
  $$('#groupMain [data-people]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#groupMain [data-people]').forEach(c => {
        c.classList.toggle('is-on', c === chip);
        c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
      });
      state.people = chip.dataset.people || 'any';
      renderList();
    });
  });
  // 時段
  $$('#groupMain [data-slot]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#groupMain [data-slot]').forEach(c => {
        c.classList.toggle('is-on', c === chip);
        c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
      });
      state.slot = chip.dataset.slot || 'any';
      renderList();
    });
  });
  // 預算
  $$('#groupMain [data-budget]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#groupMain [data-budget]').forEach(c => {
        c.classList.toggle('is-on', c === chip);
        c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
      });
      state.budget = chip.dataset.budget || 'any';
      renderList();
    });
  });
  // 城市
  $$('#groupMain [data-city]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#groupMain [data-city]').forEach(c => {
        c.classList.toggle('is-on', c === chip);
        c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
      });
      state.city = chip.dataset.city || 'any';
      renderList();
    });
  });

  // ===== 重點：列表事件用「委派」 =====
  const listEl = $('#gpList');
  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.gp-cta');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;
      openDetail(id);
    });
  }

  // 關閉詳情
  $('#btnCloseGp')?.addEventListener('click', closeDetail);

  // 清除篩選
  $('#btnGpRetry')?.addEventListener('click', () => {
    state.people = 'any';
    state.slot   = 'any';
    state.budget = 'any';
    state.city   = 'any';
    renderList();

    // 把 chips 的 active 狀態也還原
    $$('#groupMain .chips button').forEach(btn => {
      const isAny =
        btn.dataset.people === 'any' ||
        btn.dataset.slot   === 'any' ||
        btn.dataset.budget === 'any' ||
        btn.dataset.city   === 'any';
      btn.classList.toggle('is-on', isAny);
      if (btn.hasAttribute('aria-selected')) {
        btn.setAttribute('aria-selected', isAny ? 'true' : 'false');
      }
    });
  });

  // 返回首頁（因為這頁是分開的 html）
  $('#btnBackHome')?.addEventListener('click', () => {
    location.href = 'index.html#home';
  });

  // 打開設定
  $('#btnOpenSettings')?.addEventListener('click', () => {
    if (window.hlOpenDrawer) window.hlOpenDrawer();
  });

  // 初始化
  renderList();
});