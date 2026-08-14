function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
}

function errorHandler(error, _req, res, _next) {
  if (error.code === '23505') return res.status(409).json({ error: 'El registro ya existe' });
  if (error.code === '23503') return res.status(409).json({ error: 'El registro está relacionado con otros datos' });
  const status = error.status || 500;
  return res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : error.message,
    ...(error.details && { details: error.details }),
  });
}

module.exports = { notFound, errorHandler };
