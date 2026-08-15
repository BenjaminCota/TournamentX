const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Error HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const tournamentXApi = {
  health: () => request('/health'),
  sponsors: () => request('/sponsors'),
  prizePools: () => request('/prize-pools'),
  rewards: () => request('/rewards'),
  teams: () => request('/teams'),
  team: (id: string) => request(`/teams/${id}`),
  createTeam: (data: unknown) => request('/teams', { method: 'POST', body: data }),
  updateTeam: (id: string, data: unknown) => request(`/teams/${id}`, { method: 'PATCH', body: data }),
  players: () => request('/players'),
  player: (id: string) => request(`/players/${id}`),
  createPlayer: (data: unknown) => request('/players', { method: 'POST', body: data }),
  updatePlayer: (id: string, data: unknown) => request(`/players/${id}`, { method: 'PATCH', body: data }),
  addRosterMember: (teamId: string, data: unknown) => request(`/teams/${teamId}/roster`, { method: 'POST', body: data }),
  removeRosterMember: (teamId: string, playerId: string) => request(`/teams/${teamId}/roster/${playerId}`, { method: 'DELETE' }),
  addContribution: (prizePoolId: number, data: unknown) =>
    request(`/prize-pools/${prizePoolId}/contributions`, { method: 'POST', body: data }),
  updateContributionStatus: (contributionId: number, status: string) =>
    request(`/contributions/${contributionId}/status`, { method: 'PATCH', body: { status } }),
  registerResults: (prizePoolId: number, data: unknown) =>
    request(`/prize-pools/${prizePoolId}/results`, { method: 'POST', body: data })
};
