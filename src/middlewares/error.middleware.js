export function errorHandler(err, req, res, next) {
  console.error('[Server Error]', err.message);

  const statusCode = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const errorMessage = isProd && statusCode === 500
    ? 'Terjadi kesalahan pada server, silakan coba lagi.'
    : (err.message || 'Terjadi kesalahan pada server.');

  res.status(statusCode).json({
    success: false,
    error: errorMessage
  });
}
