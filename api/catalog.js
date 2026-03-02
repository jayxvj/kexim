const { Redis } = require('@upstash/redis');

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

const hasKvEnv = () => (
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
);

const getRedis = () => {
  if (!hasKvEnv()) return null;
  return new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  });
};

module.exports = async (req, res) => {
  const redis = getRedis();

  if (req.method === 'GET') {
    try {
      if (!redis) {
        res.status(200).json({ ok: true, catalog: null, warning: 'KV not configured' });
        return;
      }

      const catalog = await redis.get(STORAGE_KEY);
      if (!catalog) {
        res.status(200).json({ ok: true, catalog: null });
        return;
      }

      res.status(200).json({ ok: true, catalog });
      return;
    } catch (error) {
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
      if (!redis) {
        res.status(503).json({ ok: false, error: 'KV not configured' });
        return;
      }

      await redis.set(STORAGE_KEY, catalog);
      res.status(200).json({ ok: true });
      return;
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to save catalog' });
      return;
    }
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
