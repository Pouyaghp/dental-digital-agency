/* ═══════════════════════════════════════════════════════════
   DASHBOARD — fetch & render client data
   Requires js/supabase-client.js and js/auth.js to be loaded first.
═══════════════════════════════════════════════════════════ */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function renderProjects(projects) {
  const el = document.getElementById('projects-list');
  if (!projects.length) { el.innerHTML = emptyState('No active projects yet — check back soon.'); return; }
  el.innerHTML = projects.map(p => `
    <div class="card dash-item">
      <div class="dash-item-head">
        <div class="dash-item-title">${escapeHtml(p.name)}</div>
        <span class="status-badge status-${escapeHtml((p.status || '').toLowerCase().replace(/\s+/g, '-'))}">${escapeHtml(p.status)}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, p.progress_percent))}%;"></div></div>
      <div class="dash-item-meta">${p.progress_percent}% complete · Updated ${new Date(p.updated_at).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function renderReports(reports) {
  const el = document.getElementById('reports-list');
  if (!reports.length) { el.innerHTML = emptyState('No reports have been shared yet.'); return; }
  el.innerHTML = reports.map(r => `
    <div class="card dash-item">
      <div class="dash-item-head">
        <div class="dash-item-title">${escapeHtml(r.title)}</div>
        ${r.metric_value ? `<span class="metric-pill">${escapeHtml(r.metric_value)}</span>` : ''}
      </div>
      ${r.metric_label ? `<div class="dash-item-meta">${escapeHtml(r.metric_label)}</div>` : ''}
      ${r.summary ? `<p class="dash-item-desc">${escapeHtml(r.summary)}</p>` : ''}
      <div class="dash-item-meta">${new Date(r.report_date).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function renderDeliverables(deliverables) {
  const el = document.getElementById('deliverables-list');
  if (!deliverables.length) { el.innerHTML = emptyState('No files have been shared yet.'); return; }
  el.innerHTML = deliverables.map(d => `
    <div class="deliverable-row">
      <div>
        <div class="dash-item-title">${escapeHtml(d.title)}</div>
        <div class="dash-item-meta">Uploaded ${new Date(d.uploaded_at).toLocaleDateString()}</div>
      </div>
      <button class="btn btn-ghost btn-sm" data-file-path="${escapeHtml(d.file_path)}">Download</button>
    </div>
  `).join('');
  el.querySelectorAll('[data-file-path]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const path = btn.getAttribute('data-file-path');
      btn.disabled = true;
      const { data, error } = await supabaseClient.storage.from('deliverables').createSignedUrl(path, 60);
      btn.disabled = false;
      if (error || !data) { alert('Could not generate download link: ' + (error?.message || 'unknown error')); return; }
      window.open(data.signedUrl, '_blank');
    });
  });
}

function renderMessages(messages) {
  const el = document.getElementById('messages-list');
  if (!messages.length) { el.innerHTML = emptyState('No messages yet — say hello!'); return; }
  el.innerHTML = messages.map(m => `
    <div class="message-bubble message-${m.sender}">
      <div class="message-body">${escapeHtml(m.body)}</div>
      <div class="message-time">${new Date(m.created_at).toLocaleString()}</div>
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

async function initDashboard() {
  const user = await guardDashboard();
  if (!user) return;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('practice_name')
    .eq('id', user.id)
    .single();

  const greetingEl = document.getElementById('dash-greeting-name');
  if (greetingEl) greetingEl.textContent = profile?.practice_name || user.email;

  const [{ data: projects }, { data: reports }, { data: deliverables }, { data: messages }] = await Promise.all([
    supabaseClient.from('projects').select('*').order('updated_at', { ascending: false }),
    supabaseClient.from('reports').select('*').order('report_date', { ascending: false }),
    supabaseClient.from('deliverables').select('*').order('uploaded_at', { ascending: false }),
    supabaseClient.from('messages').select('*').order('created_at', { ascending: true }),
  ]);

  renderProjects(projects || []);
  renderReports(reports || []);
  renderDeliverables(deliverables || []);
  renderMessages(messages || []);

  const messageForm = document.getElementById('message-form');
  if (messageForm) {
    messageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = messageForm.body.value.trim();
      if (!body) return;
      const btn = messageForm.querySelector('[type="submit"]');
      btn.disabled = true;
      const { error } = await supabaseClient.from('messages').insert({
        client_id: user.id,
        sender: 'client',
        body,
      });
      btn.disabled = false;
      if (error) { alert('Could not send message: ' + error.message); return; }
      messageForm.reset();
      const { data: refreshed } = await supabaseClient
        .from('messages').select('*').order('created_at', { ascending: true });
      renderMessages(refreshed || []);
    });
  }

  supabaseClient
    .channel('messages-realtime')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${user.id}`,
    }, async () => {
      const { data: refreshed } = await supabaseClient
        .from('messages').select('*').order('created_at', { ascending: true });
      renderMessages(refreshed || []);
    })
    .subscribe();

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

document.addEventListener('DOMContentLoaded', initDashboard);
