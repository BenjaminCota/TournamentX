const crypto = require('node:crypto');
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
    const id = crypto.randomUUID();
    await db.query('INSERT INTO sponsors (id, name, contact_email, logo_url) VALUES ($1, $2, $3, $4)', [id, name, contactEmail, logoUrl || null]);
    const { rows } = await db.query('SELECT id, name, contact_email AS "contactEmail", logo_url AS "logoUrl", active, created_at AS "createdAt" FROM sponsors WHERE id = $1', [id]);
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

async function update(req, res, next) {
  try {
    const { id } = req.validated.params;
    const current = await db.query('SELECT * FROM sponsors WHERE id = $1', [id]);
    if (!current.rows[0]) throw new HttpError(404, 'Patrocinador no encontrado');
    const body = req.validated.body;
    await db.query(
      `UPDATE sponsors SET name = $1, contact_email = $2, logo_url = $3, active = $4 WHERE id = $5`,
      [body.name ?? current.rows[0].name, body.contactEmail ?? current.rows[0].contact_email,
        body.logoUrl === undefined ? current.rows[0].logo_url : body.logoUrl,
        body.active ?? Boolean(current.rows[0].active), id],
    );
    return getById(req, res, next);
  } catch (error) { return next(error); }
}

module.exports = { list, create, getById, update };
