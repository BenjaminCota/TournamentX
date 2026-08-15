const crypto = require('node:crypto');

const teams = [
  {
    id: 'team-lnx',
    name: 'LUMINEX ESPORTS',
    abbreviation: 'LNX',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    sport: 'Valorant',
    region: 'LATAM Sur',
    competitionType: 'Regional',
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
    description: 'Penta-campeones continentales.',
    status: 'active',
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: '2025-02-01T00:00:00.000Z',
  },
];

const players = [
  {
    id: 'player-1',
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
];

const roster = [
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
];

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
        ovr: 90,
        avatar: player ? player.avatar : '',
        kda: '1.30 K/D',
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
  if (!player) return null;

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

function createTeam({ name, abbreviation, logo, sport, region, competitionType, description, status }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const team = {
    id,
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
  return serializeTeam(team);
}

function updateTeam(teamId, updates) {
  const team = teams.find((entry) => entry.id === teamId);
  if (!team) return null;
  Object.assign(team, updates, { updatedAt: new Date().toISOString() });
  return serializeTeam(team);
}

function listPlayers() {
  return players.map((player) => serializePlayer(player.id));
}

function getPlayer(playerId) {
  return serializePlayer(playerId);
}

function createPlayer({ name, lastname, nickname, avatar, sport, position, nationality, status }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const player = {
    id,
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
  return serializePlayer(player.id);
}

function updatePlayer(playerId, updates) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player) return null;
  Object.assign(player, updates, { updatedAt: new Date().toISOString() });
  return serializePlayer(player.id);
}

function addMemberToRoster(teamId, { playerId, role, status }) {
  const team = teams.find((entry) => entry.id === teamId);
  const player = players.find((entry) => entry.id === playerId);
  if (!team || !player) return { error: 'Equipo o jugador no encontrado' };

  const existing = roster.find((membership) => membership.teamId === teamId && membership.playerId === playerId && membership.status === 'active');
  if (existing) {
    return { error: 'Este jugador ya pertenece a la plantilla.' };
  }

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

function removeMemberFromRoster(teamId, playerId) {
  const membership = roster.find((entry) => entry.teamId === teamId && entry.playerId === playerId && entry.status === 'active');
  if (!membership) return null;
  membership.status = 'inactive';
  membership.leftAt = new Date().toISOString();
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
  updateTeam,
  listPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  addMemberToRoster,
  removeMemberFromRoster,
};
