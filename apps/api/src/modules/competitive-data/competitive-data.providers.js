const { eventSeed, standingSeed, teamSeed } = require('./competitive-data.store');

let cache = { expiresAt: 0, payload: null };
const isoDay = (date) => date.toISOString().slice(0, 10);
const list = (value, fallback) => String(value || fallback).split(',').map((item) => item.trim()).filter(Boolean);

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${new URL(url).hostname} respondió ${response.status}`);
  return response.json();
}

function pandaStatus(status) {
  if (status === 'running') return 'live';
  if (status === 'finished') return 'completed';
  if (status === 'canceled') return 'cancelled';
  return 'scheduled';
}

async function pandaScoreData() {
  if (!process.env.PANDASCORE_API_TOKEN) return { status: 'demo', events: [], standings: [], teams: [] };
  const headers = { Authorization: `Bearer ${process.env.PANDASCORE_API_TOKEN}` };
  const calls = await Promise.allSettled([
    fetchJson('https://api.pandascore.co/matches/running?page[size]=20', { headers }),
    fetchJson('https://api.pandascore.co/matches/upcoming?page[size]=30&sort=begin_at', { headers }),
  ]);
  const matches = calls.flatMap((result) => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);
  const uniqueMatches = [...new Map(matches.map((match) => [match.id, match])).values()];
  const teams = new Map();
  const events = uniqueMatches.map((match) => {
    const opponents = (match.opponents || []).map((entry) => entry.opponent).filter(Boolean);
    const scoreFor = (team) => Number((match.results || []).find((result) => result.team_id === team?.id)?.score || 0);
    for (const team of opponents) {
      teams.set(String(team.id), {
        id: `panda-${team.id}`, name: team.name, shortName: team.acronym || team.name?.slice(0, 4).toUpperCase(),
        category: 'esports', sport: match.videogame?.name || 'Esports', region: team.location || 'Internacional',
        country: team.location || 'Internacional', logo: team.image_url || '', rank: 0, form: [],
        players: (team.players || []).map((player) => ({ id: `panda-player-${player.id}`, name: `${player.first_name || ''} ${player.last_name || ''}`.trim() || player.name, nickname: player.name, role: player.role || 'Jugador', nationality: player.nationality || '', image: player.image_url || '' })),
        source: 'PandaScore', dataMode: 'api',
      });
    }
    const first = opponents[0] || { id: 'tbd-a', name: 'Por definir', acronym: 'TBD' };
    const second = opponents[1] || { id: 'tbd-b', name: 'Por definir', acronym: 'TBD' };
    return {
      id: `panda-match-${match.id}`, category: 'esports', sport: match.videogame?.name || 'Esports',
      competition: match.league?.name || match.serie?.full_name || 'Competencia esports', region: first.location || second.location || 'Internacional',
      status: pandaStatus(match.status), startsAt: match.begin_at || match.scheduled_at || new Date().toISOString(),
      teamA: { id: `panda-${first.id}`, name: first.name, shortName: first.acronym || 'TBD', score: scoreFor(first) },
      teamB: { id: `panda-${second.id}`, name: second.name, shortName: second.acronym || 'TBD', score: scoreFor(second) },
      round: match.match_type || match.name || 'Partido', venue: 'Online', source: 'PandaScore', dataMode: 'api',
    };
  });

  const tournamentIds = [...new Set(uniqueMatches.map((match) => match.tournament?.id).filter(Boolean))].slice(0, 2);
  const standingCalls = await Promise.allSettled(tournamentIds.map((id) => fetchJson(`https://api.pandascore.co/tournaments/${id}/standings`, { headers })));
  const standings = standingCalls.flatMap((result, index) => {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value)) return [];
    const tournament = uniqueMatches.find((match) => match.tournament?.id === tournamentIds[index])?.tournament;
    return [{
      id: `panda-standing-${tournamentIds[index]}`, competition: tournament?.name || 'Torneo esports', category: 'esports', sport: uniqueMatches.find((match) => match.tournament?.id === tournamentIds[index])?.videogame?.name || 'Esports', region: 'Internacional', source: 'PandaScore', dataMode: 'api',
      table: result.value.map((row, rowIndex) => ({ position: Number(row.rank || row.position || rowIndex + 1), teamId: `panda-${row.team?.id || row.id}`, team: row.team?.name || row.name || 'Equipo', played: Number(row.matches_played || row.played || 0), wins: Number(row.wins || 0), draws: Number(row.draws || 0), losses: Number(row.losses || 0), points: Number(row.points || row.wins || 0), form: [] })),
    }];
  });
  return { status: 'configured', events, standings, teams: [...teams.values()] };
}

function footballStatus(status) {
  if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(status)) return 'live';
  if (status === 'FINISHED') return 'completed';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'POSTPONED') return 'postponed';
  return 'scheduled';
}

async function footballData() {
  if (!process.env.FOOTBALL_DATA_API_KEY) return { status: 'demo', events: [], standings: [], teams: [] };
  const headers = { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY };
  const codes = list(process.env.FOOTBALL_COMPETITIONS, 'PL,CL,BSA,MLS').slice(0, 4);
  const today = new Date();
  const end = new Date(today); end.setUTCDate(end.getUTCDate() + 21);
  const requests = codes.flatMap((code) => [
    fetchJson(`https://api.football-data.org/v4/competitions/${encodeURIComponent(code)}/standings`, { headers }),
    fetchJson(`https://api.football-data.org/v4/competitions/${encodeURIComponent(code)}/matches?dateFrom=${isoDay(today)}&dateTo=${isoDay(end)}`, { headers }),
  ]);
  const results = await Promise.allSettled(requests);
  const standings = [];
  const events = [];
  const teams = new Map();
  for (let index = 0; index < codes.length; index += 1) {
    const standingResult = results[index * 2];
    const matchResult = results[index * 2 + 1];
    if (standingResult.status === 'fulfilled') {
      const body = standingResult.value;
      const table = body.standings?.[0]?.table || [];
      standings.push({
        id: `football-standing-${codes[index]}`, competition: body.competition?.name || codes[index], category: 'sports', sport: 'Fútbol', region: body.area?.name || 'Internacional', source: 'football-data.org', dataMode: 'api',
        table: table.map((row) => ({ position: row.position, teamId: `football-${row.team.id}`, team: row.team.name, played: row.playedGames, wins: row.won, draws: row.draw, losses: row.lost, points: row.points, form: String(row.form || '').split(',').filter(Boolean) })),
      });
      for (const row of table) teams.set(String(row.team.id), { id: `football-${row.team.id}`, name: row.team.name, shortName: row.team.tla || row.team.shortName || row.team.name.slice(0, 4).toUpperCase(), category: 'sports', sport: 'Fútbol', region: body.area?.name || 'Internacional', country: body.area?.name || '', logo: row.team.crest || '', rank: row.position, form: String(row.form || '').split(',').filter(Boolean), players: [], source: 'football-data.org', dataMode: 'api', providerId: row.team.id });
    }
    if (matchResult.status === 'fulfilled') {
      for (const match of matchResult.value.matches || []) {
        events.push({ id: `football-match-${match.id}`, category: 'sports', sport: 'Fútbol', competition: match.competition?.name || codes[index], region: match.area?.name || 'Internacional', status: footballStatus(match.status), startsAt: match.utcDate, teamA: { id: `football-${match.homeTeam.id}`, name: match.homeTeam.name, shortName: match.homeTeam.tla || 'LOC', score: Number(match.score?.fullTime?.home || 0) }, teamB: { id: `football-${match.awayTeam.id}`, name: match.awayTeam.name, shortName: match.awayTeam.tla || 'VIS', score: Number(match.score?.fullTime?.away || 0) }, round: match.stage || `Jornada ${match.matchday || ''}`.trim(), venue: 'Por confirmar', source: 'football-data.org', dataMode: 'api' });
      }
    }
  }

  const detailCalls = await Promise.allSettled([...teams.values()].slice(0, 2).map((team) => fetchJson(`https://api.football-data.org/v4/teams/${team.providerId}`, { headers })));
  detailCalls.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    const team = teams.get(String(result.value.id));
    if (team) team.players = (result.value.squad || []).map((player) => ({ id: `football-player-${player.id}`, name: player.name, nickname: player.name, role: player.position || 'Jugador', nationality: player.nationality || '', image: '' }));
  });
  return { status: 'configured', events, standings, teams: [...teams.values()].map(({ providerId, ...team }) => team) };
}

function mergeById(primary, fallback) {
  const result = [...primary];
  const ids = new Set(result.map((item) => item.id));
  for (const item of fallback) if (!ids.has(item.id)) result.push(structuredClone(item));
  return result;
}

async function competitiveOverview() {
  if (cache.payload && Date.now() < cache.expiresAt) return cache.payload;
  const [pandaResult, footballResult] = await Promise.allSettled([pandaScoreData(), footballData()]);
  const panda = pandaResult.status === 'fulfilled' ? pandaResult.value : { status: 'error', events: [], standings: [], teams: [] };
  const football = footballResult.status === 'fulfilled' ? footballResult.value : { status: 'error', events: [], standings: [], teams: [] };
  const payload = {
    generatedAt: new Date().toISOString(),
    integration: { esports: panda.status, football: football.status },
    events: mergeById([...panda.events, ...football.events], eventSeed),
    standings: mergeById([...panda.standings, ...football.standings], standingSeed),
    teams: mergeById([...panda.teams, ...football.teams], teamSeed),
  };
  cache = { expiresAt: Date.now() + 300000, payload };
  return payload;
}

module.exports = { competitiveOverview };
