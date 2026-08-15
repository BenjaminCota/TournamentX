import { useState } from 'react';
import { Sidebar, TabId } from './features/shell/Sidebar';
import { LandingView } from './features/landing/LandingView';
import { DashboardView } from './features/analytics/DashboardView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { TournamentsView } from './features/tournaments/TournamentsView';
import { TournamentCreateWizard } from './features/tournaments/TournamentCreateWizard';
import { LiveMatchView } from './features/matches/LiveMatchView';
import { CalendarView } from './features/matches/CalendarView';
import { PlayersView } from './features/teams/PlayersView';
import { TeamDetailView } from './features/teams/TeamDetailView';
import { EsportsArenaView } from './features/media/EsportsArenaView';
import { SedesMapView } from './features/geolocation/SedesMapView';
import { RecompensasView } from './features/rewards/RecompensasView';
import { LoginView } from './features/auth/LoginView';
import { UserRole } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('landing');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Capitán');
  const selectedTeamId = 'team-lnx';
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  const openTournamentWizard = () => setShowCreateWizard(true);
  const navigate = (tab: TabId) => setActiveTab(tab);

  return (
    <div id="tournamentx-app-root" className="min-h-screen bg-[#0a0b0e] text-slate-100 flex flex-col font-sans selection:bg-[#ff2e83] selection:text-white">
      {activeTab === 'landing' ? (
        <LandingView onEnterApp={navigate} onOpenCreateWizard={openTournamentWizard} onOpenAuth={() => navigate('login')} />
      ) : activeTab === 'login' ? (
        <LoginView currentUserRole={currentUserRole} setCurrentUserRole={setCurrentUserRole} onLoginSuccess={() => navigate('dashboard')} />
      ) : (
        <>
          <Sidebar
          currentTab={activeTab}
          setCurrentTab={navigate}
          currentUserRole={currentUserRole}
          onOpenCreateWizard={openTournamentWizard}
          />

          <main className="flex-1 bg-[#0a0b0e] pb-16">
          {activeTab === 'dashboard' && <DashboardView onNavigate={navigate} onOpenCreateWizard={openTournamentWizard} />}
          {activeTab === 'tournaments' && <TournamentsView onNavigate={navigate} currentUserRole={currentUserRole} onOpenCreateWizard={openTournamentWizard} />}
          {activeTab === 'live_match' && <LiveMatchView currentUserRole={currentUserRole} />}
          {activeTab === 'players' && <PlayersView currentUserRole={currentUserRole} />}
          {(activeTab === 'teams' || activeTab === 'team_detail') && <TeamDetailView teamId={selectedTeamId} onNavigate={navigate} />}
          {activeTab === 'calendar' && <CalendarView onNavigate={navigate} />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'esports' && <EsportsArenaView onWatchLiveMatch={() => navigate('live_match')} />}
          {activeTab === 'venues' && <SedesMapView onSelectVenueTournament={() => navigate('tournaments')} />}
          {activeTab === 'rewards' && <RecompensasView currentUserRole={currentUserRole} />}
          </main>
        </>
      )}

      {showCreateWizard && (
        <TournamentCreateWizard
          onClose={() => setShowCreateWizard(false)}
          onTournamentCreated={() => {
            setShowCreateWizard(false);
            navigate('tournaments');
          }}
        />
      )}
    </div>
  );
}
