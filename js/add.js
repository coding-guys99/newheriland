// add.js
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ----- Multi-select chips (categories / tags) ----- */
function bindMultiChips(container, set){
  container?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if (!btn) return;
    const v = btn.dataset.val;
    const on = btn.classList.toggle('is-on');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) set.add(v); else set.delete(v);
  });
  // keyboard: Enter
  container?.addEventListener('keydown', (e)=>{
    if (e.key !== 'Enter') return;
    const btn = e.target.closest('.chip'); if (!btn) return;
    btn.click();
  });
}

/* ----- Hours editor (Google style) ----- */
const DAYS = [
  { key:'mon', label:'Mon' },
  { key:'tue', label:'Tue' },
  { key:'wed', label:'Wed' },
  { key:'thu', label:'Thu' },
  { key:'fri', label:'Fri' },
  { key:'sat', label:'Sat' },
  { key:'sun', label:'Sun' },
];

function buildTimeOptions(stepMin=30){
  const opts = [];
  for (let h=0; h<24; h++){
    for (let m=0; m<60; m+=stepMin){
      const hh = String(h).padStart(2,'0');
      const mm = String(m).padStart(2,'0');
      opts.push(`${hh}:${mm}`);
    }
  }
  // 24:00 不做，避免超過一天
  return opts;
}
const TIME_OPTS = buildTimeOptions(30);

function timeSelect(value=''){
  return `
    <select class="open-time">
      ${TIME_OPTS.map(t => `<option value="${t}" ${t===value?'selected':''}>${t}</option>`).join('')}
    </select>
    <span>–</span>
    <select class="close-time">
      ${TIME_OPTS.map(t => `<option value="${t}">${t}</option>`).join('')}
    </select>
  `;
}

function renderHoursEditor(root){
  if (!root) return;
  root.innerHTML = DAYS.map(d => `
    <div class="hours-row" data-day="${d.key}">
      <div class="day">${d.label}</div>
      <label class="toggle">
        <input type="checkbox" class="chk-open" />
        <span>Open</span>
      </label>
      <div class="ranges">
        <button type="button" class="add-range" hidden>+ Add range</button>
      </div>
    </div>
  `).join('');

  // 行為：開關 + 新增刪除時間段
  $$('.hours-row', root).forEach(row=>{
    const chk = $('.chk-open', row);
    const rangesBox = $('.ranges', row);
    const btnAdd = $('.add-range', row);

    function addRange(initOpen='09:00', initClose='18:00'){
      const div = document.createElement('div');
      div.className = 'time-range';
      div.innerHTML = `
        ${timeSelect(initOpen)}
        <button type="button" class="btn-del" aria-label="Remove">✕</button>
      `;
      rangesBox.insertBefore(div, btnAdd);
      // 填入 close 預設
      div.querySelector('.close-time').value = initClose;

      div.querySelector('.btn-del').addEventListener('click', ()=>{
        div.remove();
        if (!rangesBox.querySelector('.time-range')) btnAdd.hidden = false;
      });
    }

    chk.addEventListener('change', ()=>{
      const on = chk.checked;
      btnAdd.hidden = !on;
      if (on && !rangesBox.querySelector('.time-range')){
        addRange();
      }
      if (!on){
        rangesBox.querySelectorAll('.time-range').forEach(x=>x.remove());
      }
    });

    btnAdd.addEventListener('click', ()=> addRange());
  });
}

function serializeOpenHours(root){
  const out = {};
  $$('.hours-row', root).forEach(row=>{
    const day = row.dataset.day;
    const open = $('.chk-open', row).checked;
    const ranges = [];
    row.querySelectorAll('.time-range').forEach(tr=>{
      const o = tr.querySelector('.open-time')?.value;
      const c = tr.querySelector('.close-time')?.value;
      if (o && c) ranges.push({ open: o, close: c });
    });
    out[day] = { open, ranges };
  });
  return out;
}

/* ----- Save ----- */
(async function initAddPage(){
  const form = $('#addForm');
  if (!form) return;

  // init chips
  const catSet = new Set();
  const tagSet = new Set();
  bindMultiChips($('#catChips'), catSet);
  bindMultiChips($('#tagChips'), tagSet);

  // init hours editor
  const hoursRoot = $('#hoursEditor');
  renderHoursEditor(hoursRoot);

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const name = $('#fName')?.value.trim();
    const city_id = $('#fCity')?.value;
    const address = $('#fAddress')?.value.trim();

    if (!name || !city_id){
      alert('Please fill in Name and City.');
      return;
    }

    const categories = Array.from(catSet);
    const category = categories[0] || null;  // 以第一個為主分類
    const tags = Array.from(tagSet);
    const open_hours = serializeOpenHours(hoursRoot);

    const payload = {
      name,
      city_id,
      address,
      category,       // 仍保留單一欄位供現有 explore 使用
      categories,     // 新增多選欄位（建議在 DB 建 text[]）
      tags,           // 多選標籤（建議在 DB 建 text[]）
      open_hours,     // JSONB 結構
      status: 'active'
    };

    // 👉 Supabase 欄位建議（避免 400）：
    // merchants 表新增（若還沒有）：
    //   alter table merchants add column if not exists categories text[];
    //   alter table merchants add column if not exists tags text[];
    //   alter table merchants add column if not exists open_hours jsonb;

    try{
      const { data, error } = await supabase
        .from('merchants')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;
      alert('Saved!');

      // 可選：跳回 Explore
      location.hash = '#explore';
    }catch(err){
      console.error('Save failed:', err);
      alert(`Save failed: ${err.message || err}`);
    }
  });
})();
