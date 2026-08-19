const crypto = require('node:crypto');
const HttpError = require('../../utils/http-error');
const { generateGroups, generateRoundRobinMatches } = require('./group-generator');
const { generateSingleEliminationBracket } = require('./bracket-generator');
const { computeGroupStandings } = require('./standings');
const localStore = require('../../config/local-store');
const { getActiveTeam } = require('../teams/teams.public');

const MAX_TOURNAMENT_NAME_LENGTH = 120;
const MAX_TOURNAMENT_DESCRIPTION_LENGTH = 500;
const MAX_PRIZE_AMOUNT_USD = 1_000_000;

const tournaments = localStore.collection('tournaments', []);
const tournamentAudits = localStore.collection('tournamentAudits', []);
function persist() { localStore.saveCollection('tournaments', tournaments); localStore.saveCollection('tournamentAudits', tournamentAudits); }

function findTournament(tournamentId) {
  const tournament = tournaments.find((entry) => entry.id === tournamentId);
  if (!tournament) throw new HttpError(404, 'Torneo no encontrado');
  return tournament;
}

function participantsById(tournament) {
  return new Map(tournament.participants.map((participant) => [participant.id, participant]));
}

function teamSlot(participantId, winnerParticipantId, score, byId) {
  if (!participantId) return { id: 'tbd', name: 'Por definir', score: 0 };
  const participant = byId.get(participantId);
  return {
    id: participant.id,
    name: participant.name,
    score: score || 0,
    seed: participant.seed,
    ...(winnerParticipantId ? { winner: winnerParticipantId === participantId } : {}),
  };
}

function serializeKnockoutMatch(match, byId) {
  return {
    id: match.id,
    roundId: match.round,
    matchNumber: match.matchOrder + 1,
    team1: teamSlot(match.participant1Id, match.winnerParticipantId, match.participant1Score, byId),
    team2: teamSlot(match.participant2Id, match.winnerParticipantId, match.participant2Score, byId),
    status: match.status === 'completed' || match.status === 'bye' ? 'FINISHED' : 'SCHEDULED',
    bestOf: match.bestOf,
    ...(match.nextMatchId ? { nextMatchId: match.nextMatchId } : {}),
  };
}

function serializeGroupMatch(match, byId) {
  return {
    id: match.id,
    groupId: match.groupId,
    round: match.round,
    team1: teamSlot(match.participant1Id, match.winnerParticipantId, match.participant1Score, byId),
    team2: teamSlot(match.participant2Id, match.winnerParticipantId, match.participant2Score, byId),
    status: match.status === 'completed' ? 'FINISHED' : 'SCHEDULED',
  };
}

function knockoutMatches(tournament) {
  return tournament.matches.filter((match) => match.stage === 'knockout');
}

function groupMatches(tournament, groupId) {
  return tournament.matches.filter((match) => match.stage === 'group' && (!groupId || match.groupId === groupId));
}

function serializeRounds(tournament) {
  const byId = participantsById(tournament);
  const matches = knockoutMatches(tournament);
  if (matches.length === 0) return undefined;

  const rounds = new Map();
  for (const match of matches) {
    if (!rounds.has(match.round)) rounds.set(match.round, { id: match.round, name: match.roundName, matches: [] });
    rounds.get(match.round).matches.push(match);
  }

  return [...rounds.values()]
    .sort((a, b) => a.id - b.id)
    .map((round) => ({
      ...round,
      matches: round.matches
        .sort((a, b) => a.matchOrder - b.matchOrder)
        .map((match) => serializeKnockoutMatch(match, byId)),
    }));
}

function serializeTournament(tournament) {
  return {
    id: tournament.id,
    name: tournament.name,
    description: tournament.description,
    game: tournament.game,
    gameCategory: tournament.gameCategory,
    banner: tournament.banner,
    prizePool: tournament.prizePool,
    prizeAmountUSD: tournament.prizeAmountUSD,
    entryFee: Math.max(0, Number(tournament.entryFee ?? 10) || 0),
    entryCurrency: String(tournament.entryCurrency || 'USD').toUpperCase(),
    status: tournament.status,
    format: tournament.format,
    dates: tournament.dates,
    startDate: tournament.startDate || null,
    endDate: tournament.endDate || null,
    registeredTeams: tournament.participants.length,
    maxTeams: tournament.maxTeams,
    privacy: tournament.privacy,
    organizer: tournament.organizer,
    createdBy: tournament.createdBy || null,
    tier: tournament.tier,
    ...(tournament.venue ? { venue: tournament.venue } : {}),
    ...(tournament.location ? { location: tournament.location } : {}),
    ...(tournament.championId ? { championId: tournament.championId } : {}),
    rounds: serializeRounds(tournament),
  };
}

function sanitizeLegacyTournaments() {
  let changed = false;
  for (const tournament of tournaments) {
    const name = String(tournament.name || '').trim();
    const description = String(tournament.description || '').trim();
    const prizeAmountUSD = Number(tournament.prizeAmountUSD || 0);
    const isInvalid = name.length > MAX_TOURNAMENT_NAME_LENGTH
      || description.length > MAX_TOURNAMENT_DESCRIPTION_LENGTH
      || !Number.isFinite(prizeAmountUSD)
      || prizeAmountUSD > MAX_PRIZE_AMOUNT_USD;
    if (!isInvalid) continue;
    tournament.name = name.slice(0, MAX_TOURNAMENT_NAME_LENGTH) || 'Torneo inválido';
    tournament.description = description.slice(0, MAX_TOURNAMENT_DESCRIPTION_LENGTH);
    tournament.prizeAmountUSD = Math.min(Math.max(0, Number.isFinite(prizeAmountUSD) ? prizeAmountUSD : 0), MAX_PRIZE_AMOUNT_USD);
    tournament.prizePool = tournament.prizeAmountUSD ? `$${tournament.prizeAmountUSD.toLocaleString('en-US')} USD` : '$0 USD';
    tournament.status = 'CANCELLED';
    tournament.updatedAt = new Date().toISOString();
    changed = true;
  }
  if (changed) persist();
}

function listTournaments() {
  return tournaments.map((tournament) => serializeTournament(tournament));
}

function getTournament(tournamentId) {
  return serializeTournament(findTournament(tournamentId));
}

function canUserManageTournament(tournamentId, userId) {
  const tournament = findTournament(tournamentId);
  return Boolean(tournament.createdBy && tournament.createdBy === userId);
}

function getTournamentOwner(tournamentId) {
  return findTournament(tournamentId).createdBy || null;
}

function createTournament(input) {
  const now = new Date().toISOString();
  const tournament = {
    // Permite que la capa Supabase conserve el mismo identificador al crear
    // una copia local para ejecutar los algoritmos de grupos y brackets.
    id: input.id || crypto.randomUUID(),
    name: input.name,
    description: input.description || '',
    game: input.game,
    gameCategory: input.gameCategory || 'TRADITIONAL',
    banner: input.banner || '',
    prizePool: input.prizePool || '',
    prizeAmountUSD: Number(input.prizeAmountUSD) || 0,
    entryFee: Math.max(0, Number(input.entryFee ?? 10) || 0),
    entryCurrency: String(input.entryCurrency || 'USD').toUpperCase(),
    status: ['DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED'].includes(input.status) ? input.status : 'OPEN',
    format: input.format || 'SINGLE_ELIMINATION',
    dates: input.dates || '',
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    maxTeams: Number(input.maxTeams) || 0,
    privacy: input.privacy || 'PUBLIC',
    organizer: input.organizer || '',
    tier: input.tier || 'OPEN',
    venue: input.venue,
    location: input.location,
    groupAdvanceCount: Number(input.groupAdvanceCount) || 2,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    participants: [],
    groups: [],
    matches: [],
    championId: null,
  };
  tournaments.push(tournament);
  persist();
  return serializeTournament(tournament);
}

function changeStatus(tournamentId, nextStatus, changedBy, note = '', { forceCancellation = false } = {}) {
  const tournament = findTournament(tournamentId);
  const transitions = {
    DRAFT: ['OPEN'], OPEN: ['CLOSED', 'IN_PROGRESS', 'CANCELLED'], CLOSED: ['OPEN', 'PUBLISHED', 'CANCELLED'],
    PUBLISHED: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [],
  };
  const adminCancellation = forceCancellation && nextStatus === 'CANCELLED' && tournament.status !== 'CANCELLED';
  if (!adminCancellation && !transitions[tournament.status]?.includes(nextStatus)) throw new HttpError(409, `No se puede cambiar de ${tournament.status} a ${nextStatus}`);
  const previousStatus = tournament.status;
  tournament.status = nextStatus;
  tournament.updatedAt = new Date().toISOString();
  tournamentAudits.push({ id: crypto.randomUUID(), tournamentId, previousStatus, nextStatus, changedBy, note, createdAt: tournament.updatedAt });
  persist();
  return { tournament: serializeTournament(tournament), audit: tournamentAudits.at(-1) };
}

function listAudit(tournamentId) {
  findTournament(tournamentId);
  return tournamentAudits.filter((entry) => entry.tournamentId === tournamentId).map((entry) => ({ ...entry }));
}

function listParticipants(tournamentId) {
  const tournament = findTournament(tournamentId);
  return tournament.participants.map((participant) => ({ ...participant }));
}

function registerParticipant(tournamentId, { teamId, teamName, seed }) {
  const tournament = findTournament(tournamentId);
  if (!teamId) throw new HttpError(400, 'El equipo es obligatorio');
  const team = getActiveTeam(teamId);
  if (!team) throw new HttpError(404, 'El equipo no existe o no está activo');
  if (tournament.maxTeams && tournament.participants.length >= tournament.maxTeams) {
    throw new HttpError(409, 'El torneo alcanzó el cupo máximo de participantes');
  }

  const id = teamId;
  if (tournament.participants.some((participant) => participant.id === id)) {
    throw new HttpError(409, 'Este equipo ya está inscrito en el torneo');
  }

  const participant = {
    id,
    name: team.name,
    seed: Number.isInteger(seed) ? seed : tournament.participants.length + 1,
  };
  tournament.participants.push(participant);
  tournament.updatedAt = new Date().toISOString();
  persist();
  return { ...participant };
}

function generateGroupsForTournament(tournamentId, groupCount) {
  const tournament = findTournament(tournamentId);
  if (tournament.format !== 'GROUP_STAGE_PLAYOFFS') {
    throw new HttpError(400, 'Este torneo no utiliza formato de fase de grupos');
  }
  if (tournament.groups.length > 0) throw new HttpError(409, 'Los grupos ya fueron generados para este torneo');

  const seeded = [...tournament.participants].sort((a, b) => a.seed - b.seed);
  const groupedParticipants = generateGroups(seeded, groupCount);

  groupedParticipants.forEach((groupParticipants, index) => {
    const group = { id: crypto.randomUUID(), name: `Grupo ${String.fromCharCode(65 + index)}`, participantIds: groupParticipants.map((p) => p.id) };
    tournament.groups.push(group);

    const roundsOfMatches = generateRoundRobinMatches(groupParticipants);
    for (const roundMatches of roundsOfMatches) {
      for (const match of roundMatches) {
        tournament.matches.push({
          id: crypto.randomUUID(),
          stage: 'group',
          groupId: group.id,
          round: match.round,
          participant1Id: match.participant1.id,
          participant2Id: match.participant2.id,
          participant1Score: null,
          participant2Score: null,
          winnerParticipantId: null,
          status: 'scheduled',
        });
      }
    }
  });

  tournament.status = 'IN_PROGRESS';
  tournament.updatedAt = new Date().toISOString();
  persist();
  return getGroups(tournamentId);
}

function getGroups(tournamentId) {
  const tournament = findTournament(tournamentId);
  const byId = participantsById(tournament);
  return tournament.groups.map((group) => {
    const participants = group.participantIds.map((id) => byId.get(id));
    const matches = groupMatches(tournament, group.id);
    return {
      id: group.id,
      name: group.name,
      standings: computeGroupStandings(participants, matches.map((match) => ({
        participant1Id: match.participant1Id,
        participant2Id: match.participant2Id,
        participant1Score: match.participant1Score,
        participant2Score: match.participant2Score,
        status: match.status,
      }))),
      matches: matches.map((match) => serializeGroupMatch(match, byId)),
    };
  });
}

function reportGroupMatchResult(tournamentId, matchId, { score1, score2 }) {
  const tournament = findTournament(tournamentId);
  const match = tournament.matches.find((entry) => entry.id === matchId && entry.stage === 'group');
  if (!match) throw new HttpError(404, 'Partido de fase de grupos no encontrado');
  if (match.status === 'completed') throw new HttpError(409, 'Este partido ya tiene un resultado registrado');
  if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
    throw new HttpError(400, 'Los marcadores deben ser enteros no negativos');
  }

  match.participant1Score = score1;
  match.participant2Score = score2;
  match.status = 'completed';
  if (score1 > score2) match.winnerParticipantId = match.participant1Id;
  else if (score2 > score1) match.winnerParticipantId = match.participant2Id;
  else match.winnerParticipantId = null;

  tournament.updatedAt = new Date().toISOString();
  persist();
  const byId = participantsById(tournament);
  return serializeGroupMatch(match, byId);
}

function topStandingsByGroup(tournament) {
  const groups = getGroups(tournament.id);
  const incompleteGroup = groups.find((group) => groupMatches(tournament, group.id).some((match) => match.status !== 'completed'));
  if (incompleteGroup) throw new HttpError(409, 'Aún hay partidos de fase de grupos sin finalizar');

  const byId = participantsById(tournament);
  const positions = [];
  for (let position = 0; position < tournament.groupAdvanceCount; position += 1) {
    for (const group of groups) {
      const row = group.standings[position];
      if (row) positions.push(byId.get(row.participantId));
    }
  }
  return positions;
}

function linkKnockoutRounds(tournament, generated) {
  const idByPosition = new Map();
  const created = [];

  generated.rounds.forEach((roundMatches) => {
    for (const match of roundMatches) {
      const id = crypto.randomUUID();
      idByPosition.set(`${match.round}-${match.matchOrder}`, id);
      created.push({
        id,
        stage: 'knockout',
        round: match.round,
        roundName: match.roundName,
        matchOrder: match.matchOrder,
        participant1Id: match.participant1 ? match.participant1.id : null,
        participant2Id: match.participant2 ? match.participant2.id : null,
        participant1Score: null,
        participant2Score: null,
        winnerParticipantId: match.winner ? match.winner.id : null,
        status: match.status,
        bestOf: 1,
        nextMatchOrder: match.nextMatchOrder,
        nextSlot: match.nextSlot,
        nextMatchId: null,
      });
    }
  });

  for (const match of created) {
    if (match.nextMatchOrder === null) continue;
    match.nextMatchId = idByPosition.get(`${match.round + 1}-${match.nextMatchOrder}`) || null;
    delete match.nextMatchOrder;
    delete match.nextSlot;
  }

  return created;
}

function generateBracket(tournamentId) {
  const tournament = findTournament(tournamentId);
  if (knockoutMatches(tournament).length > 0) throw new HttpError(409, 'El bracket de este torneo ya fue generado');

  let seeded;
  if (tournament.format === 'GROUP_STAGE_PLAYOFFS') {
    seeded = topStandingsByGroup(tournament);
  } else {
    if (tournament.participants.length < 2) throw new HttpError(400, 'Se requieren al menos 2 participantes inscritos');
    seeded = [...tournament.participants].sort((a, b) => a.seed - b.seed);
  }

  const generated = generateSingleEliminationBracket(seeded);
  const knockoutMatchList = linkKnockoutRounds(tournament, generated);
  tournament.matches.push(...knockoutMatchList);
  tournament.status = 'IN_PROGRESS';
  tournament.updatedAt = new Date().toISOString();
  persist();
  return serializeRounds(tournament);
}

function getBracket(tournamentId) {
  const tournament = findTournament(tournamentId);
  return serializeRounds(tournament) || [];
}

function reportBracketMatchResult(tournamentId, matchId, { score1, score2 }) {
  const tournament = findTournament(tournamentId);
  const match = tournament.matches.find((entry) => entry.id === matchId && entry.stage === 'knockout');
  if (!match) throw new HttpError(404, 'Partido de bracket no encontrado');
  if (match.status === 'completed' || match.status === 'bye') throw new HttpError(409, 'Este partido ya tiene un resultado registrado');
  if (match.status === 'pending') throw new HttpError(409, 'Aún no están definidos ambos equipos de este partido');
  if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
    throw new HttpError(400, 'Los marcadores deben ser enteros no negativos');
  }
  if (score1 === score2) throw new HttpError(400, 'Los partidos de eliminación directa no permiten empates');

  match.participant1Score = score1;
  match.participant2Score = score2;
  match.status = 'completed';
  match.winnerParticipantId = score1 > score2 ? match.participant1Id : match.participant2Id;
  tournament.updatedAt = new Date().toISOString();

  if (match.nextMatchId) {
    const next = tournament.matches.find((entry) => entry.id === match.nextMatchId);
    if (match.matchOrder % 2 === 0) next.participant1Id = match.winnerParticipantId;
    else next.participant2Id = match.winnerParticipantId;
    if (next.participant1Id && next.participant2Id && next.status === 'pending') next.status = 'scheduled';
  } else {
    tournament.championId = match.winnerParticipantId;
    tournament.status = 'COMPLETED';
  }

  // Persiste también el avance a la siguiente ronda y, especialmente, el
  // campeón de la final. Antes se guardaba demasiado pronto y el campeón se
  // perdía al reiniciar la API aunque el partido figurara como completado.
  persist();

  const byId = participantsById(tournament);
  return serializeKnockoutMatch(match, byId);
}

function getStatus(tournamentId) {
  const tournament = findTournament(tournamentId);
  const knockout = knockoutMatches(tournament);
  const group = groupMatches(tournament);
  const pendingGroupMatches = group.filter((match) => match.status !== 'completed');
  const pendingKnockoutMatches = knockout.filter((match) => match.status === 'scheduled');

  let stage = 'registration';
  if (tournament.status === 'COMPLETED') stage = 'completed';
  else if (tournament.status === 'CANCELLED') stage = 'cancelled';
  else if (knockout.length > 0) stage = 'knockout';
  else if (group.length > 0) stage = 'group_stage';

  const currentRound = pendingKnockoutMatches.length > 0
    ? Math.min(...pendingKnockoutMatches.map((match) => match.round))
    : null;

  return {
    tournamentId: tournament.id,
    status: tournament.status,
    stage,
    currentRound,
    pendingGroupMatches: pendingGroupMatches.length,
    pendingKnockoutMatches: pendingKnockoutMatches.map((match) => match.id),
    championId: tournament.championId,
  };
}

function seed() {
  const community = createTournament({
    name: 'TournamentX Community Cup',
    description: 'Copa de bienvenida con inscripción abierta y llave de eliminación directa.',
    game: 'Valorant',
    gameCategory: 'FPS',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    prizePool: '$1,000 USD',
    prizeAmountUSD: 1000,
    format: 'SINGLE_ELIMINATION',
    dates: 'POR CONFIRMAR',
    maxTeams: 8,
    privacy: 'PUBLIC',
    organizer: 'TournamentX Community Staff',
    tier: 'COMMUNITY',
  });
  [
    { teamId: 'team-lnx', teamName: 'LUMINEX ESPORTS', seed: 1 },
    { teamId: 'team-titans', teamName: 'Titans', seed: 2 },
  ].forEach((participant) => registerParticipant(community.id, participant));
  generateBracket(community.id);

  createTournament({
    name: 'Copa Grupos LATAM',
    description: 'Fase de grupos clasificatoria seguida de playoffs de eliminación directa.',
    game: 'Rocket League',
    gameCategory: 'SPORTS',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
    prizePool: '$2,500 USD',
    prizeAmountUSD: 2500,
    format: 'GROUP_STAGE_PLAYOFFS',
    dates: 'POR CONFIRMAR',
    maxTeams: 8,
    privacy: 'PUBLIC',
    organizer: 'TournamentX LATAM',
    tier: 'CHALLENGER',
    groupAdvanceCount: 2,
  });
}

function seedAdditionalCatalog() {
  const catalog = [
    {
      id: 'tour-futbol-sonora-2026', name: 'Copa Sonora de Fútbol 2026', game: 'Fútbol', gameCategory: 'TRADITIONAL',
      description: 'Torneo presencial de fútbol amateur con fase de grupos y playoffs.',
      banner: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$3,000 USD', prizeAmountUSD: 3000, format: 'GROUP_STAGE_PLAYOFFS', dates: '2026-10-10 al 2026-10-25', startDate: '2026-10-10', endDate: '2026-10-25',
      maxTeams: 16, privacy: 'PUBLIC', organizer: 'Arena TournamentX', createdBy: 'user-organizer-2', tier: 'OPEN', venue: 'Arena TournamentX', groupAdvanceCount: 2,
    },
    {
      id: 'tour-cs2-norte-2026', name: 'CS2 Norte Open', game: 'Counter-Strike 2', gameCategory: 'FPS',
      description: 'Circuito competitivo online para equipos del norte de México.',
      banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$1,500 USD', prizeAmountUSD: 1500, format: 'DOUBLE_ELIMINATION', dates: '2026-09-12 al 2026-09-20', startDate: '2026-09-12', endDate: '2026-09-20',
      maxTeams: 16, privacy: 'PUBLIC', organizer: 'TournamentX Community Staff', createdBy: 'user-organizer', tier: 'CHALLENGER', venue: 'Online (Servidores Dedicados)', status: 'PUBLISHED',
    },
    {
      id: 'tour-basket-hermosillo-2026', name: 'Hermosillo 3x3 Challenge', game: 'Baloncesto 3x3', gameCategory: 'TRADITIONAL',
      description: 'Competencia local de baloncesto 3x3 para equipos emergentes.',
      banner: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$800 USD', prizeAmountUSD: 800, format: 'ROUND_ROBIN', dates: '2026-11-07 al 2026-11-08', startDate: '2026-11-07', endDate: '2026-11-08',
      maxTeams: 8, privacy: 'PUBLIC', organizer: 'Arena TournamentX', createdBy: 'user-organizer-2', tier: 'COMMUNITY', venue: 'Arena TournamentX',
    },
    {
      id: 'tour-valorant-rush-2026', name: 'Valorant Rush LATAM', game: 'Valorant', gameCategory: 'FPS',
      description: 'Torneo relámpago online para escuadras competitivas de LATAM.',
      banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
      prizePool: '$1,200 USD', prizeAmountUSD: 1200, format: 'SINGLE_ELIMINATION', dates: '2026-09-05 al 2026-09-06', startDate: '2026-09-05', endDate: '2026-09-06',
      maxTeams: 32, privacy: 'PUBLIC', organizer: 'TournamentX Community Staff', createdBy: 'user-organizer', tier: 'OPEN', venue: 'Online (Servidores Dedicados)',
    },
  ];
  for (const tournament of catalog) {
    if (!tournaments.some((entry) => entry.id === tournament.id)) createTournament(tournament);
  }
}

function restoreChampionFromCompletedFinals() {
  let changed = false;
  for (const tournament of tournaments) {
    if (tournament.championId) continue;
    const completedFinal = knockoutMatches(tournament)
      .filter((match) => !match.nextMatchId && match.status === 'completed' && match.winnerParticipantId)
      .sort((left, right) => Number(right.round || 0) - Number(left.round || 0))[0];
    if (!completedFinal) continue;
    tournament.championId = completedFinal.winnerParticipantId;
    tournament.status = 'COMPLETED';
    tournament.updatedAt = tournament.updatedAt || new Date().toISOString();
    changed = true;
  }
  if (changed) localStore.saveCollection('tournaments', tournaments);
}

if (tournaments.length === 0) seed();
seedAdditionalCatalog();
sanitizeLegacyTournaments();
restoreChampionFromCompletedFinals();

module.exports = {
  listTournaments,
  getTournament,
  getTournamentOwner,
  canUserManageTournament,
  createTournament,
  listParticipants,
  registerParticipant,
  generateGroupsForTournament,
  getGroups,
  reportGroupMatchResult,
  generateBracket,
  getBracket,
  reportBracketMatchResult,
  getStatus,
  changeStatus,
  listAudit,
};
