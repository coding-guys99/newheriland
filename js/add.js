// add.js — integrated, safe to drop-in
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

(async function () {
  /* ---------- 基本 refs（缺任何一块都不会报错） ---------- */
  const form = $('#addForm');
  if (!form) return; // 整页没有 addForm 就直接退出（不报错）

  // 基础字段
  const fName    = $('#fName');
  const fAddress = $('#fAddress');
  const fPhone   = $('#fPhone');
  const fWebsite = $('#fWebsite');
  const fCity    = $('#fCity');        // <select> or <input>
  const fPrice   = $('#fPriceLevel');  // 1~4
  const fDesc    = $('#fDesc');
  const fInsta   = $('#fInsta');
  const fFB      = $('#fFB');

  // 地理编码（可选）
  const fLat     = $('#fLat');   // 可隐藏
  const fLng     = $('#fLng');   // 可隐藏
  const btnGeo   = $('#btnGeocode');

  // 分类 / 标签（chips）
  const typeWrap = $('#typeChips'); // 单选：分类
  const tagWrap  = $('#tagChips');  // 多选：标签（可空）

  // 每周营业时间容器（7天行，每行：checkbox.day-on + select.open + select.close）
  // 行结构示例：<div class="day-row" data-day="mon">...</div>
  const hoursWrap = $('#hoursWeekly');

  // 照片
  const fileInput = $('#fPhotos');     // multiple
  const grid      = $('#previewGrid'); // 预览容器

  // 状态提示
  const toast     = $('#addToast');    // 可选简易提示

  /* ---------- 小工具 ---------- */
  const slug = (s='') => (s||'').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

  const autosize = (el)=>{ if(!el) return; el.style.height='auto'; el.style.height = Math.min(240, el.scrollHeight)+'px'; };

  const showToast = (msg, kind='info')=>{
    if (!toast) { console[kind==='error'?'error':'log'](msg); return; }
    toast.textContent = msg;
    toast.dataset.kind = kind;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> toast.hidden = true, 2400);
  };

  // 生成 id： city + slug(name) + 时间尾巴
  const makeId = (cityId, name) => {
    const t = Date.now().toString(36).slice(-5);
    return `${(cityId||'xx').toLowerCase()}-${slug(name)}-${t}`;
  };

  // 读 chips
  const readType = () => {
    const on = typeWrap?.querySelector('.chip.is-on');
    return on ? (on.dataset.type || on.textContent.trim()) : '';
  };
  const readTags = () => {
    return $$('.chip.is-on', tagWrap).map(c => c.dataset.tag || c.textContent.trim());
  };

  // 读 weekly hours → open_hours 结构（与 explore.js 兼容）
  // 需要的 DOM：#hoursWeekly 内含 7 个 .day-row[data-day] 行
  // 行内有：input[type=checkbox].day-on, select.open, select.close（ HH:MM ）
  const wdMap = ['sun','mon','tue','wed','thu','fri','sat'];
  function readHours(){
    const out = {};
    if (!hoursWrap) return out;
    $$('.day-row', hoursWrap).forEach(row=>{
      const day  = row.dataset.day;             // 'mon' | 'tue' ...
      if (!day) return;
      const on   = row.querySelector('.day-on')?.checked;
      const open = row.querySelector('.open')?.value || '';
      const close= row.querySelector('.close')?.value || '';
      if (!on || !open || !close) { out[day] = { ranges: [] }; return; }
      out[day] = { ranges: [{ open, close }] };
    });
    return out;
  }

  // 地址 → 经纬度（可选；失败不拦截）
  async function geocode(addr){
    if (!addr) return null;
    try{
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`;
      const r = await fetch(url, { headers: { 'Accept-Language': 'en' }});
      const j = await r.json();
      if (Array.isArray(j) && j.length){
        return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
      }
    }catch(e){ /* noop */ }
    return null;
  }

  // 上传图片到 Supabase Storage（如未配置 supabase，则返回本地 dataURL 占位）
  // 需要一个 bucket：merchant-photos（public）
  async function uploadPhotos(files){
    const results = [];
    const arr = Array.from(files||[]).slice(0, 10);
    for (const f of arr){
      if (!supabase) {
        // fallback：转为临时预览地址
        results.push({ url: URL.createObjectURL(f) });
        continue;
      }
      try{
        const ext = (f.name.split('.').pop()||'jpg').toLowerCase();
        const path = `merchants/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('merchant-photos').upload(path, f, {
          cacheControl: '3600', upsert: false, contentType: f.type || 'image/jpeg'
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('merchant-photos').getPublicUrl(path);
        results.push({ url: pub?.publicUrl || '' });
      }catch(err){
        console.error('upload error:', err);
        // 退回本地 URL，让用户至少能看到
        results.push({ url: URL.createObjectURL(f) });
      }
    }
    return results;
  }

  /* ---------- 交互：chips / 描述自适应 / 预览 ---------- */
  // 分类（单选）
  typeWrap?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if (!btn) return;
    $$('.chip', typeWrap).forEach(c => c.classList.remove('is-on'));
    btn.classList.add('is-on');
  });

  // 标签（多选）
  tagWrap?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if (!btn) return;
    btn.classList.toggle('is-on');
  });

  // 描述自适应
  if (fDesc){
    autosize(fDesc);
    fDesc.addEventListener('input', ()=> autosize(fDesc));
  }

  // 照片本地预览
  function renderPreview(files){
    if (!grid) return;
    grid.innerHTML = '';
    Array.from(files||[]).slice(0, 10).forEach(file=>{
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
  fileInput?.addEventListener('change', (e)=> renderPreview(e.target.files||[]));

  // 地址 → 经纬度（可选按钮）
  btnGeo?.addEventListener('click', async ()=>{
    const addr = fAddress?.value?.trim();
    if (!addr) { showToast('請先輸入地址', 'error'); return; }
    showToast('Geocoding…');
    const pt = await geocode(addr);
    if (!pt){ showToast('查不到此地址座標', 'error'); return; }
    if (fLat) fLat.value = pt.lat.toFixed(6);
    if (fLng) fLng.value = pt.lng.toFixed(6);
    showToast('已取得座標 ✓', 'success');
  });

  /* ---------- 提交 ---------- */
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    // 必填：名稱 / 地址 / 城市
    const name = fName?.value?.trim();
    const addr = fAddress?.value?.trim();
    const city = fCity?.value?.trim() || fCity?.dataset.value || '';
    if (!name){ fName?.focus(); showToast('請輸入商家名稱', 'error'); return; }
    if (!addr){ fAddress?.focus(); showToast('請輸入地址', 'error'); return; }
    if (!city){ fCity?.focus(); showToast('請選擇城市', 'error'); return; }

    // 读取 UI 值
    const category = readType();
    const tags = readTags();
    const phone = fPhone?.value?.trim() || '';
    const website = fWebsite?.value?.trim() || '';
    const priceLevel = parseInt(fPrice?.value || '0', 10) || null;
    const socials = { instagram: fInsta?.value?.trim() || '', facebook: fFB?.value?.trim() || '' };
    const open_hours = readHours();
    let lat = fLat?.value ? Number(fLat.value) : null;
    let lng = fLng?.value ? Number(fLng.value) : null;

    // 没有经纬度 → 尝试后台地理编码（不阻塞）
    if ((!lat || !lng) && addr){
      try{ const pt = await geocode(addr); if (pt){ lat = pt.lat; lng = pt.lng; } }catch(_){}
    }

    // 先上传图片（如有）
    let images = [];
    let cover = '';
    try{
      if (fileInput?.files?.length){
        const uploaded = await uploadPhotos(fileInput.files);
        images = uploaded.map(x => x.url).filter(Boolean);
        cover = images[0] || '';
      }
    }catch(err){
      console.warn('photo upload failed (continue anyway):', err);
    }

    // 组装 payload（与 explore/detail 结构对齐）
    const payload = {
      id: makeId(city, name),
      name,
      city_id: city,
      category: category || null,
      tag_ids: tags,                 // 建议 merchants.tag_ids 列型 JSONB
      address: addr,
      lat, lng,
      cover: cover || null,
      images,                        // JSONB
      open_hours,                    // JSONB
      rating: null,
      price_level: priceLevel,       // int
      phone,
      whatsapp: null,
      website,
      email: null,
      socials,                       // JSONB {instagram, facebook}
      description: fDesc?.value?.trim() || '',
      status: 'pending',             // 或 'active' 視權限流程
      featured: false,
      updated_at: new Date().toISOString()
    };

    // 尝试存至 Supabase（如未配置，则放本地队列）
    if (!supabase){
      // 本地排队（简单 localStorage）
      const key = 'add_queue_merchants';
      const q = JSON.parse(localStorage.getItem(key) || '[]');
      q.push(payload);
      localStorage.setItem(key, JSON.stringify(q));
      showToast('已暫存於本地（未連接後端）', 'success');
      form.reset(); grid && (grid.innerHTML='');
      return;
    }

    try{
      const { data, error } = await supabase
        .from('merchants')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;

      showToast('已送出，待審核上架 ✓', 'success');
      form.reset();
      grid && (grid.innerHTML='');

    }catch(err){
      console.error('Save failed:', err);
      // 典型錯：欄位型別不符 / JSONB 欄位不存在
      showToast(err?.message || '儲存失敗，已加入離線佇列', 'error');

      // 退回本地隊列避免遺失
      const key = 'add_queue_merchants';
      const q = JSON.parse(localStorage.getItem(key) || '[]');
      q.push(payload);
      localStorage.setItem(key, JSON.stringify(q));
    }
  });

})();