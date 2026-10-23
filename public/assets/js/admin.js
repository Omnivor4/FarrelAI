document.addEventListener('DOMContentLoaded', () => {
  const loginGate = document.getElementById('loginGate');
  const dashboardContainer = document.getElementById('dashboardContainer');
  const adminKeyInput = document.getElementById('adminKeyInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');

  const totalDevicesEl = document.getElementById('totalDevices');
  const totalMessagesEl = document.getElementById('totalMessages');
  const deviceListEl = document.getElementById('deviceList');
  const logsFeedListEl = document.getElementById('logsFeedList');
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportBtn = document.getElementById('exportBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  let adminKey = sessionStorage.getItem('farrel_admin_key') || '';
  let allLogs = [];
  let selectedDeviceId = null;

  if (adminKey) {
    loadDashboard();
  }

  loginBtn.addEventListener('click', handleLogin);
  adminKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  async function handleLogin() {
    const key = adminKeyInput.value.trim().replace(/^["']|["']$/g, '');
    if (!key) return;

    loginBtn.disabled = true;
    loginError.style.display = 'none';

    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-key': key }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Password salah. Silakan coba lagi.');
      }

      adminKey = key;
      sessionStorage.setItem('farrel_admin_key', adminKey);
      loadDashboard();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
    }
  }

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('farrel_admin_key');
    window.location.reload();
  });

  async function loadDashboard() {
    loginGate.style.display = 'none';
    dashboardContainer.classList.add('active');

    await fetchStats();
    await fetchLogs();
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-key': adminKey }
      });
      if (res.status === 401) {
        sessionStorage.removeItem('farrel_admin_key');
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (data.success) {
        totalDevicesEl.textContent = data.stats.totalDevices || 0;
        totalMessagesEl.textContent = data.stats.totalMessages || 0;
        renderDevices(data.devices || []);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }

  async function fetchLogs() {
    try {
      let url = '/api/admin/logs?limit=200';
      if (selectedDeviceId) {
        url += `&deviceId=${encodeURIComponent(selectedDeviceId)}`;
      }
      const res = await fetch(url, {
        headers: { 'x-admin-key': adminKey }
      });
      const data = await res.json();
      if (data.success) {
        allLogs = data.logs || [];
        renderLogs(allLogs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }

  function renderDevices(devices) {
    deviceListEl.innerHTML = '';
    if (devices.length === 0) {
      deviceListEl.innerHTML = '<li class="empty-state">Belum ada perangkat yang terdeteksi.</li>';
      return;
    }

    const allItem = document.createElement('li');
    allItem.className = `device-item ${selectedDeviceId === null ? 'active' : ''}`;
    allItem.innerHTML = `
      <div class="device-name">Semua Perangkat (${devices.length})</div>
      <div class="device-meta">Tampilkan semua obrolan</div>
    `;
    allItem.addEventListener('click', () => {
      selectedDeviceId = null;
      document.querySelectorAll('.device-item').forEach(el => el.classList.remove('active'));
      allItem.classList.add('active');
      fetchLogs();
    });
    deviceListEl.appendChild(allItem);

    devices.forEach((dev) => {
      const li = document.createElement('li');
      li.className = `device-item ${selectedDeviceId === dev.deviceId ? 'active' : ''}`;
      const lastSeen = dev.lastActive ? new Date(dev.lastActive).toLocaleString('id-ID') : '-';
      li.innerHTML = `
        <div class="device-name">${escapeHtml(dev.platform || 'Unknown')}</div>
        <div class="device-meta">
          <span>ID: ${dev.deviceId.substring(0, 12)}...</span>
          <span>${dev.messageCount || 1} chat</span>
        </div>
      `;
      li.addEventListener('click', () => {
        selectedDeviceId = dev.deviceId;
        document.querySelectorAll('.device-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        fetchLogs();
      });
      deviceListEl.appendChild(li);
    });
  }

  function renderLogs(logs) {
    logsFeedListEl.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();

    const filtered = logs.filter(l => {
      if (!query) return true;
      return (
        (l.userMessage && l.userMessage.toLowerCase().includes(query)) ||
        (l.botReply && l.botReply.toLowerCase().includes(query)) ||
        (l.platform && l.platform.toLowerCase().includes(query))
      );
    });

    if (filtered.length === 0) {
      logsFeedListEl.innerHTML = '<div class="empty-state">Tidak ada pesan yang ditemukan.</div>';
      return;
    }

    filtered.forEach(log => {
      const card = document.createElement('div');
      card.className = 'log-entry';
      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '-';
      card.innerHTML = `
        <div class="log-meta">
          <span><strong>${escapeHtml(log.platform || 'Perangkat')}</strong> (ID: ${log.deviceId?.substring(0, 8)}...)</span>
          <span>${timeStr}</span>
        </div>
        <div class="log-chat-turn">
          <div class="log-user"><strong>User:</strong> ${escapeHtml(log.userMessage || '')}</div>
          <div class="log-bot"><strong>Farrel:</strong> ${escapeHtml(log.botReply || '')}</div>
        </div>
      `;
      logsFeedListEl.appendChild(card);
    });
  }

  searchInput.addEventListener('input', () => {
    renderLogs(allLogs);
  });

  refreshBtn.addEventListener('click', () => {
    fetchStats();
    fetchLogs();
  });

  exportBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/export', {
        headers: { 'x-admin-key': adminKey }
      });
      if (!res.ok) throw new Error('Gagal mengunduh file log.');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'chat-log.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message || 'Gagal mengunduh log.');
    }
  });

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
});
