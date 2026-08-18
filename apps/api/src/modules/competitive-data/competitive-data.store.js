const eventSeed = [
  { id: 'feed-lol-latam', category: 'esports', sport: 'League of Legends', competition: 'LCS x LoL Esports LATAM', region: 'LATAM', status: 'live', startsAt: '2026-08-16T23:00:00.000Z', teamA: { id: 'ext-lyon', name: 'LYON', shortName: 'LYON', score: 0 }, teamB: { id: 'ext-sen', name: 'SEN', shortName: 'SEN', score: 0 }, round: 'Bo3', venue: 'Online', source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'feed-valorant-latam', category: 'esports', sport: 'Valorant', competition: 'VCT LATAM', region: 'LATAM', status: 'scheduled', startsAt: '2026-08-18T20:00:00.000Z', teamA: { id: 'ext-kru', name: 'KRÜ Esports', shortName: 'KRÜ', score: 0 }, teamB: { id: 'ext-lev', name: 'Leviatán', shortName: 'LEV', score: 0 }, round: 'Upper bracket', venue: 'Online', source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'feed-lcs-na', category: 'esports', sport: 'League of Legends', competition: 'LCS', region: 'Norteamérica', status: 'scheduled', startsAt: '2026-08-19T01:00:00.000Z', teamA: { id: 'ext-fly', name: 'FlyQuest', shortName: 'FLY', score: 0 }, teamB: { id: 'ext-tl', name: 'Team Liquid', shortName: 'TL', score: 0 }, round: 'Temporada regular', venue: 'Los Angeles', source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'feed-lec-eu', category: 'esports', sport: 'League of Legends', competition: 'LEC', region: 'Europa', status: 'scheduled', startsAt: '2026-08-20T17:00:00.000Z', teamA: { id: 'ext-g2', name: 'G2 Esports', shortName: 'G2', score: 0 }, teamB: { id: 'ext-fnc', name: 'Fnatic', shortName: 'FNC', score: 0 }, round: 'Playoffs', venue: 'Berlín', source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'feed-ligamx', category: 'sports', sport: 'Fútbol', competition: 'Liga MX', region: 'LATAM', status: 'scheduled', startsAt: '2026-08-21T02:00:00.000Z', teamA: { id: 'ext-ame', name: 'Club América', shortName: 'AME', score: 0 }, teamB: { id: 'ext-tig', name: 'Tigres UANL', shortName: 'TIG', score: 0 }, round: 'Jornada 7', venue: 'Ciudad de México', source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'feed-libertadores', category: 'sports', sport: 'Fútbol', competition: 'Copa Libertadores', region: 'LATAM', status: 'scheduled', startsAt: '2026-08-22T00:30:00.000Z', teamA: { id: 'ext-riv', name: 'River Plate', shortName: 'RIV', score: 0 }, teamB: { id: 'ext-fla', name: 'Flamengo', shortName: 'FLA', score: 0 }, round: 'Cuartos de final', venue: 'Buenos Aires', source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'feed-nba', category: 'sports', sport: 'Baloncesto', competition: 'NBA', region: 'Estados Unidos', status: 'scheduled', startsAt: '2026-08-23T01:00:00.000Z', teamA: { id: 'ext-bos', name: 'Boston Celtics', shortName: 'BOS', score: 0 }, teamB: { id: 'ext-lal', name: 'Los Angeles Lakers', shortName: 'LAL', score: 0 }, round: 'Pretemporada', venue: 'Boston', source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'feed-mls', category: 'sports', sport: 'Fútbol', competition: 'MLS', region: 'Estados Unidos', status: 'scheduled', startsAt: '2026-08-23T23:30:00.000Z', teamA: { id: 'ext-mia', name: 'Inter Miami', shortName: 'MIA', score: 0 }, teamB: { id: 'ext-lafc', name: 'Los Angeles FC', shortName: 'LAFC', score: 0 }, round: 'Temporada regular', venue: 'Miami', source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'feed-ucl', category: 'sports', sport: 'Fútbol', competition: 'UEFA Champions League', region: 'Europa', status: 'scheduled', startsAt: '2026-08-25T19:00:00.000Z', teamA: { id: 'ext-rma', name: 'Real Madrid', shortName: 'RMA', score: 0 }, teamB: { id: 'ext-mci', name: 'Manchester City', shortName: 'MCI', score: 0 }, round: 'Fase de liga', venue: 'Madrid', source: 'TournamentX demo regional', dataMode: 'simulated' },
];

const standingSeed = [
  { id: 'standing-latam', competition: 'LCS x LoL Esports LATAM', category: 'esports', sport: 'League of Legends', region: 'LATAM', source: 'TournamentX demo regional', dataMode: 'simulated', table: [
    { position: 1, teamId: 'ext-lyon', team: 'LYON', played: 8, wins: 6, draws: 0, losses: 2, points: 18, form: ['W','W','L','W','W'] },
    { position: 2, teamId: 'ext-sen', team: 'SEN', played: 8, wins: 5, draws: 0, losses: 3, points: 15, form: ['W','L','W','W','L'] },
  ] },
  { id: 'standing-lec', competition: 'LEC', category: 'esports', sport: 'League of Legends', region: 'Europa', source: 'TournamentX demo regional', dataMode: 'simulated', table: [
    { position: 1, teamId: 'ext-g2', team: 'G2 Esports', played: 9, wins: 7, draws: 0, losses: 2, points: 21, form: ['W','W','W','L','W'] },
    { position: 2, teamId: 'ext-fnc', team: 'Fnatic', played: 9, wins: 6, draws: 0, losses: 3, points: 18, form: ['W','L','W','W','W'] },
  ] },
  { id: 'standing-ligamx', competition: 'Liga MX', category: 'sports', sport: 'Fútbol', region: 'LATAM', source: 'TournamentX demo regional', dataMode: 'simulated', table: [
    { position: 1, teamId: 'ext-ame', team: 'Club América', played: 6, wins: 4, draws: 1, losses: 1, points: 13, form: ['W','D','W','W','L'] },
    { position: 2, teamId: 'ext-tig', team: 'Tigres UANL', played: 6, wins: 4, draws: 0, losses: 2, points: 12, form: ['W','W','L','W','L'] },
  ] },
  { id: 'standing-mls', competition: 'MLS', category: 'sports', sport: 'Fútbol', region: 'Estados Unidos', source: 'TournamentX demo regional', dataMode: 'simulated', table: [
    { position: 1, teamId: 'ext-mia', team: 'Inter Miami', played: 24, wins: 15, draws: 5, losses: 4, points: 50, form: ['W','W','D','W','W'] },
    { position: 2, teamId: 'ext-lafc', team: 'Los Angeles FC', played: 24, wins: 14, draws: 5, losses: 5, points: 47, form: ['W','L','W','D','W'] },
  ] },
  { id: 'standing-ucl', competition: 'UEFA Champions League', category: 'sports', sport: 'Fútbol', region: 'Europa', source: 'TournamentX demo regional', dataMode: 'simulated', table: [
    { position: 1, teamId: 'ext-rma', team: 'Real Madrid', played: 8, wins: 6, draws: 1, losses: 1, points: 19, form: ['W','W','D','W','W'] },
    { position: 2, teamId: 'ext-mci', team: 'Manchester City', played: 8, wins: 5, draws: 2, losses: 1, points: 17, form: ['D','W','W','L','W'] },
  ] },
];

const teamSeed = [
  { id: 'ext-lyon', name: 'LYON', shortName: 'LYON', category: 'esports', sport: 'League of Legends', region: 'LATAM', country: 'Latinoamérica', logo: '', rank: 1, form: ['W','W','L','W','W'], players: [], source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'ext-kru', name: 'KRÜ Esports', shortName: 'KRÜ', category: 'esports', sport: 'Valorant', region: 'LATAM', country: 'Argentina', logo: '', rank: 2, form: ['W','L','W','W','L'], players: [], source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'ext-g2', name: 'G2 Esports', shortName: 'G2', category: 'esports', sport: 'League of Legends', region: 'Europa', country: 'Europa', logo: '', rank: 1, form: ['W','W','W','L','W'], players: [], source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'ext-fly', name: 'FlyQuest', shortName: 'FLY', category: 'esports', sport: 'League of Legends', region: 'Norteamérica', country: 'Estados Unidos', logo: '', rank: 1, form: ['W','L','W','W','W'], players: [], source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'ext-ame', name: 'Club América', shortName: 'AME', category: 'sports', sport: 'Fútbol', region: 'LATAM', country: 'México', logo: '', rank: 1, form: ['W','D','W','W','L'], players: [], source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'ext-mia', name: 'Inter Miami', shortName: 'MIA', category: 'sports', sport: 'Fútbol', region: 'Estados Unidos', country: 'Estados Unidos', logo: '', rank: 1, form: ['W','W','D','W','W'], players: [], source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'ext-rma', name: 'Real Madrid', shortName: 'RMA', category: 'sports', sport: 'Fútbol', region: 'Europa', country: 'España', logo: '', rank: 1, form: ['W','W','D','W','W'], players: [], source: 'TournamentX demo regional', dataMode: 'simulated' },
  { id: 'ext-bos', name: 'Boston Celtics', shortName: 'BOS', category: 'sports', sport: 'Baloncesto', region: 'Estados Unidos', country: 'Estados Unidos', logo: '', rank: 1, form: ['W','W','L','W','W'], players: [], source: 'TournamentX demo regional', dataMode: 'simulated' },
];

module.exports = { eventSeed, standingSeed, teamSeed };
