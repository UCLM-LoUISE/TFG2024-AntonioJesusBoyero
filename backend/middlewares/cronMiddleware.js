// middlewares/cronMiddleware.js
const crypto = require('crypto');

function safeEqual(a, b) {
  const key = 'vercel-cron-salt';
  const ha = crypto.createHmac('sha256', key).update(String(a)).digest();
  const hb = crypto.createHmac('sha256', key).update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = function verifyCronToken(req, res, next) {
  try {
    // Acepta GET (Vercel suele usar GET)
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    // En producción, si activas esta variable, exige el header propio de Vercel
    if (process.env.REQUIRE_VERCEL_CRON === '1') {
      if (req.headers['x-vercel-cron'] !== '1') {
        return res.status(401).json({ ok: false, error: 'not_vercel_cron' });
      }
      // Si pasó, no necesitas token extra
      return next();
    }

    // ---- Modo local / pruebas: valida tu token propio (opcional) ----
    const provided = (req.headers['x-cron-token'] || req.query.token || '').toString().trim();
    if (!provided) {
      return res.status(401).json({ ok: false, error: 'missing_cron_token' });
    }

    const single = process.env.CRON_TOKEN ? [process.env.CRON_TOKEN] : [];
    const multiple = (process.env.CRON_TOKENS || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const validTokens = [...single, ...multiple];
    if (validTokens.length === 0) {
      return res.status(500).json({ ok: false, error: 'cron_token_not_configured' });
    }

    const ok = validTokens.some(tok => safeEqual(provided, tok));
    if (!ok) return res.status(401).json({ ok: false, error: 'unauthorized' });

    next();
  } catch (e) {
    console.error('verifyCronToken error:', e);
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
};
