const ipChatStore = new Map();
const deviceChatStore = new Map();
const ipAdminStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of ipChatStore.entries()) {
    if (now > data.resetTime) ipChatStore.delete(key);
  }
  for (const [key, data] of deviceChatStore.entries()) {
    if (now > data.resetTime) deviceChatStore.delete(key);
  }
  for (const [key, data] of ipAdminStore.entries()) {
    if (now > data.resetTime) ipAdminStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'self';");
  next();
}

export function chatRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;

  const clientIp = ipChatStore.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > clientIp.resetTime) {
    clientIp.count = 0;
    clientIp.resetTime = now + windowMs;
  }

  clientIp.count++;
  ipChatStore.set(ip, clientIp);

  if (clientIp.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'santai dulu bro, jangan spam chat, tunggu semenit ya.'
    });
  }

  const rawDeviceId = req.body?.deviceId;
  if (typeof rawDeviceId === 'string' && rawDeviceId.length >= 8 && rawDeviceId.length <= 64) {
    const clientDev = deviceChatStore.get(rawDeviceId) || { count: 0, resetTime: now + windowMs };
    if (now > clientDev.resetTime) {
      clientDev.count = 0;
      clientDev.resetTime = now + windowMs;
    }
    clientDev.count++;
    deviceChatStore.set(rawDeviceId, clientDev);

    if (clientDev.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'santai dulu bro, jangan spam chat, tunggu semenit ya.'
      });
    }
  }

  next();
}

export function adminBruteForceGuard(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 25;

  const client = ipAdminStore.get(ip) || { failures: 0, resetTime: now + windowMs };

  if (now > client.resetTime) {
    client.failures = 0;
    client.resetTime = now + windowMs;
  }

  if (client.failures >= maxAttempts) {
    return res.status(429).json({
      success: false,
      error: 'terlalu banyak percobaan login gagal, silakan coba lagi dalam 1 menit.'
    });
  }

  res.on('finish', () => {
    if (res.statusCode === 401) {
      client.failures++;
      ipAdminStore.set(ip, client);
    } else if (res.statusCode === 200) {
      ipAdminStore.delete(ip);
    }
  });

  next();
}
