import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { OrganizerRequestCard } from './features/auth/OrganizerRequestCard';
import { SplashScreen } from './features/landing/SplashScreen';
import { AuthUser, Team, Tournament, User, UserRole } from './types';
import { tournamentXApi } from './services/apiClient';
import { supabase } from './services/supabaseClient';
import { FeedbackToaster } from './shared/components/FeedbackToaster';
import { notify } from './shared/feedback';

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
      kda: String((member as { kda?: string }).kda || 'Sin registro oficial'),
      status: (member as { status?: 'active' | 'inactive' }).status ?? 'active',
    })),
  };
}

function enforceTextLimit(event: FormEvent<HTMLElement>) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  const isTextarea = target instanceof HTMLTextAreaElement;
  const supportedInput = ['text', 'search', 'email', 'password', 'tel', 'url'].includes(target.type);
  if (!isTextarea && !supportedInput) return;

  const defaultLimit = isTextarea ? 500 : target.type === 'password' ? 128 : target.type === 'email' ? 255 : target.type === 'url' ? 500 : 120;
  if (target.maxLength < 0 || target.maxLength > defaultLimit) target.maxLength = defaultLimit;
  if (target.value.length > target.maxLength) target.value = target.value.slice(0, target.maxLength);
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
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Espectador');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>();

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
        const results = await Promise.allSettled([
          tournamentXApi.teams(),
          tournamentXApi.players(),
          tournamentXApi.tournaments(),
          tournamentXApi.analytics(),
        ]);
        const [teamsResult, playersResult, tournamentsResult, analyticsResult] = results;
        const fetchedTeams = teamsResult.status === 'fulfilled' ? teamsResult.value : null;
        const fetchedPlayers = playersResult.status === 'fulfilled' ? playersResult.value : null;
        const fetchedTournaments = tournamentsResult.status === 'fulfilled' ? tournamentsResult.value : null;
        const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
        const failedModules = [
          teamsResult.status === 'rejected' ? 'equipos' : '',
          playersResult.status === 'rejected' ? 'jugadores' : '',
          tournamentsResult.status === 'rejected' ? 'torneos' : '',
          analyticsResult.status === 'rejected' ? 'estadísticas' : '',
        ].filter(Boolean);
        if (failedModules.length) {
          notify(failedModules.length === results.length ? 'error' : 'info', `Carga parcial: no se pudieron actualizar ${failedModules.join(', ')}.`);
        }
        if (Array.isArray(fetchedTeams)) {
          setTeams(fetchedTeams.map((team) => {
            const persisted = normalizeTeam(team);
            const rankingIndex = analytics?.ranking.findIndex((entry) => entry.id === persisted.id) ?? -1;
            const result = rankingIndex >= 0 ? analytics?.ranking[rankingIndex] : undefined;
            return result ? normalizeTeam({
              ...persisted,
              globalRank: result.played > 0 ? rankingIndex + 1 : 0,
              winRate: result.rate,
              matchesPlayed: result.played,
              record: { wins: result.wins, losses: result.losses, ties: result.draws },
              points: result.points,
            }) : persisted;
          }));
          setSelectedTeamId((current) => current || fetchedTeams[0]?.id || '');
        }
        if (Array.isArray(fetchedPlayers)) {
          setPlayers(fetchedPlayers.map(normalizePlayer));
        }
        if (Array.isArray(fetchedTournaments)) {
          setTournaments(fetchedTournaments as Tournament[]);
        }
      } catch (error) {
        notify('error', error instanceof Error ? error.message : 'No se pudieron cargar los datos persistidos.');
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

  const selectedTeam = useMemo(() => teams.find((team) => team.id === selectedTeamId) || teams[0], [teams, selectedTeamId]);

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
    } catch (error) {
      throw error;
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
    } catch (error) {
      throw error;
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
    } catch (error) {
      throw error;
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
    } catch (error) {
      throw error;
    }
  };

  const handleDeletePlayer = async (id: string) => {
    await tournamentXApi.deletePlayer(id);
    setPlayers((currentPlayers) => currentPlayers.filter((player) => player.id !== id));
    setTeams((currentTeams) => currentTeams.map((team) => ({
      ...team,
      roster: team.roster.filter((member) => (member.playerId || member.id) !== id),
    })));
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
            kda: 'Sin registro oficial',
            status: 'active',
          },
        ],
      } : null;

      if (updatedTeam) {
        setTeams((current) => current.map((entry) => entry.id === teamId ? normalizeTeam(updatedTeam) : entry));
      }
      return { ok: true, message: 'Jugador agregado a la plantilla.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'No se pudo modificar la plantilla.' };
    }
  };

  const handleRemoveRosterMember = async (teamId: string, playerId: string) => {
    try {
      await tournamentXApi.removeRosterMember(teamId, playerId);
    } catch (error) {
      throw error;
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
    } catch (error) {
      throw error;
    }
  };

  const refreshTournament = async (tournamentId: string) => {
    const updated = await tournamentXApi.tournament(tournamentId) as Tournament;
    setTournaments((current) => current.map((t) => t.id === tournamentId ? updated : t));
    return updated;
  };

  const handleReportBracketResult = async (tournamentId: string, matchId: string, score1: number, score2: number) => {
    await tournamentXApi.reportBracketMatchResult(tournamentId, matchId, score1, score2);
    await refreshTournament(tournamentId);
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

  const handleChangeTournamentStatus = async (tournamentId: string, status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED', note?: string) => {
    const result = await tournamentXApi.changeTournamentStatus(tournamentId, status, note) as { tournament: Tournament };
    setTournaments((current) => current.map((tournament) => tournament.id === tournamentId ? result.tournament : tournament));
  };

  const openTournamentWizard = () => setShowCreateWizard(true);
  const navigate = (tab: TabId) => setActiveTab(tab);
  const enterFromLanding = (tab: TabId = 'dashboard') => navigate(tab);
  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('tournamentx_token');
    localStorage.removeItem('tournamentx_user');
    setCurrentUser(null);
    setCurrentUserRole('Espectador');
    navigate('landing');
    setShowLogoutConfirmation(false);
    notify('success', 'Sesión cerrada. Ahora estás explorando como visitante.');
  };
  const navigateToTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('team_detail');
  };
  const navigateToMatch = (matchId: string) => { setSelectedMatchId(matchId); setActiveTab('live_match'); };

  if (showSplash) return <SplashScreen />;

  return (
    <div id="tournamentx-app-root" onInputCapture={enforceTextLimit} className="tx-app-shell min-h-screen bg-[#0a0b0e] text-slate-100 flex flex-col font-sans selection:bg-[#ff2e83] selection:text-white">
      {activeTab === 'landing' ? (
        <LandingView
          teams={teams}
          tournaments={tournaments}
          onEnterApp={enterFromLanding}
          onOpenCreateWizard={() => currentUser ? openTournamentWizard() : navigate('login')}
          onOpenAuth={() => navigate('login')}
        />
      ) : activeTab === 'login' ? (
        <LoginView
          onAuthenticated={(user) => { setCurrentUser(user); setCurrentUserRole(user.roleLabel); navigate('dashboard'); notify('success', `Bienvenido, ${user.name}.`); }}
          onBackToHome={() => navigate('landing')}
        />
      ) : (
        <>
          <Sidebar
            currentTab={activeTab}
            setCurrentTab={navigate}
            currentUserRole={currentUserRole}
            currentUserName={currentUser?.name}
            isAuthenticated={Boolean(currentUser)}
            onOpenAuth={() => navigate('login')}
            onRequestLogout={() => setShowLogoutConfirmation(true)}
            onOpenCreateWizard={openTournamentWizard}
          />

          <main className="tx-module-host flex-1 bg-[#0a0b0e] pb-16">
            {activeTab === 'dashboard' && <><OrganizerRequestCard currentUserRole={currentUserRole}/><DashboardView teams={teams} tournaments={tournaments} onNavigate={navigate} onOpenMatch={navigateToMatch} onOpenCreateWizard={openTournamentWizard} /></>}
            {activeTab === 'tournaments' && (
              <TournamentsView
                onNavigate={navigate}
                currentUserRole={currentUserRole}
                onOpenCreateWizard={openTournamentWizard}
                tournaments={tournaments}
                teams={teams}
                onReportBracketResult={handleReportBracketResult}
                onRegisterParticipant={handleRegisterParticipant}
                onGenerateGroups={handleGenerateGroups}
                onGenerateBracket={handleGenerateBracket}
                onChangeStatus={handleChangeTournamentStatus}
              />
            )}
            {(activeTab === 'calendar' || activeTab === 'esports' || activeTab === 'live_match') && (
              <MatchesWorkspace
                section={activeTab}
                currentUserRole={currentUserRole}
                currentUserId={currentUser?.id}
                selectedMatchId={selectedMatchId}
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
                currentUserId={currentUser?.id}
                onNavigate={navigate}
                onSelectTeam={navigateToTeam}
                onCreateTeam={handleCreateTeam}
                onCreatePlayer={handleCreatePlayer}
                onUpdatePlayer={handleUpdatePlayer}
                onDeletePlayer={handleDeletePlayer}
              />
            )}
            {activeTab === 'team_detail' && (
              <TeamDetailView
                teamId={selectedTeam?.id || selectedTeamId}
                teams={teams}
                players={players}
                currentUserRole={currentUserRole}
                currentUserId={currentUser?.id}
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
            {activeTab === 'users' && <UsersView currentUserRole={currentUserRole} currentUserId={currentUser?.id} />}
            {activeTab === 'rewards' && <RecompensasView currentUserRole={currentUserRole} currentUserId={currentUser?.id} isAuthenticated={Boolean(currentUser)} />}
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
      {showLogoutConfirmation && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="logout-confirmation-title">
          <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11131d] p-6 shadow-2xl">
            <h2 id="logout-confirmation-title" className="text-xl font-bold text-white">¿Cerrar sesión?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Dejarás de administrar la plataforma y volverás a la vista de visitante.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowLogoutConfirmation(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/[.06] hover:text-white">Cancelar</button>
              <button type="button" onClick={() => { void logout(); }} className="rounded-xl bg-[#ff2e83] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#ff2e83]/20 hover:bg-[#ef2778]">Cerrar sesión</button>
            </div>
          </section>
        </div>
      )}
      <FeedbackToaster />
    </div>
  );
}
