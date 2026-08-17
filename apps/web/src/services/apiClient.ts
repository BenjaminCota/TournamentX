import type { AnalyticsOverview, AuthUser, Team, Tournament, TournamentMatch, User } from '../types';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

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

  return response.json() as Promise<T>;
}

export const tournamentXApi = {
  health: () => request<{ status: string }>('/health'),
  login: (email: string, password: string) => request<{ token: string; user: AuthUser; expiresIn: number }>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (data: { name: string; username?: string; email: string; password: string }) => request<{ token: string; user: AuthUser; expiresIn: number }>('/auth/register', { method: 'POST', body: data }),
  me: () => request<{ user: AuthUser }>('/auth/me'),
  users: () => request<{ data: AuthUser[] }>('/auth/users'),
  updateUser: (id: string, data: Partial<AuthUser> & { password?: string }) => request<{ user: AuthUser }>(`/auth/users/${id}`, { method: 'PATCH', body: data }),
  analytics: () => request<AnalyticsOverview>('/analytics/overview'),
  sponsors: () => request<{ data: unknown[] }>('/sponsors'),
  prizePools: () => request<{ data: unknown[] }>('/prize-pools'),
  rewards: () => request<{ data: unknown[] }>('/rewards'),
  teams: () => request<Team[]>('/teams'),
  team: (id: string) => request<Team>(`/teams/${id}`),
  createTeam: (data: unknown) => request<Team>('/teams', { method: 'POST', body: data }),
  updateTeam: (id: string, data: unknown) => request<Team>(`/teams/${id}`, { method: 'PATCH', body: data }),
  players: () => request<User[]>('/players'),
  player: (id: string) => request<User>(`/players/${id}`),
  createPlayer: (data: unknown) => request<User>('/players', { method: 'POST', body: data }),
  updatePlayer: (id: string, data: unknown) => request<User>(`/players/${id}`, { method: 'PATCH', body: data }),
  addRosterMember: (teamId: string, data: unknown) => request<{ id: string }>(`/teams/${teamId}/roster`, { method: 'POST', body: data }),
  removeRosterMember: (teamId: string, playerId: string) => request(`/teams/${teamId}/roster/${playerId}`, { method: 'DELETE' }),
  matches: () => request<TournamentMatch[]>('/matches'),
  match: (id: string) => request<TournamentMatch>(`/matches/${id}`),
  updateMatchScore: (id: string, data: unknown, token?: string) => request(`/matches/${id}/score`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: data,
  }),
  addContribution: (prizePoolId: number, data: unknown) =>
    request(`/prize-pools/${prizePoolId}/contributions`, { method: 'POST', body: data }),
  updateContributionStatus: (contributionId: number, status: string) =>
    request(`/contributions/${contributionId}/status`, { method: 'PATCH', body: { status } }),
  registerResults: (prizePoolId: number, data: unknown) =>
    request(`/prize-pools/${prizePoolId}/results`, { method: 'POST', body: data }),
  tournaments: () => request<Tournament[]>('/tournaments'),
  tournament: (id: string) => request<Tournament>(`/tournaments/${id}`),
  createTournament: (data: unknown) => request<Tournament>('/tournaments', { method: 'POST', body: data }),
  tournamentParticipants: (tournamentId: string) => request(`/tournaments/${tournamentId}/participants`),
  registerTournamentParticipant: (tournamentId: string, data: unknown) =>
    request(`/tournaments/${tournamentId}/participants`, { method: 'POST', body: data }),
  tournamentGroups: (tournamentId: string) => request(`/tournaments/${tournamentId}/groups`),
  generateTournamentGroups: (tournamentId: string, groupCount: number) =>
    request(`/tournaments/${tournamentId}/groups/generate`, { method: 'POST', body: { groupCount } }),
  reportGroupMatchResult: (tournamentId: string, matchId: string, score1: number, score2: number) =>
    request(`/tournaments/${tournamentId}/group-matches/${matchId}/result`, { method: 'PUT', body: { score1, score2 } }),
  generateTournamentBracket: (tournamentId: string) =>
    request(`/tournaments/${tournamentId}/bracket/generate`, { method: 'POST' }),
  tournamentBracket: (tournamentId: string) => request(`/tournaments/${tournamentId}/bracket`),
  reportBracketMatchResult: (tournamentId: string, matchId: string, score1: number, score2: number) =>
    request(`/tournaments/${tournamentId}/bracket-matches/${matchId}/result`, { method: 'PUT', body: { score1, score2 } }),
  tournamentStatus: (tournamentId: string) => request(`/tournaments/${tournamentId}/status`),
  streams: () => request<{ data: Array<{ id: string; platform: 'Twitch' | 'YouTube'; title: string; channel: string; game: string; viewers: number; live: boolean; thumbnail: string; url: string; source: string }>; integration: { twitch: string; youtube: string } }>('/media/streams'),
  lobbies: () => request<{ data: Array<{ id: string; name: string; game: string; server: string; map: string; team1: string; team2: string; status: 'In Game' | 'Waiting' | 'Paused'; ping: number; players: number; maxPlayers: number }> }>('/media/lobbies'),
  mediaMetrics: () => request<{ data: Array<{ game: string; lobbies: number; activePlayers: number; viewers: number }> }>('/media/metrics'),
  createLobby: (data: unknown) => request('/media/lobbies', { method: 'POST', body: data }),
  updateLobby: (id: string, data: unknown) => request(`/media/lobbies/${id}`, { method: 'PATCH', body: data }),
};
