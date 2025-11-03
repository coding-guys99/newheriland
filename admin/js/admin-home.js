// /admin/js/admin-home.js — Home Admin (Tabs + Hero/hl_banners CRUD)
import { supabase } from '../../js/app.js';

const $  = (s, r=document)=> r.querySelector(s);
const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));

/* =========================
   Tabs：通用切換（含 lazy render）
   ========================= */
const tabButtons = $$('.tabs .btn');
const panels = Array.from(document.querySelectorAll('section[id^="tab-"]'));
const loaded = {}; // 首次開啟才渲染用（之後接其它面板）

function showTab(name){
  const targetId = `tab-${name}`;
  panels.forEach(p => p.style.display = (p.id === targetId ? 'block' : 'none'));
  tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  history.replaceState({}, '', `#home:${name}`);

  // 首次開啟才做初始化（目前只需要 banners）
  if (!loaded[name]) {
    if (name === 'banners') renderBanners();
    // e.g. if (name === 'features') renderFeaturesAdmin();
    loaded[name] = true;
  }
}
tabButtons.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
const initial = location.hash.match(/#home:([\w-]+)/)?.[1] || 'banners';
showTab(initial);
window.addEventListener('message', e => { if (e?.data?.openTab) showTab(e.data.openTab); });

/* =========================
   HERO / hl_banners CRUD
   ========================= */
const tableBody   = $('#bn-body');
const btnAdd      = $('#bn-add');
const btnRefresh  = $('#bn-refresh');
const PLACEHOLDER_IMG = 'https://placehold.co/1200x600?text=Banner';

async function fetchBanners(){
  const { data, error } = await supabase
    .from('hl_banners')
    .select('id,title,image_url,target_type,target_value,sort_order,is_active')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

function opt(v,label,cur){ return `<option value="${v}" ${cur===v?'selected':''}>${label}</option>`; }
function esc(s){ return (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

function rowTpl(b){
  const id = b.id;
  return `
  <tr data-id="${id}">
    <td colspan="8">
      <div class="bn-row">
        <!-- 預覽 -->
        <div>
          <img class="bn-thumb"
               src="${b.image_url || PLACEHOLDER_IMG}"
               alt="preview"
               onerror="this.src='${PLACEHOLDER_IMG}'">
        </div>

        <!-- 標題 -->
        <div>
          <div class="badge">標題</div>
          <input class="in title" value="${esc(b.title||'')}" placeholder="例：Mid-Autumn Specials">
        </div>

        <!-- 圖片 URL -->
        <div>
          <div class="badge">圖片 URL</div>
          <input class="in image_url" value="${esc(b.image_url||'')}" placeholder="https://...">
        </div>

        <!-- 導向類型 -->
        <div>
          <div class="badge">導向類型</div>
          <select class="in sel target_type">
            ${opt('url','url',b.target_type)}
            ${opt('city','city',b.target_type)}
            ${opt('experience','experience',b.target_type)}
            ${opt('merchant','merchant',b.target_type)}
          </select>
        </div>

        <!-- 導向值 / 連結 -->
        <div>
          <div class="badge">導向值 / 連結</div>
          <input class="in target_value" value="${esc(b.target_value||'')}" placeholder="#explore?city=kuching 或 ID/URL">
        </div>

        <!-- 排序 + 上下移 -->
        <div class="stack">
          <input class="in sort_order" type="number" value="${Number(b.sort_order||1)}" style="width:80px">
          <button class="btn icon act up"   title="上移">↑</button>
          <button class="btn icon act down" title="下移">↓</button>
        </div>

        <!-- 上架狀態 -->
        <div class="stack">
          <label class="badge only-wide">狀態</label>
          <label class="switch" title="上架">
            <input type="checkbox" class="in is_active" ${b.is_active? 'checked':''}>
            <i></i>
          </label>
        </div>

        <!-- 操作 -->
        <div class="stack">
          <button class="btn primary save">💾 儲存</button>
          <button class="btn danger  del">🗑️ 刪除</button>
        </div>
      </div>
    </td>
  </tr>`;
}

async function renderBanners(){
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="8" style="padding:12px" class="help">載入中…</td></tr>';
  try{
    const data = await fetchBanners();
    tableBody.innerHTML = data.length
      ? data.map(rowTpl).join('')
      : '<tr><td colspan="8" style="padding:12px" class="help">尚無資料，點右上角「新增 Banner」。</td></tr>';
  }catch(e){
    console.error(e);
    tableBody.innerHTML = `<tr><td colspan="8" style="padding:12px" class="help">讀取失敗：${esc(e.message)}</td></tr>`;
  }
}

/* 即時預覽圖片（事件委派） */
const bnTable = $('#bn-table');
if (bnTable){
  bnTable.addEventListener('input', (e)=>{
    const tr = e.target.closest('tr'); if(!tr) return;
    if(e.target.classList.contains('image_url')){
      const url = e.target.value.trim();
      const img = tr.querySelector('img');
      img.src = url || PLACEHOLDER_IMG;
    }
  });

  /* 點擊事件（儲存 / 刪除 / 上下移） */
  bnTable.addEventListener('click', async (e)=>{
    const tr = e.target.closest('tr'); if(!tr) return;
    const id = tr.dataset.id;

    if(e.target.classList.contains('save')){
      await saveRow(tr);
    } else if(e.target.classList.contains('del')){
      await deleteRow(id);
    } else if(e.target.classList.contains('up')){
      await moveRow(tr, -1);
    } else if(e.target.classList.contains('down')){
      await moveRow(tr, +1);
    }
  });
}

/* 重新整理 / 新增 */
btnRefresh?.addEventListener('click', renderBanners);
btnAdd?.addEventListener('click', async ()=>{
  try{
    const { data: maxRows, error: e1 } = await supabase
      .from('hl_banners')
      .select('sort_order')
      .order('sort_order',{ascending:false})
      .limit(1);
    if(e1) throw e1;
    const nextSort = (maxRows?.[0]?.sort_order || 0) + 1;

    const { error } = await supabase.from('hl_banners').insert({
      title: '新 Banner',
      image_url: PLACEHOLDER_IMG,
      sort_order: nextSort,
      is_active: true,
      target_type: 'url',
      target_value: '#'
    });
    if(error) throw error;
    await renderBanners();
  }catch(e){ alert('新增失敗：'+e.message); }
});

/* 儲存一列 */
async function saveRow(tr){
  const id = tr.dataset.id;
  const payload = {
    title:        tr.querySelector('.title').value.trim(),
    image_url:    tr.querySelector('.image_url').value.trim() || PLACEHOLDER_IMG,
    target_type:  tr.querySelector('.target_type').value,
    target_value: tr.querySelector('.target_value').value.trim(),
    sort_order:   Number(tr.querySelector('.sort_order').value || 1),
    is_active:    tr.querySelector('.is_active').checked
  };
  try{
    const { error } = await supabase.from('hl_banners').update(payload).eq('id', id);
    if(error) throw error;
    await renderBanners(); // 重新拉取（確保排序正確）
  }catch(e){ alert('儲存失敗：'+e.message); }
}

/* 刪除一列 */
async function deleteRow(id){
  if(!confirm('確定要刪除這個 Banner？')) return;
  try{
    const { error } = await supabase.from('hl_banners').delete().eq('id', id);
    if(error) throw error;
    await renderBanners();
  }catch(e){ alert('刪除失敗：'+e.message); }
}

/* 上下移（交換 sort_order） */
async function moveRow(tr, dir){
  // dir = -1 (上移) / +1 (下移)
  const id = tr.dataset.id;
  const currentSort = Number(tr.querySelector('.sort_order').value || 1);

  const rows = $$('#bn-body tr');
  const idx = rows.indexOf(tr);
  const swapWith = rows[idx + dir];
  if(!swapWith) return; // 已到邊界

  const otherId   = swapWith.dataset.id;
  const otherSort = Number(swapWith.querySelector('.sort_order').value || 1);

  try{
    const { error } = await supabase.from('hl_banners').upsert([
      { id,        sort_order: otherSort },
      { id: otherId, sort_order: currentSort }
    ]);
    if(error) throw error;
    await renderBanners();
  }catch(e){ alert('移動失敗：'+e.message); }
}