import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Host the client-side resolver portal
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Premium Key Resolver</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background-color: #0b0f19;
      color: #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
    }
    .container {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 28px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h2 { margin: 0 0 16px 0; font-size: 1.4rem; text-align: center; color: #f8fafc; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      background: #10b981;
      color: #fff;
      margin-bottom: 20px;
      text-align: center;
      width: 100%;
    }
    label { display: block; margin-bottom: 6px; font-size: 0.85rem; color: #94a3b8; font-weight: 500; }
    input[type="text"] {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #475569;
      background: #0f172a;
      color: #fff;
      font-size: 0.95rem;
      margin-bottom: 12px;
      outline: none;
    }
    input[type="text"]:focus { border-color: #38bdf8; }
    button {
      width: 100%;
      padding: 12px;
      background: #0284c7;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 8px;
    }
    button:hover { background: #0369a1; }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }
    .status { margin-top: 14px; font-size: 0.85rem; text-align: center; }
    .success { color: #4ade80; }
    .error { color: #f87171; }
    #token-panel { border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 16px; }
  </style>
</head>
<body>

<div class="container">
  <h2>Instant Resolver</h2>
  <div class="badge" id="storage-status">Checking stored credentials...</div>

  <!-- Panel 1: Save permanent token once -->
  <div id="token-panel">
    <label for="jwt-token">1. Paste Master Token (Saved Locally):</label>
    <input type="text" id="jwt-token" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." />
    <button onclick="saveStoredToken()">Save Master Token</button>
  </div>

  <!-- Panel 2: Link Input & Resolver -->
  <div id="resolve-panel">
    <label for="shortener-url">2. Paste Link (e.g. tipsguru.in/prolink.php?id=...):</label>
    <input type="text" id="shortener-url" placeholder="https://tipsguru.in/prolink.php?id=..." />
    <button onclick="resolveAndRedirect()">Resolve & Go</button>
    <button class="btn-secondary" onclick="resetToken()">Change Master Token</button>
  </div>

  <div id="status" class="status"></div>
</div>

<script>
  const STORAGE_KEY = 'pw_master_access_token';

  // Read saved state when page loads
  window.addEventListener('DOMContentLoaded', () => {
    const existing = localStorage.getItem(STORAGE_KEY);
    const badge = document.getElementById('storage-status');
    const panel = document.getElementById('token-panel');

    if (existing) {
      badge.innerText = 'Master Token Active in Browser';
      badge.style.background = '#059669';
      panel.style.display = 'none';
    } else {
      badge.innerText = 'Master Token Not Configured';
      badge.style.background = '#d97706';
      panel.style.display = 'block';
    }
  });

  function saveStoredToken() {
    const raw = document.getElementById('jwt-token').value.trim();
    if (!raw) {
      showStatus('Please input a valid token.', 'error');
      return;
    }
    localStorage.setItem(STORAGE_KEY, raw);
    document.getElementById('token-panel').style.display = 'none';
    const badge = document.getElementById('storage-status');
    badge.innerText = 'Master Token Active in Browser';
    badge.style.background = '#059669';
    showStatus('Token saved. You can now resolve links immediately.', 'success');
  }

  function resetToken() {
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('jwt-token').value = '';
    document.getElementById('token-panel').style.display = 'block';
    const badge = document.getElementById('storage-status');
    badge.innerText = 'Master Token Not Configured';
    badge.style.background = '#d97706';
    showStatus('Stored token cleared.', 'error');
  }

  function resolveAndRedirect() {
    const token = localStorage.getItem(STORAGE_KEY);
    const rawInput = document.getElementById('shortener-url').value.trim();

    if (!token) {
      showStatus('Configure and save your master token first.', 'error');
      document.getElementById('token-panel').style.display = 'block';
      return;
    }

    if (!rawInput) {
      showStatus('Please paste a link to resolve.', 'error');
      return;
    }

    try {
      const url = new URL(rawInput);
      let targetUrlStr = null;

      // Extract Base64 payload from '?id=' parameter if present
      const encodedId = url.searchParams.get('id');
      if (encodedId) {
        // Base64 decode URL payload
        targetUrlStr = atob(decodeURIComponent(encodedId));
      } else {
        targetUrlStr = rawInput;
      }

      // Attach token and redirect
      const finalUrl = new URL(targetUrlStr);
      finalUrl.searchParams.set('token', token);
      finalUrl.searchParams.set('directLogin', 'true');

      showStatus('Target verified. Forwarding...', 'success');
      window.location.href = finalUrl.toString();

    } catch (err) {
      showStatus('Invalid link or malformed Base64 parameters.', 'error');
    }
  }

  function showStatus(msg, type) {
    const el = document.getElementById('status');
    el.innerText = msg;
    el.className = 'status ' + type;
  }
</script>

</body>
</html>`);
});

// Health check endpoint for Railway
app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(PORT, () => {
  console.log('Resolver service running on port ' + PORT);
});
