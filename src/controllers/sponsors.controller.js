const db = require('../config/database');
const HttpError = require('../utils/http-error');

async function list(_req, res, next) {
  try {
    const { rows } = await db.query('SELECT id, name, contact_email AS "contactEmail", logo_url AS "logoUrl", active, created_at AS "createdAt" FROM sponsors ORDER BY created_at DESC');
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const { name, contactEmail, logoUrl } = req.validated.body;
    const { rows } = await db.query(
      'INSERT INTO sponsors (name, contact_email, logo_url) VALUES ($1, $2, $3) RETURNING id, name, contact_email AS "contactEmail", logo_url AS "logoUrl", active, created_at AS "createdAt"',
      [name, contactEmail, logoUrl || null],
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await db.query('SELECT id, name, contact_email AS "contactEmail", logo_url AS "logoUrl", active, created_at AS "createdAt" FROM sponsors WHERE id = $1', [req.validated.params.id]);
    if (!rows[0]) throw new HttpError(404, 'Patrocinador no encontrado');
    res.json({ data: rows[0] });
  } catch (error) { next(error); }
}

module.exports = { list, create, getById };
