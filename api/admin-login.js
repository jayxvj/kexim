module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    res.status(500).json({ ok: false, error: 'Missing admin environment variables' });
    return;
  }

  let body = req.body || {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body || '{}');
    } catch {
      body = {};
    }
  }
  const user = String(body.username || '');
  const pass = String(body.password || '');

  if (user === expectedUser && pass === expectedPass) {
    res.status(200).json({ ok: true });
    return;
  }

  res.status(401).json({ ok: false, error: 'Invalid credentials' });
};
