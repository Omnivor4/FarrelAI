export function errorHandler(err, req, res, next) {
  console.error('[Server Error]', err);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Terjadi kesalahan pada server.'
  });
}
