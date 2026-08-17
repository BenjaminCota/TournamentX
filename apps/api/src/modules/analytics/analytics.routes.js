const router = require('express').Router();
const teamStore = require('../teams/team-store');
const tournamentStore = require('../tournaments/tournament-store');
const matchStore = require('../matches/match-store');

router.get('/overview', async (_req, res, next) => {
  try {
    const [matches, teams, tournaments] = await Promise.all([
      matchStore.listMatches(),
      Promise.resolve(teamStore.listTeams()),
      Promise.resolve(tournamentStore.listTournaments()),
    ]);
    const ranking = teams.map((team) => {
      const teamMatches = matches.filter((match) => match.team1Id === team.id || match.team2Id === team.id);
      const completed = teamMatches.filter((match) => match.status === 'completed');
      const wins = completed.filter((match) => (match.team1Id === team.id ? match.score.team1 > match.score.team2 : match.score.team2 > match.score.team1)).length;
      const losses = completed.filter((match) => (match.team1Id === team.id ? match.score.team1 < match.score.team2 : match.score.team2 < match.score.team1)).length;
      const draws = completed.length - wins - losses;
      const points = wins * 3 + draws;
      return { id: team.id, team: team.name, region: team.region, played: completed.length, wins, losses, draws, rate: completed.length ? Math.round((wins / completed.length) * 100) : Number(team.winRate || 0), points: points || Number(team.points || 0) };
    }).sort((left, right) => right.points - left.points || right.rate - left.rate);
    const completedMatches = matches.filter((match) => match.status === 'completed');
    const liveMatches = matches.filter((match) => match.status === 'live');
    res.json({
      generatedAt: new Date().toISOString(),
      metrics: {
        tournaments: tournaments.length,
        activeTournaments: tournaments.filter((item) => ['OPEN', 'IN_PROGRESS'].includes(item.status)).length,
        teams: teams.length,
        matches: matches.length,
        completedMatches: completedMatches.length,
        liveMatches: liveMatches.length,
        completionRate: matches.length ? Math.round((completedMatches.length / matches.length) * 100) : 0,
        totalPrizeUSD: tournaments.reduce((total, item) => total + Number(item.prizeAmountUSD || 0), 0),
      },
      ranking,
      recentMatches: [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
    });
  } catch (error) { next(error); }
});

module.exports = router;
