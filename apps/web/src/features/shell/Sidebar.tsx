import React from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { TournamentXLogo } from '../../shared/components/TournamentXLogo';
import { UserRole } from '../../types';

export type TabId = 'landing' | 'dashboard' | 'tournaments' | 'live_match' | 'teams' | 'team_detail' | 'players' | 'users' | 'calendar' | 'analytics' | 'esports' | 'venues' | 'rewards' | 'create_tournament' | 'login';

interface SidebarProps {
  currentTab: TabId;
  setCurrentTab: (tab: TabId) => void;
  currentUserRole: UserRole;
  currentUserName?: string;
  onOpenCreateWizard: () => void;
}

const mainItems: Array<{ id: TabId; label: string }> = [
  { id: 'landing', label: 'Página principal' },
  { id: 'dashboard', label: 'Panel' },
  { id: 'tournaments', label: 'Torneos' },
  { id: 'live_match', label: 'Partidos' },
  { id: 'teams', label: 'Equipos' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'analytics', label: 'Estadísticas' },
  { id: 'rewards', label: 'Premios' }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, currentUserRole, currentUserName, onOpenCreateWizard }) => (
  <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0c10]/95 backdrop-blur-md">
    <div className="max-w-[1500px] mx-auto h-16 px-5 lg:px-8 flex items-center gap-6">
      <TournamentXLogo size="sm" onClick={() => setCurrentTab('landing')} />
      <nav className="flex-1 flex items-center gap-1 overflow-x-auto" aria-label="Menú principal">
        {mainItems.map((item) => {
          const active = currentTab === item.id || (item.id === 'teams' && currentTab === 'team_detail');
          return <button key={item.id} onClick={() => setCurrentTab(item.id)} className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white'}`}>{item.label}</button>;
        })}
        <div className="relative group">
          <button className="flex items-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-white">Más <ChevronDown className="w-3.5 h-3.5" /></button>
          <div className="hidden group-hover:block absolute top-full right-0 pt-2 w-48">
            <div className="rounded-xl border border-white/10 bg-[#12141b] p-1 shadow-xl">
              <button onClick={() => setCurrentTab('players')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10">Jugadores</button>
              {currentUserRole === 'Admin' && <button onClick={() => setCurrentTab('users')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10">Usuarios y roles</button>}
              <button onClick={() => setCurrentTab('esports')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10">Transmisiones</button>
              <button onClick={() => setCurrentTab('venues')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10">Sedes</button>
            </div>
          </div>
        </div>
      </nav>
      {(currentUserRole === 'Admin' || currentUserRole === 'Organizador') && <button onClick={onOpenCreateWizard} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff2e83] text-white text-sm font-semibold hover:bg-[#e11d48]"><Plus className="w-4 h-4" /> Crear torneo</button>}
      <button onClick={() => setCurrentTab('login')} className="w-9 h-9 rounded-full bg-[#ff2e83]/15 border border-[#ff2e83]/30 text-sm font-semibold text-white" aria-label={currentUserName ? `Cuenta de ${currentUserName}` : 'Iniciar sesión'} title={currentUserName || 'Iniciar sesión'}>{(currentUserName || currentUserRole).charAt(0)}</button>
    </div>
  </header>
);
