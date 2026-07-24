/* ═══════════════════════════════════════════════════════════
   AUTH — signup, login, logout, password reset, dashboard guard
   Requires js/supabase-client.js to be loaded first.
═══════════════════════════════════════════════════════════ */

function showFormMessage(formEl, text, type) {
  let msg = formEl.querySelector('.form-message');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'form-message';
    formEl.prepend(msg);
  }
  msg.textContent = text;
  msg.className = 'form-message ' + (type === 'error' ? 'form-error' : 'form-success');
}

function setSubmitLoading(formEl, loadingText) {
  const btn = formEl.querySelector('[type="submit"]');
  if (!btn) return null;
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>${loadingText}</span>`;
  return () => { btn.disabled = false; btn.innerHTML = original; };
}

const SUPABASE_NOT_CONFIGURED_MSG = 'Client portal is not set up yet. Add your Supabase project URL and anon key to js/supabase-client.js.';

async function handleSignup(event) {
  event.preventDefault();
  const form = event.target;
  if (!supabaseClient) { showFormMessage(form, SUPABASE_NOT_CONFIGURED_MSG, 'error'); return; }
  const practiceName = form.practice_name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirm_password.value;

  if (password !== confirmPassword) {
    showFormMessage(form, "Passwords don't match.", 'error');
    return;
  }

  const restore = setSubmitLoading(form, 'Creating Account…');
  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { practice_name: practiceName } },
  });
  if (restore) restore();

  if (error) {
    showFormMessage(form, error.message, 'error');
    return;
  }
  showFormMessage(form, 'Account created! Check your email to confirm, then log in.', 'success');
  form.reset();
}
window.handleSignup = handleSignup;

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  if (!supabaseClient) { showFormMessage(form, SUPABASE_NOT_CONFIGURED_MSG, 'error'); return; }
  const email = form.email.value.trim();
  const password = form.password.value;

  const restore = setSubmitLoading(form, 'Logging In…');
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    if (restore) restore();
    showFormMessage(form, error.message, 'error');
    return;
  }
  window.location.href = 'dashboard.html';
}
window.handleLogin = handleLogin;

async function handleLogout() {
  if (!supabaseClient) { window.location.href = 'login.html'; return; }
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}
window.handleLogout = handleLogout;

async function handleResetRequest(event) {
  event.preventDefault();
  const form = event.target;
  if (!supabaseClient) { showFormMessage(form, SUPABASE_NOT_CONFIGURED_MSG, 'error'); return; }
  const email = form.email.value.trim();

  const restore = setSubmitLoading(form, 'Sending…');
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'reset-password.html',
  });
  if (restore) restore();

  if (error) {
    showFormMessage(form, error.message, 'error');
    return;
  }
  showFormMessage(form, 'Check your email for a password reset link.', 'success');
  form.reset();
}
window.handleResetRequest = handleResetRequest;

async function handleResetConfirm(event) {
  event.preventDefault();
  const form = event.target;
  if (!supabaseClient) { showFormMessage(form, SUPABASE_NOT_CONFIGURED_MSG, 'error'); return; }
  const password = form.password.value;
  const confirmPassword = form.confirm_password.value;

  if (password !== confirmPassword) {
    showFormMessage(form, "Passwords don't match.", 'error');
    return;
  }

  const restore = setSubmitLoading(form, 'Updating…');
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (restore) restore();

  if (error) {
    showFormMessage(form, error.message, 'error');
    return;
  }
  showFormMessage(form, 'Password updated! Redirecting to login…', 'success');
  setTimeout(() => { window.location.href = 'login.html'; }, 1800);
}
window.handleResetConfirm = handleResetConfirm;

/* Redirects to login.html if there is no active session. Returns the user on success. */
async function guardDashboard() {
  if (!supabaseClient) {
    document.body.innerHTML = `<div style="padding:80px 32px; text-align:center; font-family:Raleway,sans-serif; color:#F0EDE8; background:#0B1929; min-height:100vh;">
      <p>${SUPABASE_NOT_CONFIGURED_MSG}</p></div>`;
    return null;
  }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session.user;
}
window.guardDashboard = guardDashboard;
