const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pool } = require('../src/config/database');
const scheduleStore = require('../src/modules/matches/schedule-store');
const matchStore = require('../src/modules/matches/match-store');

test('MySQL conserva calendario y resultado del partido generado', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const tournamentId = crypto.randomUUID();
  let scheduleId;
  let matchId;
  try {
    const schedule = await scheduleStore.createSchedule({
      tournamentId,
      teamIds: [crypto.randomUUID(), crypto.randomUUID()],
      startsAt: new Date('2026-10-02T18:00:00.000Z'),
      slotMinutes: 60,
      venue: 'Arena MySQL',
      mode: 'best_of_3',
      format: 'single_elimination',
    });
    scheduleId = schedule.id;
    matchId = schedule.matches[0].id;
    assert.equal(schedule.matches.length, 1);

    const live = await matchStore.updateMatchScore(matchId, { team1Score: 2, team2Score: 1, status: 'live' });
    assert.equal(live.status, 'live');
    const completed = await matchStore.updateMatchScore(matchId, { status: 'completed' });
    assert.equal(completed.status, 'completed');

    const restored = await scheduleStore.getSchedule(scheduleId);
    assert.equal(restored.matches.length, 1);
    assert.deepEqual(restored.matches[0].score, { team1: 2, team2: 1 });
    assert.equal(restored.matches[0].status, 'completed');
  } finally {
    if (matchId) await pool.execute('DELETE FROM matches WHERE id = ?', [matchId]);
    if (scheduleId) await pool.execute('DELETE FROM schedules WHERE id = ?', [scheduleId]);
    await pool.end();
  }
});
