import React from 'react';
import {
  BarChart3,
  CalendarDays,
  Gift,
  LayoutDashboard,
  MapPin,
  Plus,
  ShieldCheck,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { TournamentXLogo } from '../../shared/components/TournamentXLogo';
import { UserRole } from '../../types';

export type TabId = 'landing' | 'dashboard' | 'tournaments' | 'live_match' | 'teams' | 'team_detail' | 'players' | 'users' | 'calendar' | 'analytics' | 'esports' | 'venues' | 'rewards' | 'create_tournament' | 'login';

interface SidebarProps {
  currentTab: TabId;
  setCurrentTab: (tab: TabId) => void;
  currentUserRole: UserRole;
  currentUserName?: string;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onRequestLogout: () => void;
  onOpenCreateWizard: () => void;
}

const mainItems = [
  { id: 'dashboard' as const, label: 'Panel', icon: LayoutDashboard, tabs: ['dashboard'] as TabId[] },
  { id: 'tournaments' as const, label: 'Torneos', icon: Trophy, tabs: ['tournaments'] as TabId[] },
  { id: 'calendar' as const, label: 'Partidos', icon: CalendarDays, tabs: ['calendar', 'live_match', 'esports'] as TabId[] },
  { id: 'teams' as const, label: 'Equipos', icon: UsersRound, tabs: ['teams', 'players', 'team_detail'] as TabId[] },
  { id: 'analytics' as const, label: 'Estadísticas', icon: BarChart3, tabs: ['analytics'] as TabId[] },
  { id: 'venues' as const, label: 'Sedes', icon: MapPin, tabs: ['venues'] as TabId[] },
  { id: 'rewards' as const, label: 'Premios', icon: Gift, tabs: ['rewards'] as TabId[] },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, currentUserRole, currentUserName, isAuthenticated, onOpenAuth, onRequestLogout, onOpenCreateWizard }) => {
  const visibleItems = currentUserRole === 'Admin'
    ? [...mainItems, { id: 'users' as const, label: 'Administración', icon: ShieldCheck, tabs: ['users'] as TabId[] }]
    : mainItems;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[.08] bg-[#090a0e]/95 shadow-[0_8px_30px_rgba(0,0,0,.28)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1540px] items-center gap-3 px-4 lg:gap-5 lg:px-7">
        <div className="shrink-0 border-r border-white/[.08] pr-4">
          <TournamentXLogo size="sm" onClick={() => setCurrentTab('landing')} />
        </div>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2" aria-label="Navegación principal">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = item.tabs.includes(currentTab);
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`group relative inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-all ${active ? 'bg-[#ff2e83]/12 text-white ring-1 ring-[#ff2e83]/25' : 'text-slate-400 hover:bg-white/[.05] hover:text-white'}`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#ff4b94]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span>{item.label}</span>
                {active && <span className="absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-[#ff2e83]" />}
              </button>
            );
          })}
        </nav>

        {(currentUserRole === 'Admin' || currentUserRole === 'Organizador') && (
          <button
            type="button"
            onClick={onOpenCreateWizard}
            className="hidden h-10 shrink-0 items-center gap-2 rounded-xl bg-[#ff2e83] px-4 text-xs font-bold text-white shadow-lg shadow-[#ff2e83]/20 hover:-translate-y-0.5 hover:bg-[#ef2778] xl:flex"
          >
            <Plus className="h-4 w-4" /> Crear torneo
          </button>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={onRequestLogout}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ff2e83]/25 bg-[#ff2e83]/10 text-sm font-bold text-white hover:bg-[#ff2e83]/20"
            aria-label="Cerrar sesión"
            title={currentUserName ? `Cerrar sesión de ${currentUserName}` : 'Cerrar sesión'}
          >
            {(currentUserName || currentUserRole).charAt(0)}
          </button>
        ) : (
          <button type="button" onClick={onOpenAuth} className="h-10 shrink-0 rounded-xl bg-[#ff2e83] px-4 text-xs font-bold text-white shadow-lg shadow-[#ff2e83]/20 transition-all hover:-translate-y-0.5 hover:bg-[#ef2778]">
            Iniciar sesión
          </button>
        )}
      </div>
    </header>
  );
};
