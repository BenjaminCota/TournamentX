const HttpError = require('../../utils/http-error');
const scheduleStore = require('./schedule-store');

async function listSchedules(req, res, next) {
  try {
    res.json(await scheduleStore.listSchedules(req.validated.query));
  } catch (error) {
    next(error);
  }
}

async function getSchedule(req, res, next) {
  try {
    const schedule = await scheduleStore.getSchedule(req.validated.params.id);
    if (!schedule) throw new HttpError(404, 'Calendario no encontrado');
    res.json(schedule);
  } catch (error) {
    next(error);
  }
}

async function createSchedule(req, res, next) {
  try {
    const schedule = await scheduleStore.createSchedule(req.validated.body);
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
}

module.exports = { listSchedules, getSchedule, createSchedule };
