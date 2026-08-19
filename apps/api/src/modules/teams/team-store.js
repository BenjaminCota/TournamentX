const crypto = require('node:crypto');
const localStore = require('../../config/local-store');

const teamsSeed = [
  {
    id: 'team-lnx',
    captainUserId: 'user-captain',
    name: 'LUMINEX ESPORTS',
    abbreviation: 'LNX',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    sport: 'Valorant',
    region: 'LATAM Sur',
    competitionType: 'Regional',
    tier: 'S TIER', globalRank: 12, winRate: 74, matchesPlayed: 38,
    record: { wins: 28, losses: 9, ties: 1 }, points: 2480, trend: 'UP',
    bio: 'Precisión táctica, desarrollo regional y una plantilla estable de Valorant.',
    description: 'Equipo profesional de competición centrado en tácticas de alta precisión.',
    status: 'active',
    createdAt: '2025-01-16T00:00:00.000Z',
    updatedAt: '2025-01-16T00:00:00.000Z',
  },
  {
    id: 'team-titans',
    name: 'Titans',
    abbreviation: 'TTN',
    logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80',
    sport: 'Valorant',
    region: 'LATAM Norte',
    competitionType: 'Pro Circuit',
    tier: 'A TIER', globalRank: 21, winRate: 68, matchesPlayed: 34,
    record: { wins: 23, losses: 11, ties: 0 }, points: 2210, trend: 'EQUAL',
    bio: 'Penta-campeones continentales con enfoque agresivo y rotaciones rápidas.',
    description: 'Penta-campeones continentales.',
    status: 'active',
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: '2025-02-01T00:00:00.000Z',
  },
  {
    id: 'team-phoenix', name: 'Phoenix Rising', abbreviation: 'PHX',
    logo: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=200&auto=format&fit=crop&q=80',
    sport: 'Valorant', region: 'México', competitionType: 'Challengers', tier: 'A TIER', globalRank: 27,
    winRate: 65, matchesPlayed: 31, record: { wins: 20, losses: 11, ties: 0 }, points: 1985, trend: 'UP',
    bio: 'Talento joven mexicano con especialidad en ejecuciones rápidas.', description: 'Proyecto competitivo de Valorant con base en México.', status: 'active',
    createdAt: '2025-03-12T00:00:00.000Z', updatedAt: '2025-03-12T00:00:00.000Z',
  },
  {
    id: 'team-andes', name: 'Andes Guardians', abbreviation: 'AND',
    logo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
    sport: 'League of Legends', region: 'LATAM Sur', competitionType: 'Liga Regional', tier: 'PRO TIER', globalRank: 34,
    winRate: 61, matchesPlayed: 36, record: { wins: 22, losses: 14, ties: 0 }, points: 1840, trend: 'UP',
    bio: 'Macro juego disciplinado y cantera sudamericana.', description: 'Organización regional de League of Legends.', status: 'active',
    createdAt: '2025-04-05T00:00:00.000Z', updatedAt: '2025-04-05T00:00:00.000Z',
  },
  {
    id: 'team-nova', name: 'Nova Velocity', abbreviation: 'NVA',
    logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    sport: 'Rocket League', region: 'Norteamérica', competitionType: 'Open Circuit', tier: 'PRO TIER', globalRank: 18,
    winRate: 71, matchesPlayed: 42, record: { wins: 30, losses: 12, ties: 0 }, points: 2325, trend: 'UP',
    bio: 'Velocidad mecánica, presión alta y juego aéreo coordinado.', description: 'Roster internacional de Rocket League.', status: 'active',
    createdAt: '2025-05-20T00:00:00.000Z', updatedAt: '2025-05-20T00:00:00.000Z',
  },
  {
    id: 'team-raven', name: 'Raven Protocol', abbreviation: 'RVN',
    logo: 'https://images.unsplash.com/photo-1603481546238-487240415921?w=200&auto=format&fit=crop&q=80',
    sport: 'Counter-Strike 2', region: 'Europa', competitionType: 'International', tier: 'S TIER', globalRank: 9,
    winRate: 76, matchesPlayed: 45, record: { wins: 34, losses: 11, ties: 0 }, points: 2690, trend: 'EQUAL',
    bio: 'Control de mapa metódico y experiencia internacional.', description: 'Quinteto europeo de Counter-Strike 2.', status: 'active',
    createdAt: '2025-06-08T00:00:00.000Z', updatedAt: '2025-06-08T00:00:00.000Z',
  },
  {
    id: 'team-sonora-fc', name: 'Sonora Solar FC', abbreviation: 'SSF',
    logo: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80',
    sport: 'Fútbol', region: 'México', competitionType: 'Liga Regional', tier: 'PRO TIER', globalRank: 0,
    winRate: 0, matchesPlayed: 0, record: { wins: 0, losses: 0, ties: 0 }, points: 0, trend: 'UP',
    bio: 'Club registrado en TournamentX con base en Hermosillo.', description: 'Plantilla competitiva de fútbol regional.', status: 'active',
    createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z',
  },
  {
    id: 'team-baja-fc', name: 'Baja Marineros', abbreviation: 'BJM',
    logo: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=200&auto=format&fit=crop&q=80',
    sport: 'Fútbol', region: 'México', competitionType: 'Liga Regional', tier: 'CHALLENGER', globalRank: 0,
    winRate: 0, matchesPlayed: 0, record: { wins: 0, losses: 0, ties: 0 }, points: 0, trend: 'EQUAL',
    bio: 'Club registrado en TournamentX con base en Baja California.', description: 'Proyecto deportivo regional.', status: 'active',
    createdAt: '2026-07-04T00:00:00.000Z', updatedAt: '2026-07-04T00:00:00.000Z',
  },
  {
    id: 'team-desert-hoops', name: 'Desert Hoops', abbreviation: 'DHP',
    logo: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200&auto=format&fit=crop&q=80',
    sport: 'Baloncesto', region: 'Norteamérica', competitionType: 'Open League', tier: 'PRO TIER', globalRank: 0,
    winRate: 0, matchesPlayed: 0, record: { wins: 0, losses: 0, ties: 0 }, points: 0, trend: 'UP',
    bio: 'Equipo de baloncesto registrado en el circuito TournamentX.', description: 'Plantilla binacional de baloncesto.', status: 'active',
    createdAt: '2026-07-08T00:00:00.000Z', updatedAt: '2026-07-08T00:00:00.000Z',
  },
  {
    id: 'team-pacific-hoops', name: 'Pacific Five', abbreviation: 'PCF',
    logo: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=200&auto=format&fit=crop&q=80',
    sport: 'Baloncesto', region: 'Norteamérica', competitionType: 'Open League', tier: 'CHALLENGER', globalRank: 0,
    winRate: 0, matchesPlayed: 0, record: { wins: 0, losses: 0, ties: 0 }, points: 0, trend: 'EQUAL',
    bio: 'Equipo de baloncesto registrado en el circuito TournamentX.', description: 'Formación competitiva de la costa oeste.', status: 'active',
    createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-09T00:00:00.000Z',
  },
];

const teams = localStore.collection('teams', teamsSeed);
const legacyCaptainTeam = teams.find((team) => team.id === 'team-lnx');
if (legacyCaptainTeam && !legacyCaptainTeam.captainUserId) {
  legacyCaptainTeam.captainUserId = 'user-captain';
  localStore.saveCollection('teams', teams);
}

const playersSeed = [
  {
    id: 'player-1',
    authUserId: 'user-captain',
    name: 'Alex',
    lastname: 'Chen',
    nickname: 'Viper',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    sport: 'Valorant',
    position: 'Capitán / IGL',
    nationality: 'MX',
    status: 'active',
    createdAt: '2025-01-16T00:00:00.000Z',
    updatedAt: '2025-01-16T00:00:00.000Z',
  },
  {
    id: 'player-2',
    authUserId: 'user-player',
    name: 'Sarah',
    lastname: 'Jenkins',
    nickname: 'Nova',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    sport: 'Valorant',
    position: 'Entry Fragger',
    nationality: 'US',
    status: 'active',
    createdAt: '2025-01-16T00:00:00.000Z',
    updatedAt: '2025-01-16T00:00:00.000Z',
  },
  {
    id: 'player-3',
    name: 'Lucas',
    lastname: 'Ferreira',
    nickname: 'Phantom',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    sport: 'Valorant',
    position: 'Sniper / Controller',
    nationality: 'BR',
    status: 'active',
    createdAt: '2025-01-16T00:00:00.000Z',
    updatedAt: '2025-01-16T00:00:00.000Z',
  },
  {
    id: 'player-4',
    name: 'Gabriel',
    lastname: 'Rios',
    nickname: 'Striker',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
    sport: 'Valorant',
    position: 'Recon / Support',
    nationality: 'MX',
    status: 'active',
    createdAt: '2025-01-16T00:00:00.000Z',
    updatedAt: '2025-01-16T00:00:00.000Z',
  },
  { id: 'player-5', name: 'Mateo', lastname: 'Vega', nickname: 'Blaze', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', sport: 'Valorant', position: 'Duelista', nationality: 'MX', ratingOVR: 91, gameProfiles: { riot: 'Blaze#PHX' }, status: 'active', createdAt: '2025-02-01T00:00:00.000Z', updatedAt: '2025-02-01T00:00:00.000Z' },
  { id: 'player-6', name: 'Valentina', lastname: 'Cruz', nickname: 'Echo', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', sport: 'Valorant', position: 'Iniciadora', nationality: 'CO', ratingOVR: 89, gameProfiles: { riot: 'Echo#LATAM' }, status: 'active', createdAt: '2025-02-01T00:00:00.000Z', updatedAt: '2025-02-01T00:00:00.000Z' },
  { id: 'player-7', name: 'Diego', lastname: 'Santos', nickname: 'Kronos', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', sport: 'Valorant', position: 'Controlador', nationality: 'BR', ratingOVR: 88, gameProfiles: { riot: 'Kronos#TTN' }, status: 'active', createdAt: '2025-02-01T00:00:00.000Z', updatedAt: '2025-02-01T00:00:00.000Z' },
  { id: 'player-8', name: 'Emiliano', lastname: 'Ruiz', nickname: 'Solar', avatar: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=150&auto=format&fit=crop&q=80', sport: 'Valorant', position: 'Capitán / IGL', nationality: 'MX', ratingOVR: 92, gameProfiles: { riot: 'Solar#PHX' }, status: 'active', createdAt: '2025-03-12T00:00:00.000Z', updatedAt: '2025-03-12T00:00:00.000Z' },
  { id: 'player-9', name: 'Camila', lastname: 'Ortega', nickname: 'Nyx', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', sport: 'Valorant', position: 'Centinela', nationality: 'AR', ratingOVR: 87, gameProfiles: { riot: 'Nyx#PHX' }, status: 'active', createdAt: '2025-03-12T00:00:00.000Z', updatedAt: '2025-03-12T00:00:00.000Z' },
  { id: 'player-10', name: 'Thiago', lastname: 'Mora', nickname: 'Pulse', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', sport: 'Valorant', position: 'Flex', nationality: 'CL', ratingOVR: 86, gameProfiles: { riot: 'Pulse#PHX' }, status: 'active', createdAt: '2025-03-12T00:00:00.000Z', updatedAt: '2025-03-12T00:00:00.000Z' },
  { id: 'player-11', name: 'Sofía', lastname: 'Paredes', nickname: 'Aurora', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80', sport: 'League of Legends', position: 'Mid', nationality: 'PE', ratingOVR: 93, gameProfiles: { riot: 'Aurora#AND' }, status: 'active', createdAt: '2025-04-05T00:00:00.000Z', updatedAt: '2025-04-05T00:00:00.000Z' },
  { id: 'player-12', name: 'Bruno', lastname: 'Lagos', nickname: 'Aegis', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', sport: 'League of Legends', position: 'Jungla', nationality: 'CL', ratingOVR: 90, gameProfiles: { riot: 'Aegis#AND' }, status: 'active', createdAt: '2025-04-05T00:00:00.000Z', updatedAt: '2025-04-05T00:00:00.000Z' },
  { id: 'player-13', name: 'Rafael', lastname: 'Costa', nickname: 'Titan', avatar: 'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=150&auto=format&fit=crop&q=80', sport: 'League of Legends', position: 'Top', nationality: 'BR', ratingOVR: 88, gameProfiles: { riot: 'Titan#AND' }, status: 'active', createdAt: '2025-04-05T00:00:00.000Z', updatedAt: '2025-04-05T00:00:00.000Z' },
  { id: 'player-14', name: 'Noah', lastname: 'Brooks', nickname: 'Jetstream', avatar: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=150&auto=format&fit=crop&q=80', sport: 'Rocket League', position: 'Striker', nationality: 'US', ratingOVR: 94, gameProfiles: { epic: 'JetstreamNVA' }, status: 'active', createdAt: '2025-05-20T00:00:00.000Z', updatedAt: '2025-05-20T00:00:00.000Z' },
  { id: 'player-15', name: 'Ethan', lastname: 'Miller', nickname: 'Orbit', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&auto=format&fit=crop&q=80', sport: 'Rocket League', position: 'Tercer hombre', nationality: 'CA', ratingOVR: 91, gameProfiles: { epic: 'OrbitNVA' }, status: 'active', createdAt: '2025-05-20T00:00:00.000Z', updatedAt: '2025-05-20T00:00:00.000Z' },
  { id: 'player-16', name: 'Léa', lastname: 'Martin', nickname: 'Comet', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', sport: 'Rocket League', position: 'Flex', nationality: 'FR', ratingOVR: 92, gameProfiles: { epic: 'CometNVA' }, status: 'active', createdAt: '2025-05-20T00:00:00.000Z', updatedAt: '2025-05-20T00:00:00.000Z' },
  { id: 'player-17', name: 'Marek', lastname: 'Nowak', nickname: 'Cipher', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80', sport: 'Counter-Strike 2', position: 'IGL', nationality: 'PL', ratingOVR: 95, gameProfiles: { steam: 'CipherRVN' }, status: 'active', createdAt: '2025-06-08T00:00:00.000Z', updatedAt: '2025-06-08T00:00:00.000Z' },
  { id: 'player-18', name: 'Erik', lastname: 'Lind', nickname: 'Frost', avatar: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=150&auto=format&fit=crop&q=80', sport: 'Counter-Strike 2', position: 'AWPer', nationality: 'SE', ratingOVR: 94, gameProfiles: { steam: 'FrostRVN' }, status: 'active', createdAt: '2025-06-08T00:00:00.000Z', updatedAt: '2025-06-08T00:00:00.000Z' },
  { id: 'player-19', name: 'Ana', lastname: 'Kovač', nickname: 'Valkyrie', avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80', sport: 'Counter-Strike 2', position: 'Rifler', nationality: 'HR', ratingOVR: 92, gameProfiles: { steam: 'ValkyrieRVN' }, status: 'active', createdAt: '2025-06-08T00:00:00.000Z', updatedAt: '2025-06-08T00:00:00.000Z' },
  { id: 'player-20', name: 'Daniel', lastname: 'Valdez', nickname: 'Dani', avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80', sport: 'Fútbol', position: 'Delantero', nationality: 'MX', ratingOVR: 84, status: 'active', createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
  { id: 'player-21', name: 'Marco', lastname: 'Ochoa', nickname: 'Mako', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', sport: 'Fútbol', position: 'Mediocampista', nationality: 'MX', ratingOVR: 82, status: 'active', createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
  { id: 'player-22', name: 'Iván', lastname: 'Morales', nickname: 'Ivo', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', sport: 'Fútbol', position: 'Portero', nationality: 'MX', ratingOVR: 86, status: 'active', createdAt: '2026-07-04T00:00:00.000Z', updatedAt: '2026-07-04T00:00:00.000Z' },
  { id: 'player-23', name: 'Luis', lastname: 'Núñez', nickname: 'Lucho', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17ce6b7?w=150&auto=format&fit=crop&q=80', sport: 'Fútbol', position: 'Defensa', nationality: 'MX', ratingOVR: 81, status: 'active', createdAt: '2026-07-04T00:00:00.000Z', updatedAt: '2026-07-04T00:00:00.000Z' },
  { id: 'player-24', name: 'Jordan', lastname: 'Reed', nickname: 'JR', avatar: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=150&auto=format&fit=crop&q=80', sport: 'Baloncesto', position: 'Base', nationality: 'US', ratingOVR: 88, status: 'active', createdAt: '2026-07-08T00:00:00.000Z', updatedAt: '2026-07-08T00:00:00.000Z' },
  { id: 'player-25', name: 'Mateo', lastname: 'Lara', nickname: 'Teo', avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&auto=format&fit=crop&q=80', sport: 'Baloncesto', position: 'Alero', nationality: 'MX', ratingOVR: 85, status: 'active', createdAt: '2026-07-08T00:00:00.000Z', updatedAt: '2026-07-08T00:00:00.000Z' },
  { id: 'player-26', name: 'Chris', lastname: 'Walker', nickname: 'CW', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80', sport: 'Baloncesto', position: 'Escolta', nationality: 'US', ratingOVR: 87, status: 'active', createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-09T00:00:00.000Z' },
  { id: 'player-27', name: 'Andrés', lastname: 'Silva', nickname: 'Dre', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&auto=format&fit=crop&q=80', sport: 'Baloncesto', position: 'Pívot', nationality: 'CO', ratingOVR: 83, status: 'active', createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-09T00:00:00.000Z' },
];

const players = localStore.collection('players', playersSeed);

const rosterSeed = [
  {
    id: 'membership-1',
    teamId: 'team-lnx',
    playerId: 'player-1',
    role: 'Capitán',
    status: 'active',
    joinedAt: '2025-01-16T00:00:00.000Z',
    leftAt: null,
  },
  {
    id: 'membership-2',
    teamId: 'team-lnx',
    playerId: 'player-2',
    role: 'Entry Fragger',
    status: 'active',
    joinedAt: '2025-01-16T00:00:00.000Z',
    leftAt: null,
  },
  {
    id: 'membership-3',
    teamId: 'team-lnx',
    playerId: 'player-3',
    role: 'Controlador',
    status: 'active',
    joinedAt: '2025-01-16T00:00:00.000Z',
    leftAt: null,
  },
  {
    id: 'membership-4',
    teamId: 'team-lnx',
    playerId: 'player-4',
    role: 'Support',
    status: 'active',
    joinedAt: '2025-01-16T00:00:00.000Z',
    leftAt: null,
  },
  { id: 'membership-5', teamId: 'team-titans', playerId: 'player-5', role: 'Duelista', status: 'active', joinedAt: '2025-02-01T00:00:00.000Z', leftAt: null },
  { id: 'membership-6', teamId: 'team-titans', playerId: 'player-6', role: 'Iniciadora', status: 'active', joinedAt: '2025-02-01T00:00:00.000Z', leftAt: null },
  { id: 'membership-7', teamId: 'team-titans', playerId: 'player-7', role: 'Controlador', status: 'active', joinedAt: '2025-02-01T00:00:00.000Z', leftAt: null },
  { id: 'membership-8', teamId: 'team-phoenix', playerId: 'player-8', role: 'Capitán / IGL', status: 'active', joinedAt: '2025-03-12T00:00:00.000Z', leftAt: null },
  { id: 'membership-9', teamId: 'team-phoenix', playerId: 'player-9', role: 'Centinela', status: 'active', joinedAt: '2025-03-12T00:00:00.000Z', leftAt: null },
  { id: 'membership-10', teamId: 'team-phoenix', playerId: 'player-10', role: 'Flex', status: 'active', joinedAt: '2025-03-12T00:00:00.000Z', leftAt: null },
  { id: 'membership-11', teamId: 'team-andes', playerId: 'player-11', role: 'Mid', status: 'active', joinedAt: '2025-04-05T00:00:00.000Z', leftAt: null },
  { id: 'membership-12', teamId: 'team-andes', playerId: 'player-12', role: 'Jungla', status: 'active', joinedAt: '2025-04-05T00:00:00.000Z', leftAt: null },
  { id: 'membership-13', teamId: 'team-andes', playerId: 'player-13', role: 'Top', status: 'active', joinedAt: '2025-04-05T00:00:00.000Z', leftAt: null },
  { id: 'membership-14', teamId: 'team-nova', playerId: 'player-14', role: 'Striker', status: 'active', joinedAt: '2025-05-20T00:00:00.000Z', leftAt: null },
  { id: 'membership-15', teamId: 'team-nova', playerId: 'player-15', role: 'Tercer hombre', status: 'active', joinedAt: '2025-05-20T00:00:00.000Z', leftAt: null },
  { id: 'membership-16', teamId: 'team-nova', playerId: 'player-16', role: 'Flex', status: 'active', joinedAt: '2025-05-20T00:00:00.000Z', leftAt: null },
  { id: 'membership-17', teamId: 'team-raven', playerId: 'player-17', role: 'IGL', status: 'active', joinedAt: '2025-06-08T00:00:00.000Z', leftAt: null },
  { id: 'membership-18', teamId: 'team-raven', playerId: 'player-18', role: 'AWPer', status: 'active', joinedAt: '2025-06-08T00:00:00.000Z', leftAt: null },
  { id: 'membership-19', teamId: 'team-raven', playerId: 'player-19', role: 'Rifler', status: 'active', joinedAt: '2025-06-08T00:00:00.000Z', leftAt: null },
  { id: 'membership-20', teamId: 'team-sonora-fc', playerId: 'player-20', role: 'Delantero', status: 'active', joinedAt: '2026-07-02T00:00:00.000Z', leftAt: null },
  { id: 'membership-21', teamId: 'team-sonora-fc', playerId: 'player-21', role: 'Mediocampista', status: 'active', joinedAt: '2026-07-02T00:00:00.000Z', leftAt: null },
  { id: 'membership-22', teamId: 'team-baja-fc', playerId: 'player-22', role: 'Portero', status: 'active', joinedAt: '2026-07-04T00:00:00.000Z', leftAt: null },
  { id: 'membership-23', teamId: 'team-baja-fc', playerId: 'player-23', role: 'Defensa', status: 'active', joinedAt: '2026-07-04T00:00:00.000Z', leftAt: null },
  { id: 'membership-24', teamId: 'team-desert-hoops', playerId: 'player-24', role: 'Base', status: 'active', joinedAt: '2026-07-08T00:00:00.000Z', leftAt: null },
  { id: 'membership-25', teamId: 'team-desert-hoops', playerId: 'player-25', role: 'Alero', status: 'active', joinedAt: '2026-07-08T00:00:00.000Z', leftAt: null },
  { id: 'membership-26', teamId: 'team-pacific-hoops', playerId: 'player-26', role: 'Escolta', status: 'active', joinedAt: '2026-07-09T00:00:00.000Z', leftAt: null },
  { id: 'membership-27', teamId: 'team-pacific-hoops', playerId: 'player-27', role: 'Pívot', status: 'active', joinedAt: '2026-07-09T00:00:00.000Z', leftAt: null },
];

const roster = localStore.collection('teamRoster', rosterSeed);
function mergeCatalog(collectionName, collection, seeds) {
  let changed = false;
  for (const seed of seeds) {
    const existing = collection.find((entry) => entry.id === seed.id);
    if (!existing) {
      collection.push(structuredClone(seed));
      changed = true;
      continue;
    }
    for (const [key, value] of Object.entries(seed)) {
      if (existing[key] === undefined || existing[key] === null) {
        existing[key] = structuredClone(value);
        changed = true;
      }
    }
  }
  if (changed) localStore.saveCollection(collectionName, collection);
}
mergeCatalog('teams', teams, teamsSeed);
mergeCatalog('players', players, playersSeed);
mergeCatalog('teamRoster', roster, rosterSeed);
const invitations = localStore.collection('teamInvitations', []);
const joinRequests = localStore.collection('teamJoinRequests', []);
function persist() {
  localStore.saveCollection('teams', teams);
  localStore.saveCollection('players', players);
  localStore.saveCollection('teamRoster', roster);
  localStore.saveCollection('teamInvitations', invitations);
  localStore.saveCollection('teamJoinRequests', joinRequests);
}

function serializeTeam(team) {
  const teamRoster = roster
    .filter((membership) => membership.teamId === team.id && membership.status === 'active')
    .map((membership) => {
      const player = players.find((entry) => entry.id === membership.playerId);
      return {
        id: membership.playerId,
        playerId: membership.playerId,
        membershipId: membership.id,
        name: player ? `${player.name} ${player.lastname}` : 'Jugador',
        nickname: player ? player.nickname : 'Unknown',
        role: membership.role,
        ovr: player?.ratingOVR || 90,
        avatar: player ? player.avatar : '',
        kda: player?.kda || 'Sin registro oficial',
        status: player ? player.status : 'inactive',
      };
    });

  return {
    ...team,
    roster: teamRoster,
  };
}

function serializePlayer(playerId) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player || player.deletedAt) return null;

  const history = roster
    .filter((membership) => membership.playerId === playerId)
    .map((membership) => {
      const team = teams.find((entry) => entry.id === membership.teamId);
      return {
        id: membership.id,
        teamId: membership.teamId,
        teamName: team ? team.name : 'Equipo no encontrado',
        role: membership.role,
        status: membership.status === 'active' ? 'Actual' : 'Finalizado',
        joinedAt: membership.joinedAt,
        leftAt: membership.leftAt,
      };
    })
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  const currentMembership = roster.find((membership) => membership.playerId === playerId && membership.status === 'active');
  const currentTeam = currentMembership ? teams.find((entry) => entry.id === currentMembership.teamId) : null;

  return {
    ...player,
    currentTeamId: currentTeam?.id || null,
    currentTeamName: currentTeam?.name || null,
    currentRole: currentMembership?.role || null,
    history,
  };
}

function listTeams() {
  return teams.map((team) => serializeTeam(team));
}

function getTeam(teamId) {
  const team = teams.find((entry) => entry.id === teamId);
  if (!team) return null;
  return serializeTeam(team);
}

function createTeam({ name, abbreviation, logo, sport, region, competitionType, description, status, captainUserId, createdBy }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const team = {
    id,
    captainUserId: captainUserId || null,
    createdBy: createdBy || null,
    name,
    abbreviation,
    logo: logo || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
    sport,
    region,
    competitionType,
    description,
    status: status || 'active',
    createdAt: now,
    updatedAt: now,
  };
  teams.push(team);
  const captainPlayer = players.find((player) => player.authUserId === captainUserId && !player.deletedAt);
  if (captainPlayer && !roster.some((membership) => membership.playerId === captainPlayer.id && membership.status === 'active')) {
    roster.push({ id: crypto.randomUUID(), teamId: id, playerId: captainPlayer.id, role: 'Capitán', status: 'active', joinedAt: now, leftAt: null });
  }
  persist();
  return serializeTeam(team);
}

function dissolveTeam(teamId) {
  const team = teams.find((entry) => entry.id === teamId);
  if (!team || team.status === 'inactive') return null;
  const now = new Date().toISOString();
  team.status = 'inactive';
  team.updatedAt = now;
  roster.forEach((membership) => {
    if (membership.teamId === teamId && membership.status === 'active') {
      membership.status = 'inactive';
      membership.leftAt = now;
    }
  });
  invitations.forEach((invitation) => {
    if (invitation.teamId === teamId && invitation.status === 'ACTIVE') invitation.status = 'CANCELLED';
  });
  persist();
  return serializeTeam(team);
}

function updateTeam(teamId, updates) {
  const team = teams.find((entry) => entry.id === teamId);
  if (!team) return null;
  Object.assign(team, updates, { updatedAt: new Date().toISOString() });
  persist();
  return serializeTeam(team);
}

function listPlayers() {
  return players.map((player) => serializePlayer(player.id)).filter(Boolean);
}

function getPlayer(playerId) {
  return serializePlayer(playerId);
}

function linkPlayerAccount(playerId, authUserId) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player || player.deletedAt) return null;
  player.authUserId = authUserId;
  player.updatedAt = new Date().toISOString();
  persist();
  return serializePlayer(playerId);
}

function createPlayer({ name, lastname, nickname, avatar, sport, position, nationality, status, authUserId, gameProfiles }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const player = {
    id,
    authUserId: authUserId || null,
    gameProfiles: gameProfiles || {},
    name,
    lastname,
    nickname,
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    sport,
    position,
    nationality,
    status: status || 'active',
    createdAt: now,
    updatedAt: now,
  };
  players.push(player);
  persist();
  return serializePlayer(player.id);
}

function updatePlayer(playerId, updates) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player || player.deletedAt) return null;
  Object.assign(player, updates, { updatedAt: new Date().toISOString() });
  persist();
  return serializePlayer(player.id);
}

function deletePlayer(playerId) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player || player.deletedAt) return null;
  const deletedAt = new Date().toISOString();

  // Se conserva una lápida local para que los jugadores de catálogo no reaparezcan
  // después de reiniciar la API. Las relaciones activas dejan de mostrarse.
  Object.assign(player, { status: 'inactive', authUserId: null, deletedAt, updatedAt: deletedAt });
  roster.forEach((membership) => {
    if (membership.playerId === playerId && membership.status === 'active') {
      membership.status = 'inactive';
      membership.leftAt = deletedAt;
    }
  });
  for (let index = joinRequests.length - 1; index >= 0; index -= 1) {
    if (joinRequests[index].playerId === playerId) joinRequests.splice(index, 1);
  }
  persist();
  return { id: playerId, deletedAt };
}

function addMemberToRoster(teamId, { playerId, role, status }) {
  const team = teams.find((entry) => entry.id === teamId);
  const player = players.find((entry) => entry.id === playerId);
  if (!team || !player) return { error: 'Equipo o jugador no encontrado' };
  if (team.status !== 'active') return { error: 'No se puede modificar un equipo dado de baja' };

  const existing = roster.find((membership) => membership.teamId === teamId && membership.playerId === playerId && membership.status === 'active');
  if (existing) {
    return { error: 'Este jugador ya pertenece a la plantilla.' };
  }
  const activeMembership = roster.find((membership) => membership.playerId === playerId && membership.status === 'active');
  if (activeMembership) return { error: 'Este jugador ya pertenece a otro equipo activo.' };

  const membership = {
    id: crypto.randomUUID(),
    teamId,
    playerId,
    role: role || 'Jugador',
    status: status || 'active',
    joinedAt: new Date().toISOString(),
    leftAt: null,
  };

  roster.push(membership);
  persist();
  return {
    id: membership.id,
    teamId: membership.teamId,
    playerId: membership.playerId,
    role: membership.role,
    status: membership.status,
    joinedAt: membership.joinedAt,
    leftAt: membership.leftAt,
  };
}

function canUserManageTeam(teamId, userId) {
  const team = teams.find((entry) => entry.id === teamId);
  return Boolean(team && team.captainUserId === userId);
}

function transferCaptain(teamId, captainUserId) {
  const team = teams.find((entry) => entry.id === teamId);
  if (!team) return null;
  team.captainUserId = captainUserId;
  team.updatedAt = new Date().toISOString();
  persist();
  return serializeTeam(team);
}

function createInvitation(teamId, { createdBy, expiresInHours = 72, rosterRole = 'Jugador' }) {
  const team = teams.find((entry) => entry.id === teamId);
  if (!team) return { error: 'Equipo no encontrado', status: 404 };
  const now = new Date();
  const invitation = {
    id: crypto.randomUUID(), teamId, code: crypto.randomBytes(4).toString('hex').toUpperCase(), rosterRole,
    status: 'ACTIVE', createdBy, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + expiresInHours * 3600000).toISOString(),
  };
  invitations.push(invitation); persist();
  return { invitation };
}

function listInvitations(teamId) {
  const now = Date.now();
  let changed = false;
  for (const invitation of invitations) {
    if (invitation.status === 'ACTIVE' && new Date(invitation.expiresAt).getTime() < now) { invitation.status = 'EXPIRED'; changed = true; }
  }
  if (changed) persist();
  return invitations.filter((invitation) => invitation.teamId === teamId).map((invitation) => ({ ...invitation }));
}

function createJoinRequest({ code, playerId, requestedBy }) {
  const invitation = invitations.find((entry) => entry.code === String(code).trim().toUpperCase());
  if (!invitation || invitation.status !== 'ACTIVE' || new Date(invitation.expiresAt).getTime() < Date.now()) {
    return { error: 'La invitaciÃ³n no existe o expirÃ³', status: 404 };
  }
  const player = players.find((entry) => entry.id === playerId);
  if (!player) return { error: 'Jugador no encontrado', status: 404 };
  if (player.authUserId !== requestedBy) return { error: 'Este perfil de jugador no estÃ¡ vinculado con tu cuenta', status: 403 };
  if (roster.some((membership) => membership.playerId === playerId && membership.status === 'active')) return { error: 'El jugador ya pertenece a un equipo activo', status: 409 };
  if (joinRequests.some((entry) => entry.playerId === playerId && entry.teamId === invitation.teamId && entry.status === 'PENDING')) return { error: 'Ya existe una solicitud pendiente', status: 409 };
  const now = new Date().toISOString();
  const request = { id: crypto.randomUUID(), teamId: invitation.teamId, invitationId: invitation.id, playerId, rosterRole: invitation.rosterRole, requestedBy, status: 'PENDING', createdAt: now, updatedAt: now };
  joinRequests.push(request); persist();
  return { request: { ...request } };
}

function listJoinRequests(teamId) {
  return joinRequests.filter((request) => request.teamId === teamId).map((request) => ({ ...request, player: serializePlayer(request.playerId) }));
}

function decideJoinRequest(teamId, requestId, { decision, decidedBy }) {
  const request = joinRequests.find((entry) => entry.id === requestId && entry.teamId === teamId);
  if (!request) return { error: 'Solicitud no encontrada', status: 404 };
  if (request.status !== 'PENDING') return { error: 'La solicitud ya fue revisada', status: 409 };
  if (decision === 'approve') {
    const membership = addMemberToRoster(teamId, { playerId: request.playerId, role: request.rosterRole, status: 'active' });
    if (membership.error) return { error: membership.error, status: 409 };
    request.membershipId = membership.id;
  }
  request.status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  request.decidedBy = decidedBy;
  request.updatedAt = new Date().toISOString();
  persist();
  return { request: { ...request } };
}

function removeMemberFromRoster(teamId, playerId) {
  const membership = roster.find((entry) => entry.teamId === teamId && entry.playerId === playerId && entry.status === 'active');
  if (!membership) return null;
  membership.status = 'inactive';
  membership.leftAt = new Date().toISOString();
  persist();
  return {
    id: membership.id,
    teamId: membership.teamId,
    playerId: membership.playerId,
    role: membership.role,
    status: membership.status,
    leftAt: membership.leftAt,
  };
}

module.exports = {
  listTeams,
  getTeam,
  createTeam,
  dissolveTeam,
  updateTeam,
  listPlayers,
  getPlayer,
  linkPlayerAccount,
  createPlayer,
  updatePlayer,
  deletePlayer,
  addMemberToRoster,
  removeMemberFromRoster,
  canUserManageTeam,
  transferCaptain,
  createInvitation,
  listInvitations,
  createJoinRequest,
  listJoinRequests,
  decideJoinRequest,
};
