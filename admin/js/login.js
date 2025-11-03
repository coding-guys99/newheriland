import { supabase } from '../../js/app.js'; // ⚠️ 若 login.html 與 app.js 不在同層，請改正確路徑

const form = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const msg = document.getElementById('msg');

// 允許登入的帳號白名單
const ALLOWED_EMAILS = ['andy@heriland.app'];

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '登入中...';

  const email = emailEl.value.trim();
  const password = passwordEl.value.trim();
  if (!email || !password) return (msg.textContent = '請輸入 Email 與密碼');

  try {
    // 登入 Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // 驗證白名單
    if (!ALLOWED_EMAILS.includes(email)) {
      await supabase.auth.signOut();
      msg.textContent = '此帳號無權限進入後台。';
      return;
    }

    msg.textContent = '登入成功，正在跳轉...';
    setTimeout(()=> location.href = './index.html', 1200);
  } catch (err) {
    msg.textContent = '登入失敗：' + (err.message || '');
  }
});


