import crypto from 'node:crypto';

export function adminAuth(req, res, next) {
  const configuredPassword = process.env.ADMIN_PASSWORD || 'pensoke';
  
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-key']) {
    token = req.headers['x-admin-key'].trim();
  } else if (req.query?.adminKey) {
    token = req.query.adminKey.trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Akses ditolak: Password admin salah atau belum dimasukkan.'
    });
  }

  const tokenBuf = Buffer.from(token);
  const passBuf = Buffer.from(configuredPassword);

  if (tokenBuf.length !== passBuf.length || !crypto.timingSafeEqual(tokenBuf, passBuf)) {
    return res.status(401).json({
      success: false,
      error: 'Akses ditolak: Password admin salah atau belum dimasukkan.'
    });
  }

  next();
}
