import type { AnalyticsOverview, AuthUser, CompetitiveOverview, MatchWorkflow, OrganizerRequest, Team, Tournament, TournamentMatch, User, Venue } from '../types';
import type { LiveEvent, MediaStream } from '../features/media/media.types';
import { isSupabaseConfigured } from './supabaseClient';
import { supabaseRepository } from './supabaseRepository';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const useSupabaseDomainData = isSupabaseConfigured && import.meta.env.VITE_DATA_SOURCE === 'supabase-direct';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tournamentx_token') : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || `Error HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function ensureLocalTournament(tournamentId: string) {
  if (!useSupabaseDomainData) return;
  try {
    await request<Tournament>(`/tournaments/${tournamentId}`);
  } catch {
    const tournament = await supabaseRepository.tournament(tournamentId);
    await request<Tournament>('/tournaments', { method: 'POST', body: tournament });
  }
}

async function runTournamentOperation<T>(tournamentId: string, path: string, options: RequestOptions = {}) {
  if (useSupabaseDomainData) await ensureLocalTournament(tournamentId);
  const result = await request<T>(path, options);
  if (useSupabaseDomainData) {
    const updated = await request<Tournament>(`/tournaments/${tournamentId}`);
    await supabaseRepository.upsertTournament(updated);
  }
  return result;
}

export const tournamentXApi = {
  health: () => request<{ status: string }>('/health'),
  login: (email: string, password: string) => isSupabaseConfigured && !email.endsWith('.local')
    ? supabaseRepository.login(email, password)
    : request<{ token: string; user: AuthUser; expiresIn: number }>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (data: { name: string; username?: string; email: string; password: string }) => isSupabaseConfigured
    ? supabaseRepository.register(data)
    : request<{ token: string; user: AuthUser; expiresIn: number }>('/auth/register', { method: 'POST', body: data }),
  me: async () => {
    if (isSupabaseConfigured) {
      try { return await supabaseRepository.me(); } catch { /* Permite resolver sesiones internas emitidas por la API. */ }
    }
    return request<{ user: AuthUser }>('/auth/me');
  },
  // La administración pasa por la API para no exponer RPC privilegiados al navegador.
  // El backend valida el rol y sincroniza Supabase cuando la sesión procede de allí.
  users: () => request<{ data: AuthUser[] }>('/auth/users'),
  updateUser: (id: string, data: Partial<AuthUser> & { password?: string }) =>
    request<{ user: AuthUser }>(`/auth/users/${id}`, { method: 'PATCH', body: data }),
  organizerRequests: () => request<{ data: OrganizerRequest[] }>('/auth/organizer-requests'),
  myOrganizerRequests: () => request<{ data: OrganizerRequest[] }>('/auth/organizer-requests/me'),
  createOrganizerRequest: (data: { organizationName: string; description?: string; logoUrl?: string; socialLinks?: Record<string, string>; credentialReference: string }) =>
    request<{ request: OrganizerRequest }>('/auth/organizer-requests', { method: 'POST', body: data }),
  decideOrganizerRequest: (id: string, data: { decision: 'approve' | 'reject'; reviewNote?: string }) =>
    request<{ request: OrganizerRequest }>(`/auth/organizer-requests/${id}`, { method: 'PATCH', body: data }),
  analytics: () => request<AnalyticsOverview>('/analytics/overview'),
  competitiveOverview: () => request<CompetitiveOverview>('/competitive/overview'),
  sponsors: () => request<{ data: unknown[] }>('/sponsors'),
  prizePools: () => request<{ data: unknown[] }>('/prize-pools'),
  rewards: () => request<{ data: unknown[] }>('/rewards'),
  teams: () => useSupabaseDomainData ? supabaseRepository.teams() : request<Team[]>('/teams'),
  team: (id: string) => useSupabaseDomainData ? supabaseRepository.team(id) : request<Team>(`/teams/${id}`),
  createTeam: (data: unknown) => useSupabaseDomainData ? supabaseRepository.createTeam(data as Partial<Team>) : request<Team>('/teams', { method: 'POST', body: data }),
  updateTeam: (id: string, data: unknown) => useSupabaseDomainData ? supabaseRepository.updateTeam(id, data as Partial<Team>) : request<Team>(`/teams/${id}`, { method: 'PATCH', body: data }),
  players: () => useSupabaseDomainData ? supabaseRepository.players() : request<User[]>('/players'),
  player: (id: string) => useSupabaseDomainData ? supabaseRepository.player(id) : request<User>(`/players/${id}`),
  createPlayer: (data: unknown) => useSupabaseDomainData ? supabaseRepository.createPlayer(data as Partial<User>) : request<User>('/players', { method: 'POST', body: data }),
  updatePlayer: (id: string, data: unknown) => useSupabaseDomainData ? supabaseRepository.updatePlayer(id, data as Partial<User>) : request<User>(`/players/${id}`, { method: 'PATCH', body: data }),
  deletePlayer: (id: string) => useSupabaseDomainData ? supabaseRepository.deletePlayer(id) : request<void>(`/players/${id}`, { method: 'DELETE' }),
  addRosterMember: (teamId: string, data: unknown) => useSupabaseDomainData
    ? supabaseRepository.addRosterMember(teamId, data as { playerId: string; role: string; status?: string })
    : request<{ id: string }>(`/teams/${teamId}/roster`, { method: 'POST', body: data }),
  removeRosterMember: (teamId: string, playerId: string) => useSupabaseDomainData
    ? supabaseRepository.removeRosterMember(teamId, playerId)
    : request(`/teams/${teamId}/roster/${playerId}`, { method: 'DELETE' }),
  createTeamInvitation: (teamId: string, data: { expiresInHours?: number; rosterRole?: string }) => request<{ invitation: { id: string; code: string; expiresAt: string; inviteUrl: string } }>(`/teams/${teamId}/invitations`, { method: 'POST', body: data }),
  teamJoinRequests: (teamId: string) => request<{ data: Array<{ id: string; playerId: string; status: string; player?: User }> }>(`/teams/${teamId}/join-requests`),
  requestToJoinTeam: (data: { code: string; playerId: string }) => request('/teams/join-requests', { method: 'POST', body: data }),
  decideTeamJoinRequest: (teamId: string, requestId: string, decision: 'approve' | 'reject') => request(`/teams/${teamId}/join-requests/${requestId}`, { method: 'PATCH', body: { decision } }),
  matches: (tournamentId?: string) => useSupabaseDomainData ? supabaseRepository.matches() : request<TournamentMatch[]>(`/matches${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ''}`),
  match: (id: string) => useSupabaseDomainData ? supabaseRepository.match(id) : request<TournamentMatch>(`/matches/${id}`),
  updateMatchScore: (id: string, data: unknown, token?: string) => useSupabaseDomainData
    ? supabaseRepository.updateMatchScore(id, data as Record<string, unknown>)
    : request(`/matches/${id}/score`, { method: 'PATCH', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: data }),
  matchWorkflow: (id: string) => request<MatchWorkflow>(`/matches/${id}/workflow`),
  checkInMatch: (id: string, teamId: string) => request<{ match: TournamentMatch; workflow: MatchWorkflow }>(`/matches/${id}/check-in`, { method: 'POST', body: { teamId } }),
  reportMatchResult: (id: string, data: { teamId: string; team1Score: number; team2Score: number; evidenceUrl: string }) => request(`/matches/${id}/reports`, { method: 'POST', body: data }),
  decideMatchReport: (id: string, reportId: string, decision: 'approve' | 'reject', reviewNote?: string) => request<{ match: TournamentMatch; workflow: MatchWorkflow }>(`/matches/${id}/reports/${reportId}`, { method: 'PATCH', body: { decision, reviewNote } }),
  disputeMatch: (id: string, data: { teamId: string; reason: string; evidenceUrl?: string }) => request(`/matches/${id}/disputes`, { method: 'POST', body: data }),
  decideMatchDispute: (id: string, disputeId: string, decision: 'resolve' | 'dismiss', resolution: string) => request<{ workflow: MatchWorkflow }>(`/matches/${id}/disputes/${disputeId}`, { method: 'PATCH', body: { decision, resolution } }),
  uploadPrivateAsset: (data: { dataUrl: string; fileName: string; purpose: 'match-evidence' | 'dispute-evidence' | 'organizer-credential'; matchId?: string }) => request<{ asset: { id: string; accessUrl: string } }>('/assets', { method: 'POST', body: data }),
  schedules: (tournamentId?: string) => request<Array<{ id: string; tournamentId: string; startsAt: string; endsAt: string; status: string; format: string }>>(`/schedules${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ''}`),
  createSchedule: (data: { tournamentId: string; teamIds: string[]; startsAt: string; slotMinutes: number; venue?: string; mode: 'best_of_1' | 'best_of_3' | 'best_of_5'; format: 'round_robin' | 'single_elimination' }) => request<{ id: string; matches: TournamentMatch[] }>('/schedules', { method: 'POST', body: data }),
  venues: () => useSupabaseDomainData ? supabaseRepository.venues() : request<Venue[]>('/geolocation/venues'),
  createVenue: (data: unknown) => request<Venue>('/geolocation/venues', { method: 'POST', body: data }),
  updateVenue: (id: string, data: unknown) => request<Venue>(`/geolocation/venues/${id}`, { method: 'PATCH', body: data }),
  deleteVenue: (id: string) => request<void>(`/geolocation/venues/${id}`, { method: 'DELETE' }),
  // Las alertas se centralizan en la API porque es quien publica los eventos de
  // torneos y partidos y quien los distribuye por Socket.IO en tiempo real.
  notifications: () => request<Array<{ id: string; title: string; message: string; type: string; createdAt: string; read?: boolean }>>(typeof window !== 'undefined' && localStorage.getItem('tournamentx_token') ? '/geolocation/notifications/me' : '/geolocation/notifications'),
  markNotificationRead: (id: string) => request<{ id: string; title: string; message: string; type: string; createdAt: string; read: boolean }>(`/geolocation/notifications/${id}/read`, { method: 'PATCH' }),
  myNotifications: () => request<Array<{ id: string; title: string; message: string; type: string; createdAt: string }>>('/geolocation/notifications/me'),
  addContribution: (prizePoolId: string, data: unknown) =>
    request(`/prize-pools/${prizePoolId}/contributions`, { method: 'POST', body: data }),
  updateContributionStatus: (contributionId: string, status: string) =>
    request(`/contributions/${contributionId}/status`, { method: 'PATCH', body: { status } }),
  registerResults: (prizePoolId: string, data: unknown) =>
    request(`/prize-pools/${prizePoolId}/results`, { method: 'POST', body: data }),
  tournaments: () => useSupabaseDomainData ? supabaseRepository.tournaments() : request<Tournament[]>('/tournaments'),
  tournament: (id: string) => useSupabaseDomainData ? supabaseRepository.tournament(id) : request<Tournament>(`/tournaments/${id}`),
  createTournament: async (data: unknown) => {
    if (!useSupabaseDomainData) return request<Tournament>('/tournaments', { method: 'POST', body: data });
    const created = await supabaseRepository.createTournament(data as Partial<Tournament>);
    await request<Tournament>('/tournaments', { method: 'POST', body: created });
    return created;
  },
  tournamentParticipants: async (tournamentId: string) => {
    if (useSupabaseDomainData) await ensureLocalTournament(tournamentId);
    return request(`/tournaments/${tournamentId}/participants`);
  },
  registerTournamentParticipant: (tournamentId: string, data: unknown) =>
    runTournamentOperation(tournamentId, `/tournaments/${tournamentId}/participants`, { method: 'POST', body: data }),
  tournamentGroups: async (tournamentId: string) => {
    if (useSupabaseDomainData) await ensureLocalTournament(tournamentId);
    return request(`/tournaments/${tournamentId}/groups`);
  },
  generateTournamentGroups: (tournamentId: string, groupCount: number) =>
    runTournamentOperation(tournamentId, `/tournaments/${tournamentId}/groups/generate`, { method: 'POST', body: { groupCount } }),
  reportGroupMatchResult: (tournamentId: string, matchId: string, score1: number, score2: number) =>
    runTournamentOperation(tournamentId, `/tournaments/${tournamentId}/group-matches/${matchId}/result`, { method: 'PUT', body: { score1, score2 } }),
  generateTournamentBracket: (tournamentId: string) =>
    runTournamentOperation(tournamentId, `/tournaments/${tournamentId}/bracket/generate`, { method: 'POST' }),
  tournamentBracket: async (tournamentId: string) => {
    if (useSupabaseDomainData) await ensureLocalTournament(tournamentId);
    return request(`/tournaments/${tournamentId}/bracket`);
  },
  reportBracketMatchResult: (tournamentId: string, matchId: string, score1: number, score2: number) =>
    runTournamentOperation(tournamentId, `/tournaments/${tournamentId}/bracket-matches/${matchId}/result`, { method: 'PUT', body: { score1, score2 } }),
  tournamentStatus: async (tournamentId: string) => {
    if (useSupabaseDomainData) await ensureLocalTournament(tournamentId);
    return request(`/tournaments/${tournamentId}/status`);
  },
  changeTournamentStatus: (tournamentId: string, status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED', note?: string) => runTournamentOperation(tournamentId, `/tournaments/${tournamentId}/status`, { method: 'PATCH', body: { status, note } }),
  tournamentAudit: async (tournamentId: string) => {
    const result = await request<{ data: Array<{ id: string; previousStatus: string; nextStatus: string; changedBy: string; note?: string; createdAt: string }> }>(`/tournaments/${tournamentId}/audit`);
    return result.data;
  },
  streams: () => request<{ data: MediaStream[]; integration: { twitch: string; youtube: string } }>('/media/streams'),
  mediaEvents: () => request<{ data: LiveEvent[]; generatedAt: string }>('/media/events'),
  lobbies: () => useSupabaseDomainData ? supabaseRepository.lobbies() : request<{ data: Array<{ id: string; name: string; game: string; server: string; map: string; team1: string; team2: string; status: 'In Game' | 'Waiting' | 'Paused'; ping: number; players: number; maxPlayers: number }> }>('/media/lobbies'),
  mediaMetrics: () => request<{ data: Array<{ game: string; lobbies: number; activePlayers: number; viewers: number }> }>('/media/metrics'),
  createLobby: (data: unknown) => useSupabaseDomainData ? supabaseRepository.createLobby(data as Record<string, unknown>) : request('/media/lobbies', { method: 'POST', body: data }),
  updateLobby: (id: string, data: unknown) => useSupabaseDomainData ? supabaseRepository.updateLobby(id, data as Record<string, unknown>) : request(`/media/lobbies/${id}`, { method: 'PATCH', body: data }),
  lobbyCredentials: (id: string) => request<{ data: { roomName?: string; roomPassword?: string } }>(`/media/lobbies/${id}/credentials`),
};
