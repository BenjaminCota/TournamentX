import { useEffect, useMemo, useState } from 'react';
import { Sidebar, TabId } from './features/shell/Sidebar';
import { LandingView } from './features/landing/LandingView';
import { DashboardView } from './features/analytics/DashboardView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { TournamentsView } from './features/tournaments/TournamentsView';
import { TournamentCreateWizard } from './features/tournaments/TournamentCreateWizard';
import { TeamDetailView } from './features/teams/TeamDetailView';
import { TeamsWorkspace } from './features/teams/TeamsWorkspace';
import { MatchesWorkspace } from './features/matches/MatchesWorkspace';
import { SedesMapView } from './features/geolocation/SedesMapView';
import { RecompensasView } from './features/rewards/RecompensasView';
import { LoginView } from './features/auth/LoginView';
import { UsersView } from './features/auth/UsersView';
import { SplashScreen } from './features/landing/SplashScreen';
import { AuthUser, Team, Tournament, User, UserRole } from './types';
import { INITIAL_USERS, MOCK_TEAMS, MOCK_TOURNAMENTS } from './data/mockData';
import { tournamentXApi } from './services/apiClient';
import { isSupabaseConfigured, supabase } from './services/supabaseClient';

const TEAM_STORAGE_KEY = 'tournamentx-dev3-teams';
const PLAYER_STORAGE_KEY = 'tournamentx-dev3-players';
const TOURNAMENT_STORAGE_KEY = 'tournamentx-dev2-tournaments';

function normalizeTeam(team: Team | Record<string, unknown>): Team {
  const roster = Array.isArray((team as Team).roster) ? (team as Team).roster : [];
  return {
    ...(team as Team),
    id: String((team as Team).id || 'team-new'),
    name: String((team as Team).name || 'Nuevo equipo'),
    tag: String((team as Team).tag || (team as Team).abbreviation || 'NEW'),
    abbreviation: String((team as Team).abbreviation || (team as Team).tag || 'NEW'),
    logo: String((team as Team).logo || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80'),
    tier: String((team as Team).tier || 'PRO TIER'),
    globalRank: Number((team as Team).globalRank ?? 0),
    winRate: Number((team as Team).winRate ?? 0),
    matchesPlayed: Number((team as Team).matchesPlayed ?? 0),
    record: (team as Team).record ?? { wins: 0, losses: 0, ties: 0 },
    points: Number((team as Team).points ?? 0),
    trend: (team as Team).trend ?? 'UP',
    region: String((team as Team).region || 'LATAM'),
    bio: String((team as Team).bio || (team as Team).description || 'Equipo de torneo.'),
    description: String((team as Team).description || (team as Team).bio || 'Equipo de torneo.'),
    sport: String((team as Team).sport || 'Valorant'),
    competitionType: String((team as Team).competitionType || 'Regional'),
    status: (team as Team).status ?? 'active',
    createdAt: (team as Team).createdAt ?? new Date().toISOString(),
    updatedAt: (team as Team).updatedAt ?? new Date().toISOString(),
    roster: roster.map((member) => ({
      ...member,
      id: String(member.id),
      playerId: String((member as { playerId?: string }).playerId || member.id),
      name: String(member.name || 'Jugador'),
      nickname: String(member.nickname || 'Unknown'),
      role: String(member.role || 'Jugador'),
      ovr: Number((member as { ovr?: number }).ovr ?? 90),
      avatar: String((member as { avatar?: string }).avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'),
      kda: String((member as { kda?: string }).kda || '1.20 K/D'),
      status: (member as { status?: 'active' | 'inactive' }).status ?? 'active',
    })),
  };
}

function normalizePlayer(player: Partial<User> | Record<string, unknown>): User {
  const name = String((player as Partial<User>).name || 'Jugador');
  const lastName = String((player as Partial<User>).lastname || '');
  const nickname = String((player as Partial<User>).nickname || (player as Partial<User>).username || name);
  return {
    ...(player as User),
    id: String((player as Partial<User>).id || `usr-${Date.now()}`),
    name: `${name} ${lastName}`.trim(),
    lastname: lastName,
    nickname,
    username: String((player as Partial<User>).username || `@${nickname.toLowerCase().replace(/\s+/g, '_')}`),
    email: String((player as Partial<User>).email || `${name.toLowerCase().replace(/\s+/g, '.')}@tournamentx.gg`),
    role: (player as Partial<User>).role ?? 'Jugador',
    avatar: String((player as Partial<User>).avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'),
    teamId: (player as Partial<User>).teamId,
    teamName: (player as Partial<User>).teamName,
    status: (player as Partial<User>).status ?? 'ACTIVE',
    lastActivity: String((player as Partial<User>).lastActivity || 'Reciente'),
    ratingOVR: Number((player as Partial<User>).ratingOVR ?? 85),
    position: String((player as Partial<User>).position || 'Jugador'),
  };
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('landing');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(isSupabaseConfigured ? 'Espectador' : 'Admin');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [teams, setTeams] = useState<Team[]>(() => {
    const initial = typeof window !== 'undefined' ? localStorage.getItem(TEAM_STORAGE_KEY) : null;
    return initial ? JSON.parse(initial).map(normalizeTeam) : MOCK_TEAMS;
  });
  const [players, setPlayers] = useState<User[]>(() => {
    const initial = typeof window !== 'undefined' ? localStorage.getItem(PLAYER_STORAGE_KEY) : null;
    return initial ? JSON.parse(initial).map(normalizePlayer) : INITIAL_USERS;
  });
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const initial = typeof window !== 'undefined' ? localStorage.getItem(TOURNAMENT_STORAGE_KEY) : null;
    return initial ? JSON.parse(initial) : MOCK_TOURNAMENTS;
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string>('team-lnx');

  useEffect(() => { const timer = window.setTimeout(() => setShowSplash(false), 3000); return () => window.clearTimeout(timer); }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  useEffect(() => {
    const restoreUser = () => tournamentXApi.me()
      .then(({ user }) => { setCurrentUser(user); setCurrentUserRole(user.roleLabel); })
      .catch(() => {
        if (!supabase) localStorage.removeItem('tournamentx_token');
      });

    if (supabase) {
      void supabase.auth.getSession().then(({ data }) => { if (data.session) void restoreUser(); });
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') { setCurrentUser(null); setCurrentUserRole('Espectador'); }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') void restoreUser();
      });
      return () => authListener.subscription.unsubscribe();
    }

    if (localStorage.getItem('tournamentx_token')) void restoreUser();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedTeams, fetchedPlayers, fetchedTournaments] = await Promise.all([
          tournamentXApi.teams().catch(() => null),
          tournamentXApi.players().catch(() => null),
          tournamentXApi.tournaments().catch(() => null),
        ]);
        if (Array.isArray(fetchedTeams) && fetchedTeams.length > 0) {
          setTeams(fetchedTeams.map(normalizeTeam));
          localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(fetchedTeams.map(normalizeTeam)));
        }
        if (Array.isArray(fetchedPlayers) && fetchedPlayers.length > 0) {
          setPlayers(fetchedPlayers.map(normalizePlayer));
          localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(fetchedPlayers.map(normalizePlayer)));
        }
        if (Array.isArray(fetchedTournaments) && fetchedTournaments.length > 0) {
          setTournaments(fetchedTournaments as Tournament[]);
          localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(fetchedTournaments));
        }
      } catch {
        // Se conserva el fallback local cuando la API no esté disponible.
      }
    };
    loadData();

    if (!supabase) return;
    const channel = supabase
      .channel('tournamentx-core-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_roster' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => void loadData())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teams));
      localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(players));
      localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(tournaments));
    }
  }, [teams, players, tournaments]);

  const selectedTeam = useMemo(() => teams.find((team) => team.id === selectedTeamId) || teams[0] || MOCK_TEAMS[0], [teams, selectedTeamId]);

  const handleCreateTeam = async (data: Partial<Team>) => {
    const payload = normalizeTeam({
      ...data,
      id: `team-${Date.now()}`,
      tag: data.tag || data.abbreviation || 'NEW',
      abbreviation: data.abbreviation || data.tag || 'NEW',
      tier: data.tier || 'PRO TIER',
      globalRank: data.globalRank ?? 0,
      winRate: data.winRate ?? 0,
      matchesPlayed: data.matchesPlayed ?? 0,
      points: data.points ?? 0,
      trend: data.trend ?? 'UP',
      record: data.record ?? { wins: 0, losses: 0, ties: 0 },
      roster: data.roster ?? [],
      logo: data.logo || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
    });
    try {
      const created = await tournamentXApi.createTeam(payload);
      const next = normalizeTeam(created);
      setTeams((current) => [next, ...current]);
      setSelectedTeamId(next.id);
      return next;
    } catch {
      const next = normalizeTeam(payload);
      setTeams((current) => [next, ...current]);
      setSelectedTeamId(next.id);
      return next;
    }
  };

  const handleUpdateTeam = async (id: string, data: Partial<Team>) => {
    const nextTeam = normalizeTeam({
      ...(teams.find((team) => team.id === id) || {}),
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    });
    try {
      const updated = await tournamentXApi.updateTeam(id, nextTeam);
      const normalized = normalizeTeam(updated);
      setTeams((current) => current.map((team) => team.id === id ? normalized : team));
      return normalized;
    } catch {
      setTeams((current) => current.map((team) => team.id === id ? nextTeam : team));
      return nextTeam;
    }
  };

  const handleCreatePlayer = async (data: Partial<User>) => {
    const payload = normalizePlayer({
      ...data,
      id: `usr-${Date.now()}`,
      username: data.username || `@${data.nickname || data.name || 'player'}`,
      role: data.role || 'Jugador',
      status: data.status || 'ACTIVE',
      lastActivity: 'Just now',
      ratingOVR: data.ratingOVR ?? 85,
    });
    try {
      const created = await tournamentXApi.createPlayer(payload);
      const next = normalizePlayer(created);
      setPlayers((current) => [next, ...current]);
      return next;
    } catch {
      setPlayers((current) => [payload, ...current]);
      return payload;
    }
  };

  const handleUpdatePlayer = async (id: string, data: Partial<User>) => {
    const current = players.find((player) => player.id === id);
    const nextPlayer = normalizePlayer({
      ...(current ?? {}),
      ...data,
      id,
    });
    try {
      const updated = await tournamentXApi.updatePlayer(id, nextPlayer);
      const normalized = normalizePlayer(updated);
      setPlayers((currentPlayers) => currentPlayers.map((player) => player.id === id ? normalized : player));
      return normalized;
    } catch {
      setPlayers((currentPlayers) => currentPlayers.map((player) => player.id === id ? nextPlayer : player));
      return nextPlayer;
    }
  };

  const handleAddRosterMember = async (teamId: string, playerId: string, role: string) => {
    const alreadyInTeam = teams
      .find((team) => team.id === teamId)?.roster.some((member) => member.playerId === playerId);
    if (alreadyInTeam) {
      return { ok: false, message: 'Este jugador ya pertenece a la plantilla.' };
    }

    try {
      const created = await tournamentXApi.addRosterMember(teamId, { playerId, role, status: 'active' });
      const player = players.find((entry) => entry.id === playerId);
      const team = teams.find((entry) => entry.id === teamId);
      const updatedTeam = team ? {
        ...team,
        roster: [
          ...team.roster,
          {
            id: created.id || `member-${Date.now()}`,
            playerId,
            name: player ? `${player.name} ${player.username}` : 'Jugador',
            nickname: player?.username || 'Unknown',
            role,
            ovr: player?.ratingOVR ?? 90,
            avatar: player?.avatar || '',
            kda: '1.30 K/D',
            status: 'active',
          },
        ],
      } : null;

      if (updatedTeam) {
        setTeams((current) => current.map((entry) => entry.id === teamId ? normalizeTeam(updatedTeam) : entry));
      }
      return { ok: true, message: 'Jugador agregado a la plantilla.' };
    } catch {
      const player = players.find((entry) => entry.id === playerId);
      const team = teams.find((entry) => entry.id === teamId);
      if (!team || !player) return { ok: false, message: 'Equipo o jugador no disponible.' };
      const nextTeam = normalizeTeam({
        ...team,
        roster: [
          ...team.roster,
          {
            id: `member-${Date.now()}`,
            playerId,
            name: `${player.name} ${player.username}`,
            nickname: player.username,
            role,
            ovr: player.ratingOVR ?? 90,
            avatar: player.avatar,
            kda: '1.30 K/D',
            status: 'active',
          },
        ],
      });
      setTeams((current) => current.map((entry) => entry.id === teamId ? nextTeam : entry));
      return { ok: true, message: 'Jugador agregado a la plantilla.' };
    }
  };

  const handleRemoveRosterMember = async (teamId: string, playerId: string) => {
    try {
      await tournamentXApi.removeRosterMember(teamId, playerId);
    } catch {
      // Fallback local sin error en la API externa.
    }
    setTeams((current) => current.map((team) => {
      if (team.id !== teamId) return team;
      return normalizeTeam({
        ...team,
        roster: team.roster.filter((member) => member.playerId !== playerId),
      });
    }));
  };

  const handleCreateTournament = async (data: Partial<Tournament>) => {
    const payload: Tournament = {
      id: `tour-${Date.now()}`,
      name: data.name || 'Nuevo torneo',
      description: data.description || '',
      game: data.game || 'Valorant',
      gameCategory: data.gameCategory || 'FPS',
      banner: data.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      prizePool: data.prizePool || '$0',
      prizeAmountUSD: data.prizeAmountUSD ?? 0,
      status: 'OPEN',
      format: data.format || 'SINGLE_ELIMINATION',
      dates: data.dates || '',
      registeredTeams: 0,
      maxTeams: data.maxTeams ?? 16,
      privacy: data.privacy || 'PUBLIC',
      organizer: data.organizer || 'TournamentX Pro Staff',
      tier: data.tier || 'PRO CIRCUIT',
      venue: data.venue,
    };
    try {
      const created = await tournamentXApi.createTournament(payload) as Tournament;
      setTournaments((current) => [created, ...current]);
      return created;
    } catch {
      setTournaments((current) => [payload, ...current]);
      return payload;
    }
  };

  const refreshTournament = async (tournamentId: string) => {
    const updated = await tournamentXApi.tournament(tournamentId) as Tournament;
    setTournaments((current) => current.map((t) => t.id === tournamentId ? updated : t));
    return updated;
  };

  const handleReportBracketResult = async (tournamentId: string, matchId: string, score1: number, score2: number) => {
    try {
      await tournamentXApi.reportBracketMatchResult(tournamentId, matchId, score1, score2);
      await refreshTournament(tournamentId);
    } catch (error) {
      if (!(error instanceof TypeError)) {
        // La API respondió (p. ej. rechazó un empate en eliminación directa): no se aplica localmente.
        throw error;
      }
      // Fallback local solo cuando la API no está disponible: refleja el resultado sin avanzar la llave.
      setTournaments((current) => current.map((t) => {
        if (t.id !== tournamentId || !t.rounds) return t;
        return {
          ...t,
          rounds: t.rounds.map((round) => ({
            ...round,
            matches: round.matches.map((m) => m.id === matchId
              ? {
                ...m,
                team1: { ...m.team1, score: score1, winner: score1 > score2 },
                team2: { ...m.team2, score: score2, winner: score2 > score1 },
                status: 'FINISHED' as const,
              }
              : m),
          })),
        };
      }));
    }
  };

  const handleRegisterParticipant = async (tournamentId: string, data: { teamId?: string; teamName: string; seed?: number }) => {
    await tournamentXApi.registerTournamentParticipant(tournamentId, data);
    await refreshTournament(tournamentId);
  };

  const handleGenerateGroups = async (tournamentId: string, groupCount: number) => {
    await tournamentXApi.generateTournamentGroups(tournamentId, groupCount);
    await refreshTournament(tournamentId);
  };

  const handleGenerateBracket = async (tournamentId: string) => {
    await tournamentXApi.generateTournamentBracket(tournamentId);
    await refreshTournament(tournamentId);
  };

  const openTournamentWizard = () => setShowCreateWizard(true);
  const navigate = (tab: TabId) => setActiveTab(tab === 'live_match' ? 'esports' : tab);
  const navigateToTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('team_detail');
  };
  const navigateToMatch = () => setActiveTab('esports');

  if (showSplash) return <SplashScreen />;

  return (
    <div id="tournamentx-app-root" className="min-h-screen bg-[#0a0b0e] text-slate-100 flex flex-col font-sans selection:bg-[#ff2e83] selection:text-white">
      {activeTab === 'landing' ? (
        <LandingView onEnterApp={navigate} onOpenCreateWizard={openTournamentWizard} onOpenAuth={() => navigate('login')} />
      ) : activeTab === 'login' ? (
        <LoginView onAuthenticated={(user) => { setCurrentUser(user); setCurrentUserRole(user.roleLabel); navigate('dashboard'); }} />
      ) : (
        <>
          <Sidebar
            currentTab={activeTab}
            setCurrentTab={navigate}
            currentUserRole={currentUserRole}
            currentUserName={currentUser?.name}
            onOpenCreateWizard={openTournamentWizard}
          />

          <main className="flex-1 bg-[#0a0b0e] pb-16">
            {activeTab === 'dashboard' && <DashboardView teams={teams} tournaments={tournaments} onNavigate={navigate} onOpenCreateWizard={openTournamentWizard} />}
            {activeTab === 'tournaments' && (
              <TournamentsView
                onNavigate={navigate}
                currentUserRole={currentUserRole}
                onOpenCreateWizard={openTournamentWizard}
                tournaments={tournaments}
                onReportBracketResult={handleReportBracketResult}
                onRegisterParticipant={handleRegisterParticipant}
                onGenerateGroups={handleGenerateGroups}
                onGenerateBracket={handleGenerateBracket}
              />
            )}
            {(activeTab === 'calendar' || activeTab === 'esports') && (
              <MatchesWorkspace
                section={activeTab}
                currentUserRole={currentUserRole}
                onNavigate={navigate}
                onOpenMatch={navigateToMatch}
              />
            )}
            {(activeTab === 'teams' || activeTab === 'players') && (
              <TeamsWorkspace
                section={activeTab}
                teams={teams}
                players={players}
                currentUserRole={currentUserRole}
                onNavigate={navigate}
                onSelectTeam={navigateToTeam}
                onCreateTeam={handleCreateTeam}
                onCreatePlayer={handleCreatePlayer}
                onUpdatePlayer={handleUpdatePlayer}
              />
            )}
            {activeTab === 'team_detail' && (
              <TeamDetailView
                teamId={selectedTeam?.id || selectedTeamId}
                teams={teams}
                players={players}
                onNavigate={navigate}
                onSelectTeam={setSelectedTeamId}
                onCreateTeam={handleCreateTeam}
                onUpdateTeam={handleUpdateTeam}
                onAddRosterMember={handleAddRosterMember}
                onRemoveRosterMember={handleRemoveRosterMember}
              />
            )}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'venues' && <SedesMapView onSelectVenueTournament={() => navigate('tournaments')} />}
            {activeTab === 'users' && <UsersView currentUserRole={currentUserRole} />}
            {activeTab === 'rewards' && <RecompensasView currentUserRole={currentUserRole} />}
          </main>
        </>
      )}

      {showCreateWizard && (
        <TournamentCreateWizard
          onClose={() => setShowCreateWizard(false)}
          onCreateTournament={handleCreateTournament}
          onTournamentCreated={() => {
            setShowCreateWizard(false);
            navigate('tournaments');
          }}
        />
      )}
    </div>
  );
}
