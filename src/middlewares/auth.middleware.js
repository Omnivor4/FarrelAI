export function adminAuth(req, res, next) {
  const configuredPassword = process.env.ADMIN_PASSWORD || 'farrel123';
  
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-key']) {
    token = req.headers['x-admin-key'].trim();
  } else if (req.query?.adminKey) {
    token = req.query.adminKey.trim();
  }

  if (!token || token !== configuredPassword) {
    return res.status(401).json({
      success: false,
      error: 'Akses ditolak: Password admin salah atau belum dimasukkan.'
    });
  }

  next();
}
