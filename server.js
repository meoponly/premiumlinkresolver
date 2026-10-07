import express from 'express';
import fetch from 'node-fetch';
import { FormData } from 'formdata-node';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const jobs = new Map();

// Helper to decode JWT
function getJwtIat(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.iat || Math.floor(Date.now() / 1000);
  } catch {
    return Math.floor(Date.now() / 1000);
  }
}

// Background worker
async function processBypass(jobId, startUrl) {
  let currentUrl = startUrl;
  let step = 1;

  try {
    while (step <= 10) {
      jobs.set(jobId, { status: `Processing step ${step}...`, done: false });

      // Fetch the page HTML
      const pageRes = await fetch(currentUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await pageRes.text();

      // Extract tokens
      const tokenMatch = html.match(/"stepToken"\s*:\s*"([^"]+)"/);
      const urlMatch = html.match(/"ajaxUrl"\s*:\s*"([^"]+)"/);
      const postMatch = html.match(/"postId"\s*:\s*(-?\d+)/);

      if (!tokenMatch || !urlMatch) {
        jobs.set(jobId, { status: 'Failed: Could not parse step tokens.', done: true, error: true });
        return;
      }

      const stepToken = tokenMatch[1];
      const ajaxUrl = urlMatch[1].replace(/\\/g, '');
      const postId = postMatch ? postMatch[1] : -1;

      // Calculate server wait time
      const iat = getJwtIat(stepToken);
      const waitTimeSec = Math.max(0, (iat + 37) - Math.floor(Date.now() / 1000));
      
      jobs.set(jobId, { status: `Step ${step}: Waiting ${waitTimeSec}s for server validation...`, done: false });
      await new Promise(r => setTimeout(r, waitTimeSec * 1000));

      // Post step completion
      const fd = new FormData();
      fd.set('action', 'wppro_add_post_cookie');
      fd.set('post_id', postId);
      fd.set('_step_token', stepToken);

      const verifyRes = await fetch(ajaxUrl, {
        method: 'POST',
        body: fd,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const data = await verifyRes.json();

      if (data.is_last && data.final_url) {
        jobs.set(jobId, { status: 'Completed!', done: true, result: data.final_url });
        return;
      } else if (data.success && data.next_url) {
        currentUrl = data.next_url;
        step++;
      } else {
        jobs.set(jobId, { status: `Server rejected step: ${data.error || 'Unknown error'}`, done: true, error: true });
        return;
      }
    }
  } catch (err) {
    jobs.set(jobId, { status: `Error: ${err.message}`, done: true, error: true });
  }
}

// API Routes
app.post('/api/start', (req, res) => {
  const { url } = req.body;
  const jobId = Math.random().toString(36).substring(2, 9);
  jobs.set(jobId, { status: 'Queued', done: false });
  processBypass(jobId, url);
  res.json({ jobId });
});

app.get('/api/status/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
