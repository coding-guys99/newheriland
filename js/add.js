// add.js
import { supabase } from './app.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const form     = $('#addForm');
const fName    = $('#fName');
const fCity    = $('#fCity');
const fCategory= $('#fCategory');
const fAddress = $('#fAddress');
const fWebsite = $('#fWebsite');
const fPhone   = $('#fPhone');
const fPrice   = $('#fPrice');
const fHours   = $('#fHours');
const fDesc    = $('#fDesc');
const fPhotos  = $('#fPhotos');
const grid     = $('#previewGrid');
const btnSave  = $('#btnSave');
const btnDraft = $('#btnDraft');
const msgBox   = $('#addMsg');

// --- 本地預覽 ---
function renderPreview(files){
  grid.innerHTML = '';
  const list = Array.from(files).slice(0, 12);
  list.forEach(file=>{
    const url = URL.createObjectURL(file);
    const cell = document.createElement('div');
    cell.className = 'thumb';
    cell.style.backgroundImage = `url("${url}")`;
    const del = document.createElement('button');
    del.type = 'button'; del.textContent = '×';
    del.addEventListener('click', ()=> cell.remove());
    cell.appendChild(del);
    grid.appendChild(cell);
  });
}
fPhotos?.addEventListener('change', (e)=>{
  renderPreview(e.target.files || []);
});

// --- 小工具 ---
const toNumberOrNull = v => {
  const n = Number(v); return Number.isFinite(n) ? n : null;
};
function setBusy(on){
  btnSave.disabled = on;
  btnDraft.disabled = on;
  form.style.opacity = on ? .7 : 1;
}
function say(t, isErr=false){
  msgBox.textContent = t || '';
  msgBox.style.color = isErr ? '#b91c1c' : '#374151';
}

// --- 圖片上傳到 Supabase Storage ---
async function uploadImagesToSupabase(files, {bucket='merchant-photos', folder='public'} = {}){
  const urls = [];
  for (const file of files){
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600', upsert: false
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}

// --- 表單提交：上傳圖 → 寫 merchants ---
form?.addEventListener('submit', async (e)=>{
  e.preventDefault();

  // 基本驗證
  if (!fName.value.trim()){ fName.focus(); return; }
  if (!fCity.value){ fCity.focus(); return; }
  if (!fCategory.value){ fCategory.focus(); return; }
  if (!fAddress.value.trim()){ fAddress.focus(); return; }

  setBusy(true); say('Uploading photos…');

  try{
    const files = Array.from(fPhotos.files || []);
    const imageUrls = files.length ? await uploadImagesToSupabase(files) : [];
    const cover = imageUrls[0] || null;

    const payload = {
      name: fName.value.trim(),
      city_id: fCity.value,
      category: fCategory.value,
      address: fAddress.value.trim(),
      website: fWebsite.value.trim() || null,
      phone: fPhone.value.trim() || null,
      price_level: toNumberOrNull(fPrice.value),
      openHours: fHours.value.trim() || null,  // 現階段簡版時間字串
      description: fDesc.value.trim() || null,
      cover,
      images: imageUrls.length ? imageUrls : null,
      status: 'active'
      // lat/lng 留空即可（之後要地理編碼再補）
    };

    say('Saving…');
    const { data, error } = await supabase.from('merchants').insert(payload).select('id').single();
    if (error) throw error;

    say('✅ Published!', false);
    form.reset();
    grid.innerHTML = '';
  }catch(err){
    console.error('Save failed:', err);
    say('Save failed. Please try again.', true);
  }finally{
    setBusy(false);
  }
});

// 可選：儲存草稿（localStorage）
btnDraft?.addEventListener('click', ()=>{
  const draft = {
    name: fName.value, city_id: fCity.value, category: fCategory.value,
    address: fAddress.value, website: fWebsite.value, phone: fPhone.value,
    price_level: fPrice.value, openHours: fHours.value, description: fDesc.value
  };
  localStorage.setItem('add_draft', JSON.stringify(draft));
  say('Draft saved locally.');
});
// 自動載入草稿
(function loadDraft(){
  try{
    const s = localStorage.getItem('add_draft');
    if (!s) return;
    const d = JSON.parse(s);
    fName.value = d.name || '';
    fCity.value = d.city_id || '';
    fCategory.value = d.category || '';
    fAddress.value = d.address || '';
    fWebsite.value = d.website || '';
    fPhone.value = d.phone || '';
    fPrice.value = d.price_level || '';
    fHours.value = d.openHours || '';
    fDesc.value = d.description || '';
  }catch{}
})();
