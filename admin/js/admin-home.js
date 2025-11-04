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
  if (name === 'banners')    renderBanners();
  if (name === 'features')   renderFeaturesAdmin();
  if (name === 'combo')      renderComboAdmin();
  if (name === 'cities')     renderCitiesAdmin();
  if (name === 'ads')        renderAdsAdmin();
  if (name === 'collections')renderCollectionsAdmin();
  if (name === 'groups')     renderGroupsAdmin();
  if (name === 'spotlight')  renderSpotlightAdmin();   // ← 新增
  if (name === 'goods')      renderGoodsAdmin();       // ← 新增
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
  const tableBody   = $('#bn-body');
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

/* =========================
   FEATURES / hl_features CRUD
   ========================= */
const FT_ICON_PLACEHOLDER = '🎁';
const ftBody     = $('#ft-body');
const ftAddBtn   = $('#ft-add');
const ftRefBtn   = $('#ft-refresh');

async function fetchFeatures(){
  const { data, error } = await supabase
    .from('hl_features')
    .select('id,icon,label,href,sort_order,is_active')
    .order('sort_order',{ ascending:true });
  if (error) throw error;
  return data || [];
}

function featureRowTpl(f){
  return `
  <tr data-id="${f.id}">
    <td>
      <input class="in icon" value="${esc(f.icon||FT_ICON_PLACEHOLDER)}" placeholder="例如：🎁" style="width:90px">
    </td>
    <td>
      <input class="in label" value="${esc(f.label||'')}" placeholder="例如：優惠活動">
    </td>
    <td>
      <input class="in href"  value="${esc(f.href||'#')}" placeholder="例如：deals.html 或 #explore">
    </td>
    <td class="stack">
      <input class="in sort_order" type="number" value="${Number(f.sort_order||1)}" style="width:80px">
      <button class="btn icon act up"   title="上移">↑</button>
      <button class="btn icon act down" title="下移">↓</button>
    </td>
    <td class="stack">
      <label class="switch" title="上架">
        <input type="checkbox" class="in is_active" ${f.is_active ? 'checked' : ''}>
        <i></i>
      </label>
    </td>
    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger  del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderFeaturesAdmin(){
  if (!ftBody) return;
  ftBody.innerHTML = `<tr><td colspan="6" class="help" style="padding:12px">載入中…</td></tr>`;
  try{
    const rows = await fetchFeatures();
    ftBody.innerHTML = rows.length ? rows.map(featureRowTpl).join('')
      : `<tr><td colspan="6" class="help" style="padding:12px">尚無資料，點右上角「新增項目」。</td></tr>`;
  }catch(e){
    ftBody.innerHTML = `<tr><td colspan="6" class="help" style="padding:12px">讀取失敗：${esc(e.message)}</td></tr>`;
  }
}

/* 事件委派：儲存 / 刪除 / 上下移 */
$('#ft-table')?.addEventListener('click', async (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;

  if (e.target.classList.contains('save')) {
    await saveFeatureRow(tr);
  } else if (e.target.classList.contains('del')) {
    await deleteFeatureRow(id);
  } else if (e.target.classList.contains('up')) {
    await moveFeatureRow(tr, -1);
  } else if (e.target.classList.contains('down')) {
    await moveFeatureRow(tr, +1);
  }
});

/* 新增 / 重新整理 */
ftRefBtn?.addEventListener('click', renderFeaturesAdmin);
ftAddBtn?.addEventListener('click', async ()=>{
  try{
    const { data: maxRow, error: e1 } = await supabase
      .from('hl_features')
      .select('sort_order')
      .order('sort_order',{ ascending:false })
      .limit(1);
    if (e1) throw e1;
    const nextSort = (maxRow?.[0]?.sort_order || 0) + 1;

    const { error } = await supabase.from('hl_features').insert({
      icon: FT_ICON_PLACEHOLDER,
      label: '新項目',
      href: '#',
      sort_order: nextSort,
      is_active: true
    });
    if (error) throw error;
    await renderFeaturesAdmin();
  }catch(err){ alert('新增失敗：'+err.message); }
});

async function saveFeatureRow(tr){
  const id = tr.dataset.id;
  const payload = {
    icon:       tr.querySelector('.icon').value || FT_ICON_PLACEHOLDER,
    label:      tr.querySelector('.label').value.trim(),
    href:       tr.querySelector('.href').value.trim() || '#',
    sort_order: Number(tr.querySelector('.sort_order').value || 1),
    is_active:  tr.querySelector('.is_active').checked
  };
  try{
    const { error } = await supabase.from('hl_features').update(payload).eq('id', id);
    if (error) throw error;
    await renderFeaturesAdmin();
  }catch(err){ alert('儲存失敗：'+err.message); }
}

async function deleteFeatureRow(id){
  if(!confirm('確定要刪除這個項目？')) return;
  try{
    const { error } = await supabase.from('hl_features').delete().eq('id', id);
    if (error) throw error;
    await renderFeaturesAdmin();
  }catch(err){ alert('刪除失敗：'+err.message); }
}

async function moveFeatureRow(tr, dir){
  const id = tr.dataset.id;
  const cur = Number(tr.querySelector('.sort_order').value || 1);

  const rows = $$('#ft-body tr');
  const idx = rows.indexOf(tr);
  const swapWith = rows[idx + dir];
  if (!swapWith) return;

  const otherId   = swapWith.dataset.id;
  const otherSort = Number(swapWith.querySelector('.sort_order').value || 1);

  try{
    const { error } = await supabase.from('hl_features').upsert([
      { id, sort_order: otherSort },
      { id: otherId, sort_order: cur }
    ]);
    if (error) throw error;
    await renderFeaturesAdmin();
  }catch(err){ alert('移動失敗：'+err.message); }
}

/* =========================
   COMBO LEFT / RIGHT CRUD
   ========================= */
const CL_PLACEHOLDER = 'https://placehold.co/1200x600?text=Combo+Left';

const clBody = $('#cl-body');
const clAdd  = $('#cl-add');
const clRef  = $('#cl-refresh');

const crBody = $('#cr-body');
const crAdd  = $('#cr-add');
const crRef  = $('#cr-refresh');

/* ---- Left: hl_combo_left ---- */
async function fetchComboLeft(){
  const { data, error } = await supabase
    .from('hl_combo_left')
    .select('id,title,image_url,href,sort_order,is_active')
    .order('sort_order',{ ascending:true });
  if (error) throw error;
  return data || [];
}

function clRowTpl(r){
  return `
  <tr data-id="${r.id}">
    <td><img class="bn-thumb" src="${esc(r.image_url||CL_PLACEHOLDER)}" alt="preview" onerror="this.src='${CL_PLACEHOLDER}'"></td>
    <td><input class="in title"     value="${esc(r.title||'')}" placeholder="標題（可空）"></td>
    <td><input class="in image_url" value="${esc(r.image_url||'')}" placeholder="https://..."></td>
    <td><input class="in href"      value="${esc(r.href||'#')}"   placeholder="# 或 https://..."></td>
    <td class="stack">
      <input class="in sort_order" type="number" value="${Number(r.sort_order||1)}" style="width:80px">
      <button class="btn icon act up">↑</button>
      <button class="btn icon act down">↓</button>
    </td>
    <td class="stack">
      <label class="switch">
        <input type="checkbox" class="in is_active" ${r.is_active?'checked':''}><i></i>
      </label>
    </td>
    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger  del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderComboLeft(){
  if (!clBody) return;
  clBody.innerHTML = `<tr><td colspan="7" class="help" style="padding:12px">載入中…</td></tr>`;
  try{
    const rows = await fetchComboLeft();
    clBody.innerHTML = rows.length ? rows.map(clRowTpl).join('')
      : `<tr><td colspan="7" class="help" style="padding:12px">尚無資料，點「新增輪播」。</td></tr>`;
  }catch(e){
    clBody.innerHTML = `<tr><td colspan="7" class="help" style="padding:12px">讀取失敗：${esc(e.message)}</td></tr>`;
  }
}

$('#cl-table')?.addEventListener('input', (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  if (e.target.classList.contains('image_url')){
    tr.querySelector('img').src = e.target.value.trim() || CL_PLACEHOLDER;
  }
});

$('#cl-table')?.addEventListener('click', async (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  if (e.target.classList.contains('save'))       await clSave(tr);
  else if (e.target.classList.contains('del'))   await clDelete(id);
  else if (e.target.classList.contains('up'))    await clMove(tr,-1);
  else if (e.target.classList.contains('down'))  await clMove(tr,+1);
});

clRef?.addEventListener('click', renderComboLeft);
clAdd?.addEventListener('click', async ()=>{
  try{
    const { data: maxRow, error: e1 } = await supabase
      .from('hl_combo_left').select('sort_order').order('sort_order',{ascending:false}).limit(1);
    if (e1) throw e1;
    const next = (maxRow?.[0]?.sort_order || 0) + 1;
    const { error } = await supabase.from('hl_combo_left').insert({
      title:'', image_url: CL_PLACEHOLDER, href:'#', sort_order: next, is_active:true
    });
    if (error) throw error;
    await renderComboLeft();
  }catch(err){ alert('新增失敗：'+err.message); }
});

async function clSave(tr){
  const id = tr.dataset.id;
  const payload = {
    title:      tr.querySelector('.title').value.trim(),
    image_url:  tr.querySelector('.image_url').value.trim() || CL_PLACEHOLDER,
    href:       tr.querySelector('.href').value.trim() || '#',
    sort_order: Number(tr.querySelector('.sort_order').value || 1),
    is_active:  tr.querySelector('.is_active').checked
  };
  try{
    const { error } = await supabase.from('hl_combo_left').update(payload).eq('id', id);
    if (error) throw error;
    await renderComboLeft();
  }catch(err){ alert('儲存失敗：'+err.message); }
}

async function clDelete(id){
  if(!confirm('確定要刪除這筆輪播？')) return;
  try{
    const { error } = await supabase.from('hl_combo_left').delete().eq('id', id);
    if (error) throw error;
    await renderComboLeft();
  }catch(err){ alert('刪除失敗：'+err.message); }
}

async function clMove(tr, dir){
  const id  = tr.dataset.id;
  const cur = Number(tr.querySelector('.sort_order').value || 1);
  const rows = $$('#cl-body tr');
  const idx = rows.indexOf(tr);
  const swap = rows[idx + dir]; if (!swap) return;
  const oid  = swap.dataset.id;
  const os   = Number(swap.querySelector('.sort_order').value || 1);
  try{
    const { error } = await supabase.from('hl_combo_left').upsert([
      { id, sort_order: os }, { id: oid, sort_order: cur }
    ]);
    if (error) throw error;
    await renderComboLeft();
  }catch(err){ alert('移動失敗：'+err.message); }
}

/* ---- Right: hl_combo_right ---- */
async function fetchComboRight(){
  const { data, error } = await supabase
    .from('hl_combo_right')
    .select('id,title,sub,href,sort_order,is_active')
    .order('sort_order', { ascending: true });   // 單欄位排序，最穩
  if (error) throw error;
  return data || [];
}




function crRowTpl(r){
  return `
  <tr data-id="${r.id}">
    <td><input class="in title" value="${esc(r.title||'')}" placeholder="標題"></td>
    <td><input class="in sub"   value="${esc(r.sub||'')}"   placeholder="副標（可空）"></td>
    <td><input class="in href"  value="${esc(r.href||'#')}" placeholder="# 或 https://..."></td>
    <td class="stack">
      <input class="in sort_order" type="number" value="${Number(r.sort_order||1)}" style="width:80px">
      <button class="btn icon act up">↑</button>
      <button class="btn icon act down">↓</button>
    </td>
    <td class="stack">
      <label class="switch"><input type="checkbox" class="in is_active" ${r.is_active?'checked':''}><i></i></label>
    </td>
    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger  del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderComboRight(){
  if (!crBody) return;
  crBody.innerHTML = `<tr><td colspan="6" class="help" style="padding:12px">載入中…</td></tr>`;
  try{
    const rows = await fetchComboRight();
    crBody.innerHTML = rows.length ? rows.map(crRowTpl).join('')
      : `<tr><td colspan="6" class="help" style="padding:12px">尚無資料，點「新增卡片」。</td></tr>`;
  }catch(e){
    crBody.innerHTML = `<tr><td colspan="6" class="help" style="padding:12px">讀取失敗：${esc(e.message)}</td></tr>`;
  }
}

$('#cr-table')?.addEventListener('click', async (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  if (e.target.classList.contains('save'))       await crSave(tr);
  else if (e.target.classList.contains('del'))   await crDelete(id);
  else if (e.target.classList.contains('up'))    await crMove(tr,-1);
  else if (e.target.classList.contains('down'))  await crMove(tr,+1);
});

crRef?.addEventListener('click', renderComboRight);
crAdd?.addEventListener('click', async ()=>{
  try{
    const { data: maxRow, error: e1 } = await supabase
      .from('hl_combo_right').select('sort_order').order('sort_order',{ascending:false}).limit(1);
    if (e1) throw e1;
    const next = (maxRow?.[0]?.sort_order || 0) + 1;
    const { error } = await supabase.from('hl_combo_right').insert({
      title:'新卡片', sub:'', href:'#', sort_order: next, is_active:true
    });
    if (error) throw error;
    await renderComboRight();
  }catch(err){ alert('新增失敗：'+err.message); }
});

async function crSave(tr){
  const id = tr.dataset.id;
  const payload = {
    title:      tr.querySelector('.title').value.trim(),
    sub:        tr.querySelector('.sub').value.trim(),
    href:       tr.querySelector('.href').value.trim() || '#',
    sort_order: Number(tr.querySelector('.sort_order').value || 1),
    is_active:  tr.querySelector('.is_active').checked
  };
  try{
    const { error } = await supabase.from('hl_combo_right').update(payload).eq('id', id);
    if (error) throw error;
    await renderComboRight();
  }catch(err){ alert('儲存失敗：'+err.message); }
}

async function crDelete(id){
  if(!confirm('確定要刪除這張卡片？')) return;
  try{
    const { error } = await supabase.from('hl_combo_right').delete().eq('id', id);
    if (error) throw error;
    await renderComboRight();
  }catch(err){ alert('刪除失敗：'+err.message); }
}

async function crMove(tr, dir){
  const id  = tr.dataset.id;
  const cur = Number(tr.querySelector('.sort_order').value || 1);
  const rows = $$('#cr-body tr');
  const idx = rows.indexOf(tr);
  const swap = rows[idx + dir]; if (!swap) return;
  const oid  = swap.dataset.id;
  const os   = Number(swap.querySelector('.sort_order').value || 1);
  try{
    const { error } = await supabase.from('hl_combo_right').upsert([
      { id, sort_order: os }, { id: oid, sort_order: cur }
    ]);
    if (error) throw error;
    await renderComboRight();
  }catch(err){ alert('移動失敗：'+err.message); }
}

/* 一鍵渲染 Combo 面板 */
async function renderComboAdmin(){
  await Promise.all([ renderComboLeft(), renderComboRight() ]);
}

/* =========================
   CITIES / hl_cities CRUD
   ========================= */
const CT_PLACEHOLDER = 'https://placehold.co/800x500?text=City';

async function fetchCities(){
  const { data, error } = await supabase
    .from('hl_cities')
    .select('id,name,image_url,href,sort_order,is_active')
    .order('sort_order',{ ascending:true });
  if (error) throw error;
  return data || [];
}

function ctRowTpl(r){
  return `
  <tr data-id="${r.id}">
    <td><img class="bn-thumb" src="${esc(r.image_url||CT_PLACEHOLDER)}" alt="preview" onerror="this.src='${CT_PLACEHOLDER}'"></td>
    <td><input class="in name"      value="${esc(r.name||'')}"      placeholder="例：Kuching 城市探險"></td>
    <td><input class="in image_url" value="${esc(r.image_url||'')}" placeholder="https://..."></td>
    <td><input class="in href"      value="${esc(r.href||'#')}"     placeholder="# 或 https://..."></td>
    <td class="stack">
      <input class="in sort_order" type="number" value="${Number(r.sort_order||1)}" style="width:80px">
      <button class="btn icon act up">↑</button>
      <button class="btn icon act down">↓</button>
    </td>
    <td class="stack">
      <label class="switch"><input type="checkbox" class="in is_active" ${r.is_active?'checked':''}><i></i></label>
    </td>
    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger  del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderCitiesAdmin(){
  const ctBody = $('#ct-body'); if (!ctBody) return;
  ctBody.innerHTML = `<tr><td colspan="7" class="help" style="padding:12px">載入中…</td></tr>`;
  try{
    const rows = await fetchCities();
    ctBody.innerHTML = rows.length ? rows.map(ctRowTpl).join('')
      : `<tr><td colspan="7" class="help" style="padding:12px">尚無資料，點右上角「新增城市」。</td></tr>`;
  }catch(e){
    ctBody.innerHTML = `<tr><td colspan="7" class="help" style="padding:12px">讀取失敗：${esc(e.message)}</td></tr>`;
  }
}

$('#ct-table')?.addEventListener('input', (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  if (e.target.classList.contains('image_url')){
    tr.querySelector('img').src = e.target.value.trim() || CT_PLACEHOLDER;
  }
});

$('#ct-table')?.addEventListener('click', async (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  if (e.target.classList.contains('save'))      await ctSave(tr);
  else if (e.target.classList.contains('del'))  await ctDelete(id);
  else if (e.target.classList.contains('up'))   await ctMove(tr,-1);
  else if (e.target.classList.contains('down')) await ctMove(tr,+1);
});

$('#ct-refresh')?.addEventListener('click', renderCitiesAdmin);
$('#ct-add')?.addEventListener('click', async ()=>{
  try{
    const { data: maxRow, error: e1 } = await supabase
      .from('hl_cities').select('sort_order').order('sort_order',{ascending:false}).limit(1);
    if (e1) throw e1;
    const next = (maxRow?.[0]?.sort_order || 0) + 1;
    const { error } = await supabase.from('hl_cities').insert({
      name:'新城市', image_url: CT_PLACEHOLDER, href:'#', sort_order: next, is_active:true
    });
    if (error) throw error;
    await renderCitiesAdmin();
  }catch(err){ alert('新增失敗：'+err.message); }
});

async function ctSave(tr){
  const id = tr.dataset.id;
  const payload = {
    name:      tr.querySelector('.name').value.trim(),
    image_url: tr.querySelector('.image_url').value.trim() || CT_PLACEHOLDER,
    href:      tr.querySelector('.href').value.trim() || '#',
    sort_order: Number(tr.querySelector('.sort_order').value || 1),
    is_active: tr.querySelector('.is_active').checked
  };
  try{
    const { error } = await supabase.from('hl_cities').update(payload).eq('id', id);
    if (error) throw error;
    await renderCitiesAdmin();
  }catch(err){ alert('儲存失敗：'+err.message); }
}

async function ctDelete(id){
  if(!confirm('確定要刪除這個城市？')) return;
  try{
    const { error } = await supabase.from('hl_cities').delete().eq('id', id);
    if (error) throw error;
    await renderCitiesAdmin();
  }catch(err){ alert('刪除失敗：'+err.message); }
}

async function ctMove(tr, dir){
  const id  = tr.dataset.id;
  const cur = Number(tr.querySelector('.sort_order').value || 1);
  const rows = $$('#ct-body tr');
  const idx = rows.indexOf(tr);
  const swap = rows[idx + dir]; if (!swap) return;
  const oid  = swap.dataset.id;
  const os   = Number(swap.querySelector('.sort_order').value || 1);
  try{
    const { error } = await supabase.from('hl_cities').upsert([
      { id, sort_order: os }, { id: oid, sort_order: cur }
    ]);
    if (error) throw error;
    await renderCitiesAdmin();
  }catch(err){ alert('移動失敗：'+err.message); }
}

/* =========================
   ADS / hl_ads CRUD
   ========================= */
const AD_PLACEHOLDER = 'https://placehold.co/1200x300?text=Ad';
const AD_PLACEMENTS = ['home_mid','home_top','home_bottom'];

/* ---- 前台讀取（只取 home_mid + 時間窗過濾）---- */
async function fetchAds(){
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('hl_ads')
    .select('id,title,image_url,href,placement,sort_order,is_active,starts_at,ends_at')
    .eq('placement', 'home_mid')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('❌ fetchAds error:', error.message);
    throw error;
  }

  // 允許 starts_at/ends_at 為空，前端做時間窗過濾
  const inWindow = (row) => {
    const s = row.starts_at ? new Date(row.starts_at).toISOString() : null;
    const e = row.ends_at   ? new Date(row.ends_at).toISOString()   : null;
    return (!s || s <= nowIso) && (!e || e >= nowIso);
  };

  return (data || []).filter(inWindow);
}

/* ---- 後台：列出全部廣告（依 placement、sort_order） ---- */
async function fetchAdsAdmin(){
  const { data, error } = await supabase
    .from('hl_ads')
    .select('id,title,image_url,href,placement,sort_order,is_active,starts_at,ends_at')
    .order('placement', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

function adRowTpl(r){
  return `
  <tr data-id="${r.id}">
    <td>
      <select class="in placement">
        ${AD_PLACEMENTS.map(p => `<option value="${p}" ${r.placement===p?'selected':''}>${p}</option>`).join('')}
      </select>
    </td>

    <td>
      <img class="bn-thumb" src="${esc(r.image_url||AD_PLACEHOLDER)}" alt="preview"
           onerror="this.src='${AD_PLACEHOLDER}'">
    </td>

    <td>
      <input class="in title" value="${esc(r.title||'')}" placeholder="廣告標題（可空）">
    </td>

    <td>
      <input class="in image_url" value="${esc(r.image_url||'')}" placeholder="https://...">
    </td>

    <td>
      <input class="in href" value="${esc(r.href||'#')}" placeholder="# 或 https://...">
    </td>

    <td class="stack">
      <input class="in starts_at" type="datetime-local"
             value="${r.starts_at ? new Date(r.starts_at).toISOString().slice(0,16) : ''}">
      <small class="help">開始</small>
    </td>

    <td class="stack">
      <input class="in ends_at" type="datetime-local"
             value="${r.ends_at ? new Date(r.ends_at).toISOString().slice(0,16) : ''}">
      <small class="help">結束</small>
    </td>

    <td class="stack">
      <input class="in sort_order" type="number" value="${Number(r.sort_order||1)}" style="width:80px">
      <button class="btn icon act up"   title="上移">↑</button>
      <button class="btn icon act down" title="下移">↓</button>
    </td>

    <td class="stack">
      <label class="switch" title="上架">
        <input type="checkbox" class="in is_active" ${r.is_active?'checked':''}><i></i>
      </label>
    </td>

    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger  del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderAdsAdmin(){
  const adBody = $('#ad-body'); if (!adBody) return;
  adBody.innerHTML = `<tr><td colspan="11" class="help" style="padding:12px">載入中…</td></tr>`;
  try{
    const rows = await fetchAdsAdmin();
    adBody.innerHTML = rows.length ? rows.map(adRowTpl).join('')
      : `<tr><td colspan="11" class="help" style="padding:12px">尚無資料，點右上角「新增廣告」。</td></tr>`;
  }catch(e){
    adBody.innerHTML = `<tr><td colspan="11" class="help" style="padding:12px">讀取失敗：${esc(e.message)}</td></tr>`;
  }
}

/* 即時預覽圖 */
$('#ad-table')?.addEventListener('input', (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  if (e.target.classList.contains('image_url')){
    tr.querySelector('img').src = e.target.value.trim() || AD_PLACEHOLDER;
  }
});

/* 點擊：儲存/刪除/上下移 */
$('#ad-table')?.addEventListener('click', async (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  if (e.target.classList.contains('save'))      await adSave(tr);
  else if (e.target.classList.contains('del'))  await adDelete(id);
  else if (e.target.classList.contains('up'))   await adMove(tr,-1);
  else if (e.target.classList.contains('down')) await adMove(tr,+1);
});

/* 重新整理 / 新增 */
$('#ad-refresh')?.addEventListener('click', renderAdsAdmin);

$('#ad-add')?.addEventListener('click', async ()=>{
  try{
    // 以 home_mid 為預設 placement，找到下一個 sort
    const { data: maxRow, error: e1 } = await supabase
      .from('hl_ads')
      .select('sort_order')
      .eq('placement','home_mid')
      .order('sort_order',{ascending:false})
      .limit(1);
    if (e1) throw e1;

    const next = (maxRow?.[0]?.sort_order || 0) + 1;

    const { error } = await supabase.from('hl_ads').insert({
      title: '',
      image_url: AD_PLACEHOLDER,
      href:'#',
      placement: 'home_mid',    // ✅ 用 placement
      sort_order: next,
      is_active:true,
      starts_at: null,
      ends_at: null
    });
    if (error) throw error;
    await renderAdsAdmin();
  }catch(err){ alert('新增失敗：'+err.message); }
});

async function adSave(tr){
  const id = tr.dataset.id;

  // 轉 datetime-local → ISO
  const toIsoOrNull = (v)=>{
    const s = v?.trim();
    if(!s) return null;
    // local -> ISO（補秒；瀏覽器輸出已是 local time 的 "YYYY-MM-DDTHH:mm"）
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const payload = {
    title:      tr.querySelector('.title').value.trim(),
    image_url:  tr.querySelector('.image_url').value.trim() || AD_PLACEHOLDER,
    href:       tr.querySelector('.href').value.trim() || '#',
    placement:  tr.querySelector('.placement').value, // ✅
    sort_order: Number(tr.querySelector('.sort_order').value || 1),
    is_active:  tr.querySelector('.is_active').checked,
    starts_at:  toIsoOrNull(tr.querySelector('.starts_at').value),
    ends_at:    toIsoOrNull(tr.querySelector('.ends_at').value)
  };

  try{
    const { error } = await supabase.from('hl_ads').update(payload).eq('id', id);
    if (error) throw error;
    await renderAdsAdmin();
  }catch(err){ alert('儲存失敗：'+err.message); }
}

async function adDelete(id){
  if(!confirm('確定要刪除這個廣告？')) return;
  try{
    const { error } = await supabase.from('hl_ads').delete().eq('id', id);
    if (error) throw error;
    await renderAdsAdmin();
  }catch(err){ alert('刪除失敗：'+err.message); }
}

async function adMove(tr, dir){
  const id  = tr.dataset.id;
  const cur = Number(tr.querySelector('.sort_order').value || 1);

  const rows = $$('#ad-body tr');
  const idx = rows.indexOf(tr);
  const swap = rows[idx + dir]; if (!swap) return;

  const oid  = swap.dataset.id;
  const os   = Number(swap.querySelector('.sort_order').value || 1);

  try{
    const { error } = await supabase.from('hl_ads').upsert([
      { id,  sort_order: os },
      { id: oid, sort_order: cur }
    ]);
    if (error) throw error;
    await renderAdsAdmin();
  }catch(err){ alert('移動失敗：'+err.message); }
}


/* =========================
   COLLECTIONS / hl_collections CRUD
   ========================= */
const CO_PLACEHOLDER = 'https://placehold.co/800x500?text=Collection';

async function fetchCollections(){
  const { data, error } = await supabase
    .from('hl_collections')
    .select('id,name,slug,icon,href,sort_order,is_active')
    .order('sort_order',{ ascending:true });
  if (error) throw error;
  return data || [];
}


function coRowTpl(r){
  return `
  <tr data-id="${r.id}">
    <td><img class="bn-thumb" src="${esc(r.image_url||CO_PLACEHOLDER)}" onerror="this.src='${CO_PLACEHOLDER}'"></td>
    <td><input class="in title" value="${esc(r.title||'')}" placeholder="主題名稱"></td>
    <td><input class="in sub" value="${esc(r.sub||'')}" placeholder="副標"></td>
    <td><input class="in image_url" value="${esc(r.image_url||'')}" placeholder="https://..."></td>
    <td><input class="in href" value="${esc(r.href||'#')}" placeholder="# 或 https://..."></td>
    <td class="stack">
      <input class="in sort_order" type="number" value="${r.sort_order||1}" style="width:80px">
      <button class="btn icon act up">↑</button>
      <button class="btn icon act down">↓</button>
    </td>
    <td class="stack"><label class="switch"><input type="checkbox" class="in is_active" ${r.is_active?'checked':''}><i></i></label></td>
    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderCollectionsAdmin(){
  const body = $('#co-body'); if (!body) return;
  body.innerHTML = `<tr><td colspan="8" class="help">載入中…</td></tr>`;
  try{
    const rows = await fetchCollections();
    body.innerHTML = rows.length ? rows.map(coRowTpl).join('') :
      `<tr><td colspan="8" class="help">尚無資料，點「新增主題」。</td></tr>`;
  }catch(e){ body.innerHTML = `<tr><td colspan="8" class="help">讀取失敗：${esc(e.message)}</td></tr>`; }
}

$('#co-table')?.addEventListener('click', async (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  if(e.target.classList.contains('save'))      await coSave(tr);
  else if(e.target.classList.contains('del'))  await coDelete(id);
  else if(e.target.classList.contains('up'))   await coMove(tr,-1);
  else if(e.target.classList.contains('down')) await coMove(tr,+1);
});

$('#co-add')?.addEventListener('click', async ()=>{
  try{
    const { data: maxRow } = await supabase.from('hl_collections').select('sort_order').order('sort_order',{ascending:false}).limit(1);
    const next = (maxRow?.[0]?.sort_order || 0) + 1;
    const { error } = await supabase.from('hl_collections').insert({
      title:'新主題', sub:'', image_url:CO_PLACEHOLDER, href:'#', sort_order:next, is_active:true
    });
    if(error) throw error; await renderCollectionsAdmin();
  }catch(e){ alert('新增失敗：'+e.message); }
});

$('#co-refresh')?.addEventListener('click', renderCollectionsAdmin);

async function coSave(tr){
  const id = tr.dataset.id;
  const payload = {
    title: tr.querySelector('.title').value.trim(),
    sub: tr.querySelector('.sub').value.trim(),
    image_url: tr.querySelector('.image_url').value.trim() || CO_PLACEHOLDER,
    href: tr.querySelector('.href').value.trim() || '#',
    sort_order: Number(tr.querySelector('.sort_order').value || 1),
    is_active: tr.querySelector('.is_active').checked
  };
  try{
    const { error } = await supabase.from('hl_collections').update(payload).eq('id',id);
    if(error) throw error; await renderCollectionsAdmin();
  }catch(e){ alert('儲存失敗：'+e.message); }
}

async function coDelete(id){
  if(!confirm('確定要刪除？')) return;
  await supabase.from('hl_collections').delete().eq('id',id);
  await renderCollectionsAdmin();
}

async function coMove(tr,dir){
  const rows=$$('#co-body tr');const idx=rows.indexOf(tr);const swap=rows[idx+dir];if(!swap)return;
  const id=tr.dataset.id,oid=swap.dataset.id;
  const s=Number(tr.querySelector('.sort_order').value),os=Number(swap.querySelector('.sort_order').value);
  await supabase.from('hl_collections').upsert([{id,sort_order:os},{id:oid,sort_order:s}]);
  await renderCollectionsAdmin();
}

/* =========================
   GROUPS / hl_groups CRUD
   ========================= */
const GR_PLACEHOLDER='https://placehold.co/200x200?text=Avatar';

async function fetchGroups(){
  const {data,error}=await supabase.from('hl_groups').select('id,title,sub,avatar_url,href,sort_order,is_active').order('sort_order',{ascending:true});
  if(error)throw error;return data||[];
}

function grRowTpl(r){
  return `
  <tr data-id="${r.id}">
    <td><img class="avatar-thumb" src="${esc(r.avatar_url||GR_PLACEHOLDER)}" onerror="this.src='${GR_PLACEHOLDER}'"></td>
    <td><input class="in title" value="${esc(r.title||'')}" placeholder="名稱"></td>
    <td><input class="in sub" value="${esc(r.sub||'')}" placeholder="副標"></td>
    <td><input class="in href" value="${esc(r.href||'#')}" placeholder="# 或 https://..."></td>
    <td class="stack">
      <input class="in sort_order" type="number" value="${r.sort_order||1}" style="width:80px">
      <button class="btn icon act up">↑</button>
      <button class="btn icon act down">↓</button>
    </td>
    <td class="stack"><label class="switch"><input type="checkbox" class="in is_active" ${r.is_active?'checked':''}><i></i></label></td>
    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderGroupsAdmin(){
  const body=$('#gr-body');if(!body)return;
  body.innerHTML=`<tr><td colspan="7" class="help">載入中…</td></tr>`;
  try{
    const rows=await fetchGroups();
    body.innerHTML=rows.length?rows.map(grRowTpl).join(''):`<tr><td colspan="7" class="help">尚無資料，點「新增主題」。</td></tr>`;
  }catch(e){body.innerHTML=`<tr><td colspan="7" class="help">讀取失敗：${esc(e.message)}</td></tr>`;}
}

$('#gr-table')?.addEventListener('click',async(e)=>{
  const tr=e.target.closest('tr');if(!tr)return;const id=tr.dataset.id;
  if(e.target.classList.contains('save'))await grSave(tr);
  else if(e.target.classList.contains('del'))await grDelete(id);
  else if(e.target.classList.contains('up'))await grMove(tr,-1);
  else if(e.target.classList.contains('down'))await grMove(tr,+1);
});

$('#gr-add')?.addEventListener('click',async()=>{
  try{
    const {data:maxRow}=await supabase.from('hl_groups').select('sort_order').order('sort_order',{ascending:false}).limit(1);
    const next=(maxRow?.[0]?.sort_order||0)+1;
    await supabase.from('hl_groups').insert({title:'新主題',sub:'',avatar_url:GR_PLACEHOLDER,href:'#',sort_order:next,is_active:true});
    await renderGroupsAdmin();
  }catch(e){alert('新增失敗：'+e.message);}
});

$('#gr-refresh')?.addEventListener('click',renderGroupsAdmin);

async function grSave(tr){
  const id=tr.dataset.id;
  const payload={
    title:tr.querySelector('.title').value.trim(),
    sub:tr.querySelector('.sub').value.trim(),
    avatar_url:tr.querySelector('.avatar-thumb').src||GR_PLACEHOLDER,
    href:tr.querySelector('.href').value.trim()||'#',
    sort_order:Number(tr.querySelector('.sort_order').value||1),
    is_active:tr.querySelector('.is_active').checked
  };
  await supabase.from('hl_groups').update(payload).eq('id',id);
  await renderGroupsAdmin();
}

async function grDelete(id){
  if(!confirm('確定要刪除？'))return;
  await supabase.from('hl_groups').delete().eq('id',id);
  await renderGroupsAdmin();
}

async function grMove(tr,dir){
  const rows=$$('#gr-body tr');const idx=rows.indexOf(tr);const swap=rows[idx+dir];if(!swap)return;
  const id=tr.dataset.id,oid=swap.dataset.id;
  const s=Number(tr.querySelector('.sort_order').value),os=Number(swap.querySelector('.sort_order').value);
  await supabase.from('hl_groups').upsert([{id,sort_order:os},{id:oid,sort_order:s}]);
  await renderGroupsAdmin();
}

/* =========================
   SPOTLIGHT / hl_spotlight CRUD
   ========================= */
const SP_AVATAR = 'https://placehold.co/100x100?text=SP';

async function fetchSpotlight(){
  const { data, error } = await supabase
    .from('hl_spotlight')
    .select('id,name,avatar_url,href,sort_order,is_active')
    .order('sort_order',{ascending:true});
  if (error) throw error;
  return data || [];
}

function spRowTpl(r){
  return `
  <tr data-id="${r.id}">
    <td><img class="avatar-thumb" src="${esc(r.avatar_url||SP_AVATAR)}"
             onerror="this.src='${SP_AVATAR}'" alt="avatar"></td>
    <td><input class="in name" value="${esc(r.name||'')}" placeholder="@account 或 名稱"></td>
    <td><input class="in href" value="${esc(r.href||'#')}" placeholder="# 或 https://..."></td>
    <td class="stack">
      <input class="in sort_order" type="number" value="${Number(r.sort_order||1)}" style="width:80px">
      <button class="btn icon act up">↑</button>
      <button class="btn icon act down">↓</button>
    </td>
    <td class="stack">
      <label class="switch"><input type="checkbox" class="in is_active" ${r.is_active?'checked':''}><i></i></label>
    </td>
    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderSpotlightAdmin(){
  const body = $('#sp-body'); if (!body) return;
  body.innerHTML = `<tr><td colspan="6" class="help" style="padding:12px">載入中…</td></tr>`;
  try{
    const rows = await fetchSpotlight();
    body.innerHTML = rows.length ? rows.map(spRowTpl).join('')
      : `<tr><td colspan="6" class="help" style="padding:12px">尚無資料，點「新增成員」。</td></tr>`;
  }catch(e){
    body.innerHTML = `<tr><td colspan="6" class="help" style="padding:12px">讀取失敗：${esc(e.message)}</td></tr>`;
  }
}

$('#sp-table')?.addEventListener('click', async (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  if (e.target.classList.contains('save'))      await spSave(tr);
  else if (e.target.classList.contains('del'))  await spDelete(id);
  else if (e.target.classList.contains('up'))   await spMove(tr,-1);
  else if (e.target.classList.contains('down')) await spMove(tr,+1);
});

$('#sp-add')?.addEventListener('click', async ()=>{
  try{
    const { data:maxRow } = await supabase.from('hl_spotlight').select('sort_order').order('sort_order',{ascending:false}).limit(1);
    const next = (maxRow?.[0]?.sort_order || 0) + 1;
    const { error } = await supabase.from('hl_spotlight').insert({
      name:'新成員', avatar_url:SP_AVATAR, href:'#', sort_order:next, is_active:true
    });
    if (error) throw error;
    await renderSpotlightAdmin();
  }catch(err){ alert('新增失敗：'+err.message); }
});

$('#sp-refresh')?.addEventListener('click', renderSpotlightAdmin);

async function spSave(tr){
  const id = tr.dataset.id;
  const payload = {
    name: tr.querySelector('.name').value.trim(),
    avatar_url: tr.querySelector('.avatar-thumb').src || SP_AVATAR,
    href: tr.querySelector('.href').value.trim() || '#',
    sort_order: Number(tr.querySelector('.sort_order').value || 1),
    is_active: tr.querySelector('.is_active').checked
  };
  try{
    const { error } = await supabase.from('hl_spotlight').update(payload).eq('id', id);
    if (error) throw error;
    await renderSpotlightAdmin();
  }catch(err){ alert('儲存失敗：'+err.message); }
}

async function spDelete(id){
  if(!confirm('確定要刪除這位成員？')) return;
  await supabase.from('hl_spotlight').delete().eq('id', id);
  await renderSpotlightAdmin();
}

async function spMove(tr, dir){
  const rows = $$('#sp-body tr');
  const idx = rows.indexOf(tr);
  const swap = rows[idx + dir]; if (!swap) return;
  const id = tr.dataset.id, oid = swap.dataset.id;
  const s = Number(tr.querySelector('.sort_order').value || 1);
  const os= Number(swap.querySelector('.sort_order').value || 1);
  await supabase.from('hl_spotlight').upsert([{id,sort_order:os},{id:oid,sort_order:s}]);
  await renderSpotlightAdmin();
}

/* =========================
   GOODS / hl_goods CRUD
   ========================= */
async function fetchGoods(){
  const { data, error } = await supabase
    .from('hl_goods')
    .select('id,name,price,href,sort_order,is_active')
    .order('sort_order',{ascending:true});
  if (error) throw error;
  return data || [];
}

function gdRowTpl(r){
  return `
  <tr data-id="${r.id}">
    <td><input class="in name"  value="${esc(r.name||'')}"  placeholder="商品名稱"></td>
    <td><input class="in price" value="${esc(r.price||'')}" placeholder="$9.9"></td>
    <td><input class="in href"  value="${esc(r.href||'#')}"  placeholder="# 或 https://..."></td>
    <td class="stack">
      <input class="in sort_order" type="number" value="${Number(r.sort_order||1)}" style="width:80px">
      <button class="btn icon act up">↑</button>
      <button class="btn icon act down">↓</button>
    </td>
    <td class="stack">
      <label class="switch"><input type="checkbox" class="in is_active" ${r.is_active?'checked':''}><i></i></label>
    </td>
    <td class="stack">
      <button class="btn primary save">💾 儲存</button>
      <button class="btn danger del">🗑️ 刪除</button>
    </td>
  </tr>`;
}

async function renderGoodsAdmin(){
  const body = $('#gd-body'); if (!body) return;
  body.innerHTML = `<tr><td colspan="6" class="help" style="padding:12px">載入中…</td></tr>`;
  try{
    const rows = await fetchGoods();
    body.innerHTML = rows.length ? rows.map(gdRowTpl).join('')
      : `<tr><td colspan="6" class="help" style="padding:12px">尚無資料，點「新增商品」。</td></tr>`;
  }catch(e){
    body.innerHTML = `<tr><td colspan="6" class="help" style="padding:12px">讀取失敗：${esc(e.message)}</td></tr>`;
  }
}

$('#gd-table')?.addEventListener('click', async (e)=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  if (e.target.classList.contains('save'))      await gdSave(tr);
  else if (e.target.classList.contains('del'))  await gdDelete(id);
  else if (e.target.classList.contains('up'))   await gdMove(tr,-1);
  else if (e.target.classList.contains('down')) await gdMove(tr,+1);
});

$('#gd-add')?.addEventListener('click', async ()=>{
  try{
    const { data:maxRow } = await supabase.from('hl_goods').select('sort_order').order('sort_order',{ascending:false}).limit(1);
    const next = (maxRow?.[0]?.sort_order || 0) + 1;
    const { error } = await supabase.from('hl_goods').insert({
      name:'新商品', price:'$0', href:'#', sort_order:next, is_active:true
    });
    if (error) throw error;
    await renderGoodsAdmin();
  }catch(err){ alert('新增失敗：'+err.message); }
});

$('#gd-refresh')?.addEventListener('click', renderGoodsAdmin);

async function gdSave(tr){
  const id = tr.dataset.id;
  const payload = {
    name: tr.querySelector('.name').value.trim(),
    price: tr.querySelector('.price').value.trim(),
    href: tr.querySelector('.href').value.trim() || '#',
    sort_order: Number(tr.querySelector('.sort_order').value || 1),
    is_active: tr.querySelector('.is_active').checked
  };
  try{
    const { error } = await supabase.from('hl_goods').update(payload).eq('id', id);
    if (error) throw error;
    await renderGoodsAdmin();
  }catch(err){ alert('儲存失敗：'+err.message); }
}

async function gdDelete(id){
  if(!confirm('確定要刪除這個商品？')) return;
  await supabase.from('hl_goods').delete().eq('id', id);
  await renderGoodsAdmin();
}

async function gdMove(tr, dir){
  const rows = $$('#gd-body tr');
  const idx = rows.indexOf(tr);
  const swap = rows[idx + dir]; if (!swap) return;
  const id = tr.dataset.id, oid = swap.dataset.id;
  const s = Number(tr.querySelector('.sort_order').value || 1);
  const os= Number(swap.querySelector('.sort_order').value || 1);
  await supabase.from('hl_goods').upsert([{id,sort_order:os},{id:oid,sort_order:s}]);
  await renderGoodsAdmin();
}
