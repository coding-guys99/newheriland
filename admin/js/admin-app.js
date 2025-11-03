// /admin/js/admin-app.js
import { supabase } from '../../js/app.js';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const frame = $('#adminFrame');
const userEmailEl = $('#userEmail');

const ALLOWED_EMAILS = ['andy@heriland.app'];

(async () => {
  try {
    // 用 getSession 更穩
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    const user = session?.user;
    if (!user) {
      alert('請先登入後再進入後台');
      location.href = new URL('./login.html', location.href).href;
      return;
    }

    if (!ALLOWED_EMAILS.includes(user.email)) {
      alert('此帳號無權限使用後台');
      await supabase.auth.signOut();
      location.href = new URL('./login.html', location.href).href;
      return;
    }

    userEmailEl.textContent = user.email || '';
  } catch (err) {
    console.error('Auth error:', err);
    alert('登入驗證失敗，請重新登入');
    location.href = new URL('./login.html', location.href).href;
  }
})();


