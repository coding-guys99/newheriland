// Uses the same supabase instance as the app
});
if(error) throw error;
await renderBanners();
}catch(e){ alert('新增失敗：'+e.message); }
});


async function saveRow(tr){
const id = tr.dataset.id;
const payload = {
title: tr.querySelector('.title').value.trim(),
image_url: tr.querySelector('.image_url').value.trim() || PLACEHOLDER_IMG,
target_type: tr.querySelector('.target_type').value,
target_value:tr.querySelector('.target_value').value.trim(),
sort_order: Number(tr.querySelector('.sort_order').value || 1),
is_active: tr.querySelector('.is_active').checked
};
try{
const { error } = await supabase.from('hl_banners').update(payload).eq('id', id);
if(error) throw error;
// 重新拉取（確保排序正確）
await renderBanners();
}catch(e){ alert('儲存失敗：'+e.message); }
}


async function deleteRow(id){
if(!confirm('確定要刪除這個 Banner？')) return;
try{
const { error } = await supabase.from('hl_banners').delete().eq('id', id);
if(error) throw error;
await renderBanners();
}catch(e){ alert('刪除失敗：'+e.message); }
}


async function moveRow(tr, dir){
// dir = -1 (上移) / +1 (下移)
const id = tr.dataset.id;
const currentSort = Number(tr.querySelector('.sort_order').value || 1);


// 找到鄰居
const rows = $$('#bn-body tr');
const idx = rows.indexOf(tr);
const swapWith = rows[idx + dir];
if(!swapWith) return; // already at edge


const otherId = swapWith.dataset.id;
const otherSort = Number(swapWith.querySelector('.sort_order').value || 1);


try{
// 交換兩筆的 sort_order
const { error } = await supabase.from('hl_banners').upsert([
{ id, sort_order: otherSort },
{ id: otherId, sort_order: currentSort }
]);
if(error) throw error;
await renderBanners();
}catch(e){ alert('移動失敗：'+e.message); }
}


// 首次載入
renderBanners();