const HttpError = require('../../utils/http-error');
const matchStore = require('./match-store');

async function listMatches(req, res, next) {
  try {
    const matches = await matchStore.listMatches(req.validated.query);
    res.json(matches);
  } catch (error) {
    next(error);
  }
}

async function getMatch(req, res, next) {
  try {
    const match = await matchStore.getMatch(req.validated.params.id);
    if (!match) throw new HttpError(404, 'Partido no encontrado');
    res.json(match);
  } catch (error) {
    next(error);
  }
}

async function createMatch(req, res, next) {
  try {
    const match = await matchStore.createMatch(req.validated.body);
    res.status(201).json(match);
  } catch (error) {
    next(error);
  }
}

async function updateMatchScore(req, res, next) {
  try {
    const match = await matchStore.updateMatchScore(req.validated.params.id, req.validated.body);
    if (!match) throw new HttpError(404, 'Partido no encontrado');
    req.app.get('io')?.to(`match:${match.id}`).emit('match-update', match);
    res.json(match);
  } catch (error) {
    next(error);
  }
}

module.exports = { listMatches, getMatch, createMatch, updateMatchScore };
