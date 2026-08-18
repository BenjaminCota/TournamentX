import React from 'react';
import { ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { Team, User, UserRole } from '../../types';
import { TabId } from '../shell/Sidebar';
import { PlayersView } from './PlayersView';
import { TeamsListView } from './TeamsListView';

interface TeamsWorkspaceProps {
  section: 'teams' | 'players';
  onNavigate: (tab: TabId) => void;
  teams: Team[];
  players: User[];
  currentUserRole: UserRole;
  currentUserId?: string;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam: (team: Partial<Team>) => Promise<Team> | Team;
  onCreatePlayer: (data: Partial<User>) => Promise<User>;
  onUpdatePlayer: (id: string, data: Partial<User>) => Promise<User>;
}

export const TeamsWorkspace: React.FC<TeamsWorkspaceProps> = ({
  section,
  onNavigate,
  teams,
  players,
  currentUserRole,
  currentUserId,
  onSelectTeam,
  onCreateTeam,
  onCreatePlayer,
  onUpdatePlayer,
}) => (
  <div className="min-h-screen bg-[#0a0b0e]">
    <section className="border-b border-white/[.07] bg-[radial-gradient(circle_at_20%_0%,rgba(255,46,131,.12),transparent_34%),#0d0e13] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#ff69a8]"><ShieldCheck className="h-3.5 w-3.5" /> Gestión de plantillas</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Equipos y jugadores</h1>
          <p className="mt-1 text-xs leading-5 text-slate-400">Registra equipos, administra sus integrantes y asigna cada jugador a una plantilla.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[.08] bg-black/25 p-1.5" role="tablist" aria-label="Secciones de equipos">
          <button type="button" role="tab" aria-selected={section === 'teams'} onClick={() => onNavigate('teams')} className={`flex min-w-36 items-center gap-3 rounded-xl px-4 py-2.5 text-left ${section === 'teams' ? 'bg-white/[.09] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>
            <UsersRound className={`h-4 w-4 ${section === 'teams' ? 'text-[#ff4b94]' : ''}`} />
            <span><b className="block text-xs">Equipos</b><small className="block text-[10px] font-normal text-slate-500">{teams.length} registrados</small></span>
          </button>
          <button type="button" role="tab" aria-selected={section === 'players'} onClick={() => onNavigate('players')} className={`flex min-w-36 items-center gap-3 rounded-xl px-4 py-2.5 text-left ${section === 'players' ? 'bg-white/[.09] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>
            <UserRound className={`h-4 w-4 ${section === 'players' ? 'text-[#ff4b94]' : ''}`} />
            <span><b className="block text-xs">Jugadores</b><small className="block text-[10px] font-normal text-slate-500">{players.length} perfiles</small></span>
          </button>
        </div>
      </div>
    </section>

    {section === 'teams' ? (
      <TeamsListView teams={teams} currentUserRole={currentUserRole} onSelectTeam={onSelectTeam} onCreateTeam={onCreateTeam} />
    ) : (
      <PlayersView currentUserRole={currentUserRole} currentUserId={currentUserId} players={players} onCreatePlayer={onCreatePlayer} onUpdatePlayer={onUpdatePlayer} />
    )}
  </div>
);
