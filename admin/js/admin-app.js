import { supabase } from '../../js/app.js';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const frame = $('#adminFrame');
const userEmailEl = $('#userEmail');

// ✅ 同一份白名單
const ALLOWED_EMAILS = ['andy@heriland.app'];

// 1) Auth guard + 顯示使用者 email
(async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    const user = data?.user;
    if (!user) {
      alert('請先登入後再進入後台');
      location.href = '../login.html';
      return;
    }

    // 檢查是否允許
    if (!ALLOWED_EMAILS.includes(user.email)) {
      alert('此帳號無權限使用後台');
      await supabase.auth.signOut();
      location.href = '../login.html';
      return;
    }

    userEmailEl.textContent = user.email || '';
  } catch (err) {
    console.error('Auth error:', err);
    alert('登入驗證失敗，請重新登入');
    location.href = '../login.html';
  }
})();
