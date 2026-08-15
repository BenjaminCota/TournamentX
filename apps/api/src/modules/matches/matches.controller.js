const HttpError = require('../../utils/http-error');
const matchStore = require('./match-store');

async function listMatches(req, res, next) {
  try {
    const matches = matchStore.listMatches(req.validated.query);
    res.json(matches);
  } catch (error) {
    next(error);
  }
}

async function getMatch(req, res, next) {
  try {
    const match = matchStore.getMatch(req.validated.params.id);
    if (!match) throw new HttpError(404, 'Partido no encontrado');
    res.json(match);
  } catch (error) {
    next(error);
  }
}

async function createMatch(req, res, next) {
  try {
    const match = matchStore.createMatch(req.validated.body);
    res.status(201).json(match);
  } catch (error) {
    next(error);
  }
}

module.exports = { listMatches, getMatch, createMatch };
