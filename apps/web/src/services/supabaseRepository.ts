import type { AuthUser, Team, Tournament, TournamentMatch, User, Venue } from '../types';
import { requireSupabase } from './supabaseClient';

type Row = Record<string, any>;

const roleLabels: Record<AuthUser['role'], AuthUser['roleLabel']> = {
  admin: 'Admin', organizer: 'Organizador', captain: 'Capitán', player: 'Jugador',
};

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function mapProfile(row: Row): AuthUser {
  const role = row.role as AuthUser['role'];
  return { id: row.id, name: row.name, username: row.username, email: row.email, role: roleLabels[role] ? role : 'player', roleLabel: roleLabels[role] ?? 'Jugador', status: row.status };
}

function mapPlayer(row: Row): User {
  return {
    id: row.id,
    name: row.name,
    lastname: row.lastname,
    nickname: row.nickname,
    username: row.username,
    email: row.email,
    role: row.role,
    avatar: row.avatar_url || '',
    teamId: row.team_id || undefined,
    teamName: row.team_name || undefined,
    status: row.status,
    lastActivity: row.last_activity,
    ratingOVR: row.rating_ovr,
    position: row.position_name,
  };
}

function mapTeam(row: Row): Team {
  const rosterRows = Array.isArray(row.team_roster) ? row.team_roster : [];
  return {
    id: row.id,
    name: row.name,
    tag: row.abbreviation,
    abbreviation: row.abbreviation,
    logo: row.logo_url || '',
    tier: row.tier,
    globalRank: row.global_rank,
    winRate: Number(row.win_rate),
    matchesPlayed: row.matches_played,
    record: { wins: row.wins, losses: row.losses, ties: row.ties },
    points: row.points,
    trend: row.trend,
    region: row.region,
    bio: row.description,
    description: row.description,
    sport: row.sport,
    competitionType: row.competition_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    roster: rosterRows.map((member: Row) => ({
      id: member.id,
      playerId: member.player_id,
      name: `${member.players?.name || 'Jugador'} ${member.players?.lastname || ''}`.trim(),
      nickname: member.players?.nickname || 'Unknown',
      role: member.role_name,
      ovr: member.ovr,
      avatar: member.players?.avatar_url || '',
      kda: member.kda,
      status: member.status,
    })),
  };
}

function teamInput(data: Partial<Team>) {
  return {
    ...(data.id ? { id: data.id } : {}),
    name: data.name,
    abbreviation: data.abbreviation || data.tag,
    logo_url: data.logo,
    tier: data.tier,
    global_rank: data.globalRank,
    win_rate: data.winRate,
    matches_played: data.matchesPlayed,
    wins: data.record?.wins,
    losses: data.record?.losses,
    ties: data.record?.ties,
    points: data.points,
    trend: data.trend,
    region: data.region,
    description: data.description || data.bio,
    sport: data.sport,
    competition_type: data.competitionType,
    status: data.status,
  };
}

function playerInput(data: Partial<User>) {
  return {
    ...(data.id ? { id: data.id } : {}),
    name: data.name,
    lastname: data.lastname || '',
    nickname: data.nickname || data.username?.replace(/^@/, '') || data.name,
    username: data.username,
    email: data.email,
    role: data.role,
    avatar_url: data.avatar,
    team_id: data.teamId || null,
    team_name: data.teamName || null,
    status: data.status,
    last_activity: data.lastActivity,
    rating_ovr: data.ratingOVR,
    position_name: data.position,
  };
}

function mapTournament(row: Row): Tournament {
  return {
    id: row.id, name: row.name, description: row.description, game: row.game, gameCategory: row.game_category,
    banner: row.banner_url || '', prizePool: row.prize_pool, prizeAmountUSD: Number(row.prize_amount_usd), status: row.status,
    format: row.format, dates: row.date_label, registeredTeams: row.registered_teams, maxTeams: row.max_teams,
    privacy: row.privacy, organizer: row.organizer, tier: row.tier, venue: row.venue || undefined,
    location: row.latitude !== null && row.longitude !== null ? { lat: Number(row.latitude), lng: Number(row.longitude), city: row.city || '', country: row.country || '' } : undefined,
    rounds: Array.isArray(row.rounds) ? row.rounds : undefined,
  };
}

function tournamentInput(data: Partial<Tournament>) {
  return {
    ...(data.id ? { id: data.id } : {}), name: data.name, description: data.description, game: data.game,
    game_category: data.gameCategory, banner_url: data.banner, prize_pool: data.prizePool, prize_amount_usd: data.prizeAmountUSD,
    status: data.status, format: data.format, date_label: data.dates, registered_teams: data.registeredTeams, max_teams: data.maxTeams,
    privacy: data.privacy, organizer: data.organizer, tier: data.tier, venue: data.venue || null,
    latitude: data.location?.lat ?? null, longitude: data.location?.lng ?? null, city: data.location?.city ?? null,
    country: data.location?.country ?? null, rounds: data.rounds || [],
  };
}

function mapMatch(row: Row): TournamentMatch {
  return {
    id: row.id, scheduleId: row.schedule_id, tournamentId: row.tournament_id, roundId: row.round_id,
    team1Id: row.team1_id, team2Id: row.team2_id, scheduledAt: row.scheduled_at, venue: row.venue,
    mode: row.mode, status: row.status, score: { team1: row.score_team1, team2: row.score_team2 },
    streamUrl: row.stream_url, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export const supabaseRepository = {
  async login(email: string, password: string) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); fail(error);
    if (!data.session || !data.user) throw new Error('No se pudo crear la sesión de Supabase.');
    const { data: profile, error: profileError } = await client.from('profiles').select('*').eq('id', data.user.id).single(); fail(profileError);
    if (profile.status === 'SUSPENDED') {
      await client.auth.signOut();
      throw new Error('La cuenta está suspendida. Contacta a un administrador.');
    }
    return { token: data.session.access_token, user: mapProfile(profile), expiresIn: data.session.expires_in };
  },
  async register(input: { name: string; username?: string; email: string; password: string }) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({ email: input.email.trim().toLowerCase(), password: input.password, options: { data: { name: input.name.trim(), username: input.username?.trim() } } }); fail(error);
    if (!data.user) throw new Error('No se pudo crear la cuenta.');
    if (!data.session) throw new Error('Cuenta creada. Confirma el correo electrónico y después inicia sesión.');
    const { data: profile, error: profileError } = await client.from('profiles').select('*').eq('id', data.user.id).single(); fail(profileError);
    return { token: data.session.access_token, user: mapProfile(profile), expiresIn: data.session.expires_in };
  },
  async me() {
    const client = requireSupabase();
    const { data: auth, error } = await client.auth.getUser(); fail(error);
    if (!auth.user) throw new Error('No existe una sesión activa.');
    const { data, error: profileError } = await client.from('profiles').select('*').eq('id', auth.user.id).single(); fail(profileError);
    if (data.status === 'SUSPENDED') throw new Error('La cuenta está suspendida.');
    return { user: mapProfile(data) };
  },
  async users() {
    const { data, error } = await requireSupabase().rpc('admin_list_profiles'); fail(error);
    return { data: (data || []).map(mapProfile) };
  },
  async updateUser(id: string, changes: Partial<AuthUser>) {
    const { data, error } = await requireSupabase().rpc('admin_update_profile', { target_id: id, new_role: changes.role ?? null, new_status: changes.status ?? null }); fail(error);
    const profile = Array.isArray(data) ? data[0] : data;
    if (!profile) throw new Error('Supabase no devolvio el perfil actualizado.');
    return { user: mapProfile(profile) };
  },
  async teams() {
    const { data, error } = await requireSupabase().from('teams').select('*, team_roster(*, players(*))').order('points', { ascending: false }); fail(error);
    return (data || []).map(mapTeam);
  },
  async team(id: string) {
    const { data, error } = await requireSupabase().from('teams').select('*, team_roster(*, players(*))').eq('id', id).single(); fail(error); return mapTeam(data);
  },
  async createTeam(input: Partial<Team>) {
    const { data, error } = await requireSupabase().from('teams').insert(teamInput(input)).select('*, team_roster(*, players(*))').single(); fail(error); return mapTeam(data);
  },
  async updateTeam(id: string, input: Partial<Team>) {
    const { id: _ignored, ...values } = teamInput(input);
    const { data, error } = await requireSupabase().from('teams').update(values).eq('id', id).select('*, team_roster(*, players(*))').single(); fail(error); return mapTeam(data);
  },
  async players() {
    const { data, error } = await requireSupabase().from('players').select('*').order('name'); fail(error); return (data || []).map(mapPlayer);
  },
  async player(id: string) {
    const { data, error } = await requireSupabase().from('players').select('*').eq('id', id).single(); fail(error); return mapPlayer(data);
  },
  async createPlayer(input: Partial<User>) {
    const { data, error } = await requireSupabase().from('players').insert(playerInput(input)).select('*').single(); fail(error); return mapPlayer(data);
  },
  async updatePlayer(id: string, input: Partial<User>) {
    const { id: _ignored, ...values } = playerInput(input);
    const { data, error } = await requireSupabase().from('players').update(values).eq('id', id).select('*').single(); fail(error); return mapPlayer(data);
  },
  async deletePlayer(id: string) {
    const { data, error } = await requireSupabase().from('players').delete().eq('id', id).select('id').maybeSingle();
    fail(error);
    if (!data) throw new Error('No se eliminó el jugador. Verifica tu rol y que el registro todavía exista.');
  },
  async addRosterMember(teamId: string, input: { playerId: string; role: string; status?: string }) {
    const player = await this.player(input.playerId);
    const { data, error } = await requireSupabase().from('team_roster').insert({ team_id: teamId, player_id: input.playerId, role_name: input.role, status: input.status || 'active', ovr: player.ratingOVR || 85 }).select('id').single(); fail(error);
    await requireSupabase().from('players').update({ team_id: teamId }).eq('id', input.playerId);
    return data as { id: string };
  },
  async removeRosterMember(teamId: string, playerId: string) {
    const client = requireSupabase();
    const { error } = await client.from('team_roster').delete().eq('team_id', teamId).eq('player_id', playerId); fail(error);
    await client.from('players').update({ team_id: null, team_name: null }).eq('id', playerId);
    return { ok: true };
  },
  async tournaments() {
    const { data, error } = await requireSupabase().from('tournaments').select('*').order('created_at', { ascending: false }); fail(error); return (data || []).map(mapTournament);
  },
  async tournament(id: string) {
    const { data, error } = await requireSupabase().from('tournaments').select('*').eq('id', id).single(); fail(error); return mapTournament(data);
  },
  async createTournament(input: Partial<Tournament>) {
    const { data, error } = await requireSupabase().from('tournaments').insert(tournamentInput(input)).select('*').single(); fail(error); return mapTournament(data);
  },
  async upsertTournament(input: Partial<Tournament>) {
    const { data, error } = await requireSupabase().from('tournaments').upsert(tournamentInput(input), { onConflict: 'id' }).select('*').single(); fail(error); return mapTournament(data);
  },
  async matches() {
    const { data, error } = await requireSupabase().from('matches').select('*').order('scheduled_at'); fail(error); return (data || []).map(mapMatch);
  },
  async match(id: string) {
    const { data, error } = await requireSupabase().from('matches').select('*').eq('id', id).single(); fail(error); return mapMatch(data);
  },
  async updateMatchScore(id: string, input: Row) {
    const values = { score_team1: input.team1 ?? input.scoreTeam1, score_team2: input.team2 ?? input.scoreTeam2, status: input.status };
    const { data, error } = await requireSupabase().from('matches').update(values).eq('id', id).select('*').single(); fail(error); return mapMatch(data);
  },
  async venues(): Promise<Venue[]> {
    const { data, error } = await requireSupabase().from('venues').select('*').order('name'); fail(error);
    return (data || []).map((row: Row) => ({
      id: row.id, name: row.name, city: row.city, country: row.country, address: row.address,
      coordinates: [Number(row.latitude), Number(row.longitude)], capacity: row.capacity,
      image: row.image_url || '', activeEventsCount: row.active_events_count,
      features: Array.isArray(row.features) ? row.features : [],
    }));
  },
  async notifications() {
    const { data, error } = await requireSupabase().from('notifications').select('*').order('created_at', { ascending: false }).limit(20); fail(error);
    return (data || []).map((row: Row) => ({ id: row.id, title: row.title, message: row.message, type: 'venue', createdAt: row.created_at, read: Boolean(row.read_at) }));
  },
  async markNotificationRead(id: string) {
    const { data, error } = await requireSupabase().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).select('*').single(); fail(error);
    return { id: data.id, title: data.title, message: data.message, type: 'venue', createdAt: data.created_at, read: true };
  },
  async lobbies() {
    const { data, error } = await requireSupabase().from('media_lobbies').select('*').order('created_at'); fail(error);
    return { data: (data || []).map((row: Row) => ({ id: row.id, name: row.name, game: row.game, server: row.server, map: row.map, team1: row.team1, team2: row.team2, matchId: row.match_id, streamId: row.stream_id, status: row.status, ping: row.ping, players: row.players, maxPlayers: row.max_players })) };
  },
  async createLobby(input: Row) {
    const { maxPlayers, matchId, streamId, ...values } = input;
    const { data, error } = await requireSupabase().from('media_lobbies').insert({ ...values, max_players: maxPlayers, match_id: matchId || null, stream_id: streamId || null }).select('*').single(); fail(error); return data;
  },
  async updateLobby(id: string, input: Row) {
    const { maxPlayers, matchId, streamId, ...values } = input;
    const update = { ...values, ...(maxPlayers === undefined ? {} : { max_players: maxPlayers }), ...(matchId === undefined ? {} : { match_id: matchId || null }), ...(streamId === undefined ? {} : { stream_id: streamId || null }) };
    const { data, error } = await requireSupabase().from('media_lobbies').update(update).eq('id', id).select('*').single(); fail(error); return data;
  },
};
