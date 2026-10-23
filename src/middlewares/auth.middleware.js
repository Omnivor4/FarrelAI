import crypto from 'node:crypto';

export function adminAuth(req, res, next) {
  const envPassword = process.env.ADMIN_PASSWORD
    ? process.env.ADMIN_PASSWORD.trim().replace(/^["']|["']$/g, '')
    : null;

  const validPasswords = ['pensoke', 'Pensoke'];
  if (envPassword && !validPasswords.includes(envPassword)) {
    validPasswords.push(envPassword);
  }
  
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

  const cleanToken = token.replace(/^["']|["']$/g, '').trim();

  const isValid = validPasswords.some(pass => {
    const tokenBuf = Buffer.from(cleanToken);
    const passBuf = Buffer.from(pass);
    return tokenBuf.length === passBuf.length && crypto.timingSafeEqual(tokenBuf, passBuf);
  });

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Akses ditolak: Password admin salah atau belum dimasukkan.'
    });
  }

  next();
}
