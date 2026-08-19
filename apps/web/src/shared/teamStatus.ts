export function isActiveTeam(team: { status?: unknown }) {
  return String(team.status || 'active').toLowerCase() === 'active';
}

export function teamDisplayName(teamId?: string | null, fallback = 'Por definir') {
  if (!teamId) return fallback;
  if (teamId.startsWith('pending:')) return 'Pendiente';
  if (teamId.startsWith('bye:')) return 'Descansa';
  return teamId;
}
