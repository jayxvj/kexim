const STORAGE_KEY = 'kexim:catalog:v1';

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
};

const kvConfig = () => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
};

const kvCommand = async (args) => {
  const { url, token } = kvConfig();
  if (!url || !token) {
    throw new Error('KV_NOT_CONFIGURED');
  }

  const path = args.map((part) => encodeURIComponent(String(part))).join('/');
  const response = await fetch(`${url}/${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`KV_REQUEST_FAILED_${response.status}`);
  }

  return response.json();
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const data = await kvCommand(['GET', STORAGE_KEY]);
      const raw = data?.result;
      if (!raw) {
        res.status(200).json({ ok: true, catalog: null });
        return;
      }
      try {
        res.status(200).json({ ok: true, catalog: JSON.parse(raw) });
      } catch {
        res.status(200).json({ ok: true, catalog: null });
      }
      return;
    } catch (error) {
      const message = String(error?.message || '');
      if (message === 'KV_NOT_CONFIGURED') {
        res.status(200).json({ ok: true, catalog: null, warning: 'KV not configured' });
        return;
      }
      res.status(500).json({ ok: false, error: 'Failed to read catalog' });
      return;
    }
  }

  if (req.method === 'PUT') {
    const body = parseBody(req);
    const catalog = body?.catalog;
    const isValid = catalog && Array.isArray(catalog.filters) && Array.isArray(catalog.products);
    if (!isValid) {
      res.status(400).json({ ok: false, error: 'Invalid catalog payload' });
      return;
    }

    try {
      await kvCommand(['SET', STORAGE_KEY, JSON.stringify(catalog)]);
      res.status(200).json({ ok: true });
      return;
    } catch (error) {
      const message = String(error?.message || '');
      if (message === 'KV_NOT_CONFIGURED') {
        res.status(503).json({ ok: false, error: 'KV not configured' });
        return;
      }
      res.status(500).json({ ok: false, error: 'Failed to save catalog' });
      return;
    }
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
